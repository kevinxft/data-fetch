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
    url: "https://api.sunoaiapi.com/api/v1/gateway/limit",
    method: "get",
    headers: {
      "Content-Type": "application/json",
      "api-key": API_KEY, // 使用从环境变量中读取的 API_KEY
    },
  };

  try {
    const response = await axios(config);
    const newData = response.data;
    if (!process.env.GITHUB_ACTIONS) {
      console.log(newData);
    }
    const date = new Date().toISOString().split("T")[0];

    // 如果文件存在，读取已有数据
    let data: Record<string, any> = {};
    if (existsSync(DATA_FILE)) {
      const fileContent = readFileSync(DATA_FILE, "utf-8");
      data = JSON.parse(fileContent);
    }

    // 更新数据
    data[date] = newData;

    // 保持数据不超过 MAX_DAYS 天
    const sortedDates = Object.keys(data).sort();
    if (sortedDates.length > MAX_DAYS) {
      const cutoffDate = sortedDates[sortedDates.length - MAX_DAYS - 1];
      for (const dateKey of sortedDates) {
        if (new Date(dateKey) < new Date(cutoffDate)) {
          delete data[dateKey];
        }
      }
    }

    // 将更新后的数据写回文件
    writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

    generateAsciiTable(data);
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

type DataEntry = {
  code: number;
  msg: string;
  data: {
    songs_left: number;
    points: number;
  };
};

type Data = {
  [date: string]: DataEntry;
};
function generateAsciiTable(data: Data) {
  // 将数据按日期排序并反转顺序（最新日期在前）
  const sortedDates = Object.keys(data).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  const chartPoint: ChartPoint[] = [];
  let table = "# API使用量(2小时更新一次)\n\n";

  // 只取最近14天的数据用于走势图
  const last14Days = sortedDates.slice(0, 14).reverse(); // 反转顺序，使日期按时间顺序排列
  
  // 计算每天的使用次数
  for (let i = 0; i < last14Days.length - 1; i++) {
    const currentDate = last14Days[i];
    const nextDate = last14Days[i + 1];
    const dailyUsage = Math.abs(data[nextDate].data.songs_left - data[currentDate].data.songs_left);
    
    chartPoint.push({
      date: new Date(nextDate),
      value: dailyUsage
    });
  }

  // 生成走势图
  generateSVG(chartPoint);
  table += "\n\n ![走势图](./chart.svg)\n\n";

  // 计算并显示周平均使用量
  const weeklyUsage = chartPoint.reduce((sum, point) => sum + point.value, 0);
  const weeklyAvg = chartPoint.length > 0 ? Math.round(weeklyUsage / chartPoint.length) : 'N/A';
  const currentSongsLeft = data[sortedDates[0]]?.data.songs_left || 0;
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

  for (let i = 0; i < sortedDates.length; i++) {
    const currDate = sortedDates[i];
    const currSongsLeft = data[currDate].data.songs_left;
    const prevDate = i < sortedDates.length - 1 ? sortedDates[i + 1] : null;
    const dailyUsage = prevDate
      ? Math.abs(data[prevDate].data.songs_left - currSongsLeft)
      : "N/A";

    table += `| ${currDate} | ${currSongsLeft} | ${dailyUsage} |\n`;
  }

  // 将表格内容写入 README.md 文件
  const readmeFilePath = "README.md";

  writeFileSync(readmeFilePath, table, "utf8");
}

// 主函数
fetchData();
