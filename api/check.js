module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { uid } = req.query;

  if (!uid) {
    return res.status(400).json({ error: "UID wajib diisi." });
  }

  if (!/^\d{6,20}$/.test(uid)) {
    return res.status(400).json({ error: "UID harus berupa angka (6-20 digit)." });
  }

  try {
    const upstream = await fetch(`https://api.isan.eu.org/nickname/ff?id=${uid}`);
    const data = await upstream.json();

    console.log(JSON.stringify({ uid, status: upstream.status, data }));

    if (!upstream.ok || !data.success) {
      return res.status(404).json({
        success: false,
        message: "UID tidak ditemukan. Pastikan UID dan region sudah benar."
      });
    }

    return res.status(200).json(data);

  } catch (err) {
    console.error("[ff] error:", err.message);
    return res.status(500).json({ error: "Gagal terhubung ke server. Coba lagi." });
  }
};
