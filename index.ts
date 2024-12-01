import axios from "axios";
import dotenv from "dotenv";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { generateSVG } from "./generateSVG";

type ChartPoint = {
  date: Date;
  value: number;
};

if (!process.env.GITHUB_ACTIONS) {
  await dotenv.config();
}
// 从环境变量获取 API_KEY 和 MAX_DAYS
const API_KEY = process.env.API_KEY as string;
const MAX_DAYS = parseInt(process.env.MAX_DAYS || "30", 10); // 默认值为 30 天
const DATA_FILE = "data.json"; // 数据存储文件
// 获取数据并存储
async function fetchData() {
  const config = {
    url: "https://api.sunoaiapi.com/user/balance",
    method: "get",
    headers: {
      "Content-Type": "application/json",
      "api-key": API_KEY, // 使用从环境变量中读取的 API_KEY
    },
  };

  try {
    const response = await axios(config);
    const points = response.data.points;
    
    // 读取现有数据或创建新的数据数组
    let historicalData: ChartPoint[] = [];
    if (existsSync(DATA_FILE)) {
      historicalData = JSON.parse(readFileSync(DATA_FILE, "utf-8"));
    }

    // 添加新数据点
    const newDataPoint: ChartPoint = {
      date: new Date(),
      value: points
    };

    // 保持数据不超过 MAX_DAYS 天
    historicalData.push(newDataPoint);
    if (historicalData.length > MAX_DAYS) {
      historicalData.shift();
    }

    // 将更新后的数据写回文件
    writeFileSync(DATA_FILE, JSON.stringify(historicalData, null, 2));

    generateAsciiTable(historicalData);
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

function generateAsciiTable(data: ChartPoint[]) {
  // 将数据按日期排序并反转顺序（最新日期在前）
  const sortedData = data.sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );

  let table = "# API使用量(2小时更新一次)\n\n";

  // 计算每天的使用次数
  for (let i = 0; i < sortedData.length; i++) {
    const currentDate = sortedData[i];
    
    // 如果不是第一天，计算与前一天的差值
    if (i > 0) {
      const prevDate = sortedData[i - 1];
      
      // 如果当前剩余次数比前一天少，说明使用了一些次数
      const dailyUsage = Math.max(0, prevDate.value - currentDate.value);
      
      table += `| ${currentDate.date.toISOString().split("T")[0]} | ${currentDate.value} | ${dailyUsage} |\n`;
    } else {
      // 对于第一天，我们假设使用量为0
      table += `| ${currentDate.date.toISOString().split("T")[0]} | ${currentDate.value} | 0 |\n`;
    }
  }

  // 计算并显示周平均使用量
  const weeklyUsage = sortedData.reduce((sum, point) => sum + point.value, 0);
  const weeklyAvg = sortedData.length > 0 ? Math.round(weeklyUsage / sortedData.length) : 'N/A';
  const currentSongsLeft = sortedData[0].value || 0;
  const daysRemaining = weeklyAvg !== 'N/A' ? Math.round(currentSongsLeft / weeklyAvg) : 'N/A';

  // 添加统计信息表格
  table += "## 使用统计\n\n";
  table += "| 指标 | 数值 |\n";
  table += "|------|------|\n";
  table += `| 日平均使用量 | ${weeklyAvg} |\n`;
  table += `| 预计剩余天数 | ${daysRemaining} |\n\n`;

  // 添加详细数据表格
  table += "## 详细数据\n\n";
  table += "| 日期 | 还剩的总次数 | 当天用的次数 |\n";
  table += "|------|------------|-------------|\n";

  for (let i = 0; i < sortedData.length; i++) {
    const currDate = sortedData[i];
    const currSongsLeft = currDate.value;
    const prevDate = i < sortedData.length - 1 ? sortedData[i + 1] : null;
    const dailyUsage = prevDate
      ? Math.abs(prevDate.value - currSongsLeft)
      : "N/A";

    table += `| ${currDate.date.toISOString().split("T")[0]} | ${currSongsLeft} | ${dailyUsage} |\n`;
  }

  // 将表格内容写入 README.md 文件
  const readmeFilePath = "README.md";

  writeFileSync(readmeFilePath, table, "utf8");
}

// 主函数
fetchData();
