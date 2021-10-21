import { ViewChild, Component, AfterViewInit,ElementRef, Input} from '@angular/core';
import { SqNgCommonUtilsStr } from './../../../../sq-ng-common/src/lib/sq-ng-common.utils_str';
import { SqNgCommonUtilsTime, minDate } from './../../../../sq-ng-common/src/lib/sq-ng-common.utils_time';   // direct reference, instead of via 'public-api.ts' as an Angular library. No need for 'ng build sq-ng-common'. see https://angular.io/guide/creating-libraries
import * as d3 from 'd3';
import { gDiag, AssetLastJs } from './../../sq-globals';

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
  public poss : Nullable<BrAccSnapshotPosJs[]> = null;
}

class BrAccSnapshotPosJs {
  public assetId = NaN;
  public sqTicker = '';
  public symbol = '';
  public name = '';
  public pos = NaN;
  public avgCost = NaN;
  public priorClose = NaN;
  public estPrice = NaN;
  public estUndPrice = NaN;
  public accId = ''
}

class HistJs {
  public histStat :Nullable<BrAccHistStatJs> = null;
  public histValues : Nullable<BrAccHistValuesJs> = null;
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
class UiMktBarItem {
  public assetId = NaN;
  public sqTicker = '';
  public symbol = '';
  public name = '';
  public priorClose  = NaN;
  public last  = 500;
  public pctChg  = 0.01;
}

class UiSnapTable {
  public symbol = '';
  public lastUpdate = '';
  public snapLastUpateTime = new Date();
  public snapLastUpdateTimeAgo = NaN;
  public snapLastUpdateTimeAgoStr = '';
  public netLiquidation = NaN;
  public netLiquidationStr = '';
  public priorCloseNetLiquidation = NaN;
  public grossPositionValue = NaN;
  public totalCashValue = NaN;
  public initialMarginReq = NaN;
  public maintMarginReq = NaN;
  public poss : UiAssetSnapPossPos[] = [];
  public sumPlTodVal = 0;
  public sumPlTodPct = 0;
  public longStcokValue = 0;
  public shortStockValue = 0;
  public totalMaxRiskedN = 0;
  public totalMaxRiskedLeverage = 0;
  public numOfPoss = 0;
  public plTodPrNav = NaN;
  public pctChgTodPrNav = NaN;
}

class UiAssetSnapPossPos {
  public assetId = NaN;
  public sqTicker = '';
  public symbol = '';
  public name = '';
  public pos = NaN;
  public avgCost = NaN;
  public priorClose = NaN;
  public priorCloseStr = '';
  public estPrice = NaN;
  public pctChgTod = NaN;
  public plTod = NaN;
  public pl = NaN;
  public mktVal = NaN;
  public estUndPrice = NaN;
  public gBeta = 1; // guessed Beta
  public betaDltAdj = 1;
  public accId = '';
}

// Hist stat Values
class UiHistData {
  public assetId = NaN;
  public sqTicker ='';

  public priorClose = NaN;
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
  public rtReturn = NaN;  // comparing last (rt) price to periodEnd price.
  public return = NaN;  // Total return (from startDate to endDate to last realtime): adding period-return and realtime-return together. Every other performance number (cagr, maxDD) is also Total.
  public cagr = NaN;
  public drawDown = NaN;
  public drawUp = NaN;
  public maxDrawDown = NaN;
  public maxDrawUp = NaN;
  public histDates = [];
  public histSdaCloses = [];
  public brAccChrtActuals : UiBrcAccChrtval [] = [];
}

// Hist chart values
class UiBrcAccChrtval {
  public chartDate = new Date('2021-01-01');
  public chrtSdaClose = NaN;
}

@Component({
  selector: 'app-bracc-viewer',
  templateUrl: './bracc-viewer.component.html',
  styleUrls: ['./bracc-viewer.component.scss'],
})
export class BrAccViewerComponent implements AfterViewInit {
  @Input() _parentWsConnection?: WebSocket = undefined;    // this property will be input from above parent container
  @ViewChild('chart') chartRef!:ElementRef;

  // Guessed Beta for HL hedges and companies
  // MarketWatch Beta calculation is quite good. Use that If it is available.  There, Beta of QQQ: 1.18, that is the base.  
  static betaArr: { [id: string] : number; } = 
    {"QQQ": 1.18/1.18, "TQQQ": 3.0, "SQQQ": -3.0, "SPY": 1/1.18, "SPXL": 3*1/1.18, "UPRO": 3*1/1.18, "SPXS": -3*1/1.18, "SPXU": -3*1/1.18, "TWM": -2.07/1.18,            // market ETFs
    "VXX": -3.4/1.18,  "VXZ": -1.82/1.18,  "SVXY": 1.7/1.18, "ZIV": 1.81/1.18,                  // VIX
    "TLT": -0.50/1.18, // https://www.ishares.com/us/products/239454/ishares-20-year-treasury-bond-etf says -0.25, MarketWatch: -0.31, discretionary override from -0.31 to -0.50 (TMF too)
    "TMF": 3*-0.50/1.18, "TMV": -1*3*-0.50/1.18,  "TIP": -0.06/1.18, 
    "USO": 0.83/1.18, "SCO": -2.0*0.83/1.18, "UCO": 1.25/1.18, 
    "UNG": 0.23/1.18,   // discretionary override from 0.03 to 0.23 (UGAZ too)
    "UGAZ": 3*0.23/1.18,     
    "GLD": (-0.24*1.18)/1.18,  // GLD has no Beta on MarketWatch. YF (5Years, monthly): 0.04. But DC's discretionary (logical) override: -0.24 
    "TAIL": -1/1.18,    // compared TAIL vs. SPY and it moves about the same beta, just opposite
    "UUP": (-0.31)/1.18,    // YF Beta calculation; when market panics, the whole world wants to buy safe USA treasuries, therefore USD goes up => negative correlation.
    // companies
    "PM": 0.62/1.18 ,
    };     // it is QQQ Beta, not SPY beta

  handshakeStr = '[Nothing arrived yet]';
  handshakeStrFormatted = '[Nothing arrived yet]';
  handshakeObj: Nullable<BrAccVwrHandShk> = null;
  mktBrLstClsStr = '[Nothing arrived yet]';
  mktBrLstClsStrFormatted = '[Nothing arrived yet]';
  mktBrLstClsObj: Nullable<AssetPriorCloseJs[]> = null;
  histStr = '[Nothing arrived yet]';
  histStrFormatted = '[Nothing arrived yet]';
  histObj: Nullable<HistJs[]> = null;
  brAccountSnapshotStr = '[Nothing arrived yet]';
  brAccountSnapshotStrFormatted = '[Nothing arrived yet]';
  brAccountSnapshotObj : Nullable<BrAccSnapshotJs>=null;
  lstValObj: Nullable<AssetLastJs[]> = null;  // realtime or last values
  
  selectedNav = '';
  uiMktBar: UiMktBarItem[] = [];

  uiSnapTable : UiSnapTable = new UiSnapTable();
  uiHistData : UiHistData [] = [];  // length: 2: (uiHistData[0].assetId + uiHistData[0].brAccChrtActuals)  vs.  (uiHistData[1].assetId + uiHistData[1].brAccChrtActuals)
  
  tabPageVisibleIdx = 1;
  sortColumn : string = "DailyPL";
  sortDirection : string = "Increase";
  uiNavSel : string[] = [];
  navSelectionSelected = '';
  perfIndicatorSelected = '';
  yrSelectionChoices = ['YTD','1M','1Y','3Y','5Y'];
  yrSelectionSelected = 'YTD';
  lookbackStartET: Date; // set in ctor. We need this in JS client to check that the received data is long enough or not (Expected Date)
  lookbackStartETstr: string; // set in ctor; We need this for sending String instruction to Server. Anyway, a  HTML <input date> is always a 	A DOMString representing a date in YYYY-MM-DD format, or empty. https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/date
  lookbackEndET: Date;
  lookbackEndETstr: string;
 
  constructor() {

    const todayET = SqNgCommonUtilsTime.ConvertDateLocToEt(new Date());
    todayET.setHours(0, 0, 0, 0); // get rid of the hours, minutes, seconds and milliseconds

    this.lookbackStartET = new Date(todayET.getFullYear() - 1, 11, 31);  // set YTD as default
    this.lookbackStartETstr = SqNgCommonUtilsTime.Date2PaddedIsoStr(this.lookbackStartET);

    // https://stackoverflow.com/questions/563406/add-days-to-javascript-date
    const yesterDayET = new Date(todayET);
    yesterDayET.setDate(yesterDayET.getDate() - 1);
    this.lookbackEndET = new Date(yesterDayET.getFullYear(), yesterDayET.getMonth(), yesterDayET.getDate());  // set yesterdayET as default
    this.lookbackEndETstr = SqNgCommonUtilsTime.Date2PaddedIsoStr(this.lookbackEndET);

    setInterval(() => { this.snapshotRefresh(); }, 60 * 60 * 1000); // forced Snapshot table refresh timer in every 60 mins
   }

  public webSocketOnMessage(msgCode: string, msgObjStr: string): boolean {
    switch (msgCode) {
      case 'BrAccViewer.BrAccSnapshot': // this is the most frequent message after LstVal (realtime price). Should come first.
        console.log('BrAccViewer.BrAccSnapshot:' + msgObjStr);
        this.brAccountSnapshotStr = msgObjStr;
        this.brAccountSnapshotStrFormatted = SqNgCommonUtilsStr.splitStrToMulLines(msgObjStr);
        this.brAccountSnapshotObj = JSON.parse(msgObjStr);
        BrAccViewerComponent.updateSnapshotTable(this.brAccountSnapshotObj, this.sortColumn, this.sortDirection, this.uiSnapTable);
        const jsonObjSnap = JSON.parse(msgObjStr);
        this.updateUiWithSnapshot(jsonObjSnap);
        return true;
      case 'BrAccViewer.Hist':
        console.log('BrAccViewer.Hist:' + msgObjStr);
        this.histStr = msgObjStr;
        this.histStrFormatted = SqNgCommonUtilsStr.splitStrToMulLines(msgObjStr);
        this.histObj = JSON.parse(msgObjStr);
        BrAccViewerComponent.updateChrtUi(this.histObj, this.uiHistData);
        // this.fillChartWithData();
        // if message is too large without spaces, we have problems as there is no horizontal scrollbar in browser. So, shorten the message.
        if (msgObjStr.length < 200)
          this.histStr = msgObjStr;
        else
          this.histStr = msgObjStr.substring(0, 200) + '... [more data arrived]';
        return true;
      case 'BrAccViewer.MktBrLstCls':
        if (gDiag.wsOnFirstBrAccVwMktBrLstCls === minDate)
          gDiag.wsOnFirstBrAccVwMktBrLstCls = new Date();
        console.log('BrAccViewer.MktBrLstCls:' + msgObjStr);
        this.mktBrLstClsStr = msgObjStr;
        this.mktBrLstClsStrFormatted = SqNgCommonUtilsStr.splitStrToMulLines(msgObjStr);
        this.mktBrLstClsObj = JSON.parse(msgObjStr);
        BrAccViewerComponent.updateMktBarUi((this.handshakeObj == null) ? null : this.handshakeObj.marketBarAssets, this.mktBrLstClsObj, this.lstValObj, this.uiMktBar);
        return true;
      case 'BrAccViewer.Handshake':  // this is the least frequent message. Should come last.
        console.log('BrAccViewer.Handshake:' + msgObjStr);
        this.handshakeStr = msgObjStr;
        this.handshakeStrFormatted = SqNgCommonUtilsStr.splitStrToMulLines(msgObjStr);
        this.handshakeObj = JSON.parse(msgObjStr);
        console.log(`BrAccViewer.Handshake.SelectableBrAccs: '${(this.handshakeObj == null) ? null : this.handshakeObj.selectableNavAssets}'`);
        this.updateUiSelectableNavs((this.handshakeObj == null) ? null : this.handshakeObj.selectableNavAssets);
        return true;
      default:
        return false;
    }
  }
 
  public webSocketLstValArrived(p_lstValObj: Nullable<AssetLastJs[]>) { // real time price data
    this.lstValObj = p_lstValObj;
    BrAccViewerComponent.updateMktBarUi((this.handshakeObj == null) ? null : this.handshakeObj.marketBarAssets, this.mktBrLstClsObj, this.lstValObj, this.uiMktBar);
    BrAccViewerComponent.updateSnapshotTableWithRtNav(p_lstValObj, this.uiSnapTable);
  }
  
  updateUiSelectableNavs(pSelectableNavAssets: Nullable<AssetJs[]>) {  // same in MktHlth and BrAccViewer
    if(pSelectableNavAssets == null)
     return;
    this.navSelectionSelected = '';
    for (const nav of pSelectableNavAssets) {
      if (this.navSelectionSelected == '') // by default, the selected Nav is the first from the list
        this.navSelectionSelected = nav.symbol;
      this.uiNavSel.push(nav.symbol)
    }
  }
  
  onNavSelectedChangeAng(pEvent: any) {
    if (this._parentWsConnection != null && this._parentWsConnection.readyState === WebSocket.OPEN) {
      this._parentWsConnection.send('BrAccViewer.ChangeNav:' + this.navSelectionSelected);
    }
  }

  onPerfIndicatorSelectedChange(pEvent: any) {
    console.log("The performance indicator selected :" + this.perfIndicatorSelected);
  }

  onLookbackChangeAng() {
    console.log('Calling server with new lookback. StartDateETstr: ' + this.lookbackStartETstr + ', lookbackStartET: ' + this.lookbackStartET);
    gDiag.wsOnLastRtMktSumLookbackChgStart = new Date();
    if (this._parentWsConnection != null && this._parentWsConnection.readyState === WebSocket.OPEN) {
      this._parentWsConnection.send('MktHlth.ChangeLookback:Date:' + this.lookbackStartETstr + '...' + this.lookbackEndETstr); // we always send the Date format to server, not the strings of 'YTD/10y'
    }
  }

  onSortingClicked(event, p_sortColumn) {
    this.sortColumn = p_sortColumn;
    if (this.sortDirection == "Increasing")
      this.sortDirection = "Decreasing";
    else 
      this.sortDirection = "Increasing";
    BrAccViewerComponent.updateSnapshotTable(this.brAccountSnapshotObj, this.sortColumn, this.sortDirection, this.uiSnapTable) 
  }

  // tabpage 
  tabHeaderClicked(event: any, tabIdx: number) {
    this.tabPageVisibleIdx = tabIdx;
  }

  onSnapshotRefreshClicked(event) {
    this.snapshotRefresh();
  }
  snapshotRefresh() {
    if (this._parentWsConnection != null && this._parentWsConnection.readyState === WebSocket.OPEN) {
      this._parentWsConnection.send('BrAccViewer.RefreshSnapshot:' + this.navSelectionSelected);
    }
    console.log("hello")
  }

  updateUiWithSnapshot(jsonObjSnap: any) {
    console.log(`BrAccViewer.updateUiWithSnapshot(). Symbol: '${jsonObjSnap.symbol}'`);
    if (this.selectedNav != jsonObjSnap.symbol) // change UI only if it is a meaningful change
      this.selectedNav = jsonObjSnap.symbol;
  }

  // public perfIndicatorSelector(): void { 
  //   const indicatorSelected = (document.getElementById('perfIndicator') as HTMLSelectElement).value;
  //   for (const item of this.brAccHistStatVal) {
  //     BrAccViewerComponent.updateUiColumnBasedOnSelectedIndicator(item, indicatorSelected);
  //   }
  // }

  static updateMktBarUi(marketBarAssets: Nullable<AssetJs[]>, priorCloses: Nullable<AssetPriorCloseJs[]>, lastRt: Nullable<AssetLastJs[]>, uiMktBar: UiMktBarItem[]) {
     // check if both array exist; instead of the old-school way, do ES5+ way: https://stackoverflow.com/questions/11743392/check-if-an-array-is-empty-or-exists
    if (!(Array.isArray(marketBarAssets) && marketBarAssets.length > 0 && Array.isArray(priorCloses) && priorCloses.length > 0  && Array.isArray(lastRt) && lastRt.length > 0))
     return;
    
    for (const item of marketBarAssets) {
      let uiItem: UiMktBarItem;
      const existingUiCols = uiMktBar.filter((r) => r.sqTicker === item.sqTicker);
      if (existingUiCols.length === 0) {
        uiItem = new UiMktBarItem();
        uiItem.assetId = item.assetId;
        uiItem.sqTicker = item.sqTicker;
        uiItem.symbol = item.symbol;
        uiItem.name = item.name;
        uiMktBar.push(uiItem);
      } else if (existingUiCols.length === 1) {
        uiItem = existingUiCols[0];
      } else {
        console.warn(`Received ticker '${item.sqTicker}' has duplicates in UiArray. This might be legit if both VOD.L and VOD wants to be used. ToDo: Differentiation based on assetId is needed.`,"background: #222; color: red");
        uiItem = existingUiCols[0];
      }
    }
    for (const nonRt of priorCloses) {
      const existingUiCols = uiMktBar.filter((r) => r.assetId === nonRt.assetId);
      if (existingUiCols.length === 0) {
        console.warn(`Received assetId '${nonRt.assetId}' is not found in UiArray.`);
        break;
      }
      const uiItem = existingUiCols[0];
      uiItem.priorClose = nonRt.priorClose;
    }
    for (const rtItem of lastRt) {
      const existingUiItems = uiMktBar.filter((r) => r.assetId === rtItem.assetId);
      if (existingUiItems.length === 0) 
        continue;
      const uiItem = existingUiItems[0];
      uiItem.pctChg = (rtItem.last - uiItem.priorClose) / uiItem.priorClose;
    }
  }

  static updateSnapshotTable(brAccSnap : Nullable<BrAccSnapshotJs>, sortColumn : string, sortDirection : string, uiSnapTable : UiSnapTable)
  {
    if (brAccSnap === null || brAccSnap.poss === null)
      return;
    uiSnapTable.symbol = brAccSnap.symbol;
    uiSnapTable.lastUpdate = brAccSnap.lastUpdate;
    uiSnapTable.snapLastUpateTime = new Date(brAccSnap.lastUpdate);
    const timestampDate = new Date (brAccSnap.lastUpdate);
    const timeAgoMsec = new Date (Date.now()- timestampDate.getTime());
    const timeAgoMSecStr = timeAgoMsec.toString();     // number of milliseconds
    console.log(timeAgoMSecStr.substring(16,18) + 'hr' + timeAgoMSecStr.substring(19,21) + 'min' + timeAgoMSecStr.substring(22,24) + 'sec' );
    uiSnapTable.snapLastUpdateTimeAgoStr = timeAgoMSecStr.substring(16,18) + 'h ' + timeAgoMSecStr.substring(19,21) + 'm ' + timeAgoMSecStr.substring(22,24) + 's ago' ;
    uiSnapTable.snapLastUpdateTimeAgo = Math.round((Date.now() - (new Date (brAccSnap.lastUpdate).getTime()))/ (1000 * 60));
    uiSnapTable.totalCashValue = brAccSnap.totalCashValue;
    uiSnapTable.initialMarginReq = brAccSnap.initMarginReq;
    uiSnapTable.maintMarginReq = brAccSnap.maintMarginReq;
    uiSnapTable.grossPositionValue = brAccSnap.grossPositionValue;
    uiSnapTable.netLiquidation = brAccSnap.netLiquidation;
    uiSnapTable.netLiquidationStr = brAccSnap.netLiquidation.toString();
    uiSnapTable.priorCloseNetLiquidation = brAccSnap.priorCloseNetLiquidation;
    uiSnapTable.plTodPrNav = Math.round(brAccSnap.netLiquidation - brAccSnap.priorCloseNetLiquidation);
    uiSnapTable.pctChgTodPrNav = (brAccSnap.netLiquidation - brAccSnap.priorCloseNetLiquidation) / brAccSnap.priorCloseNetLiquidation;
 
    uiSnapTable.poss.length = 0;

    for (const possItem of brAccSnap.poss) {
      console.log("The positions of UiSnapTable are :" + possItem.pos);
      let uiPosItem = new UiAssetSnapPossPos();
      uiPosItem.assetId = possItem.assetId;
      uiPosItem.sqTicker = possItem.sqTicker;
      uiPosItem.symbol = possItem.symbol;
      uiPosItem.name = possItem.name;
      // BrAccViewerComponent.betaArr 
      uiPosItem.gBeta = (uiPosItem.symbol in BrAccViewerComponent.betaArr ) ? BrAccViewerComponent.betaArr [uiPosItem.symbol] : 1.0;
      uiPosItem.pos = possItem.pos;
      uiPosItem.avgCost = possItem.avgCost;
      uiPosItem.priorClose = possItem.priorClose;
      uiPosItem.priorCloseStr = possItem.priorClose.toFixed(2).toString();
      uiPosItem.estPrice = possItem.estPrice;
      uiPosItem.estUndPrice = possItem.estUndPrice;
      uiPosItem.accId = possItem.accId;
      uiPosItem.mktVal = Math.round(possItem.pos * possItem.estPrice);
      uiPosItem.pctChgTod = (possItem.estPrice - possItem.priorClose) / possItem.priorClose;
      uiPosItem.plTod = Math.round(possItem.pos * (possItem.estPrice - possItem.priorClose));
      uiPosItem.pl = Math.round(possItem.pos * (possItem.estPrice - possItem.avgCost))
      uiPosItem.betaDltAdj = Math.round(uiPosItem.gBeta * uiPosItem.mktVal)
      uiSnapTable.poss.push(uiPosItem);
    }
    uiSnapTable.sumPlTodVal = 0;
    uiSnapTable.longStcokValue = 0;
    uiSnapTable.shortStockValue = 0;
    uiSnapTable.totalMaxRiskedN = 0;
    for (const item of uiSnapTable.poss) {
      uiSnapTable.sumPlTodVal += item.plTod;
      if (item.mktVal > 0){ //Long and Short stock values
        uiSnapTable.longStcokValue += item.mktVal;
      } else if (item.mktVal < 0) {
        uiSnapTable.shortStockValue += item.mktVal;
      }
      uiSnapTable.totalMaxRiskedN += Math.abs(item.mktVal);
    } 
    uiSnapTable.sumPlTodPct = uiSnapTable.sumPlTodVal / uiSnapTable.priorCloseNetLiquidation; // profit & Loss total percent change
    uiSnapTable.totalMaxRiskedLeverage = (uiSnapTable.totalMaxRiskedN / uiSnapTable.netLiquidation);
    uiSnapTable.numOfPoss = (uiSnapTable.poss.length) - 1;
  
    // sort by sortColumn
    uiSnapTable.poss.sort((n1: UiAssetSnapPossPos, n2: UiAssetSnapPossPos) => {
      let dirMultiplier = (sortDirection === "Increasing") ? 1 : -1;
      switch (sortColumn) {
        case 'Symbol':
          if (n1.symbol < n2.symbol) return 1 * dirMultiplier;
          else if (n1.symbol > n2.symbol) return -1 * dirMultiplier;
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
          if (n1.plTod < n2.plTod) return 1 * dirMultiplier;
          if (n1.plTod > n2.plTod) return -1 * dirMultiplier;
          break;
        case 'MktVal':
          if (n1.mktVal < n2.mktVal) return 1 * dirMultiplier;
          if (n1.mktVal > n2.mktVal) return -1 * dirMultiplier;
          break;
        case 'EstUndPrice':
          if (n1.estUndPrice < n2.estUndPrice) return 1 * dirMultiplier;
          if (n1.estUndPrice > n2.estUndPrice) return -1 * dirMultiplier;
          break;
        // case 'IbCompUndPr':
        //   if (n1.ibCompUndr < n2.ibCompUndr) return 1 * dirMultiplier;
        //   if (n1.ibCompUndr > n2.ibCompUndr) return -1 * dirMultiplier;
        //   break;
        case 'gBeta':
          if (n1.gBeta < n2.gBeta) return 1 * dirMultiplier;
          if (n1.gBeta > n2.gBeta) return -1 * dirMultiplier;
          break;
        case 'gBetaDltAdj':
          if (n1.betaDltAdj < n2.betaDltAdj) return 1 * dirMultiplier;
          if (n1.betaDltAdj > n2.betaDltAdj) return -1 * dirMultiplier;
          break;
        default:
          console.warn("Urecognized...***");
          break;
      }
      return 0;
    });
  }

  static updateSnapshotTableWithRtNav(p_lstValObj: Nullable<AssetLastJs[]>, uiSnapTable : UiSnapTable)
  {

  }

  static updateChrtUi(histObj : Nullable<HistJs[]>, uiHistData : UiHistData[]) {
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
      uiHistItem.rtReturn = uiHistItem.priorClose > 0 ? uiHistItem.priorClose / uiHistItem.periodEnd - 1 : 0;
      uiHistItem.return = uiHistItem.priorClose > 0 ? uiHistItem.priorClose / uiHistItem.periodStart - 1 : uiHistItem.periodEnd / uiHistItem.periodStart - 1;
      const dataStartDateET = new Date(uiHistItem.periodStartDate);  // '2010-09-29T00:00:00' which was UTC is converted to DateObj interpreted in Local time zone {Tue Sept 29 2010 00:00:00 GMT+0000 (Greenwich Mean Time)}
      const nDays = SqNgCommonUtilsTime.DateDiffNdays(dataStartDateET, todayET); // 2 weeks = 14 days, 2020 year: 366 days, because it is a leap year.
      const nYears = nDays / 365.25; // exact number of days in a year in average 365.25 days, because it is 3 times 365 and 1 time 366
      uiHistItem.cagr = Math.pow(1 + uiHistItem.return, 1.0 / nYears) - 1;
      uiHistItem.drawDown = uiHistItem.priorClose > 0 ? uiHistItem.priorClose / Math.max(uiHistItem.periodHigh, uiHistItem.priorClose) - 1 : uiHistItem.periodEnd / uiHistItem.periodHigh - 1;
      uiHistItem.drawUp = uiHistItem.priorClose > 0 ? uiHistItem.priorClose / Math.min(uiHistItem.periodLow, uiHistItem.priorClose) - 1 : uiHistItem.periodEnd / uiHistItem.periodLow - 1;
      uiHistItem.maxDrawDown = Math.min(uiHistItem.periodMaxDD, uiHistItem.drawDown);
      uiHistItem.maxDrawUp = Math.max(uiHistItem.periodMaxDU, uiHistItem.drawUp);
      uiHistItem.histDates = hisStatItem.histValues.histDates;
      uiHistItem.histSdaCloses = hisStatItem.histValues.histSdaCloses;
      uiHistItem.sqTicker = hisStatItem.histValues.sqTicker;
      for (var i = 0; i < uiHistItem.histDates.length; i++ ) {
        let brAccItem = new UiBrcAccChrtval();
        var dateStr : string = uiHistItem.histDates[i];
        brAccItem.chartDate = new Date (dateStr.substring(0,4) + '-' + dateStr.substring(4,6) + '-' + dateStr.substring(6,8));
        brAccItem.chrtSdaClose = (uiHistItem.histSdaCloses[i])/1000; // divided by thousand to show data in K (Ex: 20,000 = 20K)
        uiHistItem.brAccChrtActuals.push(brAccItem);
      }
      uiHistData.push(uiHistItem);
    }
     // chart processing
     this.uiHistChrt(uiHistData)
    }
    
  static uiHistChrt(uiHistData : UiHistData[]) {
    d3.selectAll("#my_dataviz > *").remove();
     var margin = {top: 10, right: 30, bottom: 30, left: 60 };
     var width = 660 - margin.left - margin.right;
     var height = 400 - margin.top - margin.bottom;
 
     var histChrtSvg = d3.select('#my_dataviz').append('svg')
                  .attr("width", width + margin.left + margin.right)
                  .attr("height", height + margin.top + margin.bottom)
                  .append('g')
                  .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
 
     uiHistData[0].brAccChrtActuals.map((d: {chartDate: string | number | Date; chrtSdaClose: string | number; }) => 
             ({chartDate: new Date(d.chartDate),chrtSdaClose: +d.chrtSdaClose}));
 
     const formatMonth = d3.timeFormat("%Y%m%d");
     var  bisectDate = d3.bisector((d: any) => d.chartDate).left;
     // find data range
     var xMin = d3.min(uiHistData[0].brAccChrtActuals, (d:{ chartDate: any; }) => d.chartDate);
     var xMax = d3.max(uiHistData[0].brAccChrtActuals, (d:{ chartDate: any; }) => d.chartDate);
     var yMin = d3.min(uiHistData[0].brAccChrtActuals, (d: { chrtSdaClose: any; }) => d.chrtSdaClose );
     var yMax = d3.max(uiHistData[0].brAccChrtActuals, (d: { chrtSdaClose: any; }) => d.chrtSdaClose );
 
              // range of data configuring
     var histChrtScaleX = d3.scaleTime()
               .domain([xMin, xMax])
               .range([0, width]);
     var histChrtScaleY = d3.scaleLinear()
                 .domain([yMin-5, yMax])
                 .range([height, 0]);
    
     histChrtSvg.append('g')
                .attr('transform', 'translate(0,' + height + ')')
                .call(d3.axisBottom(histChrtScaleX));
 
     histChrtSvg.append('g')
                .call(d3.axisLeft(histChrtScaleY));
      
     // text label for x-axis
     histChrtSvg.append("text")
                .attr("x", width/2)
                .attr("y", height + margin.bottom) 
                .style("text-anchor","middle")
                .text("Date");
     // text label for y-axis primary
     histChrtSvg.append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", 0-margin.left)
                .attr("x", 0-(height/2))
                .attr("dy","1em")
                .style("text-anchor", "middle")
                .text("sdaClose(K)");
      histChrtSvg.append("text")
                .attr('transform', 'translate(' + width + ', 0)')
                .attr("y", 0-margin.left)
                .attr("x", 0-(height/2))
                .attr("dy","1em")
                .style("text-anchor", "middle")
                .text("sdaClose(K)");
     // Create the circle that travels along the curve of chart
      var focus = histChrtSvg.append('g')
                            .append('circle')
                            .style("fill", "none")
                            .attr("stroke", "black")
                            .attr('r', 5)
                            .style("opacity", 0);
     // Create the text that travels along the curve of chart
      var focusText = histChrtSvg.append('g')
                                .append('text')
                                .style("opacity", 0)
                                .attr("text-anchor", "left")
                                .attr("alignment-baseline", "middle");
     // Genereating line - for sdaCloses 
      var line = d3.line()
                   .x( (d: any) => histChrtScaleX(d.chartDate))
                   .y( (d: any) => histChrtScaleY(d.chrtSdaClose))
                   .curve(d3.curveCardinal);
      
      histChrtSvg.append('path')
                 .attr('class', 'line') //Assign a class for styling
                 .datum(uiHistData[0].brAccChrtActuals) // Binds data to the line
                 .attr('d', line as any);
     
      histChrtSvg.append('rect')
                 .style("fill", "none")
                 .style("pointer-events", "all")
                 .attr('width', width)
                 .attr('height', height)
                 .on('mouseover', mouseover)
                 .on('mousemove', mousemove)
                 .on('mouseout', mouseout);
     function mouseover() {
       focus.style("opacity", 1)
       focusText.style("opacity",1)
     }
     function mousemove(event: any) {
        // recover coordinate we need
       var x0 = histChrtScaleX.invert(d3.pointer(event)[0]);
       // console.log(`The X0: '${x0}'`);
       var i = bisectDate(uiHistData[0].brAccChrtActuals, x0, 1), // index value on the chart area
       selectedData = uiHistData[0].brAccChrtActuals[i],
       selectedData1 = uiHistData[0]
       focus.attr("cx",histChrtScaleX(selectedData.chartDate))
           .attr("cy",histChrtScaleY(selectedData.chrtSdaClose))
       focusText.html("s:" + selectedData1.sqTicker + " - " + "x:" + formatMonth(selectedData.chartDate) +  " - " + "y:" + (selectedData.chrtSdaClose).toFixed(2))
               .attr("x", histChrtScaleX(selectedData.chartDate)+15)
               .attr("y",histChrtScaleY(selectedData.chrtSdaClose))
     }
     function mouseout() {
       focus.style("opacity", 0)
       focusText.style("opacity", 0)
     }
    }
  ngAfterViewInit(): void {
   
  }
}
