export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { uid, region } = req.query;

  if (!uid || !region) {
    return res.status(400).json({ error: "UID dan region wajib diisi." });
  }

  const USERUID = process.env.FF_USERUID;
  const APIKEY = process.env.FF_APIKEY;
  const DAILY_LIMIT = 25;

  if (!USERUID || !APIKEY) {
    return res.status(500).json({ error: "Konfigurasi server belum lengkap." });
  }

  // ── Daily rate limiter pakai KV Vercel atau fallback in-memory ──
  // Untuk Vercel: pakai environment variable FF_USED_TODAY + FF_USED_DATE
  // Tapi karena serverless stateless, kita pakai Vercel KV jika ada,
  // atau return pesan batas jika FORCE_LIMIT=true di env

  const today = new Date().toISOString().slice(0, 10);
  const usedKey = `FF_USED_${today}`;

  // Ambil counter dari env (set manual) atau pakai header tracking via KV
  // Implementasi sederhana: hit API langsung, cek usage dari response
  const url = new URL("https://proapis.hlgamingofficial.com/main/games/freefire/account/api");
  url.searchParams.set("sectionName", "AllData");
  url.searchParams.set("PlayerUid", uid);
  url.searchParams.set("region", region.toLowerCase());
  url.searchParams.set("useruid", USERUID);
  url.searchParams.set("api", APIKEY);

  try {
    const upstream = await fetch(url.toString(), {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    const data = await upstream.json();

    // Cek apakah usage sudah mentok limit
    if (data?.usage) {
      const remaining = data.usage.remainingToday ?? 0;
      const used = data.usage.usedToday ?? 0;
      const limit = data.usage.dailyLimit ?? DAILY_LIMIT;

      if (remaining <= 0 || used >= limit) {
        return res.status(429).json({
          limitReached: true,
          message:
            "Maaf, proses Anda tidak bisa dilakukan karena batas sesi hari ini sudah penuh. Silakan coba kembali besok.",
          resetAt: "00:00 WIB besok",
          usage: data.usage,
        });
      }
    }

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: "Gagal mengambil data dari server Free Fire." });
    }

    return res.status(200).json(data);
  } catch (err) {
    if (err.name === "TimeoutError") {
      return res.status(504).json({ error: "Request timeout. Server Free Fire tidak merespons." });
    }
    console.error("FF API error:", err);
    return res.status(500).json({ error: "Terjadi kesalahan server. Coba lagi." });
  }
}
