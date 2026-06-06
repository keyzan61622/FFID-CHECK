const https = require("https");

function httpsGet(urlStr) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr);
    const options = {
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname + parsed.search,
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0",
      },
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => {
        console.log("[ff] status:", res.statusCode);
        console.log("[ff] body preview:", body.slice(0, 500));
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: { raw: body.slice(0, 500) } });
        }
      });
    });

    req.setTimeout(12000, () => {
      req.destroy();
      reject(new Error("timeout"));
    });

    req.on("error", (err) => {
      console.error("[ff] request error:", err.message);
      reject(err);
    });

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

  console.log("[ff] USERUID present:", !!USERUID);
  console.log("[ff] APIKEY present:", !!APIKEY);
  console.log("[ff] uid:", uid, "region:", region);

  if (!USERUID || !APIKEY) {
    return res.status(500).json({
      error: "Env variable missing",
      debug: {
        FF_USERUID: USERUID ? "ok" : "MISSING",
        FF_APIKEY:  APIKEY  ? "ok" : "MISSING",
      }
    });
  }

  const urlObj = new URL("https://proapis.hlgamingofficial.com/main/games/freefire/account/api");
  urlObj.searchParams.set("sectionName", "AllData");
  urlObj.searchParams.set("PlayerUid", uid);
  urlObj.searchParams.set("region", region.toLowerCase());
  urlObj.searchParams.set("useruid", USERUID);
  urlObj.searchParams.set("api", APIKEY);

  console.log("[ff] hitting:", urlObj.toString().replace(APIKEY, "***").replace(USERUID, "***"));

  try {
    const { status, data } = await httpsGet(urlObj.toString());

    console.log("[ff] upstream status:", status);
    console.log("[ff] upstream data keys:", Object.keys(data || {}));

    // Cek limit
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
    console.error("[ff] catch error:", err.message);
    if (err.message === "timeout") {
      return res.status(504).json({ error: "Timeout. Server Free Fire tidak merespons." });
    }
    return res.status(500).json({ error: err.message });
  }
};
