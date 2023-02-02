import { Component, OnInit, Input, ViewChildren, QueryList } from '@angular/core';
import { TreeViewState, TreeViewItem } from '../portfolio-manager/portfolio-manager.component';
import { RemoveItemOnce } from './../../../../sq-ng-common/src/lib/sq-ng-common.utils';

@Component({
  selector: 'app-sq-tree-view',
  templateUrl: './sq-tree-view.component.html',
  styleUrls: ['./sq-tree-view.component.scss']
})
export class SqTreeViewComponent implements OnInit {
  // @Input(), @ViewChildren variables: without "| any". Compile error: ' Property 'treeViewState' has no initializer and is not definitely assigned in the constructor.'
  // use the ! after the variable name 'Definite Assignment Assertion' to tell typescript that this variable will have a value at runtime
  @Input() items!: TreeViewItem[]; // nested tree view data receive from portfolio manager component
  @Input() treeViewState!: TreeViewState; // treeview selected data processing
  @ViewChildren(SqTreeViewComponent) public _children!: QueryList<SqTreeViewComponent>;

  isSelected: boolean = false;
  isExpanded: boolean = false;

  constructor() { }

  ngOnInit(): void {
  }

  DeselectThisItemsAndAllChildren() {
    for (const item of this.items) // at start, the root TreeViewComponent has no _children TreeviewComponents. But it has 3+ items[] for the root folders Shared, UserFolder, NoUser
      item.isSelected = false;

    for (const child of this._children) // for all Children
      child.DeselectThisItemsAndAllChildren();
  }

  onItemClicked(item: TreeViewItem) {
    this.treeViewState.lastSelectedItem = item;
    console.log('TreeView.onItemClicked(): ' + this.treeViewState.lastSelectedItem?.name);
    this.treeViewState.rootSqTreeViewComponent!.DeselectThisItemsAndAllChildren();
    item.isSelected = true;

    if (!item.isExpanded && item.children && item.children.length > 0) // set to expanded only if it was not expanded before and has children
      item.isExpanded = true;
    else
      item.isExpanded = false;

    console.log('TreeView.onItemClicked(): isExpanded: ' + item.isExpanded, 'children: ', (item.children) ? item.children.length : 0);

    const expandedId = item.id;
    const isIdIncluded = this.treeViewState.expandedPrtfFolderIds.includes(expandedId);
    if (item.isExpanded) {
      if (!isIdIncluded)
        this.treeViewState.expandedPrtfFolderIds.push(expandedId); // check if the selected is already there in the list, if exist don't push it else add it
    } else {
      if (isIdIncluded)
        RemoveItemOnce(this.treeViewState.expandedPrtfFolderIds, expandedId);
    }
    console.log('TreeView.onItemClicked(): expandedPrtfFolderIds:');
    console.log(this.treeViewState.expandedPrtfFolderIds);
  }
}