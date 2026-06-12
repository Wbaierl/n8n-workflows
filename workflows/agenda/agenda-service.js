/**
 * agenda-service.js
 * BLBoardSolutions GmbH – kleiner HTTP-Dienst, der die Agenda-.docx erzeugt.
 *
 * Hintergrund: Die n8n-Code-Sandbox (@n8n/task-runner) verbietet `child_process`
 * und `fs`, der Execute-Command-Node ist nicht registriert. Dieser Dienst läuft
 * daher als eigenständiger Prozess auf dem Server; n8n ruft ihn per HTTP-Node auf.
 *
 * Start:   node /opt/scripts/agenda-service.js
 * Health:  GET  http://127.0.0.1:3001/health
 * Render:  POST http://127.0.0.1:3001/generate   Body: { "data": {...}, "output": "/pfad.docx" }
 *
 * Env (optional):
 *   AGENDA_PORT        (default 3001)
 *   AGENDA_HOST        (default 127.0.0.1 – nur lokal erreichbar)
 *   AGENDA_TOKEN       (wenn gesetzt: Header "Authorization: Bearer <token>" nötig)
 *   AGENDA_TEMPLATE    (default /opt/scripts/agenda_template.docx)
 *   AGENDA_OUTPUT_DIR  (default /opt/scripts/output)
 */
'use strict';

const express       = require('express');
const fs            = require('fs');
const path          = require('path');
const PizZip        = require('pizzip');
const Docxtemplater = require('docxtemplater');

const PORT          = process.env.AGENDA_PORT       || 3001;
const HOST          = process.env.AGENDA_HOST       || '127.0.0.1';
const TOKEN         = process.env.AGENDA_TOKEN      || '';
const TEMPLATE_PATH = process.env.AGENDA_TEMPLATE   || '/opt/scripts/agenda_template.docx';
const OUTPUT_DIR    = process.env.AGENDA_OUTPUT_DIR || '/opt/scripts/output';

const app = express();
app.use(express.json({ limit: '5mb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/generate', (req, res) => {
  try {
    if (TOKEN && req.get('authorization') !== `Bearer ${TOKEN}`) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    // Payload akzeptiert { data: {...} } oder direkt das Datenobjekt
    const data = req.body && req.body.data ? req.body.data : req.body;
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return res.status(400).json({ ok: false, error: 'no valid data object' });
    }

    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const content = fs.readFileSync(TEMPLATE_PATH, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks:    true,
      nullGetter:    () => '',
    });
    doc.render(data);
    const buf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });

    // Dateiname server-seitig absichern: nur Basename, immer in OUTPUT_DIR
    // (verhindert Path-Traversal / Schreiben außerhalb des Output-Verzeichnisses).
    const requested = (req.body && (req.body.filename || req.body.output)) || '';
    let base = path.basename(String(requested));
    if (!base || !base.toLowerCase().endsWith('.docx')) {
      const datum = (data.termin || '').replace(/[^0-9]/g, '-').replace(/-+/g, '-');
      base = `AGD_${datum}_Boardmeeting.docx`;
    }
    const outPath = path.join(OUTPUT_DIR, base);
    fs.writeFileSync(outPath, buf);

    return res.json({ ok: true, path: outPath });
  } catch (e) {
    console.error('generate error:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`agenda-service läuft auf http://${HOST}:${PORT}`);
});
