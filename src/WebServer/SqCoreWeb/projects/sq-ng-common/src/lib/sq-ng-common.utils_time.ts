import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'lib-sq-ng-common',
  template: `
    <p>
      sq-ng-common works!
    </p>
  `,
  styles: []
})
export class SqNgCommonUtilsTime implements OnInit {

  // Javascript doesn't support timezones, so either use moment.js or hack it here.
  // https://stackoverflow.com/questions/36206260/how-to-set-date-always-to-eastern-time-regardless-of-users-time-zone/36206597
  public static ConvertDateUtcToEt(utcDate: Date) {
    const monthOriUTC = utcDate.getMonth() + 1;
    const dayOriUTC = utcDate.getDate();
    const dayOfWeekOriUTC = utcDate.getDay();

    // https://en.wikipedia.org/wiki/Eastern_Time_Zone
    // on the second Sunday in March, at 2:00 a.m. EST, clocks are advanced to 3:00 a.m. EDT leaving a one-hour "gap". On the first Sunday in November, at 2:00 a.m. EDT,
    // clocks are moved back to 1:00 a.m. EST, thus "duplicating" one hour. Southern parts of the zone (Panama and the Caribbean) do not observe daylight saving time.""
    let offsetToNYTime = -4;
    if (monthOriUTC < 3 || monthOriUTC === 12 || (monthOriUTC === 3 && (dayOriUTC - dayOfWeekOriUTC) < 8) || (monthOriUTC === 11 && (dayOriUTC - dayOfWeekOriUTC) > 1)) {
      offsetToNYTime = -5;
    }
    const dateEt: Date = utcDate;
    dateEt.setTime(dateEt.getTime() + offsetToNYTime * 60 * 60000);
    return dateEt;
  }

  // https://stackoverflow.com/questions/948532/how-do-you-convert-a-javascript-date-to-utc    "a method I've been using many times. function convertDateToUTC(date) {..."
  public static ConvertDateLocToEt(locDate: Date) {
    const dateUtc = new Date(locDate.getUTCFullYear(), locDate.getUTCMonth(), locDate.getUTCDate(), locDate.getUTCHours(), locDate.getUTCMinutes());
    return this.ConvertDateUtcToEt(dateUtc);
  }

  constructor() { }

  ngOnInit(): void {
  }


}
