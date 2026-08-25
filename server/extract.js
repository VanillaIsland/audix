const express = require('express');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const OUT = path.join(__dirname, 'public');
fs.mkdirSync(OUT, { recursive: true });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const BUCKET = 'audix-mp3';

app.get('/health', (req, res) => res.json({ ok: true }));

app.get('/extract', async (req, res) => {
  const id = String(req.query.id ?? '');
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) return res.status(400).json({ error: 'ID invalide' });

  // 1. Déjà dans Supabase ? URL directe, zéro re-conversion
  try {
    const { error } = await supabase.storage.from(BUCKET).head(`${id}.mp3`);
    if (!error) {
      return res.json({ url: supabase.storage.from(BUCKET).getPublicUrl(`${id}.mp3`).publicUrl, cached: true });
    }
  } catch (_) {}

  // 2. Conversion locale yt-dlp
  const file = path.join(OUT, `${id}.mp3`);
  if (!fs.existsSync(file)) {
    const result = await new Promise((resolve) => {
      execFile(
        'yt-dlp',
        [
          '-x', '--audio-format', 'mp3', '--audio-quality', '6',
          '--no-playlist', '--js-runtimes', 'node',
          '--extractor-args', 'youtube:player_client=default,android',
          '-o', path.join(OUT, `${id}.%(ext)s`),
          `https://www.youtube.com/watch?v=${id}`,
        ],
        { timeout: 240000 },
        (err, stdout, stderr) => resolve({ ok: !err, stderr: String(stderr || (err && err.message) || '') })
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

  res.json({ url: supabase.storage.from(BUCKET).getPublicUrl(`${id}.mp3`).publicUrl, cached: false });
});

app.listen(process.env.PORT || 10000, () => console.log('Serveur yt-dlp prêt'));
