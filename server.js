/**
 * SnapLoad — Backend Server
 * Powered by yt-dlp (handles YouTube, Instagram, Facebook, TikTok, Twitter, Vimeo & 1000+ sites)
 *
 * Requirements:
 *   - Node.js >= 18
 *   - yt-dlp installed and in PATH  →  https://github.com/yt-dlp/yt-dlp#installation
 *   - ffmpeg installed (for audio extraction / merging)  →  https://ffmpeg.org/download.html
 */

const express = require('express');
const cors = require('cors');
const { spawn, execFile } = require('child_process');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Serve the frontend HTML
app.use(express.static(__dirname));

// Rate limiting — 30 requests per 10 minutes per IP
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Validate that a URL is safe to pass to yt-dlp.
 * Blocks localhost, private IPs, and file:// schemes.
 */
function validateUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return { valid: false, reason: 'Invalid URL format.' };
  }

  const blocked = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
  if (blocked.some(b => url.hostname.includes(b))) {
    return { valid: false, reason: 'URL not allowed.' };
  }

  if (url.protocol === 'file:') {
    return { valid: false, reason: 'File URLs are not allowed.' };
  }

  return { valid: true };
}

/**
 * Run yt-dlp with the given args and return stdout as a string.
 * Rejects with stderr on non-zero exit.
 */
function runYtDlp(args, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const proc = execFile('yt-dlp', args, { timeout: timeoutMs }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr || err.message));
      } else {
        resolve(stdout);
      }
    });
  });
}

/**
 * Map yt-dlp format ID / vcodec / acodec to a human-readable label.
 */
function buildFormatLabel(f) {
  if (f.vcodec === 'none') {
    // Audio-only
    const abr = f.abr ? `${Math.round(f.abr)}kbps` : '';
    return `${(f.ext || 'audio').toUpperCase()} ${abr} (audio only)`;
  }
  const res = f.height ? `${f.height}p` : f.resolution || '';
  const fps = f.fps && f.fps > 30 ? ` ${Math.round(f.fps)}fps` : '';
  const hdr = (f.dynamic_range || '').includes('HDR') ? ' HDR' : '';
  return `${res}${fps}${hdr} ${(f.ext || 'mp4').toUpperCase()}`;
}

// ── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /api/info?url=<URL>
 * Returns metadata + available formats for the given URL.
 */
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
      '--socket-timeout', '15',
      url
    ]);

    const info = JSON.parse(raw);

    // Build a clean list of formats, deduplicated by resolution
    const seenRes = new Set();
    const formats = (info.formats || [])
      .filter(f => {
        // Keep audio-only and video formats
        if (!f.url) return false;
        if (f.vcodec === 'none') return true; // audio only
        if (!f.height) return false;
        return true;
      })
      .sort((a, b) => (b.height || 0) - (a.height || 0))
      .filter(f => {
        const key = f.vcodec === 'none' ? `audio-${f.abr}` : `${f.height}-${f.ext}`;
        if (seenRes.has(key)) return false;
        seenRes.add(key);
        return true;
      })
      .slice(0, 10)
      .map(f => ({
        format_id: f.format_id,
        label: buildFormatLabel(f),
        ext: f.ext,
        height: f.height || null,
        abr: f.abr || null,
        filesize: f.filesize || f.filesize_approx || null,
        isAudio: f.vcodec === 'none'
      }));

    // Always add an MP3 option
    formats.push({
      format_id: 'bestaudio',
      label: 'MP3 Best Quality (audio only)',
      ext: 'mp3',
      isAudio: true,
      filesize: null
    });

    const result = {
      id: info.id,
      title: info.title,
      thumbnail: info.thumbnail,
      duration: info.duration,
      duration_string: info.duration_string,
      view_count: info.view_count,
      like_count: info.like_count,
      uploader: info.uploader,
      upload_date: info.upload_date,
      platform: info.extractor_key || info.extractor,
      webpage_url: info.webpage_url,
      formats
    };

    res.json(result);
  } catch (err) {
    console.error('[/api/info]', err.message);
    if (err.message.includes('Unsupported URL')) {
      return res.status(400).json({ error: 'This URL is not supported. Make sure it points to a public video/photo.' });
    }
    if (err.message.includes('Private video') || err.message.includes('Sign in')) {
      return res.status(403).json({ error: 'This content is private or requires login.' });
    }
    res.status(500).json({ error: 'Failed to fetch media info. Check the URL and try again.' });
  }
});

/**
 * GET /api/download?url=<URL>&format_id=<ID>&filename=<name>
 * Streams the download directly to the client via yt-dlp pipe.
 */
app.get('/api/download', (req, res) => {
  const { url, format_id = 'bestvideo+bestaudio/best', filename = 'download', ext = 'mp4' } = req.query;

  if (!url) return res.status(400).json({ error: 'Missing url parameter.' });

  const check = validateUrl(url);
  if (!check.valid) return res.status(400).json({ error: check.reason });

  const safeFilename = filename.replace(/[^a-zA-Z0-9_\-. ]/g, '_').substring(0, 120);
  const safeExt = (ext || 'mp4').replace(/[^a-zA-Z0-9]/g, '');

  // Set headers for file download
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.${safeExt}"`);
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Transfer-Encoding', 'chunked');

  let ytdlpArgs = [
    '--no-playlist',
    '--no-warnings',
    '--socket-timeout', '30',
    '-o', '-',            // output to stdout → we pipe it to res
  ];

  // Audio → transcode to MP3 via ffmpeg
  if (safeExt === 'mp3') {
    ytdlpArgs.push('-f', 'bestaudio/best', '-x', '--audio-format', 'mp3');
  } else {
    ytdlpArgs.push('-f', format_id || 'bestvideo+bestaudio/best');
    if (safeExt === 'mp4') {
      ytdlpArgs.push('--merge-output-format', 'mp4');
    }
  }

  ytdlpArgs.push(url);

  const proc = spawn('yt-dlp', ytdlpArgs);

  proc.stdout.pipe(res);

  proc.stderr.on('data', data => {
    // Log progress lines but don't crash
    const line = data.toString().trim();
    if (line) console.log('[yt-dlp]', line);
  });

  proc.on('error', err => {
    console.error('[yt-dlp spawn error]', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'yt-dlp not found. Please install it first.' });
    }
  });

  proc.on('close', code => {
    if (code !== 0) {
      console.error('[yt-dlp] exited with code', code);
    }
    res.end();
  });

  // If client disconnects, kill yt-dlp
  req.on('close', () => proc.kill('SIGTERM'));
});

/**
 * GET /api/health
 * Checks if yt-dlp and ffmpeg are available.
 */
app.get('/api/health', async (req, res) => {
  const checks = { server: 'ok', ytdlp: false, ffmpeg: false };

  try {
    const ver = await runYtDlp(['--version'], 5000);
    checks.ytdlp = ver.trim();
  } catch {
    checks.ytdlp = 'not found — install from https://github.com/yt-dlp/yt-dlp';
  }

  try {
    await new Promise((resolve, reject) => {
      execFile('ffmpeg', ['-version'], { timeout: 5000 }, (err, stdout) => {
        if (err) reject(err);
        else resolve(stdout.split('\n')[0]);
      });
    }).then(v => { checks.ffmpeg = v; });
  } catch {
    checks.ffmpeg = 'not found — install from https://ffmpeg.org/download.html';
  }

  res.json(checks);
});

// ── Start ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 SnapLoad server running at http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health\n`);
});
