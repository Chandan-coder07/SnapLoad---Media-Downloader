[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express.js-Backend-black?logo=express&logoColor=white)](https://expressjs.com/)
[![yt-dlp](https://img.shields.io/badge/yt--dlp-Latest-red.svg)](https://github.com/yt-dlp/yt-dlp)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-Media%20Processing-blue?logo=ffmpeg&logoColor=white)](https://ffmpeg.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

# 🎬 SnapLoad

### Multi-Platform Media Downloader

**Fast video downloads · Audio extraction · 1000+ supported websites · Clean browser dashboard**

**SnapLoad** is a full-stack media downloader built with **Node.js, Express.js, yt-dlp, and FFmpeg**.  
It allows users to fetch media details and download videos or audio from platforms like **YouTube, Instagram, Facebook, TikTok, Twitter/X, Vimeo**, and many other sites supported by `yt-dlp`.

> ⚠️ Legal Notice: This project is for educational and personal use only. Do not use it to download copyrighted content without permission. Always respect the terms of service of each platform.

---

## 🎯 What Makes This Project Unique?

### Universal Media Downloading

- Supports YouTube, Instagram, Facebook, TikTok, Twitter/X, Vimeo, and more
- Uses powerful `yt-dlp` backend integration
- Supports 1000+ websites
- Fetches available video and audio formats
- Allows direct browser-based downloading
- Supports audio-only downloads
- FFmpeg support for media conversion and merging
- Simple, clean, responsive UI

---

## ⚡ Core Capabilities

### Media Downloader

- Paste any supported media URL
- Fetch video title, thumbnail, duration, and format details
- Choose from available video/audio formats
- Download best quality video
- Download audio-only format
- Stream download directly from Express backend
- Works with public videos from supported platforms

### Backend System

- Express.js backend server
- yt-dlp command wrapper
- FFmpeg integration
- Media info API
- Download streaming API
- Health check endpoint
- Rate limiting for abuse protection
- Error handling for failed or unsupported URLs

### Frontend Dashboard

- Clean web interface
- URL input box
- Fetch media information button
- Format selection
- Download button
- Responsive layout
- Beginner-friendly UI
- Works directly in browser

### Security

- Rate limiting enabled
- URL input validation
- No permanent media storage required
- Prevents excessive requests
- Recommended HTTPS deployment
- Designed for personal/educational use

---

## System Architecture

```bash
Frontend
  index.html
  URL Input -> Format Selector -> Download Button

Express Backend
  REST API (/api/health /api/info /api/download)
  Rate Limiter
  Error Handler
  Download Stream Handler

Media Processing Layer
  yt-dlp -> Fetch media information and stream formats
  FFmpeg -> Audio extraction / video merging when required

Output
  Browser downloads video/audio file
```

---

## Project Structure

```bash
snapload/
├── server.js              # Express backend and yt-dlp wrapper
├── package.json           # Node.js dependencies and scripts
├── package-lock.json      # Dependency lock file
├── public/
│   └── index.html         # Frontend UI
├── assets/
│   ├── home.png           # Homepage screenshot
│   ├── formats.png        # Format selection screenshot
│   └── download.png       # Download demo screenshot
└── README.md              # Project documentation
```

---

## 🖥️ Dashboard Preview

### SnapLoad Home Page

<img width="2940" height="1912" alt="image" src="https://github.com/user-attachments/assets/3dc26c0a-3ca7-47bb-b6e5-a69bafcaeeb0" />


### Format Selection

<img width="2206" height="1242" alt="image" src="https://github.com/user-attachments/assets/f439dc77-ba24-482f-b233-3359871c97de" />


### Download Demo

<img width="1188" height="416" alt="image" src="https://github.com/user-attachments/assets/3c57bea0-93e2-4a90-ba29-54d1219a0228" />

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm
- yt-dlp latest version
- FFmpeg installed and added to PATH

---

### 1. Clone

```bash
git clone https://github.com/YOUR_USERNAME/snapload.git
cd snapload
```

---

### 2. Install Node.js Dependencies

```bash
npm install
```

---

### 3. Install yt-dlp

#### macOS

```bash
brew install yt-dlp
```

#### Linux

```bash
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

#### Windows

```bash
winget install yt-dlp
```

Or download `yt-dlp.exe` manually from:

```bash
https://github.com/yt-dlp/yt-dlp/releases/latest
```

---

### 4. Install FFmpeg

#### macOS

```bash
brew install ffmpeg
```

#### Ubuntu / Debian

```bash
sudo apt install ffmpeg
```

#### Windows

Download from:

```bash
https://ffmpeg.org/download.html
```

Then add FFmpeg to your system PATH.

---

### 5. Run SnapLoad

```bash
npm start
```

For development mode:

```bash
npm run dev
```

Open:

```bash
http://localhost:3000
```

---

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Check yt-dlp and FFmpeg status |
| `/api/info?url=<URL>` | GET | Fetch media information and available formats |
| `/api/download?url=<URL>&format_id=<ID>&ext=<ext>&filename=<name>` | GET | Stream selected media download |

---

## API Usage Examples

### Check Health

```bash
curl "http://localhost:3000/api/health"
```

---

### Fetch Video Information

```bash
curl "http://localhost:3000/api/info?url=https://youtube.com/watch?v=dQw4w9WgXcQ"
```

---

### Download Audio as MP3

```bash
curl "http://localhost:3000/api/download?url=https://youtube.com/watch?v=dQw4w9WgXcQ&format_id=bestaudio&ext=mp3&filename=sample-audio" -o sample-audio.mp3
```

---

### Download Best Video

```bash
curl "http://localhost:3000/api/download?url=https://youtube.com/watch?v=dQw4w9WgXcQ&format_id=best&ext=mp4&filename=sample-video" -o sample-video.mp4
```

---

## Supported Platforms

SnapLoad supports websites handled by `yt-dlp`, including:

- YouTube
- Instagram
- Facebook
- TikTok
- Twitter / X
- Vimeo
- Dailymotion
- SoundCloud
- Reddit
- Twitch
- Bilibili
- 1000+ other supported websites

---

## Configuration

Default port:

```bash
3000
```

Run on a custom port:

```bash
PORT=8080 npm start
```

---

### Rate Limiter

You can modify the rate limiter inside `server.js`:

```js
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
});
```

This allows each IP to make **30 requests every 10 minutes**.

---

## Deployment

### VPS Deployment

Install required packages:

```bash
sudo apt update
sudo apt install nodejs npm ffmpeg -y
```

Install yt-dlp:

```bash
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

Install PM2:

```bash
npm install -g pm2
```

Start SnapLoad with PM2:

```bash
pm2 start server.js --name snapload
pm2 save
pm2 startup
```

---

### Nginx Reverse Proxy

Example Nginx config:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_buffering off;
        proxy_read_timeout 300s;
    }
}
```

Restart Nginx:

```bash
sudo systemctl restart nginx
```

---

## Troubleshooting

### yt-dlp not found

Run:

```bash
yt-dlp --version
```

If it fails, reinstall yt-dlp and make sure it is added to PATH.

---

### FFmpeg not found

Run:

```bash
ffmpeg -version
```

If it fails, install FFmpeg and add it to PATH.

---

### Video download is slow

Some platforms take time to prepare streams. Large files may take longer to start downloading.

---

### Private videos are not downloading

Private, login-required, restricted, or age-restricted videos are not supported in the current setup.

---

### Audio conversion is not working

Audio extraction and merging require FFmpeg. Install FFmpeg properly and restart the server.

---

### Some websites suddenly stop working

Websites often change their internal APIs. Update yt-dlp regularly:

```bash
yt-dlp -U
```

For Homebrew users:

```bash
brew upgrade yt-dlp
```

---

## Security Checklist

- [ ] Use rate limiting
- [ ] Validate media URLs
- [ ] Do not store downloaded files permanently
- [ ] Keep yt-dlp updated
- [ ] Keep FFmpeg updated
- [ ] Use HTTPS in production
- [ ] Run behind Nginx on a VPS
- [ ] Avoid downloading copyrighted or restricted content
- [ ] Respect each platform’s terms of service

---

## Built With

Node.js · Express.js · yt-dlp · FFmpeg · HTML · CSS · JavaScript · express-rate-limit

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Legal Disclaimer

This software is for educational and personal use only.

SnapLoad must not be used to download copyrighted, private, restricted, or unauthorized content.  
The developer is not responsible for misuse of this project.

Always respect copyright laws and the terms of service of each platform.

---

## 👨‍💻 Author

** Chandan Kumar Sharma **  
*Department of Computer Science and Engineering*  
**KPR Institute of Engineering and Technology (KPR IET)**  
*Coimbatore, Tamil Nadu, India*

**© 2026 Chandan Kumar Sharma | KPR Institute of Engineering and Technology, CSE Department**

*Built with ❤️ for fast and simple media downloading* 🎬
