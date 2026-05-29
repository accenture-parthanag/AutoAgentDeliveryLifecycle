/**
 * Shared docx builders for SDD and TDD.
 *
 * Used by:
 *   - server/routes/projects.js (live API downloads)
 *   - scripts/regenerate-sdd.js / regenerate-tdd.js (one-shot regeneration)
 */

const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, AlignmentType, ImageRun, PageBreak
} = require('docx');

// ---------- common helpers ----------

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
function loadImageBuffer(img) {
  // Prefer in-memory data, fall back to savedAt path
  if (img?.dataBase64) return Buffer.from(img.dataBase64, 'base64');
  if (img?.savedAt && fs.existsSync(img.savedAt)) return fs.readFileSync(img.savedAt);
  return null;
}

// ---------- SDD builder ----------

async function buildSddDocx({ project, sdd, imageManifest }) {
  if (!sdd || typeof sdd !== 'object') {
    throw new Error('Project has no sddDocument — run the Architect agent first.');
  }
  imageManifest = Array.isArray(imageManifest) ? imageManifest : [];

  const body = [];

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
    children: [new TextRun({ text: `Generated ${new Date().toISOString().split('T')[0]} · Agent Driven Automation - Architect Agent`, italics: true, size: 20 })]
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

  body.push(H1('1. Solution Overview'));
  body.push(P(sdd.overview));

  body.push(H1('2. Architecture Style'));
  body.push(kvTable([
    ['Style', sdd.architectureStyle?.style],
    ['Rationale', sdd.architectureStyle?.rationale]
  ]));

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

  body.push(H1('4. Data Model'));
  const entities = sdd.dataModel?.entities || [];
  entities.forEach((e, i) => {
    body.push(H2(`4.${i + 1} ${e.name}`));
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
    if (Array.isArray(s.referencedPddImages) && s.referencedPddImages.length) {
      body.push(H3('Referenced PDD visuals'));
      s.referencedPddImages.forEach(idx => {
        const img = imageManifest.find(im => im.index === idx);
        if (!img) return;
        const buf = loadImageBuffer(img);
        if (buf) {
          body.push(imageParagraph(buf, img.contentType));
          body.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: `Figure ${idx} — from PDD (${img.filename})`, italics: true, size: 18 })]
          }));
        }
      });
    }
  });

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

  body.push(H1('7. Technology Stack'));
  body.push(kvTable([
    ['Frontend', sdd.techStack?.frontend],
    ['Backend', sdd.techStack?.backend],
    ['Database', sdd.techStack?.database],
    ['Infrastructure', sdd.techStack?.infrastructure],
    ['Identity', sdd.techStack?.identity]
  ]));

  body.push(H1('8. Integrations'));
  if (sdd.integrations?.length) {
    body.push(multiColTable(
      ['System', 'Direction', 'Purpose', 'Protocol', 'Payload'],
      sdd.integrations.map(i => [i.system, i.direction || '', i.purpose || '', i.protocol || '', i.payloadSummary || ''])
    ));
  } else body.push(P('(no integrations defined)'));

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

  body.push(H1('10. Non-Functional Requirements'));
  body.push(kvTable([
    ['Scalability', sdd.nonFunctional?.scalability],
    ['Security', sdd.nonFunctional?.security],
    ['Performance', sdd.nonFunctional?.performance],
    ['Reliability', sdd.nonFunctional?.reliability],
    ['Observability', sdd.nonFunctional?.observability]
  ]));

  body.push(H1('11. PDD Visual References'));
  if (sdd.pddVisualReferences?.length) {
    sdd.pddVisualReferences.forEach((ref) => {
      const img = imageManifest.find(im => im.index === ref.imageIndex);
      body.push(H2(`Figure ${ref.imageIndex} — ${ref.whatItShows || ''}`));
      body.push(P(`Source: ${ref.imageFilename || img?.filename || ''}`));
      body.push(P(`Used in design: ${ref.howUsedInDesign || ''}`));
      if (img) {
        const buf = loadImageBuffer(img);
        if (buf) body.push(imageParagraph(buf, img.contentType));
      }
    });
  } else {
    imageManifest.forEach(img => {
      body.push(H2(`PDD Figure ${img.index}`));
      body.push(P(`Filename: ${img.filename}`));
      const buf = loadImageBuffer(img);
      if (buf) body.push(imageParagraph(buf, img.contentType));
    });
  }

  body.push(H1('12. Risks'));
  if (sdd.risks?.length) {
    body.push(multiColTable(
      ['Risk', 'Severity', 'Related Gap', 'Mitigation'],
      sdd.risks.map(r => [r.risk, r.severity, r.relatedBaGap || '', r.mitigation])
    ));
  }

  const doc = new Document({
    creator: 'Agent Driven Automation - Architect Agent',
    title: `SDD — ${project.name}`,
    description: 'System Design Document',
    sections: [{
      properties: { page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } } },
      children: body
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  const fileName = `SDD_${(project.name || 'project').replace(/[^a-z0-9_\-]+/gi, '_')}.docx`;
  return { buffer, fileName };
}

// ---------- TDD builder ----------

async function buildTddDocx({ project, tdd, imageManifest }) {
  if (!tdd || typeof tdd !== 'object') {
    throw new Error('Project has no tddDocument — run the Tech Lead agent first.');
  }
  imageManifest = Array.isArray(imageManifest) ? imageManifest : [];

  const body = [];

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
    children: [new TextRun({ text: `Generated ${new Date().toISOString().split('T')[0]} · Agent Driven Automation - Tech Lead Agent`, italics: true, size: 20 })]
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

  body.push(H1('1. Summary'));
  body.push(P(tdd.summary));
  if (tdd.buildSequence?.length) {
    body.push(H2('Build sequence'));
    tdd.buildSequence.forEach(s => body.push(Bullet(s)));
  }

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
    if (Array.isArray(t.relatedPddImages) && t.relatedPddImages.length) {
      body.push(H3('Referenced PDD visuals'));
      t.relatedPddImages.forEach(idx => {
        const img = imageManifest.find(im => im.index === idx);
        if (!img) return;
        const buf = loadImageBuffer(img);
        if (buf) {
          body.push(imageParagraph(buf, img.contentType));
          body.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: `Figure ${idx} — from PDD (${img.filename})`, italics: true, size: 18 })]
          }));
        }
      });
    }
  });

  if (tdd.sequenceDiagrams?.length) {
    body.push(H1('4. Sequence Diagrams'));
    tdd.sequenceDiagrams.forEach((s, i) => {
      body.push(H2(`4.${i + 1} ${s.name}`));
      MonoBlock(s.asciiSequence || '').forEach(p => body.push(p));
    });
  }

  if (tdd.dataMigrationOrBootstrap?.length) {
    body.push(H1('5. Data Bootstrap / Migration'));
    body.push(multiColTable(
      ['Task', 'Approach', 'Owner'],
      tdd.dataMigrationOrBootstrap.map(d => [d.task, d.approach, d.owner])
    ));
  }

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

  body.push(H1('7. PDD Visual References'));
  if (tdd.pddVisualReferences?.length) {
    tdd.pddVisualReferences.forEach((ref) => {
      const img = imageManifest.find(im => im.index === ref.imageIndex);
      body.push(H2(`Figure ${ref.imageIndex} — ${ref.whatItShows || ''}`));
      body.push(P(`Source: ${ref.imageFilename || img?.filename || ''}`));
      body.push(P(`Used in TDD: ${ref.howUsedInTdd || ''}`));
      if (img) {
        const buf = loadImageBuffer(img);
        if (buf) body.push(imageParagraph(buf, img.contentType));
      }
    });
  } else {
    imageManifest.forEach(img => {
      body.push(H2(`PDD Figure ${img.index}`));
      body.push(P(`Filename: ${img.filename}`));
      const buf = loadImageBuffer(img);
      if (buf) body.push(imageParagraph(buf, img.contentType));
    });
  }

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
    creator: 'Agent Driven Automation - Tech Lead Agent',
    title: `TDD — ${project.name}`,
    description: 'Technical Design Document',
    sections: [{
      properties: { page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } } },
      children: body
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  const fileName = `TDD_${(project.name || 'project').replace(/[^a-z0-9_\-]+/gi, '_')}.docx`;
  return { buffer, fileName };
}

module.exports = {
  buildSddDocx,
  buildTddDocx
};
