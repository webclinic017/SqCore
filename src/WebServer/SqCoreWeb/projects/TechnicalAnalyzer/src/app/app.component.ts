import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

enum PctChnSignal { Unknown = 0, NonValidBull = 1, NonValidBear = 2, ValidBull = 3, ValidBear = 4 }

class PctChnData {
  public Date: Date = new Date();
  public pctChnWeightAggregate: number = 0;
  public pctChnVal1: number = 0;
  public pctChnVal2: number = 0;
  public pctChnVal3: number = 0;
  public pctChnVal4: number = 0;
  public pctChnSignal1: PctChnSignal = PctChnSignal.Unknown;
  public pctChnSignal2: PctChnSignal = PctChnSignal.Unknown;
  public pctChnSignal3: PctChnSignal = PctChnSignal.Unknown;
  public pctChnSignal4: PctChnSignal = PctChnSignal.Unknown;
}

class AssetHistData {
  // public sqTicker = ''; // “S/TSLA” // sqTicker identifies the asset uniquely in C#, but we don’t need that at the moment. Here we use only the Symbol.
  public symbol = ''; // “TSLA”
  public pctChnDatas: PctChnData[] = [];
}

// SnapshotData; contain only the latest values of that Technical factor. E.g. SMA50, SMA200.  m_snapDatas;
// HistoricalData (having data for different dates); m_histDatas;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  m_httpClient: HttpClient;
  m_controllerBaseUrl: string;
  m_tickersStr: string | null = null;
  m_assetHistDatas: AssetHistData[] = [];
  m_enumPctChnSignal = PctChnSignal;
  m_pctChnDataForTooltip: PctChnData = new PctChnData();
  m_isShowPctChnTooltip: boolean = false;

  constructor(http: HttpClient) {
    this.m_httpClient = http;

    // Angular ctor @Inject('BASE_URL') contains the full path: 'https://sqcore.net/webapps/TechnicalAnalyzer', but we have to call our API as 'https://sqcore.net/TechnicalAnalyzer/GetPctChnData', so we need the URL without the '/webapps/TechnicalAnalyzer' Path.
    // And anyway, better to go non-Angular for less complexity. And 'window.location' is the fastest, native JS option for getting the URL.
    this.m_controllerBaseUrl = window.location.origin + '/TechnicalAnalyzer/'; // window.location.origin (URL without the path) = Local: "https://127.0.0.1:4206", Server: https://sqcore.net"
    console.log('window.location.origin', window.location.origin);

    const url = new URL(window.location.href); // https://sqcore.net/webapps/TechnicalAnalyzer/?tickers=TSLA,MSFT
    this.m_tickersStr = url.searchParams.get('tickers');
    if (this.m_tickersStr != null && this.m_tickersStr.length != 0) // If there are no tickers in the URL, do not process the request to obtain getPctChnData.
      this.getPctChnData(this.m_tickersStr);
  }

  ngOnInit(): void {
    console.log('ngOnInit()');
  }

  onInputTickers(event: Event) {
    this.m_tickersStr = (event.target as HTMLInputElement).value.trim().toUpperCase();
    this.getPctChnData(this.m_tickersStr);
  }

  onMouseoverPctChnWtAggCell() {
    this.m_isShowPctChnTooltip = true;
  }

  onMouseenterPctChnWtAggCell(event: MouseEvent, pctChnData: PctChnData) {
    this.m_pctChnDataForTooltip = pctChnData; // Assign the passed in percentage change data to a property used for displaying the tooltip.

    const pctChnTooltipCoords = (document.getElementById('pctChnTooltipText') as HTMLElement); // Get the tooltip element from the DOM where the tooltip text will be displayed.
    const scrollLeft = (window.pageXOffset !== undefined) ? window.pageXOffset : ((document.documentElement || document.body.parentNode || document.body) as HTMLElement).scrollLeft; // Get the horizontal scroll position of the window.
    const scrollTop = (window.pageYOffset !== undefined) ? window.pageYOffset : ((document.documentElement || document.body.parentNode || document.body) as HTMLElement).scrollTop; // Get the vertical scroll position of the window.
    // Set the position of the tooltip element relative to the mouse cursor position.
    // The tooltip will be positioned 10 pixels to the right of the cursor's X position and aligned with the cursor's Y position.
    pctChnTooltipCoords.style.left = 10 + event.pageX - scrollLeft + 'px';
    pctChnTooltipCoords.style.top = event.pageY - scrollTop + 'px';
  }

  onMouseleavePctChnWtAggCell() {
    this.m_isShowPctChnTooltip = false;
  }

  getPctChnData(tickersStr: string) {
    const body: object = { Tickers: tickersStr };
    const url: string = this.m_controllerBaseUrl + 'GetPctChnData'; // Server: it needs to be https://sqcore.net/webapps/TechnicalAnalyzer/GetPctChnData
    this.m_httpClient.post<string>(url, body).subscribe((response) => {
      console.log('percentage channel data:', response);
      this.processAssetHistPctChnData(response);
    }, (error) => console.error(error));
  }

  processAssetHistPctChnData(assetPctChnData: any) {
    this.m_assetHistDatas.length = 0; // empty the m_assetHistDatas
    for (const assetData of assetPctChnData) {
      const assetHistData = new AssetHistData();
      assetHistData.symbol = assetData.t; // 't' is Ticker
      for (let i = assetData.ad.length - 1; i >= 0; i--) { // The data is currently sorted in ascending order by date, but for display on the UI, we need the latest date at the top followed by earlier dates.
        const pctChn = assetData.ad[i]; // 'ad' is AggregateDatePctlChannel
        const pctChnData = new PctChnData();
        pctChnData.Date = pctChn.d; // 'd' is Date
        pctChnData.pctChnWeightAggregate = pctChn.a; // 'a' is aggregate value
        for (let j = 0; j < 4; j++) {
          pctChnData[`pctChnVal${j + 1}`] = pctChn.c[j].v; // 'v' is pctChnvalue
          pctChnData[`pctChnSignal${j + 1}`] = pctChn.c[j].s; // 's' is pctChnSig
        }
        assetHistData.pctChnDatas.push(pctChnData);
      }
      this.m_assetHistDatas.push(assetHistData);
    }
  }
}