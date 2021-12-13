import { Component, Input, OnInit } from '@angular/core';
import { gDiag, AssetLastJs } from './../../sq-globals';
import { SqNgCommonUtilsStr } from './../../../../sq-ng-common/src/lib/sq-ng-common.utils_str';
import { SqNgCommonUtilsTime, minDate } from './../../../../sq-ng-common/src/lib/sq-ng-common.utils_time';   // direct reference, instead of via 'public-api.ts' as an Angular library. No need for 'ng build sq-ng-common'. see https://angular.io/guide/creating-libraries
import * as d3 from 'd3';

type Nullable<T> = T | null;

// Input data classes
class BrAccVwrHandShk {
  marketBarAssets: Nullable<AssetJs[]> = null;
  selectableNavAssets: Nullable<AssetJs[]> = null;
}

class AssetJs {
  public assetId = NaN;
  public sqTicker = '';
  public symbol = '';
  public name = '';
}

class BrAccSnapshotJs {
  public assetId = NaN;
  public symbol = '';
  public lastUpdate = '';
  public netLiquidation = NaN;
  public priorCloseNetLiquidation = NaN;
  public grossPositionValue = NaN;
  public totalCashValue = NaN;
  public initMarginReq = NaN;
  public maintMarginReq = NaN;
  public poss: Nullable<BrAccSnapshotPosJs[]> = null;
  public clientMsg = '';
}

class BrAccSnapshotPosJs {
  public assetId = NaN;
  public sqTicker = '';
  public symbol = '';
  public symbolEx = '';
  public name = '';
  public pos = NaN;
  public avgCost = NaN;
  public priorClose = NaN;
  public estPrice = NaN;
  public estUndPrice = NaN;
  public ibCompDelta = NaN;
  public delivValue = NaN;
  public dltAdjDelivVal = NaN;
  public accId = '';
}

class HistJs {
  public histStat: Nullable<BrAccHistStatJs> = null;
  public histValues: Nullable<BrAccHistValuesJs> = null;
}

class BrAccHistStatJs {
  public assetId = NaN;
  public sqTicker = '';
  public periodStartDate = '';
  public periodEndDate = '';
  public periodStart = NaN;
  public periodEnd = NaN;
  public periodHigh = NaN;
  public periodLow = NaN;
  public periodMaxDD = NaN;
  public periodMaxDU = NaN;
}

class BrAccHistValuesJs {
  public assetId = NaN;
  public sqTicker = '';
  public periodStartDate = '';
  public periodEndDate = '';
  public histDates = [];
  public histSdaCloses = [];
}

class AssetPriorCloseJs {
  public assetId = NaN;
  public date = ''; // preferred to be a new Date(), but when it arrives from server it is a string '2010-09-29T00:00:00' which is ET time zone and better to keep that way than converting to local time-zone Date object
  public priorClose = NaN;
}

// UI classes
class UiMktBar {
  public lstValLastRefreshTimeLoc = new Date();
  public lstValLastRefreshTimeStr = '';
  public poss: UiMktBarItem[] = [];
}

class UiMktBarItem {
  public assetId = NaN;
  public sqTicker = '';
  public symbol = '';
  public name = '';
  public priorClose = NaN;
  public pctChg = 0.01;
}

class UiSnapTable {
  public navAssetId = NaN;
  public navSymbol = '';
  public snapLastUpateTimeLoc = new Date();
  public snapLastUpdateTimeAgoStr = '';
  public navLastUpdateTimeLoc = new Date();
  public navLastUpdateTimeAgoStr = '';
  public netLiquidation = NaN;
  public priorCloseNetLiquidation = NaN;
  public grossPositionValue = NaN;
  public totalCashValue = NaN;
  public initialMarginReq = NaN;
  public maintMarginReq = NaN;
  public sumPlTodVal = 0;
  public sumPlTodPct = 0;
  public longStockValue = 0;
  public shortStockValue = 0;
  public totalMaxRiskedN = 0;
  public totalMaxRiskedLeverage = 0;
  public plTodPrNav = NaN;
  public pctChgTodPrNav = NaN;
  public numOfPoss = 0;
  public poss: UiAssetSnapPossPos[] = [];
  public clientMsg = '';
  public stockChartVals: UiChrtval[] = [];
}

class UiAssetSnapPossPos {
  public assetId = NaN;
  public sqTicker = '';
  public symbol = '';
  public symbolEx = '';
  public name = '';
  public pos = NaN;
  public avgCost = NaN;
  public priorClose = NaN;
  public estPrice = NaN;
  public pctChgTod = NaN;
  public plTod = NaN;
  public pl = NaN;
  public mktVal = NaN;
  public estUndPrice = NaN;
  public ibCompDelta = NaN;
  public delivValue = NaN;
  public dltAdjDelivVal = NaN;
  public gBeta = 1; // guessed Beta
  public betaDltAdj = 1;
  public accIdStr = '';
}

// Hist stat Values
class UiHistData {
  public assetId = NaN;
  public sqTicker ='';
  public periodStartDate = '';
  public periodEndDate = '';
  public periodStart = NaN;
  public periodEnd = NaN;
  public periodHigh = NaN;
  public periodLow = NaN;
  public periodMaxDD = NaN;
  public periodMaxDU = NaN;
  // calculated fields as numbers
  public periodReturn = NaN; // for period: from startDate to endDate
  public periodMaxDrawDown = NaN; // for period: from startDate to endDate
  public return = NaN;  // Total return (from startDate to endDate to last realtime): adding period-return and realtime-return together. Every other performance number (cagr, maxDD) is also Total.
  public cagr = NaN;
  public drawDown = NaN;
  public drawUp = NaN;
  public maxDrawDown = NaN;
  public maxDrawUp = NaN;
  public navChrtVals: UiChrtval[] = [];
}

// Hist chart values
class UiChrtval {
  public date = new Date('2021-01-01');
  public sdaClose = NaN;
}

@Component({
  selector: 'app-bracc-viewer',
  templateUrl: './bracc-viewer.component.html',
  styleUrls: ['./bracc-viewer.component.scss'],
})
export class BrAccViewerComponent implements OnInit {
  @Input() _parentWsConnection?: WebSocket = undefined;    // this property will be input from above parent container

  // Guessed Beta for HL hedges and companies.MarketWatch Beta calculation is quite good. Use that If it is available.  There, Beta of QQQ: 1.18, that is the base.  
  static betaArr: { [id: string] : number; } = 
    {'QQQ': 1.18/1.18, 'TQQQ': 3.0, 'SQQQ': -3.0, 'SPY': 1/1.18, 'SPXL': 3*1/1.18, 'UPRO': 3*1/1.18, 'SPXS': -3*1/1.18, 'SPXU': -3*1/1.18, 'TWM': -2.07/1.18,            // market ETFs
    'VXX': -3.4/1.18,  'VXZ': -1.82/1.18,  'SVXY': 1.7/1.18, 'ZIV': 1.81/1.18,                  // VIX
    'TLT': -0.50/1.18, // https://www.ishares.com/us/products/239454/ishares-20-year-treasury-bond-etf says -0.25, MarketWatch: -0.31, discretionary override from -0.31 to -0.50 (TMF too)
    'TMF': 3*-0.50/1.18, 'TMV': -1*3*-0.50/1.18,  'TIP': -0.06/1.18, 
    'USO': 0.83/1.18, 'SCO': -2.0*0.83/1.18, 'UCO': 1.25/1.18, 
    'UNG': 0.23/1.18,   // discretionary override from 0.03 to 0.23 (UGAZ too)
    'UGAZ': 3*0.23/1.18,     
    'GLD': (-0.24*1.18)/1.18,  // GLD has no Beta on MarketWatch. YF (5Years, monthly): 0.04. But DC's discretionary (logical) override: -0.24 
    'TAIL': -1/1.18,    // compared TAIL vs. SPY and it moves about the same beta, just opposite
    'UUP': (-0.31)/1.18,    // YF Beta calculation; when market panics, the whole world wants to buy safe USA treasuries, therefore USD goes up => negative correlation.
    // companies
    'PM': 0.62/1.18 ,
    };     // it is QQQ Beta, not SPY beta

  handshakeStrFormatted = '[Nothing arrived yet]';
  handshakeObj: Nullable<BrAccVwrHandShk> = null;
  mktBrLstClsStrFormatted = '[Nothing arrived yet]';
  mktBrLstClsObj: Nullable<AssetPriorCloseJs[]> = null;
  histStrFormatted = '[Nothing arrived yet]';
  histObj: Nullable<HistJs[]> = null;
  stockHistDataFormatted = '[Nothing arrived yet]'; // temporary variable to be deleted
  brAccountSnapshotStrFormatted = '[Nothing arrived yet]';
  brAccountSnapshotObj: Nullable<BrAccSnapshotJs> = null;
  lstValObj: Nullable<AssetLastJs[]> = null;  // realtime or last values
  lstValLastUiRefreshTimeLoc = new Date(); // This is not the time of the Rt data, but the time when last refresh was sent from server to UI.
  navSelection: string[] = [];
  navSelectionSelected = '';
  uiMktBar: UiMktBar = new UiMktBar();
  uiSnapTable: UiSnapTable = new UiSnapTable();
  uiHistData: UiHistData[] = [];

  tabPageVisibleIdx = 1;
  sortColumn: string = 'DailyPL';
  sortDirection: string = 'Increase';
  histPeriodSelection = ['YTD', '1M', '1Y', '3Y', '5Y', 'Date'];
  histPeriodSelectionSelected = 'YTD';
  bnchmkTickerSelection = ['SPY', 'QQQ', 'TLT', 'VXX', 'SVXY', 'UNG', 'USO'];
  bnchmkTickerSelectionSelected : string = 'SPY';
  histPeriodStartET: Date; // set in ctor. We need this in JS client to check that the received data is long enough or not (Expected Date)
  histPeriodStartETstr: string; // set in ctor; We need this for sending String instruction to Server. Anyway, a  HTML <input date> is always a 	A DOMString representing a date in YYYY-MM-DD format, or empty. https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/date
  histPeriodEndET: Date;
  histPeriodEndETstr: string;
  chrtTickerSelected: string = 'SPY';
  
  constructor() {

    const todayET = SqNgCommonUtilsTime.ConvertDateLocToEt(new Date());
    todayET.setHours(0, 0, 0, 0); // get rid of the hours, minutes, seconds and milliseconds

    this.histPeriodStartET = new Date(todayET.getFullYear() - 1, 11, 31);  // set YTD as default
    this.histPeriodStartETstr = SqNgCommonUtilsTime.Date2PaddedIsoStr(this.histPeriodStartET);

    // https://stackoverflow.com/questions/563406/add-days-to-javascript-date
    const yesterDayET = new Date(todayET);
    yesterDayET.setDate(yesterDayET.getDate() - 1);
    this.histPeriodEndET = new Date(yesterDayET.getFullYear(), yesterDayET.getMonth(), yesterDayET.getDate());  // set yesterdayET as default
    this.histPeriodEndETstr = SqNgCommonUtilsTime.Date2PaddedIsoStr(this.histPeriodEndET);

    setInterval(() => { this.snapshotRefresh(); }, 60 * 60 * 1000); // forced Snapshot table refresh timer in every 60 mins
    setInterval(() => { this.uiMktBar.lstValLastRefreshTimeStr = SqNgCommonUtilsTime.ConvertMilliSecToTimeStr(Date.now() - this.uiMktBar.lstValLastRefreshTimeLoc.getTime());
                        this.uiSnapTable.navLastUpdateTimeAgoStr = SqNgCommonUtilsTime.ConvertMilliSecToTimeStr(Date.now() - this.uiSnapTable.navLastUpdateTimeLoc.getTime());
                        this.uiSnapTable.snapLastUpdateTimeAgoStr = SqNgCommonUtilsTime.ConvertMilliSecToTimeStr(Date.now() - this.uiSnapTable.snapLastUpateTimeLoc.getTime());
                        this.uiSnapTable.plTodPrNav = Math.round(this.uiSnapTable.netLiquidation - this.uiSnapTable.priorCloseNetLiquidation);
                        this.uiSnapTable.pctChgTodPrNav = (this.uiSnapTable.netLiquidation - this.uiSnapTable.priorCloseNetLiquidation) / this.uiSnapTable.priorCloseNetLiquidation;
                      }, 1000);
    setInterval(() => {
      if (this._parentWsConnection != null && this._parentWsConnection.readyState === WebSocket.OPEN)
        this._parentWsConnection.send('BrAccViewer.RefreshMktBrPriorCloses:' + this.uiMktBar);
      }, 120 * 60 * 1000);
   }
     
  ngOnInit(): void {
  }

  public webSocketOnMessage(msgCode: string, msgObjStr: string): boolean {
    switch (msgCode) {
      case 'BrAccViewer.BrAccSnapshot': // this is the most frequent message after LstVal (realtime price). Should come first.
        gDiag.wsOnLastBrAccVwSnapshot = new Date();
        console.log('BrAccViewer.BrAccSnapshot:' + msgObjStr);
        this.brAccountSnapshotStrFormatted = SqNgCommonUtilsStr.splitStrToMulLines(msgObjStr);
        this.brAccountSnapshotObj = JSON.parse(msgObjStr);
        BrAccViewerComponent.updateSnapshotTable(this.brAccountSnapshotObj, this.sortColumn, this.sortDirection, this.uiSnapTable);
        return true;
      case 'BrAccViewer.Hist':
        console.log('BrAccViewer.Hist:' + msgObjStr);
        this.histStrFormatted = SqNgCommonUtilsStr.splitStrToMulLines(msgObjStr);
        this.histObj = JSON.parse(msgObjStr);
        BrAccViewerComponent.updateUiWithHist(this.histObj, this.uiHistData);
        return true;
      case 'BrAccViewer.MktBrLstCls':
        if (gDiag.wsOnFirstBrAccVwMktBrLstCls === minDate)
          gDiag.wsOnFirstBrAccVwMktBrLstCls = new Date();
        console.log('BrAccViewer.MktBrLstCls:' + msgObjStr);
        this.mktBrLstClsStrFormatted = SqNgCommonUtilsStr.splitStrToMulLines(msgObjStr);
        this.mktBrLstClsObj = JSON.parse(msgObjStr);
        BrAccViewerComponent.updateMktBarUi(this.handshakeObj, this.mktBrLstClsObj, this.lstValObj, this.lstValLastUiRefreshTimeLoc, this.uiMktBar);
        return true;
      case 'BrAccViewer.Handshake':  // this is the least frequent message. Should come last.
        console.log('BrAccViewer.Handshake:' + msgObjStr);
        this.handshakeStrFormatted = SqNgCommonUtilsStr.splitStrToMulLines(msgObjStr);
        this.handshakeObj = JSON.parse(msgObjStr);
        console.log(`BrAccViewer.Handshake.SelectableBrAccs: '${(this.handshakeObj == null) ? null : this.handshakeObj.selectableNavAssets}'`);
        this.updateUiSelectableNavs((this.handshakeObj == null) ? null : this.handshakeObj.selectableNavAssets);
        return true;
      case 'BrAccViewer.SelectedStockTickerHist':
        console.log('BrAccViewer.SelectedStockTickerHist:' + msgObjStr)
        this.stockHistDataFormatted = SqNgCommonUtilsStr.splitStrToMulLines(msgObjStr);
        this.histObj = JSON.parse(msgObjStr);
        // BrAccViewerComponent.updateStockHistData(this.histObj, this.uiSnapTable)
        return true;
      default:
        return false;
    }
  }

  public webSocketLstValArrived(p_lstValObj: Nullable<AssetLastJs[]>) { // real time price data
    this.lstValLastUiRefreshTimeLoc = new Date();
    this.lstValObj = p_lstValObj;
    BrAccViewerComponent.updateMktBarUi(this.handshakeObj, this.mktBrLstClsObj, this.lstValObj, this.lstValLastUiRefreshTimeLoc,this.uiMktBar);
    BrAccViewerComponent.updateSnapshotTableWithRtNav(this.lstValObj, this.uiSnapTable);
  }

  updateUiSelectableNavs(pSelectableNavAssets: Nullable<AssetJs[]>) {  // same in MktHlth and BrAccViewer
    if(pSelectableNavAssets == null)
      return;
    this.navSelectionSelected = '';
    for (const nav of pSelectableNavAssets) {
      if (this.navSelectionSelected == '') // by default, the selected Nav is the first from the list
        this.navSelectionSelected = nav.symbol;
      this.navSelection.push(nav.symbol)
    }
  }

  static updateMktBarUi(handshakeObj: Nullable<BrAccVwrHandShk>, priorCloses: Nullable<AssetPriorCloseJs[]>, lastRt: Nullable<AssetLastJs[]>, lstValLastUiRefreshTime: Date, uiMktBar: UiMktBar) {
    let marketBarAssets: Nullable<AssetJs[]> = (handshakeObj == null) ? null : handshakeObj.marketBarAssets;
    // check if both array exist; instead of the old-school way, do ES5+ way: https://stackoverflow.com/questions/11743392/check-if-an-array-is-empty-or-exists
    if (!(Array.isArray(marketBarAssets) && marketBarAssets.length > 0 && Array.isArray(priorCloses) && priorCloses.length > 0  && Array.isArray(lastRt) && lastRt.length > 0))
      return;
    uiMktBar.lstValLastRefreshTimeLoc = lstValLastUiRefreshTime;
    uiMktBar.lstValLastRefreshTimeStr = SqNgCommonUtilsTime.ConvertMilliSecToTimeStr(Date.now() - uiMktBar.lstValLastRefreshTimeLoc.getTime());
    for (const item of marketBarAssets) {
      let uiItem = new UiMktBarItem();
      const existingUiCols = uiMktBar.poss.filter((r) => r.sqTicker === item.sqTicker);
      if (existingUiCols.length === 0) {
        uiItem.assetId = item.assetId;
        uiItem.sqTicker = item.sqTicker;
        uiItem.symbol = item.symbol;
        uiItem.name = item.name;
        uiMktBar.poss.push(uiItem);
      } else if (existingUiCols.length >= 2)
        console.warn(`Received ticker '${item.sqTicker}' has duplicates in UiArray. This might be legit if both VOD.L and VOD wants to be used. ToDo: Differentiation based on assetId is needed.`,'background: #222; color: red');
    }
    for (const nonRt of priorCloses) {
      const existingUiCols = uiMktBar.poss.filter((r) => r.assetId === nonRt.assetId);
      if (existingUiCols.length === 0) {
        console.warn(`Received assetId '${nonRt.assetId}' is not found in UiArray.`);
        break;
      }
      const uiItem = existingUiCols[0];
      uiItem.priorClose = nonRt.priorClose;
    }
    for (const rtItem of lastRt) {
      const existingUiItems = uiMktBar.poss.filter((r) => r.assetId === rtItem.assetId);
      if (existingUiItems.length === 0)
        continue;
      const uiItem = existingUiItems[0];
      uiItem.pctChg = (rtItem.last - uiItem.priorClose) / uiItem.priorClose;
    }  
}

  static updateSnapshotTable(brAccSnap: Nullable<BrAccSnapshotJs>, sortColumn: string, sortDirection: string, uiSnapTable: UiSnapTable) {
    if (brAccSnap === null || brAccSnap.poss === null)
      return;
    uiSnapTable.navAssetId = brAccSnap.assetId;
    uiSnapTable.navSymbol = brAccSnap.symbol;
    uiSnapTable.snapLastUpateTimeLoc = new Date(brAccSnap.lastUpdate);
    uiSnapTable.snapLastUpdateTimeAgoStr = SqNgCommonUtilsTime.ConvertMilliSecToTimeStr(Date.now() - (new Date (brAccSnap.lastUpdate)).getTime());
    uiSnapTable.navLastUpdateTimeLoc = new Date(brAccSnap.lastUpdate);
    uiSnapTable.navLastUpdateTimeAgoStr = SqNgCommonUtilsTime.ConvertMilliSecToTimeStr(Date.now() - (new Date (brAccSnap.lastUpdate)).getTime());
    uiSnapTable.totalCashValue = brAccSnap.totalCashValue;
    uiSnapTable.initialMarginReq = brAccSnap.initMarginReq;
    uiSnapTable.maintMarginReq = brAccSnap.maintMarginReq;
    uiSnapTable.grossPositionValue = brAccSnap.grossPositionValue;
    uiSnapTable.netLiquidation = brAccSnap.netLiquidation;
    uiSnapTable.priorCloseNetLiquidation = brAccSnap.priorCloseNetLiquidation;
    uiSnapTable.plTodPrNav = Math.round(brAccSnap.netLiquidation - brAccSnap.priorCloseNetLiquidation);
    uiSnapTable.pctChgTodPrNav = (brAccSnap.netLiquidation - brAccSnap.priorCloseNetLiquidation) / brAccSnap.priorCloseNetLiquidation;
    uiSnapTable.clientMsg = brAccSnap.clientMsg.replace(';','\n');
    uiSnapTable.poss.length = 0;

    for (const possItem of brAccSnap.poss) {
      let uiPosItem = new UiAssetSnapPossPos();
      uiPosItem.assetId = possItem.assetId;
      uiPosItem.sqTicker = possItem.sqTicker;
      uiPosItem.symbol = possItem.symbol;
      uiPosItem.symbolEx = possItem.symbolEx;
      uiPosItem.name = possItem.name;
      // BrAccViewerComponent.betaArr 
      uiPosItem.gBeta = (uiPosItem.symbol in BrAccViewerComponent.betaArr ) ? BrAccViewerComponent.betaArr [uiPosItem.symbol] : 1.0;
      uiPosItem.pos = possItem.pos;
      uiPosItem.avgCost = possItem.avgCost;
      uiPosItem.priorClose = possItem.priorClose;
      uiPosItem.estPrice = possItem.estPrice;
      uiPosItem.estUndPrice = possItem.estUndPrice;
      uiPosItem.ibCompDelta = possItem.ibCompDelta;
      if (possItem.sqTicker.startsWith('O') && !isNaN(possItem.ibCompDelta) && possItem.ibCompDelta != 0.0) {
        var optCallPutMulN = 1;
        if (possItem.name.includes('Call')) {
          var optCallPutMulN = -1;
          uiPosItem.delivValue = Math.round(possItem.pos * optCallPutMulN * 100 * Number(possItem.ibCompDelta));
          uiPosItem.dltAdjDelivVal = Math.round(uiPosItem.ibCompDelta * uiPosItem.delivValue);
        }
        uiPosItem.delivValue = Math.round(possItem.pos * optCallPutMulN * 100 * Number(possItem.ibCompDelta));
        uiPosItem.dltAdjDelivVal = Math.round(uiPosItem.ibCompDelta * uiPosItem.delivValue);
      }
      uiPosItem.accIdStr = possItem.accId;
      uiPosItem.mktVal = Math.round(possItem.pos * possItem.estPrice);
      uiPosItem.pctChgTod = (possItem.estPrice - possItem.priorClose) / possItem.priorClose;
      uiPosItem.plTod = Math.round(possItem.pos * (possItem.estPrice - possItem.priorClose));
      uiPosItem.pl = Math.round(possItem.pos * (possItem.estPrice - possItem.avgCost))
      uiPosItem.betaDltAdj = Math.round(uiPosItem.gBeta * uiPosItem.mktVal)
      uiSnapTable.poss.push(uiPosItem);
    }
    uiSnapTable.sumPlTodVal = 0;
    uiSnapTable.longStockValue = 0;
    uiSnapTable.shortStockValue = 0;
    uiSnapTable.totalMaxRiskedN = 0;
    for (const item of uiSnapTable.poss) {
      uiSnapTable.sumPlTodVal += item.plTod;
      if (item.mktVal > 0) { //Long and Short stock values
        uiSnapTable.longStockValue += item.mktVal;
      } else if (item.mktVal < 0) {
        uiSnapTable.shortStockValue += item.mktVal;
      }
      uiSnapTable.totalMaxRiskedN += Math.abs(item.mktVal);
    } 
    uiSnapTable.sumPlTodPct = uiSnapTable.sumPlTodVal / uiSnapTable.priorCloseNetLiquidation; // profit & Loss total percent change
    uiSnapTable.totalMaxRiskedLeverage = (uiSnapTable.totalMaxRiskedN / uiSnapTable.netLiquidation);
    uiSnapTable.numOfPoss = uiSnapTable.poss.length;

    // sort by sortColumn
    uiSnapTable.poss.sort((n1: UiAssetSnapPossPos, n2: UiAssetSnapPossPos) => {
      let dirMultiplier = (sortDirection === 'Increasing') ? 1 : -1;
      switch (sortColumn) {
        case 'Symbol':
          if (n1.symbol < n2.symbol) return 1 * dirMultiplier;
          else if (n1.symbol > n2.symbol) return -1 * dirMultiplier;
          break;
        case 'SymbolEx':
          if (n1.symbolEx < n2.symbolEx) return 1 * dirMultiplier;
          else if (n1.symbolEx > n2.symbolEx) return -1 * dirMultiplier;
          break;
        case 'Pos':
          if (n1.pos < n2.pos) return 1 * dirMultiplier;
          if (n1.pos > n2.pos) return -1 * dirMultiplier;
          break;
        case 'Cost':
          if (n1.avgCost < n2.avgCost) return 1 * dirMultiplier;
          if (n1.avgCost > n2.avgCost) return -1 * dirMultiplier;
          break;
        case 'PriorClose':
          if (n1.priorClose < n2.priorClose) return 1 * dirMultiplier;
          if (n1.priorClose > n2.priorClose) return -1 * dirMultiplier;
          break;
        case 'EstPrice':
          if (n1.estPrice < n2.estPrice) return 1 * dirMultiplier;
          if (n1.estPrice > n2.estPrice) return -1 * dirMultiplier;
          break;
        case 'DailyPctChg':
          if (n1.pctChgTod < n2.pctChgTod) return 1 * dirMultiplier;
          if (n1.pctChgTod > n2.pctChgTod) return -1 * dirMultiplier;
          break;
        case 'DailyPL':
          if (n1.plTod < n2.plTod) return 1 * dirMultiplier;
          if (n1.plTod > n2.plTod) return -1 * dirMultiplier;
          break;
        case 'ProfLos':
          if (n1.pl < n2.pl) return 1 * dirMultiplier;
          if (n1.pl > n2.pl) return -1 * dirMultiplier;
          break;
        case 'MktVal':
          if (n1.mktVal < n2.mktVal) return 1 * dirMultiplier;
          if (n1.mktVal > n2.mktVal) return -1 * dirMultiplier;
          break;
        case 'EstUndPrice':
          if (n1.estUndPrice < n2.estUndPrice) return 1 * dirMultiplier;
          if (n1.estUndPrice > n2.estUndPrice) return -1 * dirMultiplier;
          break;
        case 'DelivValue':
          if (n1.delivValue < n2.delivValue) return 1 * dirMultiplier;
          if (n1.delivValue > n2.delivValue) return -1 * dirMultiplier;
          break;
        case 'IbCompDelta':
          if (n1.ibCompDelta < n2.ibCompDelta) return 1 * dirMultiplier;
          if (n1.ibCompDelta > n2.ibCompDelta) return -1 * dirMultiplier;
          break;
        case 'DltAdjDelivVal':
          if (n1.dltAdjDelivVal < n2.dltAdjDelivVal) return 1 * dirMultiplier;
          if (n1.dltAdjDelivVal > n2.dltAdjDelivVal) return -1 * dirMultiplier;
          break;
        case 'gBeta':
          if (n1.gBeta < n2.gBeta) return 1 * dirMultiplier;
          if (n1.gBeta > n2.gBeta) return -1 * dirMultiplier;
          break;
        case 'gBetaDltAdj':
          if (n1.betaDltAdj < n2.betaDltAdj) return 1 * dirMultiplier;
          if (n1.betaDltAdj > n2.betaDltAdj) return -1 * dirMultiplier;
          break;
        default:
          console.warn('Urecognized...***');
          break;
      }
      return 0;
    }
    );
  }

  static updateSnapshotTableWithRtNav(p_lstValObj: Nullable<AssetLastJs[]>, uiSnapTable: UiSnapTable) {
    if (!(Array.isArray(p_lstValObj) && p_lstValObj.length > 0))
      return;
    for (const item of p_lstValObj) {
      if (item.assetId === uiSnapTable.navAssetId) {
        uiSnapTable.netLiquidation = item.last;
        uiSnapTable.navLastUpdateTimeLoc = new Date(item.lastUtc);
        uiSnapTable.navLastUpdateTimeAgoStr = SqNgCommonUtilsTime.ConvertMilliSecToTimeStr(Date.now() - (uiSnapTable.navLastUpdateTimeLoc).getTime()) == null ? SqNgCommonUtilsTime.ConvertMilliSecToTimeStr(uiSnapTable.snapLastUpateTimeLoc.getTime()) : SqNgCommonUtilsTime.ConvertMilliSecToTimeStr(Date.now() - (uiSnapTable.navLastUpdateTimeLoc).getTime());
      }
    }
  }

  static updateUiWithHist(histObj: Nullable<HistJs[]>, uiHistData: UiHistData[]) {
    if (histObj == null)
      return;
    const todayET = SqNgCommonUtilsTime.ConvertDateLocToEt(new Date());
    todayET.setHours(0, 0, 0, 0); // get rid of the hours, minutes, seconds and milliseconds

    uiHistData.length = 0;
    for(const hisStatItem  of histObj) {
      if (hisStatItem.histStat ==  null || hisStatItem.histValues == null) 
        continue;
      let uiHistItem = new UiHistData();
      uiHistItem.assetId = hisStatItem.histStat.assetId;      
      uiHistItem.periodEnd = hisStatItem.histStat.periodEnd;
      uiHistItem.periodEndDate = hisStatItem.histStat.periodEndDate;
      uiHistItem.periodHigh = hisStatItem.histStat.periodHigh;
      uiHistItem.periodLow = hisStatItem.histStat.periodLow;
      uiHistItem.periodMaxDD = hisStatItem.histStat.periodMaxDD;
      uiHistItem.periodMaxDU = hisStatItem.histStat.periodMaxDU;
      uiHistItem.periodStart = hisStatItem.histStat.periodStart
      uiHistItem.periodStartDate = hisStatItem.histStat.periodStartDate;
      // preparing values
      uiHistItem.periodReturn = uiHistItem.periodEnd / uiHistItem.periodStart - 1;
      uiHistItem.periodMaxDrawDown = uiHistItem.periodMaxDD;
      uiHistItem.return = uiHistItem.periodEnd / uiHistItem.periodStart - 1;
      const dataStartDateET = new Date(uiHistItem.periodStartDate);  // '2010-09-29T00:00:00' which was UTC is converted to DateObj interpreted in Local time zone {Tue Sept 29 2010 00:00:00 GMT+0000 (Greenwich Mean Time)}
      const nDays = SqNgCommonUtilsTime.DateDiffNdays(dataStartDateET, todayET); // 2 weeks = 14 days, 2020 year: 366 days, because it is a leap year.
      const nYears = nDays / 365.25; // exact number of days in a year in average 365.25 days, because it is 3 times 365 and 1 time 366
      uiHistItem.cagr = Math.pow(1 + uiHistItem.return, 1.0 / nYears) - 1;
      uiHistItem.drawDown = uiHistItem.periodEnd / uiHistItem.periodHigh - 1;
      uiHistItem.drawUp = uiHistItem.periodEnd / uiHistItem.periodLow - 1;
      uiHistItem.maxDrawDown = Math.min(uiHistItem.periodMaxDD, uiHistItem.drawDown);
      uiHistItem.maxDrawUp = Math.max(uiHistItem.periodMaxDU, uiHistItem.drawUp);
      uiHistItem.sqTicker = hisStatItem.histValues.sqTicker;
      for (var i = 0; i < hisStatItem.histValues.histDates.length; i++ ) {
        let brAccItem = new UiChrtval();
        var dateStr : string = hisStatItem.histValues.histDates[i];
        brAccItem.date = new Date (dateStr.substring(0,4) + '-' + dateStr.substring(4,6) + '-' + dateStr.substring(6,8));
        brAccItem.sdaClose = (hisStatItem.histValues.histSdaCloses[i])/1000; // divided by thousand to show data in K (Ex: 20,000 = 20K)
        uiHistItem.navChrtVals.push(brAccItem);
      }
      uiHistData.push(uiHistItem);
    }
    BrAccViewerComponent.processUiWithNavChrt(uiHistData);
  }
    
  static processUiWithNavChrt(uiHistData: UiHistData[]) {
    d3.selectAll('#my_dataviz > *').remove();
    var margin = {top: 10, right: 30, bottom: 30, left: 60 };
    var width = 660 - margin.left - margin.right;
    var height = 400 - margin.top - margin.bottom;

    var firstEleOfHistDataArr1 = uiHistData[0].navChrtVals[0].sdaClose; // used to convert the data into percentage values
    var firstEleOfHistDataArr2 = uiHistData[1].navChrtVals[0].sdaClose; // used to convert the data into percentage values

    var navChrtData1 = uiHistData[0].navChrtVals.map((r:{ date: Date; sdaClose: number; }) => 
            ({date: new Date(r.date), sdaClose: (100 * r.sdaClose / firstEleOfHistDataArr1)}));
    var navChrtData2 = uiHistData[1].navChrtVals.map((r:{ date: Date; sdaClose: number; }) => 
            ({date: new Date(r.date), sdaClose: (100 * r.sdaClose / firstEleOfHistDataArr2)}));

    const formatMonth = d3.timeFormat('%Y%m%d');
    var  bisectDate = d3.bisector((r: any) => r.date).left;
    // find data range
    var xMin = d3.min(navChrtData1, (r:{ date: any; }) => r.date);
    var xMax = d3.max(navChrtData1, (r:{ date: any; }) => r.date);
    var yMinAxis = Math.min(d3.min(navChrtData1, (r:{ sdaClose: any; }) => r.sdaClose), d3.min(navChrtData2, (r:{ sdaClose: any; }) => r.sdaClose ));
    var yMaxAxis = Math.max(d3.max(navChrtData1, (r:{ sdaClose: any; }) => r.sdaClose), d3.max(navChrtData2, (r:{ sdaClose: any; }) => r.sdaClose ));
    // range of data configuring
    var navChrtScaleX = d3.scaleTime().domain([xMin, xMax]).range([0, width]);
    var navChrtScaleY = d3.scaleLinear().domain([yMinAxis - 5, yMaxAxis + 5]).range([height, 0]);

    var navChrtSvg = d3.select('#my_dataviz').append('svg')
                        .attr('width', width + margin.left + margin.right)
                        .attr('height', height + margin.top + margin.bottom)
                        .append('g')
                        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
    var navChrtScaleYAxis = d3.axisLeft(navChrtScaleY).tickFormat((r: any) => Math.round(r) + '%');

    navChrtSvg.append('g')
              .attr('transform', 'translate(0,' + height + ')')
              .call(d3.axisBottom(navChrtScaleX));
    navChrtSvg.append('g').call(navChrtScaleYAxis)

    // Define the line
    var line = d3.line()
                  .x((r: any) => navChrtScaleX(r.date))
                  .y((r: any) => navChrtScaleY(r.sdaClose))
                  .curve(d3.curveCardinal);
    var line2 = d3.line()
                  .x((r: any) => navChrtScaleX(r.date))
                  .y((r: any) => navChrtScaleY(r.sdaClose))
                  .curve(d3.curveCardinal);

    var navChrtlineSvg = navChrtSvg.append('g');
    var focus = navChrtSvg.append('g').style('display', 'none');
  // Add the valueline path.
    navChrtlineSvg.append('path')
                  .attr('class', 'line')
                  .datum(navChrtData1) // Binds data to the line
                  .attr('d', line as any)

    navChrtlineSvg.append('path')
                  .attr('class', 'line2')
                  .style('stroke-dasharray', ('3, 3'))
                  .datum(navChrtData2) // Binds data to the line
                  .attr('d', line2 as any)

     // append the x line
    focus.append('line')
        .attr('class', 'x')
        .style('stroke', 'blue')
        .style('stroke-dasharray', '3,3')
        .style('opacity', 0.5)
        .attr('y1', 0)
        .attr('y2', height);

 // append the y line
    focus.append('line')
        .attr('class', 'y')
        .style('stroke', 'blue')
        .style('stroke-dasharray', '3,3')
        .style('opacity', 0.5)
        .attr('x1', width)
        .attr('x2', width);
    focus.append('line2')
        .attr('class', 'y')
        .style('stroke', 'blue')
        .style('stroke-dasharray', '3,3')
        .style('opacity', 0.5)
        .attr('x1', width)
        .attr('x2', width);

    // append the circle at the intersection
    focus.append('circle')
        .attr('class', 'y')
        .style('fill', 'none')
        .style('stroke', 'blue')
        .attr('r', 4);

    // place the value at the intersection
    focus.append('text')
        .attr('class', 'y1')
        .style('stroke', 'white')
        .style('stroke-width', '3.5px')
        .style('opacity', 0.8)
        .attr('dx', 8)
        .attr('dy', '-.3em');
    focus.append('text')
        .attr('class', 'y2')
        .attr('dx', 8)
        .attr('dy', '-.3em');

    // place the date at the intersection
    focus.append('text')
        .attr('class', 'y3')
        .style('stroke', 'white')
        .style('stroke-width', '3.5px')
        .style('opacity', 0.8)
        .attr('dx', 8)
        .attr('dy', '1em');
    focus.append('text')
        .attr('class', 'y4')
        .attr('dx', 8)
        .attr('dy', '1em');
    focus.append('text')
        .attr('class', 'y4')
        .attr('dx', 8)
        .attr('dy', '1em');
    
    // append the rectangle to capture mouse
    navChrtSvg.append('rect')
        .attr('width', width)
        .attr('height', height)
        .style('fill', 'none')
        .style('pointer-events', 'all')
        .on('mouseover', function() { focus.style('display', null); })
        .on('mouseout', function() { focus.style('display', 'none'); })
        .on('mousemove', mousemove);

    function mousemove(event: any) {
      var x0 = navChrtScaleX.invert(d3.pointer(event)[0]),
      i = bisectDate(navChrtData1, x0, 1),
      r = navChrtData1[i]
      focus.select('circle.y')
          .attr('transform', 'translate(' + navChrtScaleX(r.date) + ',' + navChrtScaleY(r.sdaClose) + ')');
      focus.select('text.y1')
          .attr('transform', 'translate(' + navChrtScaleX(r.date) + ',' + navChrtScaleY(r.sdaClose) + ')')
          .text(r.sdaClose);
      focus.select('text.y2')
          .attr('transform', 'translate(' + navChrtScaleX(r.date) + ',' + navChrtScaleY(r.sdaClose) + ')')
          .text(d3.format(',')(Math.round((r.sdaClose*firstEleOfHistDataArr1/100))) + 'K');
      focus.select('text.y3')
          .attr('transform', 'translate(' + navChrtScaleX(r.date) + ',' + navChrtScaleY(r.sdaClose) + ')')
          .text(formatMonth(r.date));
      focus.select('text.y4')
          .attr('transform','translate(' + navChrtScaleX(r.date) + ',' + navChrtScaleY(r.sdaClose) + ')')
          .text(formatMonth(r.date));
      focus.select('.x')
          .attr('transform', 'translate(' + navChrtScaleX(r.date) + ',' + navChrtScaleY(r.sdaClose) + ')')
          .attr('y2', height - navChrtScaleY(r.sdaClose));
      focus.select('.y')
          .attr('transform', 'translate(' + width * -1 + ',' + navChrtScaleY(r.sdaClose) + ')')
          .attr('x2', width + width);
    }
  }

  // bioler plate code for Stock chrt data - under development (Daya)
  static updateStockHistData(histObj: Nullable<HistJs[]>, uiSnapTable: UiSnapTable[]) {
    if (histObj == null)
      return;
    let item = new UiSnapTable();
    for (const histValItem of histObj) {
      if (histValItem.histValues == null) 
        continue;
      let stockItem = new UiChrtval();
      for (var i = 0; i < histValItem.histValues.histDates.length; i++) {
        stockItem.date = histValItem.histValues.histDates[i];
        stockItem.sdaClose = histValItem.histValues.histSdaCloses[i];
        item.stockChartVals.push(stockItem);
      }
      uiSnapTable.push(item);
    }
  }

  onNavSelectedChange(pEvent: any) {
    if (this._parentWsConnection != null && this._parentWsConnection.readyState === WebSocket.OPEN) 
      this._parentWsConnection.send('BrAccViewer.ChangeNav:' + this.navSelectionSelected);
  }

  onLookbackSelectChange() {
    const currDateET: Date = SqNgCommonUtilsTime.ConvertDateLocToEt(new Date());
    if (this.histPeriodSelectionSelected === 'YTD') {
      this.histPeriodStartETstr = (new Date(currDateET.getFullYear() - 1, 11, 31)).toString();
    } else if (this.histPeriodSelectionSelected.endsWith('y')) {
      const lbYears = parseInt(this.histPeriodStartETstr.substr(0, this.histPeriodStartETstr.length - 1), 10);
      this.histPeriodStartETstr = (new Date(currDateET.setFullYear(currDateET.getFullYear() - lbYears))).toString();
    // } else if (lookbackStr.endsWith('m')) {
    //   const lbMonths = parseInt(this.histPeriodStartETstr.substr(0, this.histPeriodStartETstr.length - 1), 10);
    //   this.histPeriodStartETstr = new Date(currDateET.setMonth(currDateET.getMonth() - lbMonths));
    // } else if (lookbackStr.endsWith('w')) {
    //   const lbWeeks = parseInt(this.histPeriodStartETstr.substr(0, this.histPeriodStartETstr.length - 1), 10);
    //   this.histPeriodStartETstr = new Date(currDateET.setDate(currDateET.getDate() - lbWeeks * 7));
    // } else if (lookbackStr === 'D\'99') {
    //   this.histPeriodStartETstr = new Date(1999, 3 - 1, 10); // start date of QQQ
    // } else if (lookbackStr === 'Date') {
    //   this.histPeriodStartETstr = SqNgCommonUtilsTime.PaddedIsoStr3Date(this.lookbackStartETstr);
    }
    this.histPeriodStartETstr = SqNgCommonUtilsTime.Date2PaddedIsoStr(new Date(this.histPeriodStartETstr));

    if (!(this.histPeriodSelectionSelected === 'Date')) {  // change back the end date to yesterday, except if it is in CustomDate mode
      const todayET = SqNgCommonUtilsTime.ConvertDateLocToEt(new Date());
      todayET.setHours(0, 0, 0, 0); // get rid of the hours, minutes, seconds )and milliseconds
      const yesterDayET = new Date(todayET);
      yesterDayET.setDate(yesterDayET.getDate() - 1);
      this.histPeriodEndETstr = SqNgCommonUtilsTime.Date2PaddedIsoStr(new Date(yesterDayET.getFullYear(), yesterDayET.getMonth(), yesterDayET.getDate()));  // set yesterdayET as default
    // this.onHistPeriodChange();
  }
}

  onHistPeriodChange(pEvent: any) {
    // for ( let item in this.navSelection) {
    //   if (item != this.navSelectionSelected)
    //     alert("the ticker is not avaiable, pls select the available tickers")
    // }
    if (this._parentWsConnection != null && this._parentWsConnection.readyState === WebSocket.OPEN)
      this._parentWsConnection.send('BrAccViewer.GetHistData:Bnchmrk:' + this.bnchmkTickerSelectionSelected + ",Date:" + this.histPeriodStartETstr + '...' + this.histPeriodEndETstr);
    console.log("The ticker seleceted is: ", this.bnchmkTickerSelectionSelected + "," + this.histPeriodStartETstr + '...' + this.histPeriodEndETstr);
  }

  onSortingClicked(event, p_sortColumn) {
    this.sortColumn = p_sortColumn;
    if (this.sortDirection == 'Increasing')
      this.sortDirection = 'Decreasing';
    else 
      this.sortDirection = 'Increasing';
    BrAccViewerComponent.updateSnapshotTable(this.brAccountSnapshotObj, this.sortColumn, this.sortDirection, this.uiSnapTable) 
  }

  onTabHeaderClicked(event: any, tabIdx: number) {
    this.tabPageVisibleIdx = tabIdx;
  }

  onSnapshotRefreshClicked(event: any) {
    this.snapshotRefresh();
  }

  snapshotRefresh() {
    gDiag.wsOnLastBrAccVwRefreshSnapshotStart = new Date();
    if (this._parentWsConnection != null && this._parentWsConnection.readyState === WebSocket.OPEN)
      this._parentWsConnection.send('BrAccViewer.RefreshSnapshot:' + this.navSelectionSelected);
  }

  onHistBnchmkInputKeypress(event: any) {
    var chCode = ('charCode' in event) ? event.charCode : event.keyCode;
    if (chCode == 13)
      console.log("The key pressed code is :", chCode);
  }

  onStockChrtTicker(event: any) {
    if (this._parentWsConnection != null && this._parentWsConnection.readyState === WebSocket.OPEN)
      this._parentWsConnection.send('BrAccViewer.GetStockChrtTickerHistData:' + event );
    console.log("The ticker selected on chart tooltip is :", event);
  }
}
