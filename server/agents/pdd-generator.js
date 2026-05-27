/**
 * PDD Generator
 *
 * Builds the *Approved Final PDD* for a given project by:
 *   1. Loading the original PDD file uploaded by BT (preserves headers, footers,
 *      styles, screenshots and embedded images).
 *   2. Appending a new "Clarifications from BA Review" section containing every
 *      BA gap and the matching BT response.
 *   3. Appending an Approval block (who approved, when, version bump).
 *   4. Saving the result as a brand-new DOCX without modifying the original.
 *
 * Usage (CLI):
 *   node server/agents/pdd-generator.js <projectId> [outPath]
 *
 * Usage (programmatic):
 *   const { generateApprovedPdd } = require('./pdd-generator');
 *   const { buffer, fileName } = await generateApprovedPdd(projectId);
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');
const JSZip = require('jszip');

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'aadlc';

// ---------- helpers ----------

function xmlEscape(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Build a styled paragraph; supports bold, color, size (half-points), and tab
function buildPara({ text, bold = false, size, color, alignment, spacingAfter = 80, bgShade }) {
  const runs = String(text == null ? '' : text)
    .split(/\r?\n/)
    .map((line, i) => {
      const rPr = [];
      if (bold) rPr.push('<w:b/><w:bCs/>');
      if (color) rPr.push(`<w:color w:val="${color}"/>`);
      if (size) rPr.push(`<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>`);
      const rPrXml = rPr.length ? `<w:rPr>${rPr.join('')}</w:rPr>` : '';
      const br = i > 0 ? '<w:br/>' : '';
      return `<w:r>${rPrXml}${br}<w:t xml:space="preserve">${xmlEscape(line)}</w:t></w:r>`;
    })
    .join('');

  const pPr = [];
  if (alignment) pPr.push(`<w:jc w:val="${alignment}"/>`);
  pPr.push(`<w:spacing w:after="${spacingAfter}"/>`);
  if (bgShade) pPr.push(`<w:shd w:val="clear" w:color="auto" w:fill="${bgShade}"/>`);
  const pPrXml = pPr.length ? `<w:pPr>${pPr.join('')}</w:pPr>` : '';

  return `<w:p>${pPrXml}${runs}</w:p>`;
}

function buildHeading(text, level = 1) {
  // Heading levels: 1 = 32 half-pts (16pt), 2 = 28 half-pts (14pt), 3 = 24 half-pts (12pt)
  const size = level === 1 ? 32 : level === 2 ? 28 : 24;
  return `<w:p><w:pPr><w:pStyle w:val="Heading${level}"/><w:spacing w:before="240" w:after="120"/></w:pPr>` +
    `<w:r><w:rPr><w:b/><w:bCs/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/><w:color w:val="A100FF"/></w:rPr>` +
    `<w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r></w:p>`;
}

function buildCategoryColor(category) {
  // Pastel-ish hex backgrounds matched to the editorial design system
  const map = {
    'Business Logic': 'DBEAFE',
    'Data Validation': 'D1FAE5',
    'Process Governance': 'FEF3C7',
    'Integration': 'EDE9FE',
    'Risk Management': 'FEE2E2',
    'Performance': 'FCE7F3'
  };
  return map[category] || 'E5E7EB';
}

// Build a 2-col table where the left col is a label and the right is content
function buildTable(rows) {
  const grid = '<w:tblGrid><w:gridCol w:w="2800"/><w:gridCol w:w="6800"/></w:tblGrid>';
  const tblPr = `<w:tblPr>
    <w:tblW w:w="9600" w:type="dxa"/>
    <w:tblBorders>
      <w:top w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>
      <w:left w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>
      <w:bottom w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>
      <w:right w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>
      <w:insideH w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>
      <w:insideV w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>
    </w:tblBorders>
  </w:tblPr>`;
  const trs = rows.map(([label, value, shade]) => {
    const shadeXml = shade ? `<w:shd w:val="clear" w:color="auto" w:fill="${shade}"/>` : '';
    const labelCell =
      `<w:tc><w:tcPr><w:tcW w:w="2800" w:type="dxa"/>${shadeXml}</w:tcPr>` +
      `<w:p><w:pPr><w:spacing w:after="0"/></w:pPr>` +
      `<w:r><w:rPr><w:b/><w:bCs/><w:sz w:val="20"/></w:rPr>` +
      `<w:t xml:space="preserve">${xmlEscape(label)}</w:t></w:r></w:p></w:tc>`;
    const lines = String(value == null ? '' : value).split(/\r?\n/);
    const valueRuns = lines.map((l, i) => {
      const br = i > 0 ? '<w:br/>' : '';
      return `<w:r><w:rPr><w:sz w:val="20"/></w:rPr>${br}<w:t xml:space="preserve">${xmlEscape(l)}</w:t></w:r>`;
    }).join('');
    const valueCell =
      `<w:tc><w:tcPr><w:tcW w:w="6800" w:type="dxa"/></w:tcPr>` +
      `<w:p><w:pPr><w:spacing w:after="0"/></w:pPr>${valueRuns}</w:p></w:tc>`;
    return `<w:tr>${labelCell}${valueCell}</w:tr>`;
  }).join('');
  return `<w:tbl>${tblPr}${grid}${trs}</w:tbl><w:p><w:pPr><w:spacing w:after="120"/></w:pPr></w:p>`;
}

function buildGapBlock(idx, gap, response) {
  const respText = (response && (response.text || response)) || '(No response recorded)';
  const respDate = response && response.submittedAt
    ? new Date(response.submittedAt).toLocaleString()
    : null;
  const respBy = (response && response.submittedBy) || 'BT Team';

  const rows = [
    ['Category', gap.category || 'N/A', buildCategoryColor(gap.category)],
    ['Complexity', (gap.complexity || 'medium').toUpperCase()]
  ];
  if (gap.pddReference) rows.push(['PDD Reference', gap.pddReference]);
  if (gap.answerHint) rows.push(['Expected Answer Shape', gap.answerHint]);
  if (gap.impactIfUnanswered) rows.push(['Impact if Unanswered', gap.impactIfUnanswered]);
  rows.push(['BA Question', gap.question]);
  rows.push(['BT Response', respText]);
  rows.push(['Responded By', respDate ? `${respBy} — ${respDate}` : respBy]);

  return (
    buildPara({ text: `Q${idx}. ${gap.question.substring(0, 180)}${gap.question.length > 180 ? '…' : ''}`,
               bold: true, size: 22, color: '0A1628', spacingAfter: 60 }) +
    buildTable(rows)
  );
}

// Build XML for the entire "Clarifications + Approval" section
function buildClarificationsXml({ project, approval }) {
  const gaps = project.baGaps || [];
  const responses = project.btResponses || {};

  const intro =
    buildHeading('Annexure A — Clarifications from BA Review', 1) +
    buildPara({
      text:
        'The following questions were raised by the Business Analyst (BA) Agent during the PDD review. ' +
        'Each question has been answered by the Business Transformation (BT) team and the answers form ' +
        'part of the approved scope for downstream Architecture, TDD and Development work.',
      size: 22, spacingAfter: 200
    }) +
    buildTable([
      ['Total Questions Raised', String(gaps.length)],
      ['Total Questions Answered', String(Object.keys(responses).length)],
      ['Outcome', gaps.length === Object.keys(responses).length ? 'All questions answered — PDD approved' : 'Partially answered']
    ]);

  const gapBlocks = gaps.map((g, i) => buildGapBlock(i + 1, g, responses[g.id])).join('');

  const approvalBlock =
    buildHeading('Annexure B — PDD Approval Record', 1) +
    buildTable([
      ['Project Name', project.name || 'N/A'],
      ['Project ID', String(project._id)],
      ['BT Lead', project.btLead || 'BT Lead'],
      ['Status at Approval', 'Approved — Ready for Architecture phase'],
      ['Original PDD Version', '1.x (as uploaded)'],
      ['Approved PDD Version', '2.0 (Final — incl. BA clarifications)'],
      ['Approval Notes', approval.approvalNotes || 'Approved without additional notes.'],
      ['Approved By', approval.approvedBy || 'BT Team'],
      ['Approved On', approval.approvedAt
        ? new Date(approval.approvedAt).toLocaleString()
        : new Date().toLocaleString()],
      ['Generated By', 'A-ADLC Platform — Approved PDD Generator']
    ]);

  const footerNote = buildPara({
    text:
      'This document is a system-generated, sign-off-ready version of the Process Definition Document. ' +
      'It preserves the original PDD body (including diagrams and screenshots) and appends the ' +
      'authoritative clarifications captured during the BA review cycle.',
    size: 18, color: '6B7280', spacingAfter: 0
  });

  return (
    // Page break before the appendix so it starts cleanly
    `<w:p><w:r><w:br w:type="page"/></w:r></w:p>` +
    intro +
    gapBlocks +
    approvalBlock +
    footerNote
  );
}

// Find </w:body> and inject our XML right before it (and before any final <w:sectPr>)
function injectIntoDocumentXml(docXml, clarificationsXml) {
  const bodyClose = '</w:body>';
  const idx = docXml.lastIndexOf(bodyClose);
  if (idx === -1) throw new Error('Could not locate </w:body> in document.xml');

  // If the section ends with <w:sectPr>, insert BEFORE it so our content stays
  // inside the same section. Otherwise inject immediately before </w:body>.
  const sectPrMatch = docXml.slice(0, idx).match(/<w:sectPr\b[\s\S]*?<\/w:sectPr>\s*$/);
  if (sectPrMatch) {
    const insertAt = idx - sectPrMatch[0].length;
    return docXml.slice(0, insertAt) + clarificationsXml + docXml.slice(insertAt);
  }
  return docXml.slice(0, idx) + clarificationsXml + docXml.slice(idx);
}

// ---------- main API ----------

async function generateApprovedPdd(projectId, opts = {}) {
  if (!MONGODB_URI) throw new Error('MONGODB_URI is not set in .env');
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  try {
    const db = client.db(MONGODB_DB);

    const project = await db.collection('projects').findOne({ _id: new ObjectId(projectId) });
    if (!project) throw new Error(`Project not found: ${projectId}`);

    // Build the candidate list of uploaded PDDs to try, newest first.
    // Priority: explicit override > change-request uploads (these are the
    // BT-supplied corrections) > the original pdd_review upload.
    const hasZipMagic = (b) =>
      b && b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;

    const candidates = [];
    if (opts.pddFilePath) {
      candidates.push({ path: opts.pddFilePath, source: 'opts.pddFilePath' });
    }
    const crJobs = await db.collection('jobs').find(
      { projectId, stage: 'change-request', 'context.pddFilePath': { $exists: true, $ne: null } }
    ).sort({ createdAt: -1 }).toArray();
    for (const j of crJobs) {
      candidates.push({ path: j.context.pddFilePath, source: `change-request job ${j._id}` });
    }
    const reviewJobs = await db.collection('jobs').find(
      { projectId, stage: 'pdd_review', 'context.pddFilePath': { $exists: true, $ne: null } }
    ).sort({ createdAt: -1 }).toArray();
    for (const j of reviewJobs) {
      candidates.push({ path: j.context.pddFilePath, source: `pdd_review job ${j._id}` });
    }

    if (candidates.length === 0) {
      throw new Error(
        `No PDD upload found for project ${projectId}. ` +
        `Submit a Change Request with the original .docx PDD attached and try again.`
      );
    }

    // Try each candidate. For each one we (a) read the bytes, (b) if not a ZIP,
    // attempt the legacy data-URL / base64 recovery, and (c) on success rewrite
    // the file as binary DOCX so future agents read clean bytes.
    const tried = [];
    let buf = null;
    let pddFilePath = null;
    for (const cand of candidates) {
      const p = cand.path;
      if (!p || !fs.existsSync(p)) {
        tried.push(`${cand.source}: file not on disk (${p || 'no path'})`);
        continue;
      }
      if (!p.toLowerCase().endsWith('.docx')) {
        tried.push(`${cand.source}: not a .docx (${path.extname(p)})`);
        continue;
      }

      let candBuf = fs.readFileSync(p);
      if (!hasZipMagic(candBuf)) {
        const asText = candBuf.toString('utf8').trim();
        let base64Payload = null;
        const dataUrlMatch = /^data:[^;]+;base64,([\s\S]*)$/.exec(asText);
        if (dataUrlMatch) {
          base64Payload = dataUrlMatch[1];
        } else if (/^[A-Za-z0-9+/=\s]+$/.test(asText) && asText.length > 100) {
          base64Payload = asText;
        }
        if (base64Payload) {
          const decoded = Buffer.from(base64Payload.replace(/\s+/g, ''), 'base64');
          if (hasZipMagic(decoded)) {
            console.log(`✓ Legacy data-URL upload detected — rewriting ${p} as binary DOCX`);
            try { fs.writeFileSync(p, decoded); }
            catch (writeErr) { console.warn(`⚠️  Could not rewrite legacy PDD on disk: ${writeErr.message}`); }
            candBuf = decoded;
          }
        }
      }

      if (hasZipMagic(candBuf)) {
        buf = candBuf;
        pddFilePath = p;
        console.log(`✓ Using PDD from ${cand.source}: ${p}`);
        break;
      }
      tried.push(`${cand.source}: file present but not a valid DOCX (corrupt base64/data-URL upload; cannot recover)`);
    }

    if (!buf) {
      throw new Error(
        `No usable PDD found for project ${projectId}. This usually means the original ` +
        `upload was corrupted by a now-fixed encoding bug. To recover: open Change Request, ` +
        `attach the original .docx PDD, and re-submit — the next download will use that file. ` +
        `Candidates tried:\n  - ${tried.join('\n  - ')}`
      );
    }

    const zip = await JSZip.loadAsync(buf);

    const documentXmlEntry = zip.file('word/document.xml');
    if (!documentXmlEntry) throw new Error('word/document.xml missing from the uploaded DOCX');
    const docXml = await documentXmlEntry.async('string');

    const clarificationsXml = buildClarificationsXml({
      project,
      approval: opts.approval || {}
    });
    const newDocXml = injectIntoDocumentXml(docXml, clarificationsXml);
    zip.file('word/document.xml', newDocXml);

    // Bump core.xml metadata so the saved file looks like a fresh revision
    const coreEntry = zip.file('docProps/core.xml');
    if (coreEntry) {
      let core = await coreEntry.async('string');
      const nowIso = new Date().toISOString();
      core = core.replace(/<dcterms:modified[^>]*>[^<]*<\/dcterms:modified>/,
        `<dcterms:modified xsi:type="dcterms:W3CDTF">${nowIso}</dcterms:modified>`);
      core = core.replace(/<cp:revision>[^<]*<\/cp:revision>/, '<cp:revision>2</cp:revision>');
      core = core.replace(/<cp:lastModifiedBy>[^<]*<\/cp:lastModifiedBy>/,
        '<cp:lastModifiedBy>A-ADLC Platform</cp:lastModifiedBy>');
      zip.file('docProps/core.xml', core);
    }

    const outBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    const safeName = (project.name || 'Project').replace(/[^a-z0-9_\-]+/gi, '_');
    const fileName = `Approved_PDD_${safeName}_v2.0.docx`;
    return { buffer: outBuffer, fileName, project };
  } finally {
    await client.close();
  }
}

module.exports = { generateApprovedPdd };

// ---------- CLI entrypoint ----------
if (require.main === module) {
  (async () => {
    const projectId = process.argv[2];
    const outPath = process.argv[3];
    if (!projectId) {
      console.error('Usage: node server/agents/pdd-generator.js <projectId> [outPath]');
      process.exit(1);
    }
    try {
      const { buffer, fileName } = await generateApprovedPdd(projectId);
      const finalOut = outPath || path.join(process.cwd(), fileName);
      fs.writeFileSync(finalOut, buffer);
      console.log(`✓ Approved PDD written: ${finalOut} (${(buffer.length / 1024).toFixed(1)} KB)`);
    } catch (e) {
      console.error('❌ Failed to generate Approved PDD:', e.message);
      process.exit(1);
    }
  })();
}
