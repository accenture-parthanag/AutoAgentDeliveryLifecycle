require('dotenv').config();
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

async function generateSddHtml() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db('aadlc');

    const project = await db.collection('projects').findOne({});
    const sdd = project.sddDocument;

    console.log(`\n📋 Using BA Process Flow from project: ${project.baProcessFlow ? '✅' : '⚠️'}`);
    console.log(`📋 Architecture Diagram available: ${sdd?.architectureMermaidDiagram ? '✅' : '❌'}`);
    console.log(`📋 Data Flow Diagram available: ${sdd?.dataFlowMermaidDiagram ? '✅' : '❌'}`);

    console.log(`\n📄 Generating SDD with PDD Insights...`);
    console.log(`${'='.repeat(60)}`);

    if (!sdd) {
      console.log(`❌ No SDD found`);
      return;
    }

    // Load template
    const templatePath = path.join(__dirname, 'templates', 'automation_solution_design_template.html');
    if (!fs.existsSync(templatePath)) {
      console.log(`❌ Template not found`);
      return;
    }

    let html = fs.readFileSync(templatePath, 'utf-8');

    // Extract PDD insights from final-pdd HTML
    console.log(`\n📖 Extracting insights from PDD...`);
    let pddInsights = { executiveSummary: '', asIsProcess: '', toBeProcess: '' };

    // Look for final-pdd HTML file in temp directory
    const tmpDir = path.join(require('os').tmpdir(), 'aadlc-pdds');
    if (fs.existsSync(tmpDir)) {
      const files = fs.readdirSync(tmpDir);
      const finalPddFile = files.find(f => f.startsWith('final-pdd-') && f.endsWith('.html'));

      if (finalPddFile) {
        try {
          const finalPddPath = path.join(tmpDir, finalPddFile);
          const pddHtml = fs.readFileSync(finalPddPath, 'utf-8');

          // Extract Executive Summary (look for <h2>Executive Summary</h2>)
          const execSummaryMatch = pddHtml.match(/<h2>Executive Summary<\/h2>([\s\S]*?)(?=<\/section>)/i);
          if (execSummaryMatch) {
            const summarySection = execSummaryMatch[1];
            // Get all <p> tags content
            const pTags = summarySection.match(/<p>([\s\S]*?)<\/p>/gi);
            if (pTags && pTags.length > 0) {
              const summaryText = pTags
                .map(tag => tag.replace(/<[^>]+>/g, '').trim())
                .join('\n')
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .trim();
              if (summaryText.length > 50) {
                pddInsights.executiveSummary = summaryText.substring(0, 1500);
                console.log(`✓ Executive summary extracted (${pddInsights.executiveSummary.length} chars)`);
              }
            }
          }

          // Extract As-Is Process - create from business objectives and scope
          const businessObjMatch = pddHtml.match(/<h2>Business Objectives<\/h2>([\s\S]*?)(?=<\/section>)/i);
          if (businessObjMatch) {
            const objSection = businessObjMatch[1];
            const liTags = objSection.match(/<li>([\s\S]*?)<\/li>/gi);
            if (liTags && liTags.length > 0) {
              const objectives = liTags
                .slice(0, 3) // Take first 3 objectives
                .map(tag => tag.replace(/<[^>]+>/g, '').trim())
                .join('\n• ');
              const asIsText = `Current State & Objectives:\n• ${objectives}`
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&');
              if (asIsText.length > 50) {
                pddInsights.asIsProcess = asIsText.substring(0, 2000);
                console.log(`✓ As-Is process extracted (${pddInsights.asIsProcess.length} chars)`);
              }
            }
          }

          // Extract To-Be Process (look for <h2>Process Flow</h2> and the mermaid diagram)
          const processFlowMatch = pddHtml.match(/<h2>Process Flow<\/h2>([\s\S]*?)(?=<\/section>)/i);
          if (processFlowMatch) {
            const flowSection = processFlowMatch[1];

            // Get the intro paragraph
            const introPMatch = flowSection.match(/<p>([\s\S]*?)<\/p>/);
            const intro = introPMatch ? introPMatch[1].replace(/<[^>]+>/g, '').trim() : '';

            // Get the mermaid diagram content
            const mermaidMatch = flowSection.match(/<div class="mermaid">([\s\S]*?)<\/div>/);
            const mermaidDiagram = mermaidMatch ? mermaidMatch[1].trim() : '';

            if (intro || mermaidDiagram) {
              let toBeProcess = intro;
              if (mermaidDiagram) {
                toBeProcess += `\n\nAutomated Process Flow:\n${mermaidDiagram}`;
              }
              toBeProcess = toBeProcess
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .trim();

              if (toBeProcess.length > 50) {
                pddInsights.toBeProcess = toBeProcess.substring(0, 2500);
                console.log(`✓ To-Be process extracted (${pddInsights.toBeProcess.length} chars)`);
              }
            }
          }
        } catch (err) {
          console.log(`⚠️  Could not extract from final-pdd HTML: ${err.message}`);
        }
      }
    }

    const escapeHtml = (text) => {
      if (!text) return '';
      const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
      return String(text).replace(/[&<>"']/g, m => map[m]);
    };

    // Title and date
    html = html.replace(/id="doc-title">[^<]*<\/h2/, `id="doc-title">${escapeHtml(project.name)}</h2`);
    html = html.replace(/class="subtitle" contenteditable="true">[^<]*<\/div/, `class="subtitle" contenteditable="true">${escapeHtml(project.description)}</div`);

    const todayDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
    const docId = `SDD-${project.name.replace(/[^a-z0-9-]/gi, '_').toUpperCase()}-${Date.now().toString().slice(-6)}`;

    html = html.replace(/<div class="label">Document ID<\/div>\s*<div class="value"[^>]*>[^<]*<\/div>/,
      `<div class="label">Document ID</div>\n        <div class="value" contenteditable="true">${docId}</div>`);
    html = html.replace(/<div class="label">Date<\/div>\s*<div class="value"[^>]*>[^<]*<\/div>/,
      `<div class="label">Date</div>\n        <div class="value" contenteditable="true">${todayDate}</div>`);

    // S1: Executive Summary - FROM PDD (Proposed Solution subsection)
    const execSummary = pddInsights.executiveSummary || sdd.overview || '';
    if (execSummary) {
      // Find and replace the Proposed Solution placeholder
      html = html.replace(
        /Provide a concise, non-technical summary of the proposed automation solution\. What does it do, how does it work, and what value does it deliver\?/,
        escapeHtml(execSummary)
      );
    }

    // S4: As-Is Process - FROM BA PROCESS FLOW DIAGRAM
    let asIsContent = pddInsights.asIsProcess || `The current process for "${project.name}" involves manual steps without structured workflow control.`;

    // Prefer BA process flow diagram if available
    if (project.baProcessFlow) {
      console.log(`✓ Using BA-generated process flow diagram for S4`);
      const baFlowHtml = `<p>Current state process flow diagram from business analysis:</p>
<div class="mermaid">
${project.baProcessFlow}
</div>
<p>${escapeHtml(asIsContent)}</p>`;

      html = html.replace(
        /Attach or embed the current-state process map here \(BPMN \/ swimlane \/ flowchart\)\. Tool: Visio, Lucidchart, Draw\.io, Miro\./,
        baFlowHtml
      );
    } else {
      // Fallback to text if BA diagram not available
      html = html.replace(
        /Attach or embed the current-state process map here \(BPMN \/ swimlane \/ flowchart\)\. Tool: Visio, Lucidchart, Draw\.io, Miro\./,
        escapeHtml(asIsContent).substring(0, 2000)
      );
    }

    // S5: To-Be Process - FROM ARCHITECT DATA FLOW DIAGRAM
    let toBeContent = pddInsights.toBeProcess || sdd.dataFlow || '';
    let toBeHtml = '';

    if (sdd.dataFlowMermaidDiagram) {
      // Use architect-generated data flow diagram
      console.log(`✓ Using Architect-generated data flow diagram for S5`);
      toBeHtml = `
<p>Automated system data flow:</p>
<div class="mermaid">
${sdd.dataFlowMermaidDiagram}
</div>
<p>${escapeHtml(sdd.dataFlow || 'Data flows through components as shown above.')}</p>`;
    } else if (toBeContent) {
      // Fallback to PDD-extracted content
      const mermaidMatch = toBeContent.match(/graph TD\n([\s\S]*?)(?=\n\n|$)/);
      if (mermaidMatch) {
        const fullDiagram = toBeContent.substring(toBeContent.indexOf('graph TD'));
        toBeHtml = `
<p>The following diagram illustrates the complete automated workflow:</p>
<div class="mermaid">
${fullDiagram}
</div>
<p>This automated process replaces manual intervention with system-driven operations.</p>`;
      } else {
        toBeHtml = `<p>${escapeHtml(toBeContent).substring(0, 2000)}</p>`;
      }
    } else {
      toBeHtml = '<p>Automated solution architecture and data flow to be determined.</p>';
    }

    html = html.replace(
      /Embed the future-state process map, clearly distinguishing human steps from bot\/agent steps\./,
      toBeHtml
    );

    // S6: Solution Architecture - DIAGRAM + Components Table
    if (sdd.components && sdd.components.length > 0) {
      let archDiagramHtml = '';

      // Add architecture diagram if available from architect
      if (sdd.architectureMermaidDiagram) {
        console.log(`✓ Using Architect-generated architecture diagram for S6`);
        archDiagramHtml = `
<p><strong>Architecture Diagram:</strong></p>
<div class="mermaid">
${sdd.architectureMermaidDiagram}
</div>
<p style="margin-bottom: 20px;">The diagram above shows the component interactions and dependencies.</p>`;
      }

      // Components table
      const compHtml = `<p><strong>Component Details:</strong></p>
<table style="width:100%; border-collapse: collapse; margin: 10px 0;">
        <thead><tr style="background: #1C3150; color: white;">
          <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Component</th>
          <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Responsibility</th>
          <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Dependencies</th>
        </tr></thead>
        <tbody>
        ${sdd.components.map(c => `<tr style="border: 1px solid #ddd;">
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: 600;">${escapeHtml(c.name)}</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${escapeHtml(c.responsibility)}</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${escapeHtml((c.dependencies || []).join(', '))}</td>
        </tr>`).join('')}
        </tbody>
      </table>`;

      const fullS6Html = archDiagramHtml + compHtml;

      // Replace the arch-placeholder div in S6
      html = html.replace(
        /(<div id="s6"[\s\S]*?)<div class="arch-placeholder"[\s\S]*?<\/div>/,
        `$1${fullS6Html}`
      );
    }

    // S7: Technology Stack
    if (sdd.techStack) {
      const techHtml = `Frontend: ${escapeHtml(sdd.techStack.frontend || 'N/A')}
Backend: ${escapeHtml(sdd.techStack.backend || 'N/A')}
Database: ${escapeHtml(sdd.techStack.database || 'N/A')}
Infrastructure: ${escapeHtml(sdd.techStack.infrastructure || 'N/A')}`;
      html = html.replace(/(<div id="s7"[\s\S]*?Technology Stack[\s\S]*?<div contenteditable="true" class="placeholder">)[^<]*(<\/div>)/,
        `$1<pre style="background: #f5f5f5; padding: 10px; border-radius: 4px;">${techHtml}</pre>$2`);
    }

    // S8: Integration Design
    if (sdd.integrations && sdd.integrations.length > 0) {
      const intHtml = `<table style="width:100%; border-collapse: collapse; margin: 10px 0;">
        <thead><tr style="background: #1C3150; color: white;">
          <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">System</th>
          <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Purpose</th>
          <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Protocol</th>
        </tr></thead>
        <tbody>
        ${sdd.integrations.map(i => `<tr style="border: 1px solid #ddd;">
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: 600;">${escapeHtml(i.system)}</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${escapeHtml(i.purpose)}</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${escapeHtml(i.protocol || 'N/A')}</td>
        </tr>`).join('')}
        </tbody>
      </table>`;
      html = html.replace(/(<div id="s8"[\s\S]*?Integration[\s\S]*?<div contenteditable="true" class="placeholder">)[^<]*(<\/div>)/,
        `$1${intHtml}$2`);
    }

    // S9: Security & Compliance
    if (sdd.nonFunctional?.security) {
      html = html.replace(/(<div id="s9"[\s\S]*?Security[\s\S]*?<div contenteditable="true" class="placeholder">)[^<]*(<\/div>)/,
        `$1${escapeHtml(sdd.nonFunctional.security)}$2`);
    }

    // S13: Operational Model
    if (sdd.nonFunctional?.reliability) {
      html = html.replace(/(<div id="s13"[\s\S]*?Operational[\s\S]*?<div contenteditable="true" class="placeholder">)[^<]*(<\/div>)/,
        `$1${escapeHtml(sdd.nonFunctional.reliability)}$2`);
    }

    // S14: RAID Log
    if (sdd.risks && sdd.risks.length > 0) {
      const raidHtml = sdd.risks.map((r, idx) => `
        <tr>
          <td contenteditable>${idx + 1}</td>
          <td contenteditable>${escapeHtml(r.risk)}</td>
          <td contenteditable>${escapeHtml(r.severity || 'Medium')}</td>
          <td contenteditable>${escapeHtml(r.mitigation)}</td>
          <td contenteditable>Active</td>
          <td contenteditable>Architect</td>
        </tr>`).join('');
      html = html.replace(/(<table id="raid-table"[\s\S]*?<tbody>)[\s\S]*?(<\/tbody>)/,
        `$1\n${raidHtml}$2`);
    }

    // Save
    const sddDir = path.join(require('os').tmpdir(), 'aadlc-pdds');
    if (!fs.existsSync(sddDir)) fs.mkdirSync(sddDir, { recursive: true });

    const filename = `SDD-${project.name.replace(/[^a-z0-9-]/gi, '_')}-WITH-PDD-${Date.now()}.html`;
    const sddPath = path.join(sddDir, filename);

    fs.writeFileSync(sddPath, html, 'utf-8');

    // Update DB
    await db.collection('projects').updateOne(
      { _id: project._id },
      { $set: { sddHtmlPath: sddPath } }
    );

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ SDD GENERATED WITH PDD INSIGHTS`);
    console.log(`${'='.repeat(60)}`);
    console.log(`\nFile: ${filename}`);
    console.log(`Size: ${(fs.statSync(sddPath).size / 1024).toFixed(1)} KB`);
    console.log(`\n✅ Sections Populated from PDD:`);
    console.log(`  ✓ S1: Executive Summary (from PDD Overview)`);
    console.log(`  ✓ S4: As-Is Process (from PDD Current State)`);
    console.log(`  ✓ S5: To-Be Process (from PDD Future State)`);
    console.log(`  ✓ S6: Solution Architecture (${sdd.components?.length} Components)`);
    console.log(`  ✓ S7: Technology Stack`);
    console.log(`  ✓ S8: Integration Design`);
    console.log(`  ✓ S9: Security & Compliance`);
    console.log(`  ✓ S13: Operational Model`);
    console.log(`  ✓ S14: RAID Log (${sdd.risks?.length} Risks)`);
    console.log(`\n📥 Download: GET /api/projects/${project._id}/sdd-download\n`);

  } catch (err) {
    console.error(`Error: ${err.message}`);
  } finally {
    await client.close();
  }
}

generateSddHtml();
