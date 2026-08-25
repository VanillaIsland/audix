const express = require('express');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// CORS ouvert (nécessaire pour la version web hébergée sur Netlify ;
// l'app iPhone n'en a pas besoin mais ça ne gêne pas)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  next();
});

const OUT = path.join(__dirname, 'public');
fs.mkdirSync(OUT, { recursive: true });

const COOKIES_SRC = '/etc/secrets/cookies.txt'; // lecture seule (Secret File Render)
const COOKIES = '/tmp/cookies.txt';             // copie inscriptible pour yt-dlp

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const BUCKET = 'audix-mp3';

const publicUrlFor = (id) => supabase.storage.from(BUCKET).getPublicUrl(`${id}.mp3`).data.publicUrl;

app.get('/health', (req, res) => res.json({ ok: true }));

app.get('/extract', async (req, res) => {
  const id = String(req.query.id ?? '');
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) return res.status(400).json({ error: 'ID invalide' });

  // 1. Déjà dans Supabase ? URL directe, zéro re-conversion
  try {
    const { error } = await supabase.storage.from(BUCKET).head(`${id}.mp3`);
    if (!error) return res.json({ url: publicUrlFor(id), cached: true });
  } catch (_) {}

  // 2. Conversion yt-dlp
  const file = path.join(OUT, `${id}.mp3`);
  if (!fs.existsSync(file)) {
    if (fs.existsSync(COOKIES_SRC)) {
      try { fs.copyFileSync(COOKIES_SRC, COOKIES); } catch (_) {}
    }

    const args = [
      '-x', '--audio-format', 'mp3', '--audio-quality', '6',
      '--no-playlist', '--js-runtimes', 'node',
      '--remote-components', 'ejs:github',
      '-o', path.join(OUT, `${id}.%(ext)s`),
    ];
    if (fs.existsSync(COOKIES)) {
      args.push('--cookies', COOKIES);
    } else {
      args.push('--extractor-args', 'youtube:player_client=ios,android,default');
    }
    args.push(`https://www.youtube.com/watch?v=${id}`);

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

  // 3. Upload version compressée dans Supabase Storage
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(`${id}.mp3`, fs.readFileSync(file), {
    contentType: 'audio/mpeg',
    upsert: true,
  });
  if (upErr) return res.status(500).json({ error: 'Upload Supabase échoué : ' + upErr.message });

  // 4. Nettoyage du disque local
  fs.promises.unlink(file).catch(() => {});

  res.json({ url: publicUrlFor(id), cached: false });
});

app.listen(process.env.PORT || 10000, () => console.log('Serveur yt-dlp prêt'));
