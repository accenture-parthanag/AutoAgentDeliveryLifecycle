/**
 * One-shot TDD regeneration:
 *   1. Loads project + sddDocument + latest PDD from Mongo
 *   2. Re-parses PDD (.docx or .pdf) to feed text + image manifest into the prompt
 *   3. Calls Claude CLI with the updated tech-lead-agent.md prompt
 *   4. Saves the new TDD back to project.tddDocument
 *   5. Exports a TDD.docx with PDD screenshots embedded next to the tasks that reference them
 *
 * Usage:
 *   node scripts/regenerate-tdd.js          # uses the single project in DB
 *   node scripts/regenerate-tdd.js <id>     # targets a specific project
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
  WidthType, AlignmentType, ImageRun, PageBreak
} = require('docx');

const PROMPT_PATH = path.join(__dirname, '..', 'Prompts', 'tech-lead-agent.md');
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
    const imagesDir = path.join(OUT_DIR, 'tdd-images');
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

// ---------- DOCX rendering ----------

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

async function buildDocx({ project, tdd, imageManifest, outPath }) {
  const body = [];

  // Cover
  body.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 600, after: 200 },
    children: [new TextRun({ text: 'TECHNICAL DESIGN DOCUMENT', bold: true, size: 44 })]
  }));
  body.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text: project.name || 'Untitled Project', size: 32 })]
  }));
  body.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
    children: [new TextRun({ text: `Generated ${new Date().toISOString().split('T')[0]} · A-ADLC Tech Lead Agent`, italics: true, size: 20 })]
  }));
  body.push(kvTable([
    ['Project ID', project._id?.toString() || ''],
    ['Source SDD components', String((project.sddDocument?.components || []).length)],
    ['Modules', String((tdd.modules || []).length)],
    ['Tasks', String((tdd.tasks || []).length)],
    ['Sequence diagrams', String((tdd.sequenceDiagrams || []).length)],
    ['Open questions', String((tdd.openQuestions || []).length)]
  ]));
  body.push(new Paragraph({ children: [new PageBreak()] }));

  // 1. Summary + sequence
  body.push(H1('1. Summary'));
  body.push(P(tdd.summary));
  if (tdd.buildSequence?.length) {
    body.push(H2('Build sequence'));
    tdd.buildSequence.forEach(s => body.push(Bullet(s)));
  }

  // 2. Modules
  body.push(H1('2. Modules'));
  (tdd.modules || []).forEach((m, i) => {
    body.push(H2(`2.${i + 1} ${m.name}`));
    body.push(kvTable([
      ['Purpose', m.purpose],
      ['SDD source component', m.sourceComponent],
      ['Owned entities', (m.ownedEntities || []).join(', ')]
    ]));
    if (m.interfaces?.length) {
      body.push(H3('Interfaces'));
      body.push(multiColTable(
        ['Name', 'Type', 'Signature', 'Description'],
        m.interfaces.map(itf => [itf.name, itf.type, itf.signature, itf.description])
      ));
    }
  });

  // 3. Tasks
  body.push(H1('3. Task Breakdown'));
  body.push(P(`${(tdd.tasks || []).length} atomic tasks. Each task names its SDD component, the screen it builds (where applicable), acceptance criteria, and pseudocode in the target tech stack.`));

  (tdd.tasks || []).forEach((t) => {
    body.push(H2(`Task #${t.id} — ${t.title}`));
    body.push(kvTable([
      ['Module', t.module],
      ['SDD component', t.sourceComponent || ''],
      ['Related screen', t.relatedScreen || ''],
      ['Complexity', t.complexity || ''],
      ['Estimated hours', String(t.estimatedHours ?? '')],
      ['Dependencies', (t.dependencies || []).join(', ')]
    ]));
    body.push(H3('Description'));
    body.push(P(t.description));
    if (t.acceptanceCriteria?.length) {
      body.push(H3('Acceptance criteria'));
      t.acceptanceCriteria.forEach(a => body.push(Bullet(a)));
    }
    if (t.pseudocode) {
      body.push(H3('Pseudocode / implementation sketch'));
      MonoBlock(t.pseudocode).forEach(p => body.push(p));
    }
    // Embed referenced PDD images alongside the task
    if (Array.isArray(t.relatedPddImages) && t.relatedPddImages.length) {
      body.push(H3('Referenced PDD visuals'));
      t.relatedPddImages.forEach(idx => {
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

  // 4. Sequence diagrams
  if (tdd.sequenceDiagrams?.length) {
    body.push(H1('4. Sequence Diagrams'));
    tdd.sequenceDiagrams.forEach((s, i) => {
      body.push(H2(`4.${i + 1} ${s.name}`));
      MonoBlock(s.asciiSequence || '').forEach(p => body.push(p));
    });
  }

  // 5. Data migration / bootstrap
  if (tdd.dataMigrationOrBootstrap?.length) {
    body.push(H1('5. Data Bootstrap / Migration'));
    body.push(multiColTable(
      ['Task', 'Approach', 'Owner'],
      tdd.dataMigrationOrBootstrap.map(d => [d.task, d.approach, d.owner])
    ));
  }

  // 6. Test strategy
  body.push(H1('6. Test Strategy'));
  body.push(kvTable([
    ['Unit', tdd.testStrategy?.unit],
    ['Integration', tdd.testStrategy?.integration],
    ['UAT', tdd.testStrategy?.uat]
  ]));
  if (tdd.testStrategy?.edgeCases?.length) {
    body.push(H2('Edge cases'));
    tdd.testStrategy.edgeCases.forEach(e => body.push(Bullet(e)));
  }

  // 7. PDD Visual References (appendix)
  body.push(H1('7. PDD Visual References'));
  if (tdd.pddVisualReferences?.length) {
    tdd.pddVisualReferences.forEach((ref) => {
      const img = imageManifest.find(im => im.index === ref.imageIndex);
      body.push(H2(`Figure ${ref.imageIndex} — ${ref.whatItShows || ''}`));
      body.push(P(`Source: ${ref.imageFilename || img?.filename || ''}`));
      body.push(P(`Used in TDD: ${ref.howUsedInTdd || ''}`));
      if (img && fs.existsSync(img.savedAt)) {
        body.push(imageParagraph(fs.readFileSync(img.savedAt), img.contentType));
      }
    });
  } else {
    imageManifest.forEach(img => {
      body.push(H2(`PDD Figure ${img.index}`));
      body.push(P(`Filename: ${img.filename}`));
      if (fs.existsSync(img.savedAt)) {
        body.push(imageParagraph(fs.readFileSync(img.savedAt), img.contentType));
      }
    });
  }

  // 8. Open questions
  body.push(H1('8. Open Questions'));
  if ((tdd.openQuestions || []).length === 0) {
    body.push(P('No open questions — all requirements resolved by BT and SDD.'));
  } else {
    body.push(multiColTable(
      ['Question', 'Blocks Tasks'],
      tdd.openQuestions.map(q => [q.question, (q.blockingTasks || []).join(', ')])
    ));
  }

  const doc = new Document({
    creator: 'A-ADLC Tech Lead Agent',
    title: `TDD — ${project.name}`,
    description: 'Technical Design Document',
    sections: [{
      properties: { page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } } },
      children: body
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outPath, buffer);
  console.log(`Wrote TDD docx: ${outPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
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
  if (!project.sddDocument) {
    console.error('Project has no sddDocument — run regenerate-sdd.js first.');
    process.exit(1);
  }

  console.log(`Project: ${project.name} (${project._id})`);
  console.log(`SDD components: ${(project.sddDocument.components || []).length}, screens: ${(project.sddDocument.screens || []).length}`);

  // Find latest PDD
  const projectJobs = await jobsCol.find({ projectId: project._id.toString() }).sort({ createdAt: 1 }).toArray();
  let pddPath = null;
  const crJob = [...projectJobs].reverse().find(j => j.stage === 'change-request' && j.context?.pddFilePath);
  if (crJob) pddPath = crJob.context.pddFilePath;
  if (!pddPath) {
    const prJob = [...projectJobs].reverse().find(j => j.stage === 'pdd_review' && j.context?.pddFilePath);
    if (prJob) pddPath = prJob.context.pddFilePath;
  }
  if (!pddPath || !fs.existsSync(pddPath)) {
    const fallback = 'C:\\Users\\nitin.varshneya\\Downloads\\Approved_PDD_Graphic_Autonumber_v2.0.docx';
    if (fs.existsSync(fallback)) pddPath = fallback;
  }
  if (!pddPath) {
    console.error('Could not locate PDD file.');
    process.exit(1);
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
    sddDocument: JSON.stringify(project.sddDocument, null, 2),
    fileContent: text,
    imageManifest: formatImageManifest(imageManifest),
    baGaps: formatBaGaps(project.baGaps),
    btResponses: formatBtResponses(project.btResponses, project.baGaps)
  });

  fs.writeFileSync(path.join(OUT_DIR, 'tech-lead-prompt.txt'), prompt, 'utf-8');

  console.log('Calling Claude...');
  const tdd = callClaude(prompt);
  fs.writeFileSync(path.join(OUT_DIR, 'tdd.json'), JSON.stringify(tdd, null, 2), 'utf-8');

  console.log(`TDD parsed. modules=${(tdd.modules||[]).length}, tasks=${(tdd.tasks||[]).length}, openQs=${(tdd.openQuestions||[]).length}`);

  // Save to MongoDB
  const updatedPhases = (project.phases || []).map(p =>
    p.id === 'tdd' ? { ...p, status: 'completed', progress: 100 } : p
  );
  await projectsCol.updateOne(
    { _id: project._id },
    {
      $set: {
        tddDocument: tdd,
        phases: updatedPhases,
        'keyMetrics.tasksTotal': (tdd.tasks || []).length,
        updatedAt: new Date()
      }
    }
  );
  console.log('Saved tddDocument to MongoDB');

  const outDocx = path.join(OUT_DIR, `TDD_${(project.name || 'project').replace(/\s+/g, '_')}.docx`);
  await buildDocx({ project, tdd, imageManifest, outPath: outDocx });

  await client.close();
  console.log('\nDone.');
})();
