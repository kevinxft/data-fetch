import D3Node from "d3-node";
import fs from "fs";
import * as d3 from "d3";

export function generateSVG(data: any[]) {
  const d3n = new D3Node();
  const svg = d3n.createSVG().attr("width", 800).attr("height", 400);

  const xScale = d3
    .scaleTime()
    .domain(d3.extent(data, (d) => d.date) as [Date, Date])
    .range([50, 750]);

  const yScale = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.value) || 100])
    .nice()
    .range([350, 50]);

  const line = d3
    .line<{ date: Date; value: number }>()
    .x((d) => xScale(d.date))
    .y((d) => yScale(d.value));

  // Append the line path
  svg
    .append("path")
    .data([data])
    .attr("d", line as any) // TypeScript workaround for line function
    .attr("fill", "none")
    .attr("stroke", "steelblue");

  // Append x-axis and y-axis
  svg
    .append("g")
    .attr("transform", "translate(0,350)")
    .call(d3.axisBottom(xScale).ticks(d3.timeDay.every(1)));

  svg
    .append("g")
    .attr("transform", "translate(50,0)")
    .call(d3.axisLeft(yScale));

  // Save the SVG to a file
  fs.writeFileSync("chart.svg", d3n.svgString());
}
