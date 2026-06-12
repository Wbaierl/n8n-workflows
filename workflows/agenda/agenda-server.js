/**
 * agenda-server.js
 * BLBoardSolutions GmbH – HTTP-Server für Agenda-Generierung
 *
 * Läuft als Systemd-Service auf dem IONOS-Host.
 * n8n (Docker) ruft diesen Server über die Docker-Bridge-IP 172.17.0.1:3001 auf.
 *
 * Endpoints:
 *   POST /generate  → Agenda generieren, gibt Base64-kodierte .docx zurück
 *
 * Request-Body:
 *   { "data": { ...agenda payload... }, "output": "/root/local-files/AGD_...docx" }
 *
 * Response:
 *   { "success": true, "path": "/root/local-files/...", "file_base64": "...", "filename": "..." }
 */

const http = require('http');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 3001;

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/generate') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'Not found' }));
    return;
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch(e) {
      console.error('JSON parse error:', e.message);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Invalid JSON: ' + e.message }));
      return;
    }

    const { data, output } = parsed;
    if (!data || !output) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Missing data or output field' }));
      return;
    }

    // Output-Verzeichnis sicherstellen
    const outputDir = path.dirname(output);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Shell-Escaping: einfache Anführungszeichen escapen
    const escapedJson = JSON.stringify(data).replace(/'/g, "'\\''");

    let stdout;
    try {
      stdout = execSync(
        `node /opt/scripts/generate-agenda.js --data '${escapedJson}' --output '${output}'`,
        { encoding: 'utf8', timeout: 30000 }
      ).trim();
      console.log('Script output:', stdout);
    } catch(e) {
      console.error('Script error:', e.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: e.message, stderr: e.stderr }));
      return;
    }

    if (!stdout.startsWith('OK:')) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: stdout }));
      return;
    }

    // Datei als Base64 zurückgeben (umgeht Docker-Volume Permission-Probleme)
    const filePath = stdout.slice(3).trim();
    let fileBase64;
    try {
      fileBase64 = fs.readFileSync(filePath).toString('base64');
    } catch(e) {
      console.error('Cannot read file:', e.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Cannot read generated file: ' + e.message }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success:     true,
      path:        filePath,
      file_base64: fileBase64,
      filename:    path.basename(filePath),
    }));
  });

  req.on('error', (e) => console.error('Request error:', e.message));
});

server.on('error', (e) => console.error('Server error:', e.message));

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Agenda-Server läuft auf Port ${PORT}`);
});

process.on('uncaughtException', (e) => {
  console.error('Uncaught exception:', e.message);
});
