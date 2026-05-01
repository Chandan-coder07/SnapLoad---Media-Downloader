# SnapLoad 🎬

A beautiful, fully functional multi-platform media downloader.  
Downloads from **YouTube, Instagram, Facebook, TikTok, Twitter/X, Vimeo** and 1000+ other sites.

---

## ✅ Requirements

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 18 | https://nodejs.org |
| yt-dlp | Latest | https://github.com/yt-dlp/yt-dlp#installation |
| ffmpeg | Any | https://ffmpeg.org/download.html |

---

## 🚀 Quick Start

### 1. Install yt-dlp

**macOS (Homebrew):**
```bash
brew install yt-dlp
```

**Linux:**
```bash
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

**Windows:**
```bash
winget install yt-dlp
# or download yt-dlp.exe from https://github.com/yt-dlp/yt-dlp/releases/latest
```

### 2. Install ffmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt install ffmpeg
```

**Windows:**  
Download from https://ffmpeg.org/download.html and add to PATH.

### 3. Run SnapLoad

```bash
# Install Node.js dependencies
npm install

# Start the server
npm start

# For development (auto-restart on file changes)
npm run dev
```

Open **http://localhost:3000** in your browser. 🎉

---

## 🛠 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Check yt-dlp and ffmpeg status |
| GET | `/api/info?url=<URL>` | Fetch media info and available formats |
| GET | `/api/download?url=<URL>&format_id=<ID>&ext=<ext>&filename=<name>` | Stream download |

### Example: Fetch info
```bash
curl "http://localhost:3000/api/info?url=https://youtube.com/watch?v=dQw4w9WgXcQ"
```

### Example: Download as MP3
```bash
curl "http://localhost:3000/api/download?url=https://youtube.com/watch?v=dQw4w9WgXcQ&format_id=bestaudio&ext=mp3&filename=rick-astley" -o rick-astley.mp3
```

---

## 📁 Project Structure

```
snapload/
├── server.js          ← Express backend (yt-dlp wrapper)
├── package.json
├── public/
│   └── index.html     ← Frontend UI
└── README.md
```

---

## ⚙️ Configuration

Set environment variables before starting:

```bash
PORT=8080 npm start          # Change port (default: 3000)
```

To allow more requests, edit the rate limiter in `server.js`:
```js
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,   // 10 minutes
  max: 30,                     // Max 30 requests per IP
});
```

---

## 🌐 Deploy to a Server (VPS)

```bash
# Install PM2 process manager
npm install -g pm2

# Start with PM2
pm2 start server.js --name snapload
pm2 save
pm2 startup

# Set up Nginx reverse proxy on port 80
# Then visit your server IP in a browser
```

**Nginx config example:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_buffering off;          # Important for streaming downloads
        proxy_read_timeout 300s;      # Long timeout for large files
    }
}
```

---

## ⚠️ Legal Notice

- For **personal use only**. Do not use to download copyrighted material without permission.
- Respect the terms of service of each platform.
- This tool uses [yt-dlp](https://github.com/yt-dlp/yt-dlp) under the Unlicense.

---

## 🐛 Troubleshooting

**"yt-dlp not found"**  
→ Make sure yt-dlp is installed and in your PATH. Run `yt-dlp --version` to confirm.

**"ffmpeg not found"**  
→ Audio extraction and video merging require ffmpeg. Install it and ensure it's in PATH.

**Download fails for private videos**  
→ Private/login-required videos are not supported in the current setup.

**Video is slow to start**  
→ yt-dlp needs a moment to negotiate the best stream. This is normal for large files.

**Keep yt-dlp updated** (sites change their APIs frequently):
```bash
yt-dlp -U
# or
brew upgrade yt-dlp
```
