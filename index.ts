import axios from "axios";
import { readFileSync, writeFileSync, existsSync } from "fs";

// 从环境变量获取 API_KEY 和 MAX_DAYS
const API_KEY = process.env.API_KEY as string;
const MAX_DAYS = parseInt(process.env.MAX_DAYS || "30", 10); // 默认值为 30 天
const DATA_FILE = "data.json"; // 数据存储文件

async function fetchData() {
  const config = {
    url: "https://api.sunoaiapi.com/api/v1/gateway/limit",
    method: "get",
    headers: {
      "Content-Type": "application/json",
      "api-key": `${API_KEY}`, // 使用从环境变量中读取的 API_KEY
    },
  };

  try {
    const response = await axios(config);
    const newData = response.data;
    const date = new Date().toISOString().split("T")[0];

    // 如果文件存在，读取已有数据
    let data = [];
    if (existsSync(DATA_FILE)) {
      const fileContent = readFileSync(DATA_FILE, "utf-8");
      data = JSON.parse(fileContent);
    }

    // 将新数据添加到数组的开头
    data.unshift({ date, data: newData });

    // 如果数据条目超过最大天数，删除最旧的数据
    if (data.length > MAX_DAYS) {
      data.pop();
    }

    // 将更新后的数据写回文件
    writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

    console.log(`Data for ${date} saved successfully.`);
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

fetchData();
