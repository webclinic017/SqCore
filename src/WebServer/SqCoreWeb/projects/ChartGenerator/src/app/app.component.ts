import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { SqNgCommonUtils } from './../../../sq-ng-common/src/lib/sq-ng-common.utils';
import { SqNgCommonUtilsTime, minDate, maxDate } from './../../../sq-ng-common/src/lib/sq-ng-common.utils_time';
import { UltimateChart } from '../../../../TsLib/sq-common/chartUltimate';
import { SqStatisticsBuilder, FinalStatistics } from '../../../../TsLib/sq-common/backtestStatistics';
import { ChrtGenBacktestResult, UiChrtGenPrtfRunResult, CgTimeSeries, SqLog, ChartResolution, UiChartPoint } from '../../../../TsLib/sq-common/backtestCommon';
import { sleep } from '../../../../TsLib/sq-common/utils-common';

type Nullable<T> = T | null;

class HandshakeMessage {
  public email = '';
  public param2 = '';
}

export class ChrtGenDiagnostics { // have to export the class, because .mainTsTime is set from outside of this angular component.
  public mainTsTime: Date = new Date();
  public mainAngComponentConstructorTime: Date = new Date();
  public windowOnLoadTime: Date = minDate;

  public backtestRequestStartTime: Date = new Date();
  public backtestRequestReturnTime: Date = new Date();
  public serverBacktestTime: number = 0; // msec
}

export const gChrtGenDiag: ChrtGenDiagnostics = new ChrtGenDiagnostics();

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  m_http: HttpClient;

  chrtGenBacktestResults: Nullable<ChrtGenBacktestResult> = null;
  uiChrtGenPrtfRunResults: UiChrtGenPrtfRunResult[] = [];
  _minStartDate: Date = maxDate; // recalculated based on the BacktestResult received
  _maxEndDate: Date = minDate;

  _ultimateChrt: UltimateChart = new UltimateChart();
  pvChrtWidth: number = 0;
  pvChrtHeight: number = 0;

  prtfIds: Nullable<string> = null;
  bmrks: Nullable<string> = null; // benchmarks
  startDate: Date = new Date(); // used to filter the chart Data based on the user input
  endDate: Date = new Date(); // used to filter the chart Data based on the user input
  startDateStr: string = '';
  endDateStr: string = '';
  rangeSelection: string[] = ['YTD', '1M', '1Y', '3Y', '5Y', 'ALL'];
  histRangeSelected: string = 'ALL';
  isSrvConnectionAlive: boolean = true;
  chrtGenDiagnosticsMsg: string = 'Benchmarking time, connection speed';
  isProgressBarVisble: boolean = false;
  isBacktestReturned: boolean = false;
  _sqStatisticsbuilder: SqStatisticsBuilder = new SqStatisticsBuilder();
  backtestStatsResults: FinalStatistics[] = [];

  user = {
    name: 'Anonymous',
    email: '             '
  };
  public activeTool = 'ChartGenerator';
  public _socket: WebSocket; // initialize later in ctor, becuse we have to send back the activeTool from urlQueryParams

  constructor(http: HttpClient) {
    gChrtGenDiag.mainAngComponentConstructorTime = new Date();
    this.m_http = http;

    const wsQueryStr = window.location.search; // https://sqcore.net/webapps/ChartGenerator/?pids=1  , but another parameter example can be pids=1,13,6&bmrks=SPY,QQQ&start=20210101&end=20220305
    console.log(wsQueryStr);
    // Getting the PrtfIds and Benchmarks from URL
    const url = new URL(window.location.href);
    this.prtfIds = url.searchParams.get('pids');
    this.bmrks = url.searchParams.get('bmrks');

    this.onStartBacktests();
    this._socket = new WebSocket('wss://' + document.location.hostname + '/ws/chrtgen' + wsQueryStr); // "wss://127.0.0.1/ws/chrtgen?pids=13,2" without port number, so it goes directly to port 443, avoiding Angular Proxy redirection. ? has to be included to separate the location from the params

    setInterval(() => { // checking whether the connection is live or not
      this.isSrvConnectionAlive = this._socket != null && this._socket.readyState === WebSocket.OPEN;
    }, 5 * 1000); // refresh at every 5 secs
  }

  ngOnInit(): void {
    // WebSocket connection
    this._socket.onopen = () => {
      console.log('ws: Connection started! _socket.send() can be used now.');
      this.showProgressBar();
    };

    this._socket.onmessage = async (event) => {
      const semicolonInd = event.data.indexOf(':');
      const msgCode = event.data.slice(0, semicolonInd);
      const msgObjStr = event.data.substring(semicolonInd + 1);
      switch (msgCode) {
        case 'OnConnected':
          console.log('ws: OnConnected message arrived:' + event.data);
          const handshakeMsg: HandshakeMessage = Object.assign(new HandshakeMessage(), JSON.parse(msgObjStr));
          this.user.email = handshakeMsg.email;
          break;
        case 'BacktestResults':
          await sleep(5000); // simulate slow C# server backtest
          console.log('ChrtGen.BacktestResults:' + msgObjStr);
          this.onCompleteBacktests(msgObjStr);
          break;
        case 'ErrorToUser':
          console.log('ChrtGen.ErrorToUser:' + msgObjStr);
          break;
        default:
          return false;
      }
    };
    const backtestResChartId = SqNgCommonUtils.getNonNullDocElementById('backtestPvChrt');
    this.pvChrtWidth = backtestResChartId.clientWidth as number;
    this.pvChrtHeight = backtestResChartId.clientHeight as number;
    // resizing the chart dynamically when the window is resized
    window.addEventListener('resize', () => {
      this.pvChrtWidth = backtestResChartId.clientWidth as number; // we have to remember the width/height every time window is resized, because we give these to the chart
      this.pvChrtHeight = backtestResChartId.clientHeight as number;
      this._ultimateChrt.Redraw(this.startDate, this.endDate, this.pvChrtWidth, this.pvChrtHeight);
    });
  }

  processChrtGenBacktestResults(msgObjStr: string) {
    this.chrtGenBacktestResults = JSON.parse(msgObjStr, function(this: any, key, value) {
      // property names and values are transformed to a shorter ones for decreasing internet traffic.Transform them back to normal for better code reading.

      // 'this' is the object containing the property being processed (not the embedding class) as this is a function(), not a '=>', and the property name as a string, the property value as arguments of this function.
      // eslint-disable-next-line no-invalid-this
      const _this: any = this; // use 'this' only once, so we don't have to write 'eslint-disable-next-line' before all lines when 'this' is used

      if (key === 'startPv') {
        _this.startPortfolioValue = value;
        return; // if return undefined, original property will be removed
      }
      if (key === 'endPv') {
        _this.endPortfolioValue = value;
        return; // if return undefined, original property will be removed
      }
      if (key === 'shrp') {
        _this.sharpeRatio = value == 'NaN' ? NaN : parseFloat(value);
        return; // if return undefined, original property will be removed
      }
      if (key === 'tr') {
        _this.totalReturn = parseFloat(value);
        return; // if return undefined, original property will be removed
      }
      if (key === 'wr') {
        _this.winRate = value;
        return; // if return undefined, original property will be removed
      }
      if (key === 'lr') {
        _this.lossingRate = value;
        return; // if return undefined, original property will be removed
      }
      if (key === 'srtn') {
        _this.sortino = value == 'NaN' ? NaN : parseFloat(value);
        return; // if return undefined, original property will be removed
      }
      if (key === 'to') {
        _this.turnover = value;
        return; // if return undefined, original property will be removed
      }
      if (key === 'ls') {
        _this.longShortRatio = value;
        return; // if return undefined, original property will be removed
      }
      if (key === 'bCAGR') {
        _this.benchmarkCAGR = value;
        return; // if return undefined, original property will be removed
      }
      if (key === 'bMax') {
        _this.benchmarkMaxDD = value;
        return; // if return undefined, original property will be removed
      }
      if (key === 'cwb') {
        _this.correlationWithBenchmark = value;
        return; // if return undefined, original property will be removed
      }
      return value;
    });
    this.updateUiWithChrtGenBacktestResults(this.chrtGenBacktestResults, this.uiChrtGenPrtfRunResults);
  }

  // startdate and enddate are not utlized at the moment - Daya yet to develop
  updateUiWithChrtGenBacktestResults(chrtGenBacktestRes: Nullable<ChrtGenBacktestResult>, uiChrtGenPrtfRunResults: UiChrtGenPrtfRunResult[]) {
    if (chrtGenBacktestRes == null || chrtGenBacktestRes.pfRunResults == null)
      return;

    uiChrtGenPrtfRunResults.length = 0;
    const uiPrtfResItem = new UiChrtGenPrtfRunResult();
    gChrtGenDiag.serverBacktestTime = chrtGenBacktestRes.serverBacktestTimeMs;

    for (const item of chrtGenBacktestRes.pfRunResults) { // processing Strategies
      // uiPrtfResItem.startPortfolioValue = item.pstat.startPortfolioValue;
      // uiPrtfResItem.endPortfolioValue = item.pstat.endPortfolioValue;
      // uiPrtfResItem.totalReturn = item.pstat.totalReturn;
      // uiPrtfResItem.cAGR = parseFloat(item.pstat.cagr);
      // uiPrtfResItem.maxDD = parseFloat(item.pstat.maxDD);
      // uiPrtfResItem.sharpeRatio = item.pstat.sharpeRatio;
      // uiPrtfResItem.stDev = parseFloat(item.pstat.stDev);
      // // uiPrtfResItem.ulcer = parseFloat(item.pstat.ulcer); // yet to calcualte
      // uiPrtfResItem.tradingDays = parseInt(item.pstat.tradingDays);
      // uiPrtfResItem.nTrades = parseInt(item.pstat.nTrades);
      // uiPrtfResItem.winRate = parseFloat(item.pstat.winRate);
      // uiPrtfResItem.lossRate = parseFloat(item.pstat.lossingRate);
      // uiPrtfResItem.sortino = item.pstat.sortino;
      // uiPrtfResItem.turnover = parseFloat(item.pstat.turnover);
      // uiPrtfResItem.longShortRatio = parseFloat(item.pstat.longShortRatio);
      // uiPrtfResItem.fees = parseFloat(item.pstat.fees);
      // uiPrtfResItem.benchmarkCAGR = parseFloat(item.pstat.benchmarkCAGR); // yet to calcualte
      // uiPrtfResItem.benchmarkMaxDD = parseFloat(item.pstat.benchmarkMaxDD); // yet to calcualte
      // uiPrtfResItem.correlationWithBenchmark = parseFloat(item.pstat.correlationWithBenchmark); // yet to calcualte

      // calculating the minStartDate and maxStartDate
      const firstValDate: Date = new Date(item.chrtData.dates[0] * 1000);
      const lastValDate: Date = new Date(item.chrtData.dates[item.chrtData.dates.length - 1] * 1000);

      if (firstValDate < this._minStartDate)
        this._minStartDate = firstValDate;

      if (lastValDate > this._maxEndDate)
        this._maxEndDate = lastValDate;
      console.log(`minstartDt1: ${this._minStartDate} and maxstartDt1: ${this._maxEndDate}`);

      const chartItem = new CgTimeSeries();
      chartItem.name = item.prtfName;
      chartItem.chartResolution = ChartResolution[item.chrtData.chartResolution];
      chartItem.priceData = [];
      for (let i = 0; i < item.chrtData.dates.length; i++) {
        const chrtItem = new UiChartPoint();
        const mSecSinceUnixEpoch: number = item.chrtData.dates[i] * 1000; // data comes as seconds. JS uses milliseconds since Epoch.
        chrtItem.date = new Date(mSecSinceUnixEpoch);
        chrtItem.value = item.chrtData.values[i];
        chartItem.priceData.push(chrtItem);
      }
      uiPrtfResItem.prtfChrtValues.push(chartItem);
    }

    for (const bmrkItem of chrtGenBacktestRes.bmrkHistories) { // processing benchamrks
      const firstValDateStr: string = bmrkItem.histPrices.dates[0];
      const firstValDate: Date = new Date(firstValDateStr.substring(0, 4) + '-' + firstValDateStr.substring(5, 7) + '-' + firstValDateStr.substring(8, 10));
      const lastValDateStr: String = bmrkItem.histPrices.dates[bmrkItem.histPrices.dates.length - 1];
      const lastValDate: Date = new Date(lastValDateStr.substring(0, 4) + '-' + lastValDateStr.substring(5, 7) + '-' + lastValDateStr.substring(8, 10));

      if (firstValDate < this._minStartDate)
        this._minStartDate = firstValDate;

      if (lastValDate > this._maxEndDate)
        this._maxEndDate = lastValDate;
      console.log(`minstartDt2: ${this._minStartDate} and maxstartDt2: ${this._maxEndDate}`);
      const chartItem = new CgTimeSeries();
      chartItem.name = bmrkItem.sqTicker;
      chartItem.priceData = [];
      for (let i = 0; i < bmrkItem.histPrices.dates.length; i++) {
        const chrtItem = new UiChartPoint();
        const dateStr: string = bmrkItem.histPrices.dates[i];
        chrtItem.date = new Date(dateStr.substring(0, 4) + '-' + dateStr.substring(5, 7) + '-' + dateStr.substring(8, 10));
        chrtItem.value = bmrkItem.histPrices.prices[i];
        chartItem.priceData.push(chrtItem);
      }
      uiPrtfResItem.bmrkChrtValues.push(chartItem);
    }

    for (const item of chrtGenBacktestRes.logs) {
      const logItem = new SqLog();
      logItem.sqLogLevel = item.sqLogLevel;
      logItem.message = item.message;
      uiPrtfResItem.sqLogs.push(logItem);
    }

    uiChrtGenPrtfRunResults.push(uiPrtfResItem);

    const lineChrtDiv = document.getElementById('pfRunResultChrt') as HTMLElement;
    const prtfAndBmrkChrtData: CgTimeSeries[] = uiChrtGenPrtfRunResults[0].prtfChrtValues.concat(uiChrtGenPrtfRunResults[0].bmrkChrtValues);
    const lineChrtTooltip = document.getElementById('tooltipChart') as HTMLElement;

    this.startDate = this._minStartDate;
    this.endDate = this._maxEndDate;
    this.startDateStr = SqNgCommonUtilsTime.Date2PaddedIsoStr(this.startDate);
    this.endDateStr = SqNgCommonUtilsTime.Date2PaddedIsoStr(this.endDate);
    this._ultimateChrt.Init(lineChrtDiv, lineChrtTooltip, prtfAndBmrkChrtData);
    this._sqStatisticsbuilder.Init(prtfAndBmrkChrtData);
    this.onStartOrEndDateChanged(); // will recalculate CAGR and redraw chart
  }

  onStartOrEndDateChanged() {
    // Recalculate the totalReturn and CAGR here
    this.backtestStatsResults = this._sqStatisticsbuilder.statsResults(this.startDate, this.endDate);
    console.log('onStartOrEndDateChanged: this._sqStatisticsbuilder', this.backtestStatsResults.length);
    this._ultimateChrt.Redraw(this.startDate, this.endDate, this.pvChrtWidth, this.pvChrtHeight);
  }

  async onStartBacktests() {
    this.isBacktestReturned = false;
    gChrtGenDiag.backtestRequestStartTime = new Date();
    // Remember to Show Progress bar in 2 seconds from this time.
    setTimeout(() => {
      if (!this.isBacktestReturned) // If the backtest hasn't returned yet (still pending), show Progress bar
        this.showProgressBar();
    }, 2 * 1000);
  }

  onCompleteBacktests(msgObjStr: string) {
    this.isBacktestReturned = true;
    gChrtGenDiag.backtestRequestReturnTime = new Date();
    this.isProgressBarVisble = false; // If progress bar is visible => hide it
    this.processChrtGenBacktestResults(msgObjStr);
  }

  onStartBacktestsClicked() {
    if (this._socket != null && this._socket.readyState === this._socket.OPEN) {
      this.onStartBacktests();
      this._socket.send('RunBacktest:' + '?pids=' + this.prtfIds + '&bmrks=' + this.bmrks); // parameter example can be pids=1,13,6&bmrks=SPY,QQQ&start=20210101&end=20220305
      this.startDate = new Date(this.startDate);
      this.endDate = new Date(this.endDate);
    }
  }

  showProgressBar() {
    const progsBar = document.querySelector('.progressBar') as HTMLElement;
    progsBar.style.animation = ''; // Reset the animation by setting the animation property to an empty string to return to its original state

    this.isProgressBarVisble = true;
    const estimatedDurationInSeconds = gChrtGenDiag.serverBacktestTime / 1000;
    const estimatedDuration = estimatedDurationInSeconds <= 0 ? 4 : estimatedDurationInSeconds; // if estimatedDuration cannot be calculated than, assume 4sec
    console.log('showProgressBar: estimatedDuration', estimatedDuration);
    progsBar.style.animationName = 'progressAnimation';
    progsBar.style.animationDuration = estimatedDuration + 's';
    progsBar.style.animationTimingFunction = 'linear'; // default would be ‘ease’, which is a slow start, then fast, before it ends slowly. We prefer the linear.
    progsBar.style.animationIterationCount = '1'; // only once
    progsBar.style.animationFillMode = 'forwards';
  }

  // "Server backtest time: 300ms, Communication overhead: 120ms, Total UI response: 420ms."
  mouseEnter(div: string) {
    if (div === 'chrtGenDiagnosticsMsg') {
      const totalUiResponseTime = (gChrtGenDiag.backtestRequestReturnTime.getTime() - gChrtGenDiag.backtestRequestStartTime.getTime());
      const communicationOverheadTime = totalUiResponseTime - gChrtGenDiag.serverBacktestTime;
      if (this.isSrvConnectionAlive) {
        this.chrtGenDiagnosticsMsg = `App constructor: ${SqNgCommonUtilsTime.getTimespanStr(gChrtGenDiag.mainTsTime, gChrtGenDiag.mainAngComponentConstructorTime)}\n` +
        `Window loaded: ${SqNgCommonUtilsTime.getTimespanStr(gChrtGenDiag.mainTsTime, gChrtGenDiag.windowOnLoadTime)}\n` +
        '-----\n' +
        `Server backtest time: ${gChrtGenDiag.serverBacktestTime + 'ms' }\n`+
        `Total UI response: ${totalUiResponseTime +'ms'}\n` +
        `Communication Overhead: ${communicationOverheadTime +'ms'}\n`;
      } else
        this.chrtGenDiagnosticsMsg = 'Connection to server is broken.\n Try page reload (F5).';
    }
  }

  onUserChangedHistDateRange(histPeriodSelectionSelected: string) { // selection made form the list ['YTD', '1M', '1Y', '3Y', '5Y', 'ALL']
    this.histRangeSelected = histPeriodSelectionSelected;
    const currDateET: Date = new Date(); // gets today's date
    if (this.histRangeSelected === 'YTD')
      this.startDate = new Date(SqNgCommonUtilsTime.Date2PaddedIsoStr(new Date(currDateET.getFullYear() - 1, 11, 31)));
    else if (this.histRangeSelected.toLowerCase().endsWith('y')) {
      const lbYears = parseInt(this.histRangeSelected.substr(0, this.histRangeSelected.length - 1), 10);
      this.startDate = new Date(SqNgCommonUtilsTime.Date2PaddedIsoStr(new Date(currDateET.setFullYear(currDateET.getFullYear() - lbYears))));
    } else if (this.histRangeSelected.toLowerCase().endsWith('m')) {
      const lbMonths = parseInt(this.histRangeSelected.substr(0, this.histRangeSelected.length - 1), 10);
      this.startDate = new Date(SqNgCommonUtilsTime.Date2PaddedIsoStr(new Date(currDateET.setMonth(currDateET.getMonth() - lbMonths))));
    } else if (this.histRangeSelected === 'ALL')
      this.startDate = this._minStartDate;
    this.startDateStr = SqNgCommonUtilsTime.Date2PaddedIsoStr(this.startDate);
    this.endDateStr = SqNgCommonUtilsTime.Date2PaddedIsoStr(this._maxEndDate); // Interestingly, when we change this which is bind to the date input html element, then the onChangeStartOrEndDate() is not called.
    this.endDate = this._maxEndDate;
    this.onStartOrEndDateChanged();
  }

  onUserChangedStartOrEndDateWidgets() { // User entry in the input field
    this.startDate = new Date(this.startDateStr);
    this.endDate = new Date(this.endDateStr);
    this.onStartOrEndDateChanged();
  }
}