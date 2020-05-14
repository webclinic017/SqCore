import { Component, Output, EventEmitter } from '@angular/core';

export class AppSettings {  // collect the settings variables here. This will be stored in a database in server code.
  uiTheme = '';
  marketHealthDefaultLookback = 'YTD';  // example. Not used yet.
  marketHealthDefaultStatistics = 'Return'; // example. Not used yet.
  catalystSnifferShowDetailedTooltips = true; // example. Not used yet.
}

@Component({
  selector: 'settings-dialog',
  templateUrl: './settings-dialog.component.html',
  styleUrls: ['./settings-dialog.component.scss']
})
export class SettingsDialogComponent {
  isVisible = false;  // see https://stackoverflow.com/questions/59013913/how-to-manipulate-a-div-style-in-angular-8
  @Output() parentChangeThemeEvent = new EventEmitter<string>();

  _appSettings = new AppSettings();

  constructor() { }

  onSetThemeSelector(theme: string) {
    this._appSettings.uiTheme = theme;
    console.log(theme);
    this.parentChangeThemeEvent.emit(theme);
  }
}

