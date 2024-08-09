import axios from "axios";
import { readFileSync, writeFileSync, existsSync } from "fs";

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
  // 将数据按日期排序
  const sortedDates = Object.keys(data).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  // 生成表格
  let table = "# Songs Left Change Table\n\n";
  table += "| Date       | Songs Left Change |\n";
  table += "|------------|-------------------|\n";

  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = sortedDates[i - 1];
    const currDate = sortedDates[i];

    const prevSongsLeft = data[prevDate].data.songs_left;
    const currSongsLeft = data[currDate].data.songs_left;

    const change = prevSongsLeft - currSongsLeft;

    table += `| ${currDate} | ${change}                |\n`;
  }

  // 将表格内容写入 README.md 文件
  const readmeFilePath = "README.md";

  writeFileSync(readmeFilePath, table, "utf8");
}

// 主函数
fetchData();
