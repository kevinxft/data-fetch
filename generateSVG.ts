import D3Node from "d3-node";
import fs from "fs";
import * as d3 from "d3";

export function generateSVG(data: any[]) {
  const d3n = new D3Node();
  const margin = { top: 40, right: 60, bottom: 60, left: 60 }; 
  const width = 1000 - margin.left - margin.right; 
  const height = 400 - margin.top - margin.bottom;

  // 创建SVG容器
  const svg = d3n.createSVG()
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // 添加标题
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", -margin.top / 2)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .text("最近14天使用次数趋势");

  // 创建比例尺
  const xScale = d3.scaleTime()
    .domain(d3.extent(data, d => d.date) as [Date, Date])
    .range([0, width]);

  const yScale = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.value) as number * 1.2]) 
    .nice()
    .range([height, 0]);

  // 创建坐标轴
  const xAxis = d3.axisBottom(xScale)
    .ticks(data.length)
    .tickFormat(d => d3.timeFormat("%m-%d")(d as Date));

  const yAxis = d3.axisLeft(yScale)
    .ticks(5)
    .tickFormat(d => d.toString() + "次");

  // 创建坐标轴网格线
  svg.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(0,${height})`)
    .call(xAxis.tickSize(-height).tickFormat(null));

  svg.append("g")
    .attr("class", "grid")
    .call(yAxis.tickSize(-width).tickFormat(null));

  // 创建线条生成器
  const line = d3.line<{ date: Date; value: number }>()
    .x(d => xScale(d.date))
    .y(d => yScale(d.value))
    .curve(d3.curveMonotoneX);

  // 添加渐变区域
  const area = d3.area<{ date: Date; value: number }>()
    .x(d => xScale(d.date))
    .y0(height)
    .y1(d => yScale(d.value))
    .curve(d3.curveMonotoneX);

  // 添加渐变填充区域
  svg.append("path")
    .data([data])
    .attr("class", "area")
    .attr("d", area as any)
    .style("fill", "url(#area-gradient)")
    .style("opacity", 0.3);

  // 添加线条
  svg.append("path")
    .data([data])
    .attr("class", "line")
    .attr("d", line as any)
    .style("fill", "none")
    .style("stroke", "#2196F3")
    .style("stroke-width", "2px");

  // 添加数据点
  svg.selectAll(".dot")
    .data(data)
    .enter()
    .append("circle")
    .attr("class", "dot")
    .attr("cx", d => xScale(d.date))
    .attr("cy", d => yScale(d.value))
    .attr("r", 4)
    .style("fill", "#2196F3")
    .style("stroke", "#fff")
    .style("stroke-width", "2px");

  // 添加数据标签
  svg.selectAll(".label")
    .data(data)
    .enter()
    .append("text")
    .attr("class", "label")
    .attr("x", d => xScale(d.date))
    .attr("y", d => yScale(d.value) - 10)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .text(d => d.value);

  // 添加X轴
  svg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height})`)
    .call(xAxis)
    .selectAll("text")
    .style("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", ".15em")
    .attr("transform", "rotate(-45)");

  // 添加Y轴
  svg.append("g")
    .attr("class", "y-axis")
    .call(yAxis);

  // 添加样式
  const styles = `
    .grid line {
      stroke: #e0e0e0;
      stroke-opacity: 0.7;
      shape-rendering: crispEdges;
    }
    .grid path {
      stroke-width: 0;
    }
    .dot:hover {
      r: 6;
    }
    text {
      font-family: Arial, sans-serif;
    }
    .x-axis path, .y-axis path {
      stroke: #ccc;
    }
    .x-axis text, .y-axis text {
      fill: #666;
    }
  `;

  // 将样式添加到SVG
  svg.append("style").text(styles);

  // 保存SVG文件
  fs.writeFileSync("chart.svg", d3n.svgString());
}
