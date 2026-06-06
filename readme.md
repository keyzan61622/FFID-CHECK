# FF Account Checker

Aplikasi pengecek UID & status akun Free Fire, powered by HL Gaming Official API.

## Deploy ke Vercel

### 1. Upload ke GitHub
```bash
git init
git add .
git commit -m "init ff checker"
git remote add origin https://github.com/username/ff-checker.git
git push -u origin main
```

### 2. Import ke Vercel
1. Buka https://vercel.com/new
2. Import repo GitHub lo
3. Klik **Deploy** (belum perlu setting apapun)

### 3. Set Environment Variables
Di Vercel dashboard → project lo → **Settings** → **Environment Variables**, tambahkan:

| Key | Value |
|-----|-------|
| `FF_USERUID` | developer UID lo dari HL Gaming |
| `FF_APIKEY` | API key lo dari HL Gaming |

Setelah itu **Redeploy** projectnya.

### 4. Dapat API Key
Daftar di: https://www.hlgamingofficial.com/p/api.html

## Struktur File
```
/
├── index.html       ← UI utama
├── api/
│   └── check.js     ← Serverless proxy (API key aman di sini)
├── vercel.json      ← Config routing
└── README.md
```

## Catatan
- Limit API: 25 request/hari (sesuai plan HL Gaming)
- Kalau limit habis, otomatis muncul pesan error yang ramah
- API key TIDAK pernah terekspos ke frontend (aman)
