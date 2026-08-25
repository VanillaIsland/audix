const express = require('express');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const OUT = path.join(__dirname, 'public');
fs.mkdirSync(OUT, { recursive: true });
app.use(express.static(OUT));

app.get('/extract', (req, res) => {
  const id = String(req.query.id ?? '');
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) return res.status(400).json({ error: 'ID invalide' });
  const file = path.join(OUT, `${id}.mp3`);
  if (fs.existsSync(file)) return res.json({ url: `${req.protocol}://${req.get('host')}/${id}.mp3` });
  execFile(
    'yt-dlp',
    ['-x', '--audio-format', 'mp3', '-o', path.join(OUT, `${id}.%(ext)s`), `https://www.youtube.com/watch?v=${id}`],
    { timeout: 180000 },
    (err) => {
      if (err) return res.status(500).json({ error: 'yt-dlp a échoué' });
      res.json({ url: `${req.protocol}://${req.get('host')}/${id}.mp3` });
    }
  );
});

app.listen(process.env.PORT || 3001, () => console.log('Serveur yt-dlp prêt'));
