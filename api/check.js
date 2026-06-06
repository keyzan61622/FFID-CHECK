const https = require("https");

function httpsGet(urlStr) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(urlStr);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: "GET",
      headers: { "Accept": "application/json", "User-Agent": "ff-checker/1.0" },
      timeout: 10000,
    };
    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          reject(new Error("Invalid JSON: " + body.slice(0, 300)));
        }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { uid, region } = req.query;

  if (!uid || !region) {
    return res.status(400).json({ error: "UID dan region wajib diisi." });
  }

  const USERUID = process.env.FF_USERUID;
  const APIKEY  = process.env.FF_APIKEY;

  if (!USERUID || !APIKEY) {
    return res.status(500).json({
      error: "Konfigurasi server belum lengkap.",
      debug: {
        useruid: USERUID ? "ok" : "MISSING",
        apikey:  APIKEY  ? "ok" : "MISSING"
      }
    });
  }

  const urlObj = new URL("https://proapis.hlgamingofficial.com/main/games/freefire/account/api");
  urlObj.searchParams.set("sectionName", "AllData");
  urlObj.searchParams.set("PlayerUid", uid);
  urlObj.searchParams.set("region", region.toLowerCase());
  urlObj.searchParams.set("useruid", USERUID);
  urlObj.searchParams.set("api", APIKEY);

  try {
    const { status, data } = await httpsGet(urlObj.toString());

    if (data && data.usage) {
      const remaining = typeof data.usage.remainingToday === "number" ? data.usage.remainingToday : 1;
      const used      = data.usage.usedToday ?? 0;
      const limit     = data.usage.dailyLimit ?? 25;

      if (remaining <= 0 || used >= limit) {
        return res.status(429).json({
          limitReached: true,
          message: "Maaf, proses Anda tidak bisa dilakukan karena batas sesi hari ini sudah penuh. Silakan coba kembali besok.",
          usage: data.usage,
        });
      }
    }

    if (status !== 200) {
      return res.status(status).json({ error: "Upstream error " + status, detail: data });
    }

    return res.status(200).json(data);

  } catch (err) {
    console.error("[ff-checker] error:", err.message);
    if (err.message === "timeout") {
      return res.status(504).json({ error: "Request timeout. Server Free Fire tidak merespons." });
    }
    return res.status(500).json({ error: err.message });
  }
};
