const express = require('express');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const app = express();

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  next();
});

const OUT = path.join(__dirname, 'public');
fs.mkdirSync(OUT, { recursive: true });

const COOKIES_SRC = '/etc/secrets/cookies.txt';
const COOKIES = '/tmp/cookies.txt';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const BUCKET = 'audix-mp3';

const publicUrlFor = (id) => supabase.storage.from(BUCKET).getPublicUrl(`${id}.mp3`).data.publicUrl;

const ensureCookies = () => {
  if (fs.existsSync(COOKIES_SRC)) {
    try { fs.copyFileSync(COOKIES_SRC, COOKIES); } catch (_) {}
  }
};

const baseArgs = () => {
  const args = ['--no-playlist', '--js-runtimes', 'node', '--remote-components', 'ejs:github'];
  if (fs.existsSync(COOKIES)) args.push('--cookies', COOKIES);
  else args.push('--extractor-args', 'youtube:player_client=ios,android,default');
  return args;
};

app.get('/health', (req, res) => res.json({ ok: true }));

// RAPIDE : URL de flux direct (aucune conversion) → lecture immédiate sans pub
app.get('/stream', async (req, res) => {
  const id = String(req.query.id ?? '');
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) return res.status(400).json({ error: 'ID invalide' });

  try {
    const { error } = await supabase.storage.from(BUCKET).head(`${id}.mp3`);
    if (!error) return res.json({ url: publicUrlFor(id), cached: true });
  } catch (_) {}

  ensureCookies();
  const args = ['-f', 'worstaudio/bestaudio', '-g', ...baseArgs(), `https://www.youtube.com/watch?v=${id}`];
  const result = await new Promise((resolve) => {
    execFile('yt-dlp', args, { timeout: 60000 }, (err, stdout, stderr) =>
      resolve({ ok: !err, stdout: String(stdout || ''), stderr: String(stderr || '') })
    );
  });
  const url = result.stdout.trim().split('\n')[0];
  if (!result.ok || !url) return res.status(500).json({ error: 'Flux introuvable', details: result.stderr.slice(-500) });
  res.json({ url, cached: false });
});

// LENT : conversion MP3 qualité LA PLUS FAIBLE + upload Supabase
app.get('/extract', async (req, res) => {
  const id = String(req.query.id ?? '');
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) return res.status(400).json({ error: 'ID invalide' });

  try {
    const { error } = await supabase.storage.from(BUCKET).head(`${id}.mp3`);
    if (!error) return res.json({ url: publicUrlFor(id), cached: true });
  } catch (_) {}

  const file = path.join(OUT, `${id}.mp3`);
  if (!fs.existsSync(file)) {
    ensureCookies();
    const args = [
      '-f', 'worstaudio/bestaudio',
      '-x', '--audio-format', 'mp3', '--audio-quality', '9',
      ...baseArgs(),
      '-o', path.join(OUT, `${id}.%(ext)s`),
      `https://www.youtube.com/watch?v=${id}`,
    ];
    const result = await new Promise((resolve) => {
      execFile('yt-dlp', args, { timeout: 240000 }, (err, stdout, stderr) =>
        resolve({ ok: !err, stderr: String(stderr || (err && err.message) || '') })
      );
    });
    console.log('yt-dlp stderr:', result.stderr);
    if (!result.ok || !fs.existsSync(file)) {
      return res.status(500).json({ error: 'yt-dlp a échoué', details: result.stderr.slice(-800) });
    }
  }

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(`${id}.mp3`, fs.readFileSync(file), {
    contentType: 'audio/mpeg',
    upsert: true,
  });
  if (upErr) return res.status(500).json({ error: 'Upload Supabase échoué : ' + upErr.message });

  fs.promises.unlink(file).catch(() => {});
  res.json({ url: publicUrlFor(id), cached: false });
});

app.listen(process.env.PORT || 10000, () => console.log('Serveur yt-dlp prêt'));
