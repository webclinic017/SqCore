import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-portfolio-manager',
  templateUrl: './portfolio-manager.component.html',
  styleUrls: ['./portfolio-manager.component.scss']
})
export class PortfolioManagerComponent implements OnInit {
  @Input() _parentWsConnection?: WebSocket = undefined; // this property will be input from above parent container

  portfolioSelection: string[] = ['Dr. Gyorgy, Antal', 'Didier Charmat']; // PrtFldrs
  portfolioSelectionSelected: string = 'Dr. Gyorgy, Antal';
  tabPageVisibleIdx = 1;

  dashboardHeaderWidth = 0;
  dashboardHeaderHeight = 0;
  prtfMgrToolWidth = 0;
  prtfMgrToolHeight = 0;
  panelPrtfTreeWidth = 0;
  panelPrtfTreeHeight = 0;
  panelPrtfChrtWidth = 0;
  panelPrtfChrtHeight = 0;
  panelStatsWidth = 0;
  panelStatsHeight = 0;
  panelPrtfSpecWidth = 0;
  panelPrtfSpecHeight = 0;

  constructor() { }

  ngOnInit(): void {
    // Notes : Difference btw scrollHeight, clientHeight and offsetHeight
    // ScrollHeight : Entire content & padding (visible & not)
    // ClientHeight : Visible content & padding
    // OffsetHeight : visible content & padding + border + scrollbar

    const panelPrtfTreeId = PortfolioManagerComponent.getNonNullDocElementById('panelPrtfTree');
    this.panelPrtfTreeWidth = panelPrtfTreeId.clientWidth as number;
    this.panelPrtfTreeHeight = panelPrtfTreeId.clientHeight as number;

    const panelChartId = PortfolioManagerComponent.getNonNullDocElementById('panelChart');
    this.panelPrtfChrtWidth = panelChartId.clientWidth as number;
    this.panelPrtfChrtHeight = panelChartId.clientHeight as number;

    const panelStatsId = PortfolioManagerComponent.getNonNullDocElementById('panelStats');
    this.panelStatsWidth = panelStatsId.clientWidth as number;
    this.panelStatsHeight = panelStatsId.clientHeight as number;

    const panelPrtfSpecId = PortfolioManagerComponent.getNonNullDocElementById('panelPerfSpec');
    this.panelPrtfSpecWidth = panelPrtfSpecId.clientWidth as number;
    this.panelPrtfSpecHeight = panelPrtfSpecId.clientHeight as number;

    const approotToolbar = PortfolioManagerComponent.getNonNullDocElementById('toolbarId');
    this.dashboardHeaderWidth = approotToolbar.clientWidth;
    this.dashboardHeaderHeight = approotToolbar.clientHeight;

    this.prtfMgrToolWidth = window.innerWidth as number;
    this.prtfMgrToolHeight = window.innerHeight as number;

    // For displaying the width and height - Dynamic values
    window.addEventListener('resize', (resizeBy) => {
      this.panelPrtfTreeWidth = panelPrtfTreeId.clientWidth as number;
      this.panelPrtfTreeHeight = panelPrtfTreeId.clientHeight as number;
      this.panelPrtfChrtWidth = panelChartId.clientWidth as number;
      this.panelPrtfChrtHeight = panelChartId.clientHeight as number;
      this.panelStatsWidth = panelStatsId.clientWidth as number;
      this.panelStatsHeight = panelStatsId.clientHeight as number;
      this.panelPrtfSpecWidth = panelPrtfSpecId.clientWidth as number;
      this.panelPrtfSpecHeight = panelPrtfSpecId.clientHeight as number;
      this.dashboardHeaderWidth = approotToolbar.clientWidth;
      this.dashboardHeaderHeight = approotToolbar.clientHeight;
      this.prtfMgrToolWidth = window.innerWidth as number;
      this.prtfMgrToolHeight = window.innerHeight as number;
      return resizeBy;
    });

    this.prtfMgrToolWidth = this.prtfMgrToolWidth;
    this.prtfMgrToolHeight = this.prtfMgrToolHeight - this.dashboardHeaderHeight;
  }

  public webSocketOnMessage(msgCode: string, msgObjStr: string): boolean {
    switch (msgCode) {
      case 'PortfMgr.Portfolios': // The most frequent message should come first. Note: LstVal (realtime price) is handled earlier in a unified way.
        console.log('PortfMgr.Portfolios:' + msgObjStr);
        return true;
      case 'PortfMgr.Handshake': // The least frequent message should come last.
        console.log('PortfMgr.Handshake:' + msgObjStr);
        return true;
      default:
        return false;
    }
  }

  // Under development - Daya
  onClickPortfolio(portfolioSelected: string) {
    this.portfolioSelectionSelected = portfolioSelected;
    const panelPrtfTreeId = PortfolioManagerComponent.getNonNullDocElementById('panelPrtfTree') as HTMLElement;
    const portfolioView = document.getElementsByClassName('portfolioNestedView');
    console.log('The length of tree view is :', portfolioView.length);
    console.log('The portfolioSelected is :', portfolioSelected);
    for (const portfolio of portfolioView) {
      if (this.portfolioSelectionSelected == portfolio.previousElementSibling?.innerHTML) {
        // toggling between plus and minus signs for nested view
        if (portfolio.previousElementSibling?.classList.contains('portfolioManager')) {
          portfolio.previousElementSibling?.classList.remove('portfolioManager');
          portfolio.previousElementSibling?.classList.add('portfolioManagerMinus');
        } else {
          portfolio.previousElementSibling?.classList.remove('portfolioManagerMinus');
          portfolio.previousElementSibling?.classList.add('portfolioManager');
        }
        portfolio.classList.toggle('active');
        break;
      }
    }
    this.displayPanelWidthAndHieght(panelPrtfTreeId.id);
  }

  onClickPortfolioPreview(tabIdx: number) {
    this.tabPageVisibleIdx = tabIdx;
  }

  displayPanelWidthAndHieght(id: string) {
    this.panelPrtfTreeWidth = PortfolioManagerComponent.getNonNullDocElementById(id).clientWidth as number;
    this.panelPrtfTreeHeight = PortfolioManagerComponent.getNonNullDocElementById(id).clientHeight as number;

    window.addEventListener('resize', (resizeBy) => {
      this.panelPrtfTreeWidth = PortfolioManagerComponent.getNonNullDocElementById(id).clientWidth as number;
      this.panelPrtfTreeHeight = PortfolioManagerComponent.getNonNullDocElementById(id).clientHeight as number;
      return resizeBy;
    });
  }

  static getNonNullDocElementById(id: string): HTMLElement { // document.getElementById() can return null. This 'forced' type casting fakes that it is not null for the TS compiler. (it can be null during runtime)
    return document.getElementById(id) as HTMLElement;
  }

  onMouseOver(resizer: string) {
    if (resizer == 'resizer')
      this.makeResizablePrtfTree(resizer);
    if (resizer == 'resizer2')
      this.makeResizablePrtfDetails(resizer);
  }

  makeResizablePrtfTree(resizer: string) {
    const panelPrtfTreeId = PortfolioManagerComponent.getNonNullDocElementById('panelPrtfTree');
    const panelPrtfDetailsId = PortfolioManagerComponent.getNonNullDocElementById('panelPrtfDetails');
    const panelPrtfMgrId = PortfolioManagerComponent.getNonNullDocElementById('panelPrtfMgr');
    const resizerDiv = PortfolioManagerComponent.getNonNullDocElementById(resizer);
    const resizableWidthHeight = window.document.getElementById('demo') as HTMLElement;

    resizerDiv.addEventListener('mousedown', resizingDiv);
    function resizingDiv(event: any) {
      window.addEventListener('mousemove', mousemove);
      window.addEventListener('mouseup', stopResize);
      const originalMouseX = event.pageX;
      const panelPrtfTree = panelPrtfTreeId.getBoundingClientRect();
      const panelPrtfDetails = panelPrtfDetailsId.getBoundingClientRect();

      function mousemove(event: any) {
        panelPrtfTreeId.style.width = panelPrtfTree.width - (originalMouseX - event.pageX) + 'px';
        panelPrtfDetailsId.style.width = panelPrtfDetails.width + (originalMouseX - event.pageX) + 'px';
        panelPrtfMgrId.style.width = panelPrtfTreeId.style.width + panelPrtfDetailsId.style.width;
        resizableWidthHeight.innerHTML = 'Browser inner window width : ' + panelPrtfMgrId.offsetWidth + ', height : ' + panelPrtfMgrId.offsetHeight;
      }

      function stopResize() {
        window.removeEventListener('mousemove', mousemove);
      }
    }
  }

  makeResizablePrtfDetails(resizer2: string) {
    const panelChartId = PortfolioManagerComponent.getNonNullDocElementById('panelChart');
    const panelStatsAndPerfSpecId = PortfolioManagerComponent.getNonNullDocElementById('panelStatsAndPerfSpec');
    const panelStatsId = PortfolioManagerComponent.getNonNullDocElementById('panelStats');
    const panelPerfSpecId = PortfolioManagerComponent.getNonNullDocElementById('panelPerfSpec');

    const resizerDiv = PortfolioManagerComponent.getNonNullDocElementById(resizer2);

    resizerDiv.addEventListener('mousedown', resizingDiv);
    function resizingDiv(event: any) {
      window.addEventListener('mousemove', mousemove);
      window.addEventListener('mouseup', stopResize);
      const originalMouseY = event.pageY;
      const panelChart = panelChartId.getBoundingClientRect();
      const panelStatsAndPerfSpec = panelStatsAndPerfSpecId.getBoundingClientRect();
      const panelStats = panelStatsId.getBoundingClientRect();
      const panelPerfSpec = panelPerfSpecId.getBoundingClientRect();

      function mousemove(event: any) {
        panelChartId.style.height = panelChart.height - (originalMouseY - event.pageY) + 'px';
        panelStatsAndPerfSpecId.style.height = panelStatsAndPerfSpec.height + (originalMouseY - event.pageY) + 'px';
        panelStatsId.style.height = panelStats.height + (originalMouseY - event.pageY) + 'px';
        panelPerfSpecId.style.height = panelPerfSpec.height + (originalMouseY - event.pageY) + 'px';
      }

      function stopResize() {
        window.removeEventListener('mousemove', mousemove);
      }
    }
  }
}