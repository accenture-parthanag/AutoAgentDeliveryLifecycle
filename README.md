# Agent Driven Automation: Agentic Automation Development Lifecycle

A professional, multi-page React application implementing the Agentic Automation Development Lifecycle framework. This platform orchestrates AI agents through five specialized roles (BA, Architect, Tech Lead, Developer, QA) to automate business process automation development.

## Overview

Agent Driven Automation represents a modernized approach to automation delivery where:
- **BA Agent** performs requirement hardening and gap analysis → generates Final PDD
- **Architect Agent** designs the technical solution and selects tech stack → generates SDD
- **Tech Lead Agent** decomposes design into atomic tasks and pseudocode → generates LLD
- **Developer Agent** writes modular, tested code → generates Source Code
- **QA Agent** validates against original requirements → generates Test Report

Each phase includes human-in-the-loop approval gates to maintain governance.

## Project Structure

```
├── public/
│   └── index.html                  # Entry HTML with React root
├── src/
│   ├── index.css                   # McKinsey design system styles
│   ├── index.jsx                   # React entry point
│   ├── App.jsx                     # Router and navigation
│   └── pages/
│       ├── Dashboard.jsx           # Project overview & metrics
│       ├── BAAgent.jsx             # Requirement hardening workflow
│       ├── ArchAgent.jsx           # Solution architecture workflow
│       ├── TLAgent.jsx             # Technical decomposition workflow
│       ├── DevAgent.jsx            # Code generation workflow
│       ├── QAAgent.jsx             # Quality assurance workflow
│       └── ProjectDetail.jsx       # Individual project view
├── package.json
└── README.md
```

## Design System

The platform follows the **Editorial Executive** McKinsey-grade design system:

- **Typography**: Fraunces (display serif) for headlines, Geist (sans) for body, JetBrains Mono for numbers
- **Color Palette**: Warm off-white background (#faf9f6), rust-red accent (#b8341a), light theme by default with dark mode toggle
- **Components**: KPI grids, tabs, tables, callouts, chips, timeline indicators
- **Layout**: Single responsive breakpoint at 880px, max-width container at 1240px

## Installation & Setup

### Prerequisites
- Node.js 16+ and npm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm build
```

The app will open at `http://localhost:3000`

## Pages & Features

### 1. **Dashboard** (`/`)
- **Overview Metrics**: Total projects, in-progress count, awaiting review, completed
- **Process Flow**: Visual explanation of the 5-phase Agent Driven Automation workflow
- **Active Projects Table**: Shows all pipelines with status, current phase, progress bar, and BT collaborator
- **Quick Start Section**: Links to create new projects or view pipelines
- **Governance Callout**: Explains human-in-the-loop approval structure

### 2. **BA Agent** (`/ba-agent`)
- **Performance Metrics**: Total analyzed PDDs, average gaps found, clarification time, completion rate
- **Workflow Tabs**: Ongoing projects and completed projects
- **Active Project Detail**: Shows draft PDD, identified gaps/questions, status tracking
- **Process Timeline**: 4-step workflow (ingestion → stress test → clarification → final PDD)
- **Key Insight Callout**: Emphasizes gap elimination for downstream agents

### 3. **Architect Agent** (`/arch-agent`)
- **Metrics**: Total designs, tech stack decisions, review time, scalability score
- **Design Pipeline**: Ongoing SDD draft with tech stack analysis and component architecture
- **Architecture Diagram**: SVG showing data flow between ingestion, processing, and target system
- **Tech Stack Matrix**: Comparison table of Python, RPA, and Low-Code platforms
- **Completed Projects**: Historical designs with stack selections

### 4. **Tech Lead Agent** (`/tl-agent`)
- **Metrics**: Total LLDs, tasks generated, task clarity score, code modularity %
- **Decomposition View**: Naming conventions table, dev task breakdown with complexity labels
- **Pseudocode Example**: Detailed Invoice Validation logic in pseudocode
- **Task Management**: Visual task cards with status (pending/in-progress/completed)

### 5. **Developer Agent** (`/dev-agent`)
- **Metrics**: Tasks completed, code review score, lines of code, test coverage %
- **Sprint Status**: Module breakdown showing InvoiceValidator, CurrencyConverter, LedgerWriter, ErrorRecovery with test counts
- **Code Quality**: Modular programming checklist and development standards
- **Latest Commits**: Display of recent code changes

### 6. **QA Agent** (`/qa-agent`)
- **Metrics**: Tests generated, pass rate, bugs found, execution time
- **Test Categories**: Unit, integration, business logic, and performance tests with pass/fail status
- **Progress Bars**: Visual representation of test completion rates
- **Open Issues**: Display of identified bugs with severity
- **Test Framework**: Description of testing approach

### 7. **Project Detail** (`/project/:id`)
- **Project Overview**: Name, description, status, progress, collaborator
- **Phase Timeline**: Interactive timeline showing phase progression with status indicators
- **Deliverables Table**: All phase documents (PDD, SDD, LLD, Code, Test Report) with completion and approval status
- **Project Metadata**: Creation date, collaborator, project ID
- **Quick Actions**: Download deliverables, view documents, view architecture

## Styling & Theme

The app uses CSS custom properties for theming:

```css
--bg: #faf9f6;           /* warm off-white background */
--surface: #ffffff;       /* card/surface background */
--ink: #0a1628;          /* main text color */
--accent: #b8341a;       /* rust-red accent (links, active states) */
--positive: #1b5e20;     /* green for positive metrics */
--negative: #b8341a;     /* red for negative metrics */
--gold: #b08d3a;         /* neutral markers, benchmarks */
```

**Dark Mode**: Toggle button switches `data-theme="dark"` attribute on root element. CSS variables automatically swap to dark palette.

## Component Patterns

### KPI Grid
```jsx
<div className="kpi-grid">
  <div className="kpi">
    <div className="kpi-label">Metric</div>
    <div className="kpi-value">42</div>
    <div className="kpi-sub">Description</div>
  </div>
</div>
```

### Tabs
```jsx
<div className="tabs">
  <button className={`tab ${active ? 'active' : ''}`}>Tab 1</button>
</div>
<div className={`tab-panel ${active ? 'active' : ''}`}>Content</div>
```

### Callout
```jsx
<div className="callout">
  <p><strong>Key Insight:</strong> Important message here.</p>
</div>
```

### Timeline
```jsx
<div style={{ position: 'relative', paddingLeft: '40px' }}>
  <div className="timeline-item completed">
    <div className="timeline-label">Step 1</div>
    <h3>Title</h3>
    <p>Description</p>
  </div>
</div>
```

## Integration with Claude Code CLI Backend

The platform is designed to integrate with Claude Code CLI for agentic development:

### Backend Integration Points

1. **Project Creation**: `/api/projects/create` - Submit initial PDD
2. **BA Agent Processing**: `/api/agents/ba/analyze-pdd` - Sends draft PDD, receives gaps
3. **Clarification Updates**: `/api/agents/ba/clarifications` - BT colleague updates
4. **Architect Agent**: `/api/agents/arch/design-sdd` - Generates SDD based on Final PDD
5. **Tech Lead Agent**: `/api/agents/tl/decompose-lld` - Creates LLD from SDD
6. **Developer Agent**: `/api/agents/dev/generate-code` - Generates code from LLD
7. **QA Agent**: `/api/agents/qa/validate` - Runs tests and generates report

### API Response Format

```json
{
  "success": true,
  "phase": "BA Agent",
  "status": "in-progress",
  "data": {
    "gaps": [
      {
        "id": 1,
        "question": "How should...",
        "priority": "high"
      }
    ],
    "clarificationLog": "...",
    "timestamp": "2026-05-11T14:30:00Z"
  }
}
```

### Running with Claude Code CLI

To run agents via Claude Code CLI:

```bash
# Start development server
npm start

# In another terminal, invoke agents
claude code --task "Run BA Agent analysis for project 4"
claude code --task "Generate architecture SDD for project 4"
# ... etc
```

## Workflow State Management

The app uses React hooks for state management:

```jsx
const [activeTab, setActiveTab] = useState('ongoing');
const [projects, setProjects] = useState([...]);
const [theme, setTheme] = useState('light');
```

For production, integrate with a backend API or state management library (Redux, Zustand, etc.).

## Responsive Design

- **Mobile-first**: Mobile layouts stack vertically
- **Tablet & Desktop (880px+)**: KPI grids show 4 columns, two-col layouts display side-by-side
- **No custom breakpoints**: Uses single 880px breakpoint for simplicity

## Accessibility

- Semantic HTML (header, nav, section, footer)
- Color contrast meets WCAG AA standards
- Text alternatives for status badges and icons
- Keyboard navigation support (tabs, buttons)

## Performance Optimizations

- CSS variables enable instant theme switching
- Minimal dependencies (React, React Router DOM)
- No heavy charting libraries (Charts built with CSS and SVG)
- Static content with inline state (no API calls in demo)

## Future Enhancements

1. **Backend Integration**: Connect to Claude Code CLI agents via REST API
2. **Real-time Updates**: WebSocket integration for live agent progress
3. **Document Management**: File upload/download for PDDs, SDDs, code
4. **User Authentication**: Role-based access (BT Colleague, Admin, etc.)
5. **Notifications**: Real-time alerts when agent phases complete
6. **Analytics Dashboard**: Metrics on agent performance, cycle times, success rates
7. **Feedback Loop**: Record clarifications and agent iterations for ML training

## Development Notes

- **No TypeScript** in demo version for simplicity. Add `tsconfig.json` and rename `.jsx` to `.tsx` for production.
- **Hardcoded Data**: Replace with API calls to Claude Code CLI backend.
- **Component Structure**: Each page is a standalone component. Refactor into smaller reusable components as app grows.
- **Styling**: All CSS is in `index.css`. Consider moving to CSS modules or styled-components for larger projects.

## License

Proprietary — McKinsey design system inspired, built for Agent Driven Automation workflow.

## Questions?

Refer to `adlc.md` for the full Agent Driven Automation specification and framework documentation.
