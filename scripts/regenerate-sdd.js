/**
 * One-shot SDD regeneration:
 *   1. Loads project + latest PDD from Mongo
 *   2. Parses PDD (.docx via mammoth, .pdf via pdf-parse), pulls embedded images
 *   3. Calls Claude CLI with the updated architect-agent.md prompt
 *   4. Saves the new SDD back to project.sddDocument
 *   5. Exports an SDD.docx with the PDD screenshots embedded
 *
 * Usage:
 *   node scripts/regenerate-sdd.js          # uses the single project in DB
 *   node scripts/regenerate-sdd.js <id>     # targets a specific project
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const PDFParse = require('pdf-parse');
const mammoth = require('mammoth');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, AlignmentType, ImageRun, PageBreak, BorderStyle
} = require('docx');

const PROMPT_PATH = path.join(__dirname, '..', 'Prompts', 'architect-agent.md');
const OUT_DIR = path.join(__dirname, '..', 'tmp-pdd-analysis');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const PROMPT_TEMPLATE = fs.readFileSync(PROMPT_PATH, 'utf-8');

function renderPrompt(vars) {
  return PROMPT_TEMPLATE.replace(/\{\{(\w+)\}\}/g, (m, k) =>
    Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m
  );
}

function formatBaGaps(baGaps) {
  if (!Array.isArray(baGaps) || baGaps.length === 0) return '(no BA gaps recorded)';
  return baGaps.map(g => `Q${g.id} [${g.category} / ${g.complexity}]: ${g.question}`).join('\n');
}

function formatBtResponses(btResponses, baGaps) {
  if (!btResponses || Object.keys(btResponses).length === 0) return '(no BT responses)';
  const byId = {};
  if (Array.isArray(baGaps)) for (const g of baGaps) byId[String(g.id)] = g.question;
  return Object.entries(btResponses)
    .map(([id, r]) => {
      const q = byId[id] || '(unknown question)';
      const text = typeof r === 'string' ? r : (r?.text || '(no answer)');
      return `Q${id}: ${q}\nA: ${text}`;
    })
    .join('\n\n');
}

function formatImageManifest(manifest) {
  if (!Array.isArray(manifest) || manifest.length === 0) return '(no images in PDD)';
  return manifest
    .map(img => `- Image #${img.index}: filename="${img.filename}" contentType=${img.contentType} bytes=${img.bytes} altText="${img.altText || '(none)'}"`)
    .join('\n');
}

async function extractPdd(filePath) {
  const buffer = fs.readFileSync(filePath);

  if (filePath.toLowerCase().endsWith('.pdf')) {
    const pdfData = await PDFParse(buffer);
    return { text: pdfData.text, imageManifest: [] };
  }

  if (filePath.toLowerCase().endsWith('.docx')) {
    const imageManifest = [];
    const imagesDir = path.join(OUT_DIR, 'sdd-images');
    if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

    let idx = 0;
    await mammoth.convertToHtml(
      { buffer },
      {
        convertImage: mammoth.images.imgElement(async (image) => {
          const b = await image.read();
          idx += 1;
          const ext = (image.contentType || 'image/png').split('/')[1] || 'png';
          const filename = `image-${String(idx).padStart(3, '0')}.${ext}`;
          const savedAt = path.join(imagesDir, filename);
          fs.writeFileSync(savedAt, b);
          imageManifest.push({
            index: idx, filename, contentType: image.contentType,
            bytes: b.length, altText: image.altText || '', savedAt
          });
          return { src: filename, alt: image.altText || `Figure ${idx}` };
        })
      }
    );

    const textResult = await mammoth.extractRawText({ buffer });
    return { text: textResult.value, imageManifest };
  }

  return { text: buffer.toString('utf-8'), imageManifest: [] };
}

function callClaude(prompt) {
  console.log(`Calling Claude CLI — prompt size ${(prompt.length / 1024).toFixed(1)} KB`);
  const output = execSync('claude --output-format json', {
    input: prompt,
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'inherit']
  });
  const payload = JSON.parse(output);
  const responseText = payload.result || payload.response || '';
  const match = responseText.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object in Claude response');
  return JSON.parse(match[0]);
}

// ---------- DOCX rendering helpers ----------

function H1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 160 },
    children: [new TextRun({ text, bold: true, size: 32 })]
  });
}
function H2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, size: 26 })]
  });
}
function H3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 80 },
    children: [new TextRun({ text, bold: true, size: 22 })]
  });
}
function P(text) {
  return new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun({ text: String(text ?? ''), size: 22 })]
  });
}
function Bullet(text) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text: String(text ?? ''), size: 22 })]
  });
}
function Mono(text) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [new TextRun({
      text: String(text ?? ''),
      font: 'Consolas',
      size: 18
    })]
  });
}
function MonoBlock(text) {
  const lines = String(text ?? '').split(/\r?\n/);
  return lines.map(line => new Paragraph({
    spacing: { after: 0 },
    children: [new TextRun({
      text: line.length ? line : ' ',
      font: 'Consolas',
      size: 18
    })]
  }));
}
function kvTable(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([k, v]) => new TableRow({
      children: [
        new TableCell({
          width: { size: 28, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: k, bold: true, size: 20 })] })]
        }),
        new TableCell({
          width: { size: 72, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: String(v ?? ''), size: 20 })] })]
        })
      ]
    }))
  });
}
function multiColTable(headers, rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: headers.map(h => new TableCell({
          shading: { fill: 'EFEFEF' },
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 20 })] })]
        }))
      }),
      ...rows.map(r => new TableRow({
        children: r.map(c => new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: String(c ?? ''), size: 20 })] })]
        }))
      }))
    ]
  });
}

function imageParagraph(buffer, contentType) {
  const subtype = (contentType || 'image/png').split('/')[1].toLowerCase();
  const type = subtype === 'jpeg' || subtype === 'jpg' ? 'jpg'
            : subtype === 'gif' ? 'gif'
            : subtype === 'bmp' ? 'bmp'
            : 'png';
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 100, after: 100 },
    children: [new ImageRun({
      data: buffer,
      transformation: { width: 480, height: 260 },
      type
    })]
  });
}

async function buildDocx({ project, sdd, imageManifest, outPath }) {
  const sections = [];
  const body = [];

  // Cover
  body.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 600, after: 200 },
    children: [new TextRun({ text: 'SOLUTION DESIGN DOCUMENT', bold: true, size: 44 })]
  }));
  body.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text: project.name || 'Untitled Project', size: 32 })]
  }));
  body.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
    children: [new TextRun({ text: `Generated ${new Date().toISOString().split('T')[0]} · A-ADLC Architect Agent`, italics: true, size: 20 })]
  }));
  body.push(kvTable([
    ['Project ID', project._id?.toString() || ''],
    ['Architecture Style', sdd.architectureStyle?.style || ''],
    ['Components', String((sdd.components || []).length)],
    ['Screens designed', String((sdd.screens || []).length)],
    ['User flows', String((sdd.userFlows || []).length)],
    ['Risks identified', String((sdd.risks || []).length)]
  ]));
  body.push(new Paragraph({ children: [new PageBreak()] }));

  // 1. Overview
  body.push(H1('1. Solution Overview'));
  body.push(P(sdd.overview));

  // 2. Architecture style
  body.push(H1('2. Architecture Style'));
  body.push(kvTable([
    ['Style', sdd.architectureStyle?.style],
    ['Rationale', sdd.architectureStyle?.rationale]
  ]));

  // 3. Components
  body.push(H1('3. Components'));
  if (Array.isArray(sdd.components) && sdd.components.length) {
    body.push(multiColTable(
      ['Component', 'Type', 'Responsibility', 'Owned Data', 'Depends On'],
      sdd.components.map(c => [
        c.name, c.type || '', c.responsibility || '',
        (c.ownedData || []).join(', '),
        (c.dependencies || []).join(', ')
      ])
    ));
  } else {
    body.push(P('(no components defined)'));
  }

  // 4. Data model
  body.push(H1('4. Data Model'));
  const entities = sdd.dataModel?.entities || [];
  entities.forEach(e => {
    body.push(H2(`4.${entities.indexOf(e) + 1} ${e.name}`));
    body.push(P(`Purpose: ${e.purpose || ''}`));
    body.push(P(`Primary key: ${e.primaryKey || ''}`));
    if (e.indexes?.length) body.push(P(`Indexes: ${e.indexes.join('; ')}`));
    if (Array.isArray(e.fields) && e.fields.length) {
      body.push(multiColTable(
        ['Field', 'Type', 'Required', 'Notes'],
        e.fields.map(f => [f.name, f.type, f.required ? 'Yes' : 'No', f.notes || ''])
      ));
    }
  });
  if (sdd.dataModel?.sequenceAllocation) {
    body.push(H2('Sequence allocation strategy'));
    body.push(P(sdd.dataModel.sequenceAllocation));
  }

  // 5. UI specification with embedded PDD references
  body.push(H1('5. UI Specification — Screens'));
  const screens = sdd.screens || [];
  screens.forEach((s, i) => {
    body.push(H2(`5.${i + 1} ${s.name || s.id}`));
    body.push(kvTable([
      ['Screen ID', s.id || ''],
      ['Purpose', s.purpose || ''],
      ['Primary actors', (s.primaryActors || []).join(', ')],
      ['Entry points', (s.entryPoints || []).join('; ')]
    ]));

    if (s.uiElements?.length) {
      body.push(H3('UI elements'));
      body.push(multiColTable(
        ['Element', 'Label', 'Behavior'],
        s.uiElements.map(e => [e.element || '', e.label || '', e.behavior || ''])
      ));
    }
    if (s.validation?.length) {
      body.push(H3('Validation'));
      s.validation.forEach(v => body.push(Bullet(v)));
    }
    if (s.stateTransitions?.length) {
      body.push(H3('State transitions'));
      s.stateTransitions.forEach(v => body.push(Bullet(v)));
    }
    if (s.wireframe) {
      body.push(H3('Wireframe'));
      MonoBlock(s.wireframe).forEach(p => body.push(p));
    }

    // Embed any referenced PDD images
    if (Array.isArray(s.referencedPddImages) && s.referencedPddImages.length) {
      body.push(H3('Referenced PDD visuals'));
      s.referencedPddImages.forEach(idx => {
        const img = imageManifest.find(im => im.index === idx);
        if (img && fs.existsSync(img.savedAt)) {
          body.push(imageParagraph(fs.readFileSync(img.savedAt), img.contentType));
          body.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: `Figure ${idx} — from PDD (${img.filename})`, italics: true, size: 18 })]
          }));
        }
      });
    }
  });

  // 6. User flows
  body.push(H1('6. User Flows'));
  (sdd.userFlows || []).forEach((f, i) => {
    body.push(H2(`6.${i + 1} ${f.name}`));
    body.push(P(`Actor: ${f.actor || ''}`));
    (f.steps || []).forEach(st => body.push(Bullet(st)));
    if (f.asciiSequence) {
      body.push(H3('Sequence'));
      MonoBlock(f.asciiSequence).forEach(p => body.push(p));
    }
  });

  // 7. Tech stack
  body.push(H1('7. Technology Stack'));
  body.push(kvTable([
    ['Frontend', sdd.techStack?.frontend],
    ['Backend', sdd.techStack?.backend],
    ['Database', sdd.techStack?.database],
    ['Infrastructure', sdd.techStack?.infrastructure],
    ['Identity', sdd.techStack?.identity]
  ]));

  // 8. Integrations
  body.push(H1('8. Integrations'));
  if (sdd.integrations?.length) {
    body.push(multiColTable(
      ['System', 'Direction', 'Purpose', 'Protocol', 'Payload'],
      sdd.integrations.map(i => [i.system, i.direction || '', i.purpose || '', i.protocol || '', i.payloadSummary || ''])
    ));
  } else body.push(P('(no integrations defined)'));

  // 9. Notifications
  body.push(H1('9. Notifications'));
  (sdd.notifications || []).forEach((n, i) => {
    body.push(H2(`9.${i + 1} ${n.trigger}`));
    body.push(kvTable([
      ['Channel', n.channel],
      ['Recipients', (n.recipients || []).join(', ')],
      ['Subject', n.subjectTemplate],
      ['Opt-out', n.userOptOut]
    ]));
    body.push(H3('Body template'));
    MonoBlock(n.bodyTemplate || '').forEach(p => body.push(p));
  });

  // 10. Non-functional
  body.push(H1('10. Non-Functional Requirements'));
  body.push(kvTable([
    ['Scalability', sdd.nonFunctional?.scalability],
    ['Security', sdd.nonFunctional?.security],
    ['Performance', sdd.nonFunctional?.performance],
    ['Reliability', sdd.nonFunctional?.reliability],
    ['Observability', sdd.nonFunctional?.observability]
  ]));

  // 11. PDD visual references appendix
  body.push(H1('11. PDD Visual References'));
  if (sdd.pddVisualReferences?.length) {
    sdd.pddVisualReferences.forEach((ref) => {
      const img = imageManifest.find(im => im.index === ref.imageIndex);
      body.push(H2(`Figure ${ref.imageIndex} — ${ref.whatItShows || ''}`));
      body.push(P(`Source: ${ref.imageFilename || img?.filename || ''}`));
      body.push(P(`Used in design: ${ref.howUsedInDesign || ''}`));
      if (img && fs.existsSync(img.savedAt)) {
        body.push(imageParagraph(fs.readFileSync(img.savedAt), img.contentType));
      }
    });
  } else {
    // Even if model omitted references, embed all PDD images anyway so reviewer can see them
    imageManifest.forEach(img => {
      body.push(H2(`PDD Figure ${img.index}`));
      body.push(P(`Filename: ${img.filename}`));
      if (fs.existsSync(img.savedAt)) {
        body.push(imageParagraph(fs.readFileSync(img.savedAt), img.contentType));
      }
    });
  }

  // 12. Risks
  body.push(H1('12. Risks'));
  if (sdd.risks?.length) {
    body.push(multiColTable(
      ['Risk', 'Severity', 'Related Gap', 'Mitigation'],
      sdd.risks.map(r => [r.risk, r.severity, r.relatedBaGap || '', r.mitigation])
    ));
  }

  sections.push({
    properties: {
      page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } }
    },
    children: body
  });

  const doc = new Document({
    creator: 'A-ADLC Architect Agent',
    title: `SDD — ${project.name}`,
    description: 'System Design Document',
    sections
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outPath, buffer);
  console.log(`Wrote SDD docx: ${outPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

// ---------- main ----------

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'aadlc');

  const projectsCol = db.collection('projects');
  const jobsCol = db.collection('jobs');

  const arg = process.argv[2];
  const project = arg
    ? await projectsCol.findOne({ _id: new ObjectId(arg) })
    : await projectsCol.findOne({});

  if (!project) {
    console.error('No project found in MongoDB.');
    process.exit(1);
  }

  console.log(`Project: ${project.name} (${project._id})`);

  // Find latest PDD file path — prefer change-request, fallback to pdd_review
  const projectJobs = await jobsCol.find({ projectId: project._id.toString() }).sort({ createdAt: 1 }).toArray();
  let pddPath = null;
  const crJob = [...projectJobs].reverse().find(j => j.stage === 'change-request' && j.context?.pddFilePath);
  if (crJob) pddPath = crJob.context.pddFilePath;
  if (!pddPath) {
    const prJob = [...projectJobs].reverse().find(j => j.stage === 'pdd_review' && j.context?.pddFilePath);
    if (prJob) pddPath = prJob.context.pddFilePath;
  }

  if (!pddPath || !fs.existsSync(pddPath)) {
    // fall back to user-supplied path
    const fallback = 'C:\\Users\\nitin.varshneya\\Downloads\\Approved_PDD_Graphic_Autonumber_v2.0.docx';
    if (fs.existsSync(fallback)) {
      console.log(`PDD job path missing — using fallback ${fallback}`);
      pddPath = fallback;
    } else {
      console.error('Could not locate PDD file.');
      process.exit(1);
    }
  }

  console.log(`PDD source: ${pddPath}`);
  const { text, imageManifest } = await extractPdd(pddPath);
  console.log(`Extracted ${text.length} chars, ${imageManifest.length} images`);

  const prompt = renderPrompt({
    projectName: project.name || '',
    description: project.description || '',
    scope: project.scope || '',
    objectives: project.objectives || '',
    criteria: project.criteria || '',
    fileContent: text,
    imageManifest: formatImageManifest(imageManifest),
    baGaps: formatBaGaps(project.baGaps),
    btResponses: formatBtResponses(project.btResponses, project.baGaps)
  });

  fs.writeFileSync(path.join(OUT_DIR, 'architect-prompt.txt'), prompt, 'utf-8');

  console.log('Calling Claude...');
  const sdd = callClaude(prompt);
  fs.writeFileSync(path.join(OUT_DIR, 'sdd.json'), JSON.stringify(sdd, null, 2), 'utf-8');

  console.log(`SDD parsed. components=${(sdd.components||[]).length}, screens=${(sdd.screens||[]).length}, risks=${(sdd.risks||[]).length}`);

  // Save to MongoDB
  const updatedPhases = (project.phases || []).map(p =>
    p.id === 'sdd' ? { ...p, status: 'completed', progress: 100 } : p
  );

  await projectsCol.updateOne(
    { _id: project._id },
    {
      $set: {
        sddDocument: sdd,
        sddPddImages: imageManifest,
        sddPddSourcePath: pddPath,
        phases: updatedPhases,
        updatedAt: new Date()
      }
    }
  );
  console.log('Saved sddDocument to MongoDB');

  const outDocx = path.join(OUT_DIR, `SDD_${(project.name || 'project').replace(/\s+/g, '_')}.docx`);
  await buildDocx({ project, sdd, imageManifest, outPath: outDocx });

  await client.close();
  console.log('\nDone.');
})();
