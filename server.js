/**
 * SnapLoad — Backend Server
 * Powered by yt-dlp (handles YouTube, Instagram, Facebook, TikTok, Twitter, Vimeo & 1000+ sites)
 */

const express = require('express');
const cors = require('cors');
const { spawn, execFile, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Find yt-dlp binary ───────────────────────────────────────────────────────
function findBinary(name) {
  if (process.env.YT_DLP_PATH && name === 'yt-dlp') return process.env.YT_DLP_PATH;
  if (process.env.FFMPEG_PATH && name === 'ffmpeg') return process.env.FFMPEG_PATH;

  const paths = [
    `/usr/local/bin/${name}`,
    `/usr/bin/${name}`,
    `/opt/homebrew/bin/${name}`,
    `/nix/var/nix/profiles/default/bin/${name}`,
    path.join(process.env.HOME || '', `.local/bin/${name}`),
  ];

  for (const p of paths) {
    try { if (fs.existsSync(p)) return p; } catch {}
  }

  try {
    return execSync(`which ${name}`, { timeout: 3000 }).toString().trim();
  } catch {}

  return name;
}

const YT_DLP = findBinary('yt-dlp');
const FFMPEG = findBinary('ffmpeg');

console.log(`\n🔍 yt-dlp path: ${YT_DLP}`);
console.log(`🔍 ffmpeg path: ${FFMPEG}\n`);

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  const rootHtml = path.join(__dirname, 'index.html');
  const publicHtml = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(rootHtml)) return res.sendFile(rootHtml);
  if (fs.existsSync(publicHtml)) return res.sendFile(publicHtml);
  res.send('SnapLoad is running! index.html not found.');
});

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// ── Helpers ──────────────────────────────────────────────────────────────────
function validateUrl(rawUrl) {
  let url;
  try { url = new URL(rawUrl); } catch { return { valid: false, reason: 'Invalid URL format.' }; }
  const blocked = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
  if (blocked.some(b => url.hostname.includes(b))) return { valid: false, reason: 'URL not allowed.' };
  if (url.protocol === 'file:') return { valid: false, reason: 'File URLs are not allowed.' };
  return { valid: true };
}

function runYtDlp(args, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    console.log(`[yt-dlp] Running: ${YT_DLP} ${args.join(' ')}`);
    execFile(YT_DLP, args, { timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        console.error('[yt-dlp] Error:', stderr || err.message);
        reject(new Error(stderr || err.message));
      } else {
        resolve(stdout);
      }
    });
  });
}

function buildFormatLabel(f) {
  if (f.vcodec === 'none') {
    const abr = f.abr ? `${Math.round(f.abr)}kbps` : '';
    return `${(f.ext || 'audio').toUpperCase()} ${abr} (audio only)`.trim();
  }
  const res = f.height ? `${f.height}p` : f.resolution || '';
  const fps = f.fps && f.fps > 30 ? ` ${Math.round(f.fps)}fps` : '';
  const hdr = (f.dynamic_range || '').includes('HDR') ? ' HDR' : '';
  return `${res}${fps}${hdr} ${(f.ext || 'mp4').toUpperCase()}`.trim();
}

// ── Routes ───────────────────────────────────────────────────────────────────

app.get('/api/health', async (req, res) => {
  const checks = { server: 'ok', ytdlp: false, ffmpeg: false, ytdlp_path: YT_DLP, ffmpeg_path: FFMPEG };
  try {
    const ver = await runYtDlp(['--version'], 10000);
    checks.ytdlp = ver.trim();
  } catch (e) {
    checks.ytdlp = `not found at ${YT_DLP}: ${e.message}`;
  }
  try {
    const out = await new Promise((resolve, reject) => {
      execFile(FFMPEG, ['-version'], { timeout: 5000 }, (err, stdout) => {
        if (err) reject(err); else resolve(stdout.split('\n')[0]);
      });
    });
    checks.ffmpeg = out;
  } catch (e) {
    checks.ffmpeg = `not found at ${FFMPEG}: ${e.message}`;
  }
  res.json(checks);
});

app.get('/api/info', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url parameter.' });

  const check = validateUrl(url);
  if (!check.valid) return res.status(400).json({ error: check.reason });

  try {
    const raw = await runYtDlp([
      '--dump-json',
      '--no-playlist',
      '--no-warnings',
      '--socket-timeout', '30',
      '--extractor-retries', '3',
      '--no-check-certificates',
      url
    ], 60000);

    const info = JSON.parse(raw);

    const seenRes = new Set();
    const formats = (info.formats || [])
      .filter(f => f.url && (f.vcodec === 'none' || f.height))
      .sort((a, b) => (b.height || 0) - (a.height || 0))
      .filter(f => {
        const key = f.vcodec === 'none' ? `audio-${f.abr}` : `${f.height}-${f.ext}`;
        if (seenRes.has(key)) return false;
        seenRes.add(key);
        return true;
      })
      .slice(0, 12)
      .map(f => ({
        format_id: f.format_id,
        label: buildFormatLabel(f),
        ext: f.ext,
        height: f.height || null,
        abr: f.abr || null,
        filesize: f.filesize || f.filesize_approx || null,
        isAudio: f.vcodec === 'none'
      }));

    formats.push({
      format_id: 'bestaudio/best',
      label: 'MP3 Best Quality (audio only)',
      ext: 'mp3',
      isAudio: true,
      filesize: null
    });

    res.json({
      id: info.id,
      title: info.title,
      thumbnail: info.thumbnail,
      duration: info.duration,
      duration_string: info.duration_string,
      view_count: info.view_count,
      uploader: info.uploader,
      upload_date: info.upload_date,
      platform: info.extractor_key || info.extractor,
      webpage_url: info.webpage_url || url,
      formats
    });

  } catch (err) {
    console.error('[/api/info]', err.message);
    if (err.message.includes('Unsupported URL')) {
      return res.status(400).json({ error: 'This URL is not supported. Make sure it is a public video link.' });
    }
    if (err.message.includes('Private') || err.message.includes('Sign in')) {
      return res.status(403).json({ error: 'This content is private or requires login.' });
    }
    if (err.message.includes('not found') || err.message.includes('ENOENT')) {
      return res.status(500).json({ error: 'yt-dlp is not installed on the server. Contact the admin.' });
    }
    res.status(500).json({ error: 'Failed to fetch media info. Check the URL and try again.' });
  }
});

app.get('/api/download', (req, res) => {
  const { url, format_id = 'best', filename = 'download', ext = 'mp4' } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url parameter.' });

  const check = validateUrl(url);
  if (!check.valid) return res.status(400).json({ error: check.reason });

  const safeFilename = filename.replace(/[^a-zA-Z0-9_\-. ]/g, '_').substring(0, 120);
  const safeExt = (ext || 'mp4').replace(/[^a-zA-Z0-9]/g, '');

  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.${safeExt}"`);
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Transfer-Encoding', 'chunked');

  let ytdlpArgs = ['--no-playlist', '--no-warnings', '--socket-timeout', '30', '--no-check-certificates', '-o', '-'];

  if (safeExt === 'mp3') {
    ytdlpArgs.push('-f', 'bestaudio/best', '-x', '--audio-format', 'mp3', '--ffmpeg-location', FFMPEG);
  } else {
    ytdlpArgs.push('-f', format_id || 'best');
    if (safeExt === 'mp4') {
      ytdlpArgs.push('--merge-output-format', 'mp4', '--ffmpeg-location', FFMPEG);
    }
  }

  ytdlpArgs.push(url);

  console.log(`[download] ${YT_DLP} ${ytdlpArgs.join(' ')}`);
  const proc = spawn(YT_DLP, ytdlpArgs);

  proc.stdout.pipe(res);
  proc.stderr.on('data', data => console.log('[yt-dlp stderr]', data.toString().trim()));
  proc.on('error', err => {
    console.error('[yt-dlp spawn error]', err);
    if (!res.headersSent) res.status(500).json({ error: 'yt-dlp not found on server.' });
  });
  proc.on('close', code => {
    if (code !== 0) console.error('[yt-dlp] exited with code', code);
    res.end();
  });
  req.on('close', () => proc.kill('SIGTERM'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 SnapLoad server running at http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health\n`);
});
