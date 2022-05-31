import * as d3 from 'd3';

export function shortMonthFormat(date: any) : string {
  const formatMillisec = d3.timeFormat('.%L');
  const formatShortMonth = d3.timeFormat('%Y-%m-%d');
  const formatYear = d3.timeFormat('%Y');
  return (d3.timeSecond(date) < date ? formatMillisec :
    d3.timeYear(date) < date ? formatShortMonth :
    formatYear)(date);
}

// requires data - raw format
// requires div element to select and append svg
// requires data lables, xLabel and yLabel
// if the tickformat is date we need to add shortformat date function
// requires another div for adding tooltip

export function sqLineChartGenerator(noAssets: number, nCurrData: number, assetNames2Array: any[], pctChngChrtData, xLabel: string, yLabel: string, lineChrtDiv: HTMLElement, lineChrtTooltip: HTMLElement) {
  const margin = {top: 10, right: 30, bottom: 50, left: 60};
  const width = 760 - margin.left - margin.right;
  const height = 450 - margin.top - margin.bottom;

  const stckChrtData = pctChngChrtData.map((r:{date: Date; price: number; }) =>
    ({ date: new Date(r.date), price: (r.price)}));

  const xMin = d3.min(stckChrtData, (r:{ date: any; }) => r.date as Date);
  const xMax = d3.max(stckChrtData, (r:{ date: any; }) => r.date as Date);
  const yMin = d3.min(stckChrtData, (r:{ price: any; }) => r.price as number);
  const yMax = d3.max(stckChrtData, (r:{ price: any; }) => r.price as number);

  // Add X axis --> it is a date format
  const xScale = d3.scaleLinear()
      .domain([xMin as Date, xMax as Date])
      .range([0, width]);

  // Add Y axis
  const yScale = d3.scaleLinear()
      .domain([(yMin as number) - 5, (yMax as number) + 5])
      .range([height, 0]);

  const lineChrt = d3.select(lineChrtDiv)
      .append('svg')
      .style('background', 'white')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform',
          'translate(' + margin.left + ',' + margin.top + ')');

  lineChrt.append('g')
      .attr('class', 'grid')
      .attr('transform', 'translate(0,' + height +')')
      .call(d3.axisBottom(xScale).tickSize(-height).tickFormat(shortMonthFormat))
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('transform', 'rotate(-25)');

  lineChrt.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(yScale)
          .tickSize(-width)
          .tickFormat((d: any) => d + '$'));

  // x axis label
  lineChrt
      .append('text')
      .attr('class', 'pctChgLabel')
      .attr('transform', 'translate(' + width / 2 + ' ,' + (height + 42) + ')')
      .text(xLabel);

  // y axis label
  lineChrt
      .append('text')
      .attr('class', 'pctChgLabel')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - (margin.left))
      .attr('x', 0 - (height / 2))
      .attr('dy', '2em')
      .text(yLabel);

  const priceDatagrps: any[] = [];
  for (let i = 0; i < stckChrtData.length; i += nCurrData)
    priceDatagrps.push(stckChrtData.slice(i, i + nCurrData));

  interface pctChngStckPriceData {
    ticker: string;
    priceData: any[];
  }

  const pctChngData: pctChngStckPriceData[] = [];
  for (let j = 0; j < noAssets; j++) {
    const chrtData: pctChngStckPriceData = {
      ticker: assetNames2Array[j],
      priceData: priceDatagrps[j]
    };
    pctChngData.push(chrtData);
  }

  const stckKey = pctChngData.map(function(d: any) { return d.ticker; }); // list of group names

  // adding colors for keys
  const color = d3.scaleOrdinal()
      .domain(stckKey)
      .range(['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#f781bf', '#999999', '#ffff33', '#a65628']);

  // Draw the line
  lineChrt.selectAll('.line')
      .data(pctChngData)
      .enter()
      .append('path')
      .attr('fill', 'none')
      .attr('stroke', (d: any) => color(d.ticker) as any)
      .attr('stroke-width', 1.5)
      .attr('d', (d:any) => (d3.line()
          .x((d: any) => xScale(d.date) as number)
          .y((d: any) => yScale(d.price) as number))(d.priceData) as any);
  lineChrt
      .selectAll('myCircles')
      .data(stckChrtData)
      .enter()
      .append('circle')
      .style('fill', 'none')
      .attr('stroke', 'black')
      .attr('stroke-width', 0.8)
      .attr('cx', (d: any) => xScale(d.date) as number)
      .attr('cy', (d: any) => yScale(d.price) as number)
      .attr('r', 2.5);

  // // Add the Legend
  lineChrt.selectAll('rect')
      .data(pctChngData)
      .enter().append('text')
      .attr('x', (d: any, i: any) => ( 25 + i * 60))
      .attr('y', 35)
      .attr('class', 'pctChgLabel') // style the legend
      .style('fill', (d: any) => color(d.ticker) as any)
      .text((d: any) => (d.ticker));

  const tooltipPctChg = d3.select(lineChrtTooltip);
  const tooltipLine = lineChrt.append('line');
  lineChrt.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('opacity', 0)
      .on('mousemove', onMouseMove)
      .on('mouseout', onMouseOut);

  function onMouseOut() {
    if (tooltipPctChg)
      tooltipPctChg.style('display', 'none');
    if (tooltipLine)
      tooltipLine.attr('stroke', 'none');
  }

  function onMouseMove(event: any) {
    const daysArray: any[] = [];
    stckChrtData.forEach((element) => {
      daysArray.push(element.date);
    });

    const xCoord = xScale.invert(d3.pointer(event)[0]);
    const yCoord = d3.pointer(event)[1];
    const closestXCoord = daysArray.sort(
        (a, b) => Math.abs(xCoord - a.getTime()) - Math.abs(xCoord - b.getTime()))[0];
    const closestYCoord = pctChngData[0].priceData.find((h: any) => h.date as any === closestXCoord).price;

    tooltipLine
        .attr('stroke', 'black')
        .attr('x1', xScale(closestXCoord))
        .attr('x2', xScale(closestXCoord))
        .attr('y1', 0 + 10)
        .attr('y2', height);

    tooltipPctChg
        .html('Percentage Changes :' + '<br>')
        .style('display', 'block')
        .style('left', event.pageX + 10)
        .style('top', (event.pageY - yCoord + yScale(closestYCoord)) + 15)
        .selectAll()
        .data(pctChngData)
        .enter()
        .append('div')
        .style('color', (d: any) => color(d.ticker) as any)
        .html((d: any) => d.ticker + ': ' + d.priceData.find((h: any) => h.date.getTime() as any === closestXCoord.getTime() as any).price + '%');
  }
}