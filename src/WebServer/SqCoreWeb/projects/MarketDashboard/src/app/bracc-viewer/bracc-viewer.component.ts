import { Component, Input, OnInit } from '@angular/core';
import { gDiag, AssetLastJs } from '../../../../../TsLib/sq-common/sq-globals';
import { SqNgCommonUtilsStr } from './../../../../sq-ng-common/src/lib/sq-ng-common.utils_str';
import { SqNgCommonUtilsTime, minDate } from './../../../../sq-ng-common/src/lib/sq-ng-common.utils_time'; // direct reference, instead of via 'public-api.ts' as an Angular library. No need for 'ng build sq-ng-common'. see https://angular.io/guide/creating-libraries
import * as d3 from 'd3';

type Nullable<T> = T | null;

// Input data classes
class BrAccVwrHandShk {
  marketBarAssets: Nullable<AssetJs[]> = null;
  selectableNavAssets: Nullable<AssetJs[]> = null;
  assetCategories: Nullable<AssetCategoryJs[]> = null;
}

class AssetJs {
  public assetId = NaN;
  public sqTicker = '';
  public symbol = '';
  public name = '';
}

class AssetCategoryJs {
  public tag = '';
  public sqTickers: Nullable<string[]> = null;
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
  public visibleSumPlTodVal = 0;
  public sumPlTodPct = 0;
  public visibleSumPlTodPct = 0;
  public longStockValue = 0;
  public shortStockValue = 0;
  public visibleLongStockValue = 0;
  public visibleShortStockValue = 0;
  public longOptionDeltaAdjValue = 0; // long Call or short Put options
  public shortOptionDeltaAdjValue = 0; // long Put or short Call options
  public visibleLongOptionDeltaAdjValue = 0; // visible long Call or short Put options
  public visibleShortOptionDeltaAdjValue = 0; // visible long Put or short Call options
  public totalMaxRiskedN = 0;
  public totalMaxRiskedLeverage = 0;
  public deltaAdjTotalMarketOrientation = 0;
  public visibleDeltaAdjTotalMarketOrientation = 0;
  public betaDeltaAdjTotalMarketOrientation = 0;
  public betaDeltaAdjTotalMarketOrientationLeverage = 0;
  public plTodPrNav = NaN;
  public pctChgTodPrNav = NaN;
  public numOfPoss = 0;
  public visibleNumOfPoss = 0;
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
  public return = NaN; // Total return (from startDate to endDate to last realtime): adding period-return and realtime-return together. Every other performance number (cagr, maxDD) is also Total.
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
  @Input() _parentWsConnection?: WebSocket = undefined; // this property will be input from above parent container

  // Guessed Beta for HL hedges and companies.MarketWatch Beta calculation is quite good. Use that If it is available.  There, Beta of QQQ: 1.18, that is the base.
  static betaArr: { [id: string] : number; } =
    {'QQQ': 1.18/1.18, 'TQQQ': 3.0, 'SQQQ': -3.0, 'SPY': 1/1.18, 'SPXL': 3*1/1.18, 'UPRO': 3*1/1.18, 'SPXS': -3*1/1.18, 'SPXU': -3*1/1.18, 'TWM': -2.07/1.18, // market ETFs
      'VXX': -3.4/1.18, 'VXZ': -1.82/1.18, 'SVXY': 1.7/1.18, 'ZIV': 1.81/1.18, // VIX
      'TLT': -0.50/1.18, // https://www.ishares.com/us/products/239454/ishares-20-year-treasury-bond-etf says -0.25, MarketWatch: -0.31, discretionary override from -0.31 to -0.50 (TMF too)
      'TMF': 3*-0.50/1.18, 'TMV': -1*3*-0.50/1.18, 'TIP': -0.06/1.18,
      'USO': 0.83/1.18, 'SCO': -2.0*0.83/1.18, 'UCO': 1.25/1.18,
      'UNG': 0.23/1.18, // discretionary override from 0.03 to 0.23 (UGAZ too)
      'UGAZF': 3*0.23/1.18,
      'GLD': (-0.24*1.18)/1.18, // GLD has no Beta on MarketWatch. YF (5Years, monthly): 0.04. But DC's discretionary (logical) override: -0.24
      'TAIL': -1/1.18, // compared TAIL vs. SPY and it moves about the same beta, just opposite
      'UUP': (-0.31)/1.18, // YF Beta calculation; when market panics, the whole world wants to buy safe USA treasuries, therefore USD goes up => negative correlation.
      // companies
      'PM': 0.62/1.18,
    }; // it is QQQ Beta, not SPY beta

  handshakeStrFormatted = '[Nothing arrived yet]';
  handshakeObj: Nullable<BrAccVwrHandShk> = null;
  mktBrLstClsStrFormatted = '[Nothing arrived yet]';
  mktBrLstClsObj: Nullable<AssetPriorCloseJs[]> = null;
  navHistStrFormatted = '[Nothing arrived yet]';
  navHistObj: Nullable<HistJs[]> = null;
  stockHistStrFormatted = '[Nothing arrived yet]';
  stockHistObj: Nullable<BrAccHistValuesJs> = null;
  brAccountSnapshotStrFormatted = '[Nothing arrived yet]';
  brAccountSnapshotObj: Nullable<BrAccSnapshotJs> = null;
  lstValObj: Nullable<AssetLastJs[]> = null; // realtime or last values
  lstValLastUiRefreshTimeLoc = new Date(); // This is not the time of the Rt data, but the time when last refresh was sent from server to UI.
  navSelection: string[] = [];
  navSelectionSelected = '';
  uiMktBar: UiMktBar = new UiMktBar();
  uiSnapTable: UiSnapTable = new UiSnapTable();
  uiHistData: UiHistData[] = [];

  tabPageVisibleIdx = 1;
  sortColumn: string = 'plTod';
  isSortingDirectionAscending: boolean = true;
  histPeriodSelection = ['YTD', '1M', '1Y', '3Y', '5Y'];
  histPeriodSelectionSelected: string = 'YTD';
  bnchmkTickerSelection = ['SPY', 'QQQ', 'TLT', 'VXX', 'SVXY', 'UNG', 'USO'];
  bnchmkTickerSelectionSelected: string = 'SPY';
  uiAssetCategories: AssetCategoryJs[] = [];
  assetCategorySelectionSelected: string = 'No Filter';
  assetCategorySelectedSqtickers: string[] = [];
  histPeriodStartET: Date; // set in ctor. We need this in JS client to check that the received data is long enough or not (Expected Date)
  histPeriodStartETstr: string; // set in ctor; We need this for sending String instruction to Server. Anyway, a  HTML <input date> is always a A DOMString representing a date in YYYY-MM-DD format, or empty. https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/date
  histPeriodEndET: Date;
  histPeriodEndETstr: string;
  isFilteringBasedonMktVal: boolean = true;
  isFilteringBasedonPlDaily: boolean = false;
  isFilteringBasedonOptions: boolean = false;
  // isFilteringBasedonAssetCat: boolean = false;
  stockTooltipSymbol: string = '';
  stockTooltipName: string = '';
  isShowStockTooltip: boolean = false;
  isMouseInSnapSymbolCell: boolean = false;
  isMouseInTooltip: boolean = false;
  isMouseInHistPeriodCombox: boolean = false; // under development Daya
  isHistPeriodDateValid: boolean = true;

  visibleList: string[] = []; // The visibleList is utilized when the user wants to view percentage channel details using Technical analysis.

  constructor() {
    const todayET = SqNgCommonUtilsTime.ConvertDateLocToEt(new Date());
    todayET.setHours(0, 0, 0, 0); // get rid of the hours, minutes, seconds and milliseconds

    this.histPeriodStartET = new Date(todayET.getFullYear() - 1, 11, 31); // set YTD as default
    this.histPeriodStartETstr = SqNgCommonUtilsTime.Date2PaddedIsoStr(this.histPeriodStartET);

    // https://stackoverflow.com/questions/563406/add-days-to-javascript-date
    const yesterDayET = new Date(todayET);
    yesterDayET.setDate(yesterDayET.getDate() - 1);
    this.histPeriodEndET = new Date(yesterDayET.getFullYear(), yesterDayET.getMonth(), yesterDayET.getDate()); // set yesterdayET as default
    this.histPeriodEndETstr = SqNgCommonUtilsTime.Date2PaddedIsoStr(this.histPeriodEndET);

    setInterval(() => { this.snapshotRefresh(); }, 60 * 60 * 1000); // forced Snapshot table refresh timer in every 60 mins
    setInterval(() => {
      this.uiMktBar.lstValLastRefreshTimeStr = SqNgCommonUtilsTime.ConvertMilliSecToTimeStr(Date.now() - this.uiMktBar.lstValLastRefreshTimeLoc.getTime());
      this.uiSnapTable.navLastUpdateTimeAgoStr = SqNgCommonUtilsTime.ConvertMilliSecToTimeStr(Date.now() - this.uiSnapTable.navLastUpdateTimeLoc.getTime());
      this.uiSnapTable.snapLastUpdateTimeAgoStr = SqNgCommonUtilsTime.ConvertMilliSecToTimeStr(Date.now() - this.uiSnapTable.snapLastUpateTimeLoc.getTime());
    }, 1000); // refresh at every 1 secs
    setInterval(() => {
      if (this._parentWsConnection != null && this._parentWsConnection.readyState === WebSocket.OPEN)
        this._parentWsConnection.send('BrAccViewer.RefreshMktBrPriorCloses:' + this.uiMktBar);
    }, 120 * 60 * 1000);
  }

  ngOnInit(): void {
  }

  public webSocketOnMessage(msgCode: string, msgObjStr: string): boolean {
    switch (msgCode) {
      case 'BrAccViewer.BrAccSnapshot': // The most frequent message should come first. Note: LstVal (realtime price) is handled earlier in a unified way.
        gDiag.wsBrAccVwOnLastSnapshot = new Date();
        if (gDiag.wsBrAccVwSnapshotReceiveReason == 'NavSelectChange')
          gDiag.wsBrAccVwOnLastNavSelectChangeEnd = gDiag.wsBrAccVwOnLastSnapshot;
        else if (gDiag.wsBrAccVwSnapshotReceiveReason == 'RefreshSnapshot')
          gDiag.wsBrAccVwOnLastRefreshSnapshotEnd = gDiag.wsBrAccVwOnLastSnapshot;

        gDiag.wsBrAccVwSnapshotReceiveReason = 'Unknown'; // reset the Reason flag, otherwise the last value will stuck in it
        console.log('BrAccViewer.BrAccSnapshot:' + msgObjStr);
        this.brAccountSnapshotStrFormatted = SqNgCommonUtilsStr.splitStrToMulLines(msgObjStr);
        this.brAccountSnapshotObj = JSON.parse(msgObjStr);
        if (this.brAccountSnapshotObj != null && this.brAccountSnapshotObj.poss != null) { //  Change string "NaN" to native JS number NaN
          for (const pos of this.brAccountSnapshotObj.poss) {
            if (pos.priorClose.toString() === 'NaN') // even though pos.priorClose is defined in TS as number, it will be a string "NaN" runtime in browser.
              pos.priorClose = NaN;
            if (pos.estPrice.toString() === 'NaN')
              pos.estPrice = NaN;
          }
        }
        BrAccViewerComponent.updateSnapshotTable(this.brAccountSnapshotObj, this.isSortingDirectionAscending, this.sortColumn, this.assetCategorySelectedSqtickers, this.isFilteringBasedonMktVal, this.isFilteringBasedonPlDaily, this.isFilteringBasedonOptions, this.uiSnapTable, this.visibleList);
        return true;
      case 'BrAccViewer.NavHist':
        console.log('BrAccViewer.NavHist:' + msgObjStr);
        this.navHistStrFormatted = SqNgCommonUtilsStr.splitStrToMulLines(msgObjStr);
        this.navHistObj = JSON.parse(msgObjStr);
        BrAccViewerComponent.updateUiWithHist(this.navHistObj, this.uiHistData, this.lstValObj);
        return true;
      case 'BrAccViewer.MktBrLstCls':
        if (gDiag.wsBrAccVwOnFirstMktBrLstCls === minDate)
          gDiag.wsBrAccVwOnFirstMktBrLstCls = new Date();
        console.log('BrAccViewer.MktBrLstCls:' + msgObjStr);
        this.mktBrLstClsStrFormatted = SqNgCommonUtilsStr.splitStrToMulLines(msgObjStr);
        this.mktBrLstClsObj = JSON.parse(msgObjStr);
        BrAccViewerComponent.updateMktBarUi(this.handshakeObj, this.mktBrLstClsObj, this.lstValObj, this.lstValLastUiRefreshTimeLoc, this.uiMktBar);
        return true;
      case 'BrAccViewer.StockHist':
        console.log('BrAccViewer.StockHist:' + msgObjStr);
        this.stockHistStrFormatted = SqNgCommonUtilsStr.splitStrToMulLines(msgObjStr);
        this.stockHistObj = JSON.parse(msgObjStr);
        BrAccViewerComponent.updateStockHistData(this.stockHistObj, this.uiSnapTable);
        return true;
      case 'BrAccViewer.Handshake': // The least frequent message should come last.
        console.log('BrAccViewer.Handshake:' + msgObjStr);
        this.handshakeStrFormatted = SqNgCommonUtilsStr.splitStrToMulLines(msgObjStr);
        this.handshakeObj = JSON.parse(msgObjStr);
        console.log(`BrAccViewer.Handshake.SelectableBrAccs: '${(this.handshakeObj == null) ? null : this.handshakeObj.selectableNavAssets}'`);
        this.updateUiSelectableNavs((this.handshakeObj == null) ? null : this.handshakeObj.selectableNavAssets);
        this.updateUiAssetCategories(this.handshakeObj);
        return true;
      default:
        return false;
    }
  }

  public webSocketLstValArrived(lstValObj: Nullable<AssetLastJs[]>) { // real time price data
    this.lstValLastUiRefreshTimeLoc = new Date();
    this.lstValObj = lstValObj;
    BrAccViewerComponent.updateMktBarUi(this.handshakeObj, this.mktBrLstClsObj, this.lstValObj, this.lstValLastUiRefreshTimeLoc, this.uiMktBar);
    BrAccViewerComponent.updateSnapshotTableWithRtNav(this.lstValObj, this.uiSnapTable);
    BrAccViewerComponent.updateUiWithHist(this.navHistObj, this.uiHistData, this.lstValObj);
  }

  updateUiSelectableNavs(pSelectableNavAssets: Nullable<AssetJs[]>) { // same in MktHlth and BrAccViewer
    if (pSelectableNavAssets == null)
      return;
    this.navSelectionSelected = '';
    for (const nav of pSelectableNavAssets) {
      if (this.navSelectionSelected == '') // by default, the selected Nav is the first from the list
        this.navSelectionSelected = nav.symbol;
      this.navSelection.push(nav.symbol);
    }
  }

  // under Development -- Daya
  updateUiAssetCategories(handshakeObj: Nullable<BrAccVwrHandShk>) {
    const assetCategories: Nullable<AssetCategoryJs[]> = (handshakeObj == null) ? null : handshakeObj.assetCategories;
    if (!(Array.isArray(assetCategories) && assetCategories.length > 0 ))
      return;

    // create a local assetCategories variable.
    // Push <"No Filter", []> first  , Push <"No Filter", ["*"]>
    // push the data from handshakeObj.AssetCategories after
    // create assetCategoriesSelection from assetCategories
    // Use assetCategories in the Angular UI.

    this.uiAssetCategories.push({ tag: 'No Filter', sqTickers: []});
    for (let i = 0; i < assetCategories.length; i++) {
      const uiAsset = new AssetCategoryJs();
      uiAsset.tag = assetCategories[i].tag;
      uiAsset.sqTickers = assetCategories[i].sqTickers;
      this.uiAssetCategories.push(uiAsset);
    }
  }

  static updateMktBarUi(handshakeObj: Nullable<BrAccVwrHandShk>, priorCloses: Nullable<AssetPriorCloseJs[]>, lastRt: Nullable<AssetLastJs[]>, lstValLastUiRefreshTime: Date, uiMktBar: UiMktBar) {
    const marketBarAssets: Nullable<AssetJs[]> = (handshakeObj == null) ? null : handshakeObj.marketBarAssets;
    // check if both array exist; instead of the old-school way, do ES5+ way: https://stackoverflow.com/questions/11743392/check-if-an-array-is-empty-or-exists
    if (!(Array.isArray(marketBarAssets) && marketBarAssets.length > 0 && Array.isArray(priorCloses) && priorCloses.length > 0 && Array.isArray(lastRt) && lastRt.length > 0))
      return;
    uiMktBar.lstValLastRefreshTimeLoc = lstValLastUiRefreshTime;
    uiMktBar.lstValLastRefreshTimeStr = SqNgCommonUtilsTime.ConvertMilliSecToTimeStr(Date.now() - uiMktBar.lstValLastRefreshTimeLoc.getTime());
    for (const item of marketBarAssets) {
      const uiItem = new UiMktBarItem();
      const existingUiCols = uiMktBar.poss.filter((r) => r.sqTicker === item.sqTicker);
      if (existingUiCols.length === 0) {
        uiItem.assetId = item.assetId;
        uiItem.sqTicker = item.sqTicker;
        uiItem.symbol = item.symbol;
        uiItem.name = item.name;
        uiMktBar.poss.push(uiItem);
      } else if (existingUiCols.length >= 2)
        console.warn(`Received ticker '${item.sqTicker}' has duplicates in UiArray. This might be legit if both VOD.L and VOD wants to be used. ToDo: Differentiation based on assetId is needed.`, 'background: #222; color: red');
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

  static updateSnapshotTable(brAccSnap: Nullable<BrAccSnapshotJs>, isSortingDirectionAscending: boolean, sortColumn: string,
      assetCategorySelectionSelectedSqtickers : string[], isFilteringBasedonMktVal: boolean, isFilteringBasedonPlDaily: boolean, isFilteringBasedonOptions: boolean, uiSnapTable: UiSnapTable, visibleList: string[]) {
    if (brAccSnap === null || brAccSnap.poss === null)
      return;

    visibleList.length = 0; // emptying the visible lsit on every filter selection

    uiSnapTable.navAssetId = brAccSnap.assetId;
    uiSnapTable.navSymbol = brAccSnap.symbol;
    uiSnapTable.snapLastUpateTimeLoc = new Date(brAccSnap.lastUpdate);
    uiSnapTable.snapLastUpdateTimeAgoStr = SqNgCommonUtilsTime.ConvertMilliSecToTimeStr(Date.now() - (new Date(brAccSnap.lastUpdate)).getTime());
    uiSnapTable.navLastUpdateTimeLoc = new Date(brAccSnap.lastUpdate);
    uiSnapTable.navLastUpdateTimeAgoStr = SqNgCommonUtilsTime.ConvertMilliSecToTimeStr(Date.now() - (new Date(brAccSnap.lastUpdate)).getTime());
    uiSnapTable.totalCashValue = brAccSnap.totalCashValue;
    uiSnapTable.initialMarginReq = brAccSnap.initMarginReq;
    uiSnapTable.maintMarginReq = brAccSnap.maintMarginReq;
    uiSnapTable.grossPositionValue = brAccSnap.grossPositionValue;
    uiSnapTable.netLiquidation = brAccSnap.netLiquidation;
    uiSnapTable.priorCloseNetLiquidation = brAccSnap.priorCloseNetLiquidation;
    uiSnapTable.plTodPrNav = Math.round(brAccSnap.netLiquidation - brAccSnap.priorCloseNetLiquidation);
    uiSnapTable.pctChgTodPrNav = (brAccSnap.netLiquidation - brAccSnap.priorCloseNetLiquidation) / brAccSnap.priorCloseNetLiquidation;
    uiSnapTable.clientMsg = brAccSnap.clientMsg.replace(';', '\n');
    uiSnapTable.numOfPoss = brAccSnap.poss.length;
    uiSnapTable.poss.length = 0;
    uiSnapTable.sumPlTodVal = 0;
    uiSnapTable.visibleSumPlTodVal = 0;
    uiSnapTable.longStockValue = 0;
    uiSnapTable.shortStockValue = 0;
    uiSnapTable.visibleLongStockValue = 0;
    uiSnapTable.visibleShortStockValue = 0;
    uiSnapTable.longOptionDeltaAdjValue = 0;
    uiSnapTable.shortOptionDeltaAdjValue = 0;
    uiSnapTable.visibleLongOptionDeltaAdjValue = 0;
    uiSnapTable.visibleShortOptionDeltaAdjValue = 0;
    uiSnapTable.totalMaxRiskedN = 0;
    uiSnapTable.deltaAdjTotalMarketOrientation = 0;
    uiSnapTable.visibleDeltaAdjTotalMarketOrientation = 0;
    uiSnapTable.betaDeltaAdjTotalMarketOrientation = 0;
    const smallMktValThreshold = uiSnapTable.priorCloseNetLiquidation * 0.01; // 1% of NAV. For a 400K NAV, it is 4K. For a 8M NAV it is 80K.

    for (const possItem of brAccSnap.poss) {
      // 1. Filling uiPosItem fields
      const uiPosItem = new UiAssetSnapPossPos();
      uiPosItem.assetId = possItem.assetId;
      uiPosItem.sqTicker = possItem.sqTicker;
      uiPosItem.symbol = possItem.symbol;
      uiPosItem.symbolEx = possItem.symbolEx;
      uiPosItem.name = possItem.name;
      uiPosItem.accIdStr = possItem.accId;
      // BrAccViewerComponent.betaArr
      uiPosItem.pos = possItem.pos;
      uiPosItem.avgCost = possItem.avgCost;
      uiPosItem.priorClose = possItem.priorClose;
      uiPosItem.estPrice = possItem.estPrice;
      if (possItem.priorClose === 0)
        uiPosItem.pctChgTod = NaN; // better than the positive infinity character (∞%) on the UI. If there is a ∞%, then that will be the winner of the day by PctChange, but that is fluke. IB UI: in this case the cell is blank. We follow that by using NaN. Then our call will be empty.
      else
        uiPosItem.pctChgTod = (possItem.estPrice - possItem.priorClose) / possItem.priorClose;
      uiPosItem.plTod = Math.round(possItem.pos * (possItem.estPrice - possItem.priorClose));
      uiPosItem.pl = Math.round(possItem.pos * (possItem.estPrice - possItem.avgCost));
      uiPosItem.mktVal = Math.round(possItem.pos * possItem.estPrice);
      uiPosItem.gBeta = (uiPosItem.symbol in BrAccViewerComponent.betaArr ) ? BrAccViewerComponent.betaArr [uiPosItem.symbol] : 1.0;

      if (possItem.sqTicker.startsWith('O') && !isNaN(possItem.ibCompDelta) && possItem.ibCompDelta != 0.0) {
        uiPosItem.estUndPrice = possItem.estUndPrice;
        const optCallPutMulN = possItem.name.includes('Call') ? 1 : -1; // Call option  has positive multiplier
        uiPosItem.delivValue = Math.round(possItem.pos * 100 * possItem.estUndPrice * optCallPutMulN); // Assuming option multiplier is 100
        uiPosItem.ibCompDelta = possItem.ibCompDelta;
        uiPosItem.dltAdjDelivVal = uiPosItem.delivValue * Math.abs(uiPosItem.ibCompDelta); // deliveryValueN can be negative, because of optCallPutMulN, and delta is also negative for Put options.
        uiPosItem.betaDltAdj = Math.round(uiPosItem.gBeta * uiPosItem.dltAdjDelivVal);
      } else
        uiPosItem.betaDltAdj = Math.round(uiPosItem.gBeta * uiPosItem.mktVal);

      // 2. Aggregating fields, creating sums
      if (!isNaN(uiPosItem.plTod)) // P&L Today can be NaN if PriorClose of an option is NaN
        uiSnapTable.sumPlTodVal += uiPosItem.plTod;
      if (!isNaN(uiPosItem.mktVal))
        uiSnapTable.totalMaxRiskedN += Math.abs(uiPosItem.mktVal);
      uiSnapTable.betaDeltaAdjTotalMarketOrientation += uiPosItem.betaDltAdj;

      if (possItem.sqTicker.startsWith('S')) { // Stocks
        if (uiPosItem.mktVal > 0) { // Long and Short stock values
          uiSnapTable.longStockValue += uiPosItem.mktVal;
        } else if (uiPosItem.mktVal < 0)
          uiSnapTable.shortStockValue += uiPosItem.mktVal;
      }
      if (possItem.sqTicker.startsWith('O')) { // Options
        if (uiPosItem.dltAdjDelivVal > 0) // Call options has positive dltAdjDelivVal all the time, because delivery value is positive
          uiSnapTable.longOptionDeltaAdjValue += uiPosItem.dltAdjDelivVal; // long Call or short Put options
        else if (uiPosItem.dltAdjDelivVal < 0) // Put options has negative dltAdjDelivVal. NaN or 0.0 are not added to any of them.
          uiSnapTable.shortOptionDeltaAdjValue += uiPosItem.dltAdjDelivVal; // long Put or short Call options
      }

      uiSnapTable.deltaAdjTotalMarketOrientation = Math.round(uiSnapTable.longStockValue + uiSnapTable.shortStockValue + uiSnapTable.longOptionDeltaAdjValue + uiSnapTable.shortOptionDeltaAdjValue);

      // 3. Determine visible rows based on filters
      // const cols = assetCategorySelectionSelectedSqtickers.filter((r) => r == possItem.sqTicker);
      // console.log('The len of assetCat :', cols.length);
      // when you Loop through the Snapshot tickers, you have to check each tickers one by one with this assetCategorySqTickers.
      // 1. If filterSqTicker is empty => snapshot ticker is accepted.
      // 2. If filterSqTicker is not empty => check that the current snapshot SqTicker is in the list or not.
      let isShowPos = true;
      // empty category list means 'No Filter'. So, if there is any filter, we set the visibilty to 'hide' at first, then later let isCatFilterAccepts do its job.
      if (assetCategorySelectionSelectedSqtickers.length != 0)
        isShowPos = false;
      let isCatFilterAccepts = false;
      for (const item of assetCategorySelectionSelectedSqtickers) {
        if (item == uiPosItem.sqTicker) { // checking if cat tickers exists
          isCatFilterAccepts = true;
          console.log('the ticker is found in the category list:', uiPosItem.sqTicker);
          break;
        }
      }
      if (isCatFilterAccepts) // if category filter accepted then SHOW, make it visible
        isShowPos = true;

      if (isFilteringBasedonMktVal && Math.abs(uiPosItem.mktVal) < smallMktValThreshold)
        isShowPos = false;
      if (isFilteringBasedonPlDaily && Math.abs(uiPosItem.plTod) < 500) // can be made as % of NAV, but $500 nominal value is fine now
        isShowPos = false;
      if (isFilteringBasedonOptions && possItem.sqTicker.startsWith('O'))
        isShowPos = false;

      if (isShowPos) {
        uiSnapTable.poss.push(uiPosItem);
        visibleList.push(uiPosItem.symbol);
        // Long and Short stock values for all the visible tickers
        if (possItem.sqTicker.startsWith('S')) {
          if (uiPosItem.mktVal > 0)
            uiSnapTable.visibleLongStockValue += uiPosItem.mktVal;
          else if (uiPosItem.mktVal < 0)
            uiSnapTable.visibleShortStockValue += uiPosItem.mktVal;
        }
        if (possItem.sqTicker.startsWith('O')) {
          if (uiPosItem.dltAdjDelivVal > 0) // Call options has positive dltAdjDelivVal all the time, because delivery value is positive
            uiSnapTable.visibleLongOptionDeltaAdjValue += uiPosItem.dltAdjDelivVal; // long Call or short Put options
          else if (uiPosItem.dltAdjDelivVal < 0) // Put options has negative dltAdjDelivVal. NaN or 0.0 are not added to any of them.
            uiSnapTable.visibleShortOptionDeltaAdjValue += uiPosItem.dltAdjDelivVal; // long Put or short Call options
        }
        if (!isNaN(uiPosItem.plTod)) // P&L Today can be NaN if PriorClose of an option is NaN
          uiSnapTable.visibleSumPlTodVal += uiPosItem.plTod;
      }
    }
    uiSnapTable.visibleDeltaAdjTotalMarketOrientation = Math.round(uiSnapTable.visibleLongStockValue + uiSnapTable.visibleShortStockValue + uiSnapTable.visibleLongOptionDeltaAdjValue + uiSnapTable.visibleShortOptionDeltaAdjValue);
    uiSnapTable.sumPlTodPct = uiSnapTable.sumPlTodVal / uiSnapTable.priorCloseNetLiquidation; // profit & Loss total percent change
    uiSnapTable.visibleSumPlTodPct = uiSnapTable.visibleSumPlTodVal / uiSnapTable.priorCloseNetLiquidation; // visible - profit & Loss total percent change
    uiSnapTable.totalMaxRiskedLeverage = (uiSnapTable.totalMaxRiskedN / uiSnapTable.netLiquidation);
    uiSnapTable.betaDeltaAdjTotalMarketOrientationLeverage = (uiSnapTable.betaDeltaAdjTotalMarketOrientation / uiSnapTable.netLiquidation);
    uiSnapTable.visibleNumOfPoss = uiSnapTable.poss.length;

    uiSnapTable.poss = uiSnapTable.poss.sort((n1: UiAssetSnapPossPos, n2: UiAssetSnapPossPos) => {
      if (isSortingDirectionAscending)
        return (n1[sortColumn] > n2[sortColumn]) ? 1 : ((n1[sortColumn] < n2[sortColumn]) ? -1 : 0);
      else
        return (n2[sortColumn] > n1[sortColumn]) ? 1 : ((n2[sortColumn] < n1[sortColumn]) ? -1 : 0);
    });
  }

  static updateSnapshotTableWithRtNav(lstValObj: Nullable<AssetLastJs[]>, uiSnapTable: UiSnapTable) {
    if (!(Array.isArray(lstValObj) && lstValObj.length > 0))
      return;
    for (const item of lstValObj) {
      if (item.assetId === uiSnapTable.navAssetId) {
        uiSnapTable.netLiquidation = item.last;
        uiSnapTable.navLastUpdateTimeLoc = new Date(item.lastUtc);
        uiSnapTable.navLastUpdateTimeAgoStr = SqNgCommonUtilsTime.ConvertMilliSecToTimeStr(Date.now() - (uiSnapTable.navLastUpdateTimeLoc).getTime()) == null ? SqNgCommonUtilsTime.ConvertMilliSecToTimeStr(uiSnapTable.snapLastUpateTimeLoc.getTime()) : SqNgCommonUtilsTime.ConvertMilliSecToTimeStr(Date.now() - (uiSnapTable.navLastUpdateTimeLoc).getTime());
        uiSnapTable.plTodPrNav = Math.round(uiSnapTable.netLiquidation - uiSnapTable.priorCloseNetLiquidation);
        uiSnapTable.pctChgTodPrNav = (uiSnapTable.netLiquidation - uiSnapTable.priorCloseNetLiquidation) / uiSnapTable.priorCloseNetLiquidation;
        document.title = 'MD:' + '$' + ((uiSnapTable.plTodPrNav / 1000).toFixed(1) + 'K' + '(' + ((uiSnapTable.pctChgTodPrNav) * 100).toFixed(2) + '%)').toString();
      }
    }
  }

  static updateUiWithHist(histObj: Nullable<HistJs[]>, uiHistData: UiHistData[], lstValObj: Nullable<AssetLastJs[]>) {
    if (histObj == null)
      return;
    const todayET = SqNgCommonUtilsTime.ConvertDateLocToEt(new Date());
    todayET.setHours(0, 0, 0, 0); // get rid of the hours, minutes, seconds and milliseconds

    uiHistData.length = 0;
    for (const hisStatItem of histObj) {
      if (hisStatItem.histStat == null || hisStatItem.histValues == null)
        continue;
      const uiHistItem = new UiHistData();
      uiHistItem.assetId = hisStatItem.histStat.assetId;
      uiHistItem.periodEnd = hisStatItem.histStat.periodEnd;
      uiHistItem.periodEndDate = hisStatItem.histStat.periodEndDate;
      uiHistItem.periodHigh = hisStatItem.histStat.periodHigh;
      uiHistItem.periodLow = hisStatItem.histStat.periodLow;
      uiHistItem.periodMaxDD = hisStatItem.histStat.periodMaxDD;
      uiHistItem.periodMaxDU = hisStatItem.histStat.periodMaxDU;
      uiHistItem.periodStart = hisStatItem.histStat.periodStart;
      uiHistItem.periodStartDate = hisStatItem.histStat.periodStartDate;
      // preparing values
      uiHistItem.periodReturn = uiHistItem.periodEnd / uiHistItem.periodStart - 1;
      uiHistItem.periodMaxDrawDown = uiHistItem.periodMaxDD;
      uiHistItem.return = uiHistItem.periodEnd / uiHistItem.periodStart - 1;
      const dataStartDateET = new Date(uiHistItem.periodStartDate); // '2010-09-29T00:00:00' which was UTC is converted to DateObj interpreted in Local time zone {Tue Sept 29 2010 00:00:00 GMT+0000 (Greenwich Mean Time)}
      const nDays = SqNgCommonUtilsTime.DateDiffNdays(dataStartDateET, todayET); // 2 weeks = 14 days, 2020 year: 366 days, because it is a leap year.
      const nYears = nDays / 365.25; // exact number of days in a year in average 365.25 days, because it is 3 times 365 and 1 time 366
      uiHistItem.cagr = Math.pow(1 + uiHistItem.return, 1.0 / nYears) - 1;
      uiHistItem.drawDown = uiHistItem.periodEnd / uiHistItem.periodHigh - 1;
      uiHistItem.drawUp = uiHistItem.periodEnd / uiHistItem.periodLow - 1;
      uiHistItem.maxDrawDown = Math.min(uiHistItem.periodMaxDD, uiHistItem.drawDown);
      uiHistItem.maxDrawUp = Math.max(uiHistItem.periodMaxDU, uiHistItem.drawUp);
      uiHistItem.sqTicker = hisStatItem.histValues.sqTicker;
      for (let i = 0; i < hisStatItem.histValues.histDates.length; i++ ) {
        const brAccItem = new UiChrtval();
        const dateStr: string = hisStatItem.histValues.histDates[i];
        brAccItem.date = new Date(dateStr.substring(0, 4) + '-' + dateStr.substring(4, 6) + '-' + dateStr.substring(6, 8));
        brAccItem.sdaClose = (hisStatItem.histValues.histSdaCloses[i]) / 1000; // divided by thousand to show data in K (Ex: 20,000 = 20K)
        uiHistItem.navChrtVals.push(brAccItem);
      }
      uiHistData.push(uiHistItem);
    }

    // Just for debugging purpose - yet to develop
    const chartLastDate = uiHistData[0].navChrtVals[uiHistData[0].navChrtVals.length - 1].date;
    const lastValue = uiHistData[0].navChrtVals[uiHistData[0].navChrtVals.length - 1].sdaClose;
    // real time value
    if ((Array.isArray(lstValObj) && lstValObj.length > 0)) {
      for (const item of lstValObj) {
        if (uiHistData[0].assetId != item.assetId)
          continue;

        const rtDate = new Date(item.lastUtc);
        const rtPrice = item.last / 1000; // divided by thousand to show data in K (Ex: 20,000 = 20K)
        if (rtDate === chartLastDate) // we have to overwrite the last item
          uiHistData[0].navChrtVals[uiHistData[0].navChrtVals.length - 1].sdaClose = rtPrice;
        else {
          const rtItem = new UiChrtval();
          rtItem.date = rtDate;
          rtItem.sdaClose = rtPrice;
          uiHistData[0].navChrtVals.push(rtItem);
        }
        console.log('last date is: ', chartLastDate + ' lastvalue is: ', lastValue + ' rtDate is:', rtDate + ' rtPrice val is:', rtPrice);
      }
    }

    // processing the navChart
    d3.selectAll('#navChrt > *').remove();
    const firstEleOfHistDataArr1 = uiHistData[0].navChrtVals[0].sdaClose; // used to convert the data into percentage values
    const firstEleOfHistDataArr2 = uiHistData[1].navChrtVals[0].sdaClose; // used to convert the data into percentage values
    const lineChrtDiv = document.getElementById('navChrt') as HTMLElement;
    const margin = {top: 10, right: 50, bottom: 30, left: 60 };
    const inputWidth = 660 - margin.left - margin.right;
    const inputHeight = 400 - margin.top - margin.bottom;
    const yAxisTickformat: string = '%';
    const navChrtData1 = uiHistData[0].navChrtVals.map((r:{ date: Date; sdaClose: number; }) =>
      ({date: new Date(r.date), sdaClose: (100 * r.sdaClose / firstEleOfHistDataArr1)}));
    const navChrtData2 = uiHistData[1].navChrtVals.map((r:{ date: Date; sdaClose: number; }) =>
      ({date: new Date(r.date), sdaClose: (100 * r.sdaClose / firstEleOfHistDataArr2)}));
    // find data range
    const xMin = d3.min(navChrtData1, (r:{ date: any; }) => r.date);
    const xMax = d3.max(navChrtData1, (r:{ date: any; }) => r.date);
    const yMinAxis = Math.min(d3.min(navChrtData1, (r:{ sdaClose: any; }) => r.sdaClose), d3.min(navChrtData2, (r:{ sdaClose: any; }) => r.sdaClose ));
    const yMaxAxis = Math.max(d3.max(navChrtData1, (r:{ sdaClose: any; }) => r.sdaClose), d3.max(navChrtData2, (r:{ sdaClose: any; }) => r.sdaClose ));
    const isNavChrt: boolean = true;

    BrAccViewerComponent.processUiWithNavAndStockChrt(navChrtData1, navChrtData2, lineChrtDiv, inputWidth, inputHeight, margin, xMin, xMax, yMinAxis, yMaxAxis, yAxisTickformat, firstEleOfHistDataArr1, isNavChrt);
  }

  static updateStockHistData(stockObj: Nullable<BrAccHistValuesJs>, uiSnapTable: UiSnapTable) {
    if (stockObj == null)
      return;
    uiSnapTable.stockChartVals.length = 0;
    for (let i = 0; i < stockObj.histDates.length; i++) {
      const stockVal = new UiChrtval();
      const dateStr: string = stockObj.histDates[i];
      stockVal.date = new Date(dateStr.substring(0, 4) + '-' + dateStr.substring(4, 6) + '-' + dateStr.substring(6, 8));
      stockVal.sdaClose = stockObj.histSdaCloses[i];
      uiSnapTable.stockChartVals.push(stockVal);
    }

    // processing Ui With StockChrt
    d3.selectAll('#stockChrt > *').remove();
    const firstEleOfHistDataArr1 = 100; // used to convert the data into percentage values
    const lineChrtDiv = document.getElementById('stockChrt') as HTMLElement;
    const yAxisTickformat: string = '';
    const margin = {top: 10, right: 30, bottom: 30, left: 40 };
    const inputWidth = 460 - margin.left - margin.right;
    const inputHeight = 200 - margin.top - margin.bottom;
    const stckChrtData = uiSnapTable.stockChartVals.map((r:{ date: Date; sdaClose: number; }) =>
      ({date: new Date(r.date), sdaClose: (r.sdaClose)}));
    // find data range
    const xMin = d3.min(stckChrtData, (r:{ date: any; }) => r.date);
    const xMax = d3.max(stckChrtData, (r:{ date: any; }) => r.date);
    const yMinAxis = d3.min(stckChrtData, (r:{ sdaClose: any; }) => r.sdaClose);
    const yMaxAxis = d3.max(stckChrtData, (r:{ sdaClose: any; }) => r.sdaClose);
    const isNavChrt: boolean = false;
    BrAccViewerComponent.processUiWithNavAndStockChrt(stckChrtData, stckChrtData, lineChrtDiv, inputWidth, inputHeight, margin, xMin, xMax, yMinAxis, yMaxAxis, yAxisTickformat, firstEleOfHistDataArr1, isNavChrt);
  }

  onNavSelectedChange() {
    gDiag.wsBrAccVwOnLastNavSelectChangeStart = new Date();
    gDiag.wsBrAccVwSnapshotReceiveReason = 'NavSelectChange';
    if (this._parentWsConnection != null && this._parentWsConnection.readyState === WebSocket.OPEN) //  if user already selected a different DateRange or different Benchmark then we tell the server to send that in historical data
      this._parentWsConnection.send('BrAccViewer.ChangeNav:' + this.navSelectionSelected + ',Bnchmrk:' + this.bnchmkTickerSelectionSelected.toUpperCase() + ',Date:' + this.histPeriodStartETstr + '...' + this.histPeriodEndETstr);
  }

  onBnchmrkSelectionClicked(bnchmkTickerSelectionSelected: string ) {
    this.bnchmkTickerSelectionSelected = bnchmkTickerSelectionSelected;
    if (this._parentWsConnection != null && this._parentWsConnection.readyState === WebSocket.OPEN)
      this._parentWsConnection.send('BrAccViewer.GetNavChrtData:Bnchmrk:' + this.bnchmkTickerSelectionSelected.toUpperCase() + ',Date:' + this.histPeriodStartETstr + '...' + this.histPeriodEndETstr);
    (document.getElementById('bnchmrkInput') as HTMLInputElement).value = this.bnchmkTickerSelectionSelected;
  }

  onAssetCategorySelectionClicked(uiAssetCategories: any) {
    this.assetCategorySelectionSelected = uiAssetCategories.tag;
    this.assetCategorySelectedSqtickers = uiAssetCategories.sqTickers;
    BrAccViewerComponent.updateSnapshotTable(this.brAccountSnapshotObj, this.isSortingDirectionAscending, this.sortColumn, this.assetCategorySelectedSqtickers, this.isFilteringBasedonMktVal, this.isFilteringBasedonPlDaily, this.isFilteringBasedonOptions, this.uiSnapTable, this.visibleList);
  }

  onHistPeriodSelectionClicked(histPeriodSelectionSelected: string) {
    this.histPeriodSelectionSelected = histPeriodSelectionSelected;
    const currDateET: Date = new Date(); // gets today's date
    if (this.histPeriodSelectionSelected.toUpperCase() === 'YTD')
      this.histPeriodStartETstr = (new Date(currDateET.getFullYear() - 1, 11, 31)).toString();
    else if (this.histPeriodSelectionSelected.toLowerCase().endsWith('y')) {
      const lbYears = parseInt(this.histPeriodSelectionSelected.substr(0, this.histPeriodSelectionSelected.length - 1), 10);
      this.histPeriodStartETstr = (new Date(currDateET.setFullYear(currDateET.getFullYear() - lbYears)).toString());
    } else if (this.histPeriodSelectionSelected.toLowerCase().endsWith('m')) {
      const lbMonths = parseInt(this.histPeriodSelectionSelected.substr(0, this.histPeriodSelectionSelected.length - 1), 10);
      this.histPeriodStartETstr = (new Date(currDateET.setMonth(currDateET.getMonth() - lbMonths)).toString());
    }

    this.histPeriodStartETstr = SqNgCommonUtilsTime.Date2PaddedIsoStr(new Date(this.histPeriodStartETstr));
    this.onHistPeriodChangeClicked();
    (document.getElementById('histPeriodInput') as HTMLInputElement).value = this.histPeriodSelectionSelected;
  }

  onHistPeriodChangeClicked() {
    this.histPeriodChange();
  }

  histPeriodChange() {
    // Convert input strings to Date objects
    const startDate: Date = new Date(this.histPeriodStartETstr); // "202222-03-01", Max year for C# DateTime 9999 (anything above throws an Exception). In JS, max Date: "September 13, 275760", so in JS that long date is allowed. No Exception thrown.
    const endDate: Date = new Date(this.histPeriodEndETstr);

    const minAllowedDate = new Date(1900, 1, 1); // Define the minimum valid year.
    const maxAllowedDate = new Date(); // Get the current date
    // Check if either start or end date is valid or not.
    // Ensure that the start date's year is not before 1900 and the start date is not in the future; similarly, verify that the end date's year is not prior to 1900 and the end date is not in the future.
    this.isHistPeriodDateValid = minAllowedDate <= startDate && startDate <= maxAllowedDate && minAllowedDate <= endDate && endDate <= maxAllowedDate;
    if (this.isHistPeriodDateValid) { // send the message to server only if the dates are valid
      if (this._parentWsConnection != null && this._parentWsConnection.readyState === WebSocket.OPEN)
        this._parentWsConnection.send('BrAccViewer.GetNavChrtData:Bnchmrk:' + this.bnchmkTickerSelectionSelected.toUpperCase() + ',Date:' + this.histPeriodStartETstr + '...' + this.histPeriodEndETstr);
    }
  }

  onSortingClicked(sortColumn: string) {
    this.isSortingDirectionAscending = !this.isSortingDirectionAscending;
    this.sortColumn = sortColumn;
    BrAccViewerComponent.updateSnapshotTable(this.brAccountSnapshotObj, this.isSortingDirectionAscending, this.sortColumn, this.assetCategorySelectedSqtickers, this.isFilteringBasedonMktVal, this.isFilteringBasedonPlDaily, this.isFilteringBasedonOptions, this.uiSnapTable, this.visibleList);
  }

  onTabHeaderClicked(tabIdx: number) {
    this.tabPageVisibleIdx = tabIdx;
  }

  onSnapshotRefreshClicked() {
    this.snapshotRefresh();
  }

  snapshotRefresh() {
    gDiag.wsBrAccVwOnLastRefreshSnapshotStart = new Date();
    gDiag.wsBrAccVwSnapshotReceiveReason = 'RefreshSnapshot';
    if (this._parentWsConnection != null && this._parentWsConnection.readyState === WebSocket.OPEN)
      this._parentWsConnection.send('BrAccViewer.RefreshSnapshot:' + this.navSelectionSelected);
  }

  onSnapTableSmallMktValClicked() {
    this.isFilteringBasedonMktVal = !this.isFilteringBasedonMktVal;
    BrAccViewerComponent.updateSnapshotTable(this.brAccountSnapshotObj, this.isSortingDirectionAscending, this.sortColumn, this.assetCategorySelectedSqtickers, this.isFilteringBasedonMktVal, this.isFilteringBasedonPlDaily, this.isFilteringBasedonOptions, this.uiSnapTable, this.visibleList);
  }

  onSnapTableSmallPlDailyClicked() {
    this.isFilteringBasedonPlDaily = !this.isFilteringBasedonPlDaily;
    BrAccViewerComponent.updateSnapshotTable(this.brAccountSnapshotObj, this.isSortingDirectionAscending, this.sortColumn, this.assetCategorySelectedSqtickers, this.isFilteringBasedonMktVal, this.isFilteringBasedonPlDaily, this.isFilteringBasedonOptions, this.uiSnapTable, this.visibleList);
  }

  onSnapTableOptionsClicked() {
    this.isFilteringBasedonOptions = !this.isFilteringBasedonOptions;
    BrAccViewerComponent.updateSnapshotTable(this.brAccountSnapshotObj, this.isSortingDirectionAscending, this.sortColumn, this.assetCategorySelectedSqtickers, this.isFilteringBasedonMktVal, this.isFilteringBasedonPlDaily, this.isFilteringBasedonOptions, this.uiSnapTable, this.visibleList);
  }

  onMouseEnterSnapTableSymbol(event: any, snapPos: UiAssetSnapPossPos) {
    this.stockTooltipSymbol = snapPos.symbol;
    this.stockTooltipName = snapPos.name;
    if (this._parentWsConnection != null && this._parentWsConnection.readyState === WebSocket.OPEN)
      this._parentWsConnection.send('BrAccViewer.GetStockChrtData:' + 'S/' + snapPos.symbol);

    const stockTooltipCoords = (document.getElementById('stckTooltip') as HTMLSelectElement);
    const scrollLeft = (window.pageXOffset !== undefined) ? window.pageXOffset : ((document.documentElement || document.body.parentNode || document.body) as HTMLElement).scrollLeft;
    const scrollTop = (window.pageYOffset !== undefined) ? window.pageYOffset : ((document.documentElement || document.body.parentNode || document.body) as HTMLElement).scrollTop;
    stockTooltipCoords.style.left = 10 + event.pageX - scrollLeft + 'px';
    stockTooltipCoords.style.top = event.pageY - scrollTop + 'px';
  }

  onMouseOverSnapTableSymbol() {
    this.isMouseInSnapSymbolCell = true;
    this.isShowStockTooltip = this.isMouseInSnapSymbolCell || this.isMouseInTooltip;
  }

  onMouseLeaveSnapTableSymbol() {
    this.isMouseInSnapSymbolCell = false;
    setTimeout(() => { this.isShowStockTooltip = this.isMouseInSnapSymbolCell || this.isMouseInTooltip; }, 200); // don't remove tooltip immediately, because onMouseEnterStockTooltip() will only be called later if Tooltip doesn't disappear
  }

  onMouseEnterStockTooltip() {
    this.isMouseInTooltip = true;
    this.isShowStockTooltip = this.isMouseInSnapSymbolCell || this.isMouseInTooltip;
  }

  onMouseLeaveStockTooltip() {
    this.isMouseInTooltip = false;
    this.isShowStockTooltip = this.isMouseInSnapSymbolCell || this.isMouseInTooltip;
  }

  onOpenTechicalAnalyzerClicked() {
    const technicalAnalyzerStr: string[] = [];
    for (const ticker of this.visibleList) {
      if (!technicalAnalyzerStr.includes(ticker)) // Ensure the ticker is not already in technicalAnalyzerStr before adding it.
        technicalAnalyzerStr.push(ticker);
    }
    window.open('//sqcore.net/webapps/TechnicalAnalyzer/?tickers=' + technicalAnalyzerStr.toString());
  }

  static shortMonthFormat(date: any) : string {
    const formatMillisec = d3.timeFormat('.%L');
    const formatShortMonth = d3.timeFormat('%b');
    const formatYear = d3.timeFormat('%Y');
    return (d3.timeSecond(date) < date ? formatMillisec :
      d3.timeYear(date) < date ? formatShortMonth :
      formatYear)(date);
  }

  static processUiWithNavAndStockChrt(navChrtData1: any, navChrtData2: any, lineChrtDiv: HTMLElement, inputWidth: number, inputHeight: number, margin: any, xMin: number, xMax: number, yMinAxis: number, yMaxAxis: number, yAxisTickformat: string, firstEleOfHistDataArr1: any, isNavChrt: boolean) {
    // range of data configuring
    const brAccChrtScaleX = d3.scaleTime().domain([xMin, xMax]).range([0, inputWidth]);
    const brAccChrtScaleY = d3.scaleLinear().domain([yMinAxis - 5, yMaxAxis + 5]).range([inputHeight, 0]);

    const brAccChrt = d3.select(lineChrtDiv).append('svg')
        .attr('width', inputWidth + margin.left + margin.right)
        .attr('height', inputHeight + margin.top + margin.bottom)
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
    const brAccChrtScaleYAxis = d3.axisLeft(brAccChrtScaleY).tickFormat((r: any) => Math.round(r) + yAxisTickformat);

    brAccChrt.append('g')
        .attr('transform', 'translate(0,' + inputHeight + ')')
        .call(d3.axisBottom(brAccChrtScaleX).tickFormat(BrAccViewerComponent.shortMonthFormat));
    brAccChrt.append('g').call(brAccChrtScaleYAxis);

    // Define the line
    const line = d3.line()
        .x((r: any) => brAccChrtScaleX(r.date))
        .y((r: any) => brAccChrtScaleY(r.sdaClose))
        .curve(d3.curveCardinal);
    const line2 = d3.line()
        .x((r: any) => brAccChrtScaleX(r.date))
        .y((r: any) => brAccChrtScaleY(r.sdaClose))
        .curve(d3.curveCardinal);

    const brAccChrtline = brAccChrt.append('g');
    const focus = brAccChrt.append('g').style('display', 'none');
    // Add the valueline path.
    brAccChrtline.append('path')
        .attr('class', 'line')
        .datum(navChrtData1) // Binds data to the line
        .attr('d', line as any);

    brAccChrtline.append('path')
        .attr('class', 'line2')
        .style('stroke-dasharray', ('3, 3'))
        .datum(navChrtData2) // Binds data to the line
        .attr('d', line2 as any);

    // append the x line
    focus.append('line')
        .attr('class', 'x')
        .style('stroke', 'blue')
        .style('stroke-dasharray', '3,3')
        .style('opacity', 0.5)
        .attr('y1', 0)
        .attr('y2', inputHeight);

    // append the y line
    focus.append('line')
        .attr('class', 'y')
        .style('stroke', 'blue')
        .style('stroke-dasharray', '3,3')
        .style('opacity', 0.5)
        .attr('x1', inputWidth)
        .attr('x2', inputWidth);
    focus.append('line2')
        .attr('class', 'y')
        .style('stroke', 'blue')
        .style('stroke-dasharray', '3,3')
        .style('opacity', 0.5)
        .attr('x1', inputWidth)
        .attr('x2', inputWidth);

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
        .attr('dx', -10)
        .attr('dy', '-2em');
    focus.append('text')
        .attr('class', 'y2')
        .attr('dx', -10)
        .attr('dy', '-2em');

    // place the date at the intersection
    focus.append('text')
        .attr('class', 'y3')
        .style('stroke', 'white')
        .style('stroke-width', '3.5px')
        .style('opacity', 0.8)
        .attr('dx', -30)
        .attr('dy', '-1em');
    focus.append('text')
        .attr('class', 'y4')
        .attr('dx', -30)
        .attr('dy', '-1em');

    // append the rectangle to capture mouse
    brAccChrt.append('rect')
        .attr('width', inputWidth)
        .attr('height', inputHeight)
        .style('fill', 'none')
        .style('pointer-events', 'all')
        .on('mouseover', function() { focus.style('display', null); })
        .on('mouseout', function() { focus.style('display', 'none'); })
        .on('mousemove', mousemove);

    const formatMonth = d3.timeFormat('%Y%m%d');
    const bisectDate = d3.bisector((r: any) => r.date).left;

    function mousemove(event: any) {
      const x0 = brAccChrtScaleX.invert(d3.pointer(event)[0]);
      const i = bisectDate(navChrtData1, x0, 1);
      const d0 = navChrtData1[i - 1];
      const d1 = navChrtData1[i];
      const r = (x0.getTime() - d0.date.getTime()) > (d1.date.getTime() - x0.getTime()) ? d1 : d0;
      focus.select('circle.y')
          .attr('transform', 'translate(' + brAccChrtScaleX(r.date) + ',' + brAccChrtScaleY(r.sdaClose) + ')');
      focus.select('text.y1')
          .attr('transform', 'translate(' + brAccChrtScaleX(r.date) + ',' + brAccChrtScaleY(r.sdaClose) + ')')
          .text(Math.round(r.sdaClose * firstEleOfHistDataArr1 / 100));
      if (isNavChrt) {
        focus.select('text.y2')
            .attr('transform', 'translate(' + brAccChrtScaleX(r.date) + ',' + brAccChrtScaleY(r.sdaClose) + ')')
            .text(d3.format(',')(Math.round(r.sdaClose * firstEleOfHistDataArr1 / 100)) + 'K');
      } else {
        focus.select('text.y2')
            .attr('transform', 'translate(' + brAccChrtScaleX(r.date) + ',' + brAccChrtScaleY(r.sdaClose) + ')')
            .text(d3.format(',')(Math.round(r.sdaClose * firstEleOfHistDataArr1 / 100)));
      }
      focus.select('text.y3')
          .attr('transform', 'translate(' + brAccChrtScaleX(r.date) + ',' + brAccChrtScaleY(r.sdaClose) + ')')
          .text(formatMonth(r.date));
      focus.select('text.y4')
          .attr('transform', 'translate(' + brAccChrtScaleX(r.date) + ',' + brAccChrtScaleY(r.sdaClose) + ')')
          .text(formatMonth(r.date));
      focus.select('.x')
          .attr('transform', 'translate(' + brAccChrtScaleX(r.date) + ',' + brAccChrtScaleY(r.sdaClose) + ')')
          .attr('y2', inputHeight - brAccChrtScaleY(r.sdaClose));
      focus.select('.y')
          .attr('transform', 'translate(' + inputWidth * -1 + ',' + brAccChrtScaleY(r.sdaClose) + ')')
          .attr('x2', inputWidth + inputWidth);
    }
  }
}