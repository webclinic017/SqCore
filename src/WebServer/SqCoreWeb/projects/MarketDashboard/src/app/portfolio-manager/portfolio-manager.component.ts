import { Component, OnInit, Input } from '@angular/core';

type Nullable<T> = T | null;

// Input data classes
class PrtfMgrVwrHandShk {
  portfolioMgrJs: Nullable<PortfolioMgrJs[]> = null;
}

class PortfolioMgrJs {
  public id = -1;
  public name = '';
  public userId = -1;
  public parentFolderId = -1;
}

@Component({
  selector: 'app-portfolio-manager',
  templateUrl: './portfolio-manager.component.html',
  styleUrls: ['./portfolio-manager.component.scss']
})
export class PortfolioManagerComponent implements OnInit {
  @Input() _parentWsConnection?: WebSocket = undefined; // this property will be input from above parent container

  handshakeObj: Nullable<PrtfMgrVwrHandShk> = null;
  uiPortfolioMgrs: PortfolioMgrJs[] = [];
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

    const panelPrtfSpecId = PortfolioManagerComponent.getNonNullDocElementById('panelPrtfSpec');
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
        this.handshakeObj = JSON.parse(msgObjStr);
        PortfolioManagerComponent.updateUiPortfolioMgrs(this.handshakeObj, this.uiPortfolioMgrs);
        return true;
      default:
        return false;
    }
  }

  // Under development - Daya
  onClickPortfolio(portfolioSelected: string) {
    this.portfolioSelectionSelected = portfolioSelected;
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
  }

  onClickPortfolioPreview(tabIdx: number) {
    this.tabPageVisibleIdx = tabIdx;
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
    const resizerDiv = PortfolioManagerComponent.getNonNullDocElementById(resizer);

    resizerDiv.addEventListener('mousedown', resizingDiv);
    function resizingDiv(event: any) {
      window.addEventListener('mousemove', mousemove);
      window.addEventListener('mouseup', stopResize);
      const originalMouseX = event.pageX;
      const panelPrtfTree = panelPrtfTreeId.getBoundingClientRect();

      function mousemove(event: any) {
        const width = window.innerWidth || document.documentElement.clientWidth || document.documentElement.getElementsByTagName('body')[0].clientWidth; // required for pixels to viewport width conversion.
        const calculatedWidth = 100 * (panelPrtfTree.width - (originalMouseX - event.pageX)) / width;
        panelPrtfTreeId.style.width = calculatedWidth + 'vw';
        panelPrtfDetailsId.style.width = (100 - calculatedWidth) + 'vw'; // 100vw is the whole window width as we know the prtfTree width, based on that we are calculating the prtfDetails width in vw
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
    const panelPrtfSpecId = PortfolioManagerComponent.getNonNullDocElementById('panelPrtfSpec');

    const resizerDiv = PortfolioManagerComponent.getNonNullDocElementById(resizer2);

    resizerDiv.addEventListener('mousedown', resizingDiv);
    function resizingDiv(event: any) {
      window.addEventListener('mousemove', mousemove);
      window.addEventListener('mouseup', stopResize);
      const originalMouseY = event.pageY;
      const panelChart = panelChartId.getBoundingClientRect();

      function mousemove(event: any) {
        const height = window.innerHeight || document.documentElement.clientHeight || document.documentElement.getElementsByTagName('body')[0].clientHeight; // required for pixels to viewport height conversion.
        const calculatedHeight = 100 * (panelChart.height - (originalMouseY - event.pageY)) / height;
        panelChartId.style.height = calculatedHeight + 'vh';
        panelStatsAndPerfSpecId.style.height = (95.5 - calculatedHeight) + 'vh'; // 95.5vh is the total veiwport heigh of pancelchart and panelStatsAndPerfSpecId
        panelStatsId.style.height = (95.5 - calculatedHeight) + 'vh';
        panelPrtfSpecId.style.height = (95.5 - calculatedHeight) + 'vh';
      }

      function stopResize() {
        window.removeEventListener('mousemove', mousemove);
      }
    }
  }

  // under Development -- Daya
  static updateUiPortfolioMgrs(handshakeObj: Nullable<PrtfMgrVwrHandShk>, uiPortfolioMgrs: PortfolioMgrJs[]) {
    const prtfMgrs: Nullable<PortfolioMgrJs[]> = (handshakeObj == null) ? null : handshakeObj.portfolioMgrJs;
    if (!(Array.isArray(prtfMgrs) && prtfMgrs.length > 0 ))
      return;

    for (const prtfMgr of prtfMgrs) {
      const uiProtfolios = new PortfolioMgrJs();
      uiProtfolios.id = prtfMgr.id;
      uiProtfolios.name = prtfMgr.name;
      uiProtfolios.parentFolderId = prtfMgr.parentFolderId;
      uiProtfolios.userId = prtfMgr.userId;
      uiPortfolioMgrs.push(uiProtfolios);
    }

    const portfolios = PortfolioManagerComponent.createTreeViewData(uiPortfolioMgrs);
    const containerPrtfTree = PortfolioManagerComponent.getNonNullDocElementById('panelPrtfTree');
    PortfolioManagerComponent.uiNestedTreeView(portfolios, containerPrtfTree);
  }

  static createTreeViewData(portfolios: any) {
    const tree = [];
    const object = {};
    let parent: any;
    let child: any;

    for (let i = 0; i < portfolios.length; i++) {
      parent = portfolios[i];
      object[parent.id] = parent;
      object[parent.id]['children'] = [];
    }

    for (const id in object) {
      if (object.hasOwnProperty(id)) {
        child = object[id];
        if (child.parentFolderId && object[child['parentFolderId']])
          object[child['parentFolderId']]['children'].push(child);
        else
          tree.push(child as never);
      }
    }
    return tree;
  };

  // creating a nested structure view on HTMl dynamically
  static uiNestedTreeView(portoflios: any, parent: HTMLElement) {
    const ul = document.createElement('ul');
    if (parent) {
      parent.appendChild(ul);
      portoflios.forEach(function(portfolio: any) {
        const li = document.createElement('li');
        li.innerHTML = portfolio.name;
        if (portfolio.children && portfolio.children.length > 0) {
          li.classList.add('portfolioNestedView');
          PortfolioManagerComponent.uiNestedTreeView(portfolio.children, li);
        }
        ul.classList.add('portfolioManager');
        ul.append(li);
      });
      return ul;
    }
  }
}