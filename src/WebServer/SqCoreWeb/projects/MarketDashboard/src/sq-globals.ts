// How to cath the earlies execution possibilities?
// 2020-07-02T15:53:12.007Z: main.ts                        // earliest things to catch execution. Before even Angular starts. Put some global diagnostic here. So, we can monitor how many ms Angular takes.
// 2020-07-02T15:53:12.024Z: app.component.ts/construct     // 17ms after previous.
// 2020-07-02T15:53:12.045Z: app.component.ts/ngOnInit()    // 21ms after previous. Angular mechanism takes about 30ms, this is near the end of Angular pipeline. Before that Angular is not ready, therefore we cannot execute anything meaningful which is specific to this Angular component.
// 2020-07-02T15:53:12.063Z: dOMContentLoadedReady()        // 18ms after previous. After Angular pipeline finished initializing all components,then DOMready is triggered.
// 2020-07-02T15:53:12.380Z: windowOnLoad()                 // 220ms after previous (images should be downloaded with Disabled Cache)
// 2020-07-02T15:53:12.880Z: wsConnectionStartTime()        // = ngOnInit() time
// 2020-07-02T15:53:12.880Z: wsConnectionReadyTime()        // 380ms after wsConnectionStartTime()
// 2020-07-02T15:53:12.880Z: wsOnConnectedMsgArrivedTime()  // 400ms after wsConnectionReadyTime()


// ***************** 2020-07-02: Benchmark times in Developer environment. All times are compared to base inception. Hot load, when server has RT data.
// 2020-07-02: Development. All times are compared to base inception. Cold load, when server has no RT data. (then it takes extra 500-600ms to for RT data to arrive)
// App constructor: 17ms
// Websocket connection start in OnInit: 39ms
// Websocket connection ready: 480ms
// Websocket Email arrived: 920ms
// Websocket First NonRtStat: 972ms
// Websocket First RtStat: 1469ms

// 2020-07-02: Development. All times are compared to base inception. Hot load, when server has RT data.
// App constructor: 17ms
// Websocket connection start in OnInit: 40ms
// Websocket connection ready: 422ms
// Websocket Email arrived: 842ms
// Websocket First NonRtStat: 856ms
// Websocket First RtStat: 872ms


// ***************** 2020-07-02: Benchmark times in Production (Linux server). Accessing from London.
// Release. On Server. Cold start:
// App constructor: 17ms
// Websocket connection start in OnInit: 30ms
// Websocket connection ready: 318ms
// Websocket Email arrived: 823ms
// Websocket First NonRtStat: 839ms
// Websocket First RtStat: 1382ms // 550ms after NonRtStat, because the server needs that time to download RT data.

// //Release. On Server. Hot start: Fast example. Best run time.
// App constructor: 3ms // this was one of the best time. only 190ms for websocket connection ready. It depends on how busy the server with IB TWS.
// Websocket connection start in OnInit: 11ms
// Websocket connection ready: 190ms
// Websocket Email arrived: 451ms
// Websocket First NonRtStat: 452ms
// Websocket First RtStat: 456ms

// //Release. On Server. Hot start: // a typical run
// App constructor: 5ms
// Websocket connection start in OnInit: 15ms
// Websocket connection ready: 366ms
// Websocket Email arrived: 782ms
// Websocket First NonRtStat: 783ms
// Websocket First RtStat: 795ms

// //Release. On Server. Hot start: // slow sometimes
// App constructor: 12ms // this was one of the worst time. 740ms for websocket connection ready. After not using it for 10min, the SqCoreWeb.dll drops out of the server CPU cache, and a bit sleeping.
// Websocket connection start in OnInit: 41ms
// Websocket connection ready: 739ms
// Websocket Email arrived: 1145ms
// Websocket First NonRtStat: 1145ms
// Websocket First RtStat: 1158ms


// ***************** 2020-07-02: Benchmark times in Production (Linux server). Accessing from the Bahamas.
// DC from Bahamas:  (Maybe it was a cold start, maybe warm start)
// App constructor: 33ms
// Websocket connection start in OnInit: 68ms
// Websocket connection ready: 1366ms
// Websocket Email arrived: 1858ms
// Websocket First NonRtStat: 1859ms
// Websocket First RtStat: -864159....ms (wrong somehow, maybe it was MinTime). When the tooltip was created RT was not called yet.

import { minDate } from './../../sq-ng-common/src/lib/sq-ng-common.utils_time';

type BrAccVwSnapshotReceiveReason = 'Unknown' | 'NavSelectChange' | 'RefreshSnapshot';

export class SqDiagnostics {
  public mainTsTime: Date = new Date();
  public mainAngComponentConstructorTime: Date = minDate;
  public mainAngComponentOnInitTime: Date = minDate;
  public dOMContentLoadedTime: Date = minDate;
  public windowOnLoadTime: Date = minDate;

  public wsConnectionStartTime: Date = minDate;
  public wsConnectionReadyTime: Date = minDate;
  public wsOnConnectedMsgArrivedTime: Date = minDate;

  public wsOnFirstRtMktSumNonRtStatTime: Date = minDate;
  public wsOnLastRtMktSumNonRtStatTime: Date = minDate;
  public wsOnFirstRtMktSumRtStatTime: Date = minDate;
  public wsOnLastRtMktSumRtStatTime: Date = minDate;
  public wsNumRtMktSumRtStat = 0;
  public wsOnLastRtMktSumLookbackChgStart: Date = minDate;

  public wsBrAccVwOnFirstMktBrLstCls: Date = minDate;

  public wsBrAccVwOnLastSnapshot: Date = minDate;
  public wsBrAccVwSnapshotReceiveReason: BrAccVwSnapshotReceiveReason = 'Unknown';
  public wsBrAccVwOnLastNavSelectChangeStart: Date = minDate;
  public wsBrAccVwOnLastNavSelectChangeEnd: Date = minDate;
  public wsBrAccVwOnLastRefreshSnapshotStart: Date = minDate;
  public wsBrAccVwOnLastRefreshSnapshotEnd: Date = minDate;
}

export const gDiag: SqDiagnostics = new SqDiagnostics();

export class AssetLastJs {
  public assetId = NaN;
  public lastUtc = ''; // preferred to be a new Date(), but when it arrives from server it is a string '2010-09-29T00:00:00'.
  public last = NaN;
}

// ************************************************ //
// Classes used for developing charts, stats and positions of PortfolioRunResults
// The below classes are used in PortfolioManager and ChartGenerator Apps

export enum ChartResolution
{
    Second, Minute, Minute5, Hour, Daily, Weekly, Monthly
}

export interface ChartJs { // PfRunResults Chart Data
  dates: number[];
  values: number[];
}

export class ChrtGenBacktestResult {
  public pfRunResults!: ChrtGenPfRunResult[];
  public bmrkHistories!: any[];
  public logs!: any[];
  public serverBacktestTimeMs!: number;
}

export class ChrtGenPfRunResult {
  public pstat: any; // all the Stat members from UiPrtfRunResult, we skip creating detailed sub classes
  public chart!: ChartJs;
  public chartResolution!: ChartResolution;
  public prtfName!: string;
}

export class PrtfRunResultJs extends ChrtGenPfRunResult { // we can specify the input types more, but whatever.
  public prtfPoss: any; // all the position members from UiPrtfPositions, we skip creating detailed sub classes
}


// Ui classes
export class UiChrtGenPrtfRunResult {
  public startPortfolioValue: number = 0;
  public endPortfolioValue: number = 0;
  public totalReturn: number = 0;
  public cAGR: number = 0;
  public maxDD: number = 0;
  public sharpeRatio: number = 0;
  public stDev: number = 0;
  public ulcer: number = 0;
  public tradingDays: number = 0;
  public nTrades: number = 0;
  public winRate: number = 0;
  public lossRate: number = 0;
  public sortino: number = 0;
  public turnover: number = 0;
  public longShortRatio: number = 0;
  public fees: number = 0;
  public benchmarkCAGR: number = 0;
  public benchmarkMaxDD: number = 0;
  public correlationWithBenchmark: number = 0;
  public chrtValues: UiChartPointValues[] = []; // used in PrtfRunResults in portfolioManager app

  public prtfChrtValues: UiChrtGenValues[] = []; // used in backtestResults in chrtGen app
  public bmrkChrtValues: UiChrtGenValues[] = []; // used in backtestResults in chrtGen app
  public chrtResolution: ChartResolution = ChartResolution.Daily;
}

export class UiPrtfRunResult extends UiChrtGenPrtfRunResult { // PrtfRun Results requires position values to display
  public prtfPosValues: UiPrtfPositions[] = [];
}

// chart values
export class UiChartPointValues {
  public dates = new Date();
  public values = NaN;
}

export class UiChrtGenValues extends UiChartPointValues {
  public name: string = '';
}

export class UiPrtfPositions {
  public sqTicker: string = '';
  public quantity: number = 0;
  public avgPrice: number = 0;
  public price: number = 0;
  public holdingCost: number = 0;
  public holdingValue: number = 0;
}
// ************************************************ //