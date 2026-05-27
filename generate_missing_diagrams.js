require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

async function generateMissingDiagrams() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('aadlc');

    const project = await db.collection('projects').findOne({});
    const sdd = project.sddDocument;

    console.log('\n🔧 GENERATING MISSING MERMAID DIAGRAMS');
    console.log('='.repeat(60));

    // Generate Architecture Diagram from components
    let architectureDiagram = 'graph TD\n';
    if (sdd.components && sdd.components.length > 0) {
      // Create nodes for each component
      sdd.components.forEach((comp, idx) => {
        const nodeId = `A${idx}`;
        architectureDiagram += `    ${nodeId}["${comp.name}"]\n`;
      });

      // Add dependency relationships
      sdd.components.forEach((comp, idx) => {
        if (comp.dependencies && comp.dependencies.length > 0) {
          comp.dependencies.forEach(dep => {
            const targetIdx = sdd.components.findIndex(c => c.name === dep);
            if (targetIdx !== -1) {
              const sourceNodeId = `A${idx}`;
              const targetNodeId = `A${targetIdx}`;
              architectureDiagram += `    ${sourceNodeId} -->|depends on| ${targetNodeId}\n`;
            }
          });
        }
      });
    }

    console.log('✅ Generated Architecture Diagram');
    console.log(`   Nodes: ${sdd.components?.length || 0}`);
    console.log(`   Lines: ${architectureDiagram.split('\n').length}`);

    // Generate Data Flow Diagram
    let dataFlowDiagram = 'graph TD\n';
    dataFlowDiagram += '    A["User/Designer"]\n';
    dataFlowDiagram += '    B["Submit Graphic & Metadata"]\n';
    dataFlowDiagram += '    C["Control Number Generator"]\n';
    dataFlowDiagram += '    D["Validation & Uniqueness Check"]\n';
    dataFlowDiagram += '    E["Graphic Metadata Store"]\n';
    dataFlowDiagram += '    F["Audit Trail"]\n';
    dataFlowDiagram += '    G["Approval Workflow"]\n';
    dataFlowDiagram += '    H["Notification Service"]\n';
    dataFlowDiagram += '    I["Stakeholder Visibility"]\n';
    dataFlowDiagram += '    A -->|Submit| B\n';
    dataFlowDiagram += '    B -->|Process| C\n';
    dataFlowDiagram += '    C -->|Validate| D\n';
    dataFlowDiagram += '    D -->|Store| E\n';
    dataFlowDiagram += '    D -->|Log| F\n';
    dataFlowDiagram += '    E -->|Route| G\n';
    dataFlowDiagram += '    G -->|Approved| H\n';
    dataFlowDiagram += '    H -->|Notify| I\n';

    console.log('✅ Generated Data Flow Diagram');

    // Update SDD document with diagrams
    const updateResult = await db.collection('projects').updateOne(
      { _id: project._id },
      {
        $set: {
          'sddDocument.architectureMermaidDiagram': architectureDiagram,
          'sddDocument.dataFlowMermaidDiagram': dataFlowDiagram
        }
      }
    );

    if (updateResult.modifiedCount > 0) {
      console.log('\n✅ DIAGRAMS UPDATED IN DATABASE');
      console.log(`   Modified: 1 project document`);
    }

    // Now regenerate SDD HTML with diagrams
    console.log('\n📄 Regenerating SDD HTML with diagrams...');
    require('./generate_sdd_with_pdd_insights.js');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.close();
  }
}

generateMissingDiagrams();
