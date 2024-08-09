import axios from "axios";
import { readFileSync, writeFileSync, existsSync } from "fs";
import Table from "cli-table3";

// 从环境变量获取 API_KEY 和 MAX_DAYS
const API_KEY = process.env.API_KEY as string;
const MAX_DAYS = parseInt(process.env.MAX_DAYS || "30", 10); // 默认值为 30 天
const DATA_FILE = "data.json"; // 数据存储文件
const README_FILE = "README.md"; // 要更新的 README 文件

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

    // 将更新后的数据写回文件
    writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

    console.log(`Data for ${date} saved successfully.`);

    // 生成并更新 README.md 中的表格
    const differences = calculateDifferences(data);
    const table = generateTable(differences);
    updateReadme(table);
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

// 计算每日 songs_left 差值
function calculateDifferences(data: Record<string, { songs_left: number }>) {
  const dates = Object.keys(data).sort(); // 按日期排序
  const differences = [];

  for (let i = 1; i < dates.length; i++) {
    const prevDate = dates[i - 1];
    const currDate = dates[i];
    const prevData = data[prevDate];
    const currData = data[currDate];

    const songsDifference = prevData.songs_left - currData.songs_left;

    differences.push({
      date: currDate,
      songsDifference,
    });
  }

  return differences;
}

// 生成 ASCII 表格
function generateTable(
  differences: { date: string; songsDifference: number }[]
) {
  const table = new Table({
    head: ["Date", "Songs Difference"],
    colWidths: [15, 20],
  });

  differences.forEach((diff) => {
    table.push([diff.date, diff.songsDifference.toString()]);
  });

  return table.toString();
}

// 更新 README.md 文件
function updateReadme(table: string) {
  const readmeContent = `## Daily Songs Left Differences\n\nHere is the table showing the difference in songs left between each day:\n\n\`\`\`plaintext\n${table}\n\`\`\``;

  if (existsSync(README_FILE)) {
    const existingContent = readFileSync(README_FILE, "utf-8");
    const newContent = existingContent.replace(
      /## Daily Songs Left Differences[\s\S]*?(?=\n##|\n$)/,
      readmeContent
    );
    writeFileSync(README_FILE, newContent);
  } else {
    writeFileSync(README_FILE, readmeContent);
  }

  console.log("README file updated with the new table.");
}

// 主函数
fetchData();
