const express = require('express');
const serverless = require('serverless-http');
const axios = require('axios');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBperuUWtP36lO_cRyGYSxuiTkhpy54F_Q",
  authDomain: "myvue3-e45b9.firebaseapp.com",
  projectId: "myvue3-e45b9",
  storageBucket: "myvue3-e45b9.firebasestorage.app",
  messagingSenderId: "439732498123",
  appId: "1:439732498123:web:46d43d1cb409e8678c754e",
  measurementId: "G-80R2D8D149",
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const youtubeApiKey = "AIzaSyAUD7ipwX-VAIIgbtw4V6sHKOTfyWoPdMo";

const app = express();

// 用於解析 query string 的中介軟體，Express 4 以上自帶
app.use(express.json());

// 根路由
app.get("/", (req, res) => {
  res.type("text/plain; charset=utf-8");
  res.send("Hello Express");
});

// API 分組路由 (用 express.Router)
const apiRouter = express.Router();

// /api/hello
apiRouter.get("/hello", (req, res) => {
  res.type("application/json; charset=utf-8");
  res.json({
    message: "Hello World.",
    message2: "こんにちは、世界。",
    message3: "世界，你好!",
  });
});

// /api/firebasefood
apiRouter.get("/firebasefood", async (req, res) => {
  res.type("application/json; charset=utf-8");
  try {
    const myvue3foodCollection = collection(db, "myvue3food");
    const snapshot = await getDocs(myvue3foodCollection);
    const documents = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json({ myvue3food: documents });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch data from Firestore",
      details: error.message,
    });
  }
});

// /api/youtube/channel/:channelIds
apiRouter.get("/youtube/channel/:channelIds", async (req, res) => {
  const channelIdsParam = req.params.channelIds;
  if (!channelIdsParam) {
    return res.json({ error: "請提供 channelIds 參數（可用逗號分隔多個）" });
  }
  const channelIds = channelIdsParam
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
  if (channelIds.length === 0 || channelIds.length > 50) {
    return res.json({ error: "頻道 ID 數量需介於 1 到 50 之間" });
  }
  try {
    const response = await axios.get("https://www.googleapis.com/youtube/v3/channels", {
      params: {
        part: "snippet,statistics",
        id: channelIds.join(","),
        key: youtubeApiKey,
      },
    });
    const items = response.data?.items || [];
    if (items.length === 0) return res.json({ error: "找不到任何頻道資料" });
    res.json({ count: items.length, items });
  } catch (error) {
    res.status(500).json({
      error: "無法取得頻道資料",
      message: error.message,
      status: error.response?.status || null,
      response: error.response?.data || null,
    });
  }
});

// /api/youtube/videos/:videoIds
apiRouter.get("/youtube/videos/:videoIds", async (req, res) => {
  const videoIdsParam = req.params.videoIds;
  if (!videoIdsParam) {
    return res.json({ error: "請提供 videoIds 參數（可用逗號分隔多個）" });
  }
  const videoIds = videoIdsParam
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
  if (videoIds.length === 0 || videoIds.length > 50) {
    return res.json({ error: "影片 ID 數量需介於 1 到 50 之間" });
  }
  try {
    const response = await axios.get("https://www.googleapis.com/youtube/v3/videos", {
      params: {
        part: "snippet,statistics",
        id: videoIds.join(","),
        key: youtubeApiKey,
      },
    });
    const items = response.data?.items || [];
    if (items.length === 0) return res.json({ error: "找不到任何影片資料" });
    res.json({ count: items.length, items });
  } catch (error) {
    res.status(500).json({
      error: "無法取得影片資料",
      message: error.message,
      status: error.response?.status || null,
      response: error.response?.data || null,
    });
  }
});

// /api/countdown/:slug
apiRouter.get("/countdown/:slug", (req, res) => {
  const slug = req.params.slug;
  if (!slug || slug.length < 12) {
    return res.json({ error: "Invalid slug. Format should be: YYYYMMDDHHMM" });
  }

  const slugISO = `${slug.slice(0, 4)}-${slug.slice(4, 6)}-${slug.slice(6, 8)}T${slug.slice(
    8,
    10
  )}:${slug.slice(10, 12)}:00+08:00`;

  const now = new Date();
  const next = new Date(slugISO);

  const diffMs = next.getTime() - now.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  let remaining = diffSec;

  const diffday = Math.floor(remaining / 86400);
  remaining -= diffday * 86400;
  const diffhour = Math.floor(remaining / 3600);
  remaining -= diffhour * 3600;
  const diffminute = Math.floor(remaining / 60);
  const diffsecond = remaining % 60;

  res.json({
    slug,
    now: now.toISOString(),
    slugISO,
    next: next.toISOString(),
    diffMs,
    diffday,
    diffhour,
    diffminute,
    diffsecond,
  });
});

// /api/bilibili/:bvid
apiRouter.get("/bilibili/:bvid", async (req, res) => {
  res.type("application/json; charset=utf-8");
  const bvid = req.params.bvid;
  if (!bvid) return res.json({ error: "請提供 bvid 參數" });

  try {
    const response = await axios.get("https://api.bilibili.com/x/web-interface/view", {
      params: { bvid },
    });

    const { pic, title, owner, stat, pages } = response.data.data;
    const raw = response.data.data;
    const newdata = {};
    for (const key in raw) {
      if (typeof raw[key] !== "object") newdata[key] = raw[key];
    }

    res.json({ pic, title, owner, stat, data: newdata, pages });
  } catch (error) {
    res.status(500).json({
      error: "無法取得 Bilibili 資料",
      message: error.message,
      status: error.response?.status || null,
      response: error.response?.data || null,
    });
  }
});

// /api/bilibili/proxyimg?url=...
apiRouter.get("/bilibili/proxyimg", async (req, res) => {
  const url = req.query.url;
  if (!url) {
    res.status(400);
    return res.json({ error: "請提供 url 參數" });
  }

  try {
    const response = await axios.get(url, {
      responseType: "stream",
      headers: { Referer: "https://www.bilibili.com/" },
    });

    res.setHeader("Content-Type", response.headers["content-type"] || "application/octet-stream");
    res.setHeader("Cache-Control", "public, max-age=86400");

    response.data.pipe(res);
  } catch (err) {
    res.status(500).json({ error: "圖片代理失敗", message: err.message });
  }
});

app.use("/api", apiRouter);

module.exports = app;
module.exports.handler = serverless(app);
