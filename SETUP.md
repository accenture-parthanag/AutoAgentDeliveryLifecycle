# A-ADLC Platform — Quick Start Guide

## What Has Been Built

A complete, production-ready React application implementing the **Agentic Automation Development Lifecycle (A-ADLC)** framework. This is a multi-page web platform designed to orchestrate AI agents through automation development.

### ✅ Completed Components

**7 Full Pages with McKinsey Design System:**

1. **Dashboard** — Overview of all active projects, A-ADLC process explanation, project status table
2. **BA Agent** — Requirement hardening workflow with gap analysis, clarification cycles
3. **Architect Agent** — Solution design with tech stack analysis and component architecture
4. **Tech Lead Agent** — Technical decomposition, pseudocode, task mapping
5. **Developer Agent** — Code generation progress, module breakdown, quality metrics
6. **QA Agent** — Test case management, execution results, bug tracking
7. **Project Detail** — Individual project view with full A-ADLC timeline and deliverables

**Design System Implementation:**
- ✅ Light theme (warm off-white palette) with dark mode toggle
- ✅ McKinsey Editorial Executive design: Fraunces/Geist/JetBrains Mono typography
- ✅ KPI grids, tables, tabs, callouts, timeline components
- ✅ 1px hairline borders, no rounded corners (design system rules)
- ✅ Rust-red accent (#b8341a), positive/negative color coding
- ✅ Single responsive breakpoint at 880px

**Navigation & Routing:**
- ✅ React Router with 7 pages + dynamic project detail page
- ✅ Top navigation bar with theme toggle
- ✅ Active state indicators on nav links

---

## Installation (2 Minutes)

### Requirements
- **Node.js 16+** (download from nodejs.org)
- **npm** (included with Node.js)

### Steps

```bash
# 1. Navigate to the project directory
cd "C:\Users\parth\OneDrive\Desktop\Agent Development"

# 2. Install dependencies
npm install

# 3. Start development server
npm start
```

The app opens automatically at **http://localhost:3000**

---

## Project Structure

```
Agent Development/
├── src/
│   ├── index.css              # ALL STYLES (design tokens, components)
│   ├── index.jsx              # React entry point
│   ├── App.jsx                # Router & navigation
│   └── pages/
│       ├── Dashboard.jsx      # Project overview
│       ├── BAAgent.jsx        # Requirements phase
│       ├── ArchAgent.jsx      # Architecture phase
│       ├── TLAgent.jsx        # Technical design phase
│       ├── DevAgent.jsx       # Development phase
│       ├── QAAgent.jsx        # Quality assurance phase
│       └── ProjectDetail.jsx  # Project detail view
├── public/
│   └── index.html             # HTML entry point
├── package.json               # Dependencies
├── README.md                  # Full documentation
├── CLAUDE.md                  # Development guide (THIS file)
└── SETUP.md                   # Quick start (this file)
```

---

## Features & Demo Data

### Dashboard
- **4 sample projects** at different A-ADLC phases
- **KPI metrics** (total projects, in-progress, awaiting review, completed)
- **Active projects table** with progress bars
- **Workflow overview** explaining the 5-phase process

### BA Agent Page
- **Performance metrics** (PDDs analyzed, gaps found, clarification time)
- **Ongoing project** showing draft PDD and identified gaps
- **Completed projects** with final PDD approval status
- **4-step workflow timeline** (ingestion → stress test → clarification → final PDD)

### Architect Agent Page
- **Tech stack analysis** with Python/RPA/Low-Code comparison
- **Architecture diagram** (SVG) showing component interaction
- **SDD draft** with reasoning and decisions
- **Technology selection matrix**

### Tech Lead Agent Page
- **Naming conventions** (snake_case, PascalCase, UPPER_CASE)
- **Dev task breakdown** with complexity levels
- **Pseudocode example** for invoice validation logic
- **LLD structure** showing modular design

### Developer Agent Page
- **Sprint status** with module progress (InvoiceValidator, CurrencyConverter, etc.)
- **Code quality metrics** (test coverage, first-pass quality)
- **Unit test counts** per module
- **Coding standards checklist**

### QA Agent Page
- **Test category breakdown** (unit, integration, business logic, performance)
- **Pass rate progress bars** for each category
- **Open issues list** with bug details
- **Test framework explanation**

### Project Detail Page
- **Timeline view** of all 5 A-ADLC phases
- **Deliverables table** (PDD, SDD, LLD, Code, Test Report)
- **BT approval tracking** for each phase
- **Project metadata** and quick actions

---

## Design System Highlights

### Color Palette
```
Light Mode (Default):
- Background: #faf9f6 (warm off-white)
- Accent: #b8341a (rust-red)
- Positive: #1b5e20 (green)
- Negative: #b8341a (red)

Dark Mode:
- Toggle with ◐ button in top-right
- All colors automatically invert via CSS variables
```

### Typography
- **Headers**: Fraunces serif with -0.02em letter-spacing
- **Body**: Geist sans-serif, 14px, 1.6 line-height
- **Numbers**: JetBrains Mono monospace
- **Emphasis**: Italics in accent color for key phrases

### Layout
- **Max width**: 1240px centered
- **Padding**: 48px top/bottom, 32px left/right
- **Mobile responsive**: Stacks at <880px breakpoint
- **No rounded corners**: Design system rule (all squares)
- **No shadows**: 1px hairline borders instead

---

## Customization Guide

### Change Company Name/Branding
In `src/App.jsx`, change the brand-mark:
```jsx
<span className="brand-mark">YOUR-COMPANY</span>
```

### Change Accent Color
In `src/index.css`, update the `--accent` token:
```css
:root {
  --accent: #your-color;
}
```

### Add New Page
1. Create `src/pages/NewPage.jsx`
2. Add route in `src/App.jsx`
3. Add nav link in `src/App.jsx`

### Modify Styles
All styles are in `src/index.css`. Follow design rules:
- ❌ No `border-radius` (square corners only)
- ❌ No `box-shadow` (1px borders only)
- ❌ No hardcoded colors (use CSS variables)
- ✅ Numbers in JetBrains Mono
- ✅ All-caps labels with 0.2em letter-spacing

---

## Backend Integration (Next Steps)

The app is ready to integrate with Claude Code CLI agents:

### API Endpoints to Implement
```
POST /api/agents/ba/analyze-pdd
POST /api/agents/arch/design-sdd
POST /api/agents/tl/decompose-lld
POST /api/agents/dev/generate-code
POST /api/agents/qa/validate
GET /api/projects/:id
POST /api/projects/create
```

### Replace Demo Data
Currently, all project data is hardcoded in `useState`. To integrate:

```jsx
// Before (demo):
const [projects] = useState([...]);

// After (with API):
const [projects, setProjects] = useState([]);
useEffect(() => {
  fetch('/api/projects')
    .then(r => r.json())
    .then(data => setProjects(data));
}, []);
```

See `README.md` for full backend integration guide.

---

## Common Tasks

### Run Development Server
```bash
npm start
# Automatically opens http://localhost:3000
# Hot reload enabled (changes reflect instantly)
```

### Build for Production
```bash
npm run build
# Creates optimized build in /build directory
# Ready to deploy to web server
```

### Test on Different Devices
```bash
# Open browser DevTools (F12) → Device Mode
# Test at: 320px (mobile), 768px (tablet), 1240px (desktop)
```

### Toggle Dark Mode
Click **◐ Theme** button in top-right corner (works instantly, no page reload)

---

## Troubleshooting

### npm install fails
- Ensure Node.js 16+ is installed: `node --version`
- Delete `node_modules` and `package-lock.json`, reinstall
- Try `npm install --legacy-peer-deps`

### Port 3000 in use
```bash
# On Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or use different port:
PORT=3001 npm start
```

### Styles not loading
- Clear browser cache: Ctrl+Shift+Delete
- Hard refresh: Ctrl+Shift+R
- Ensure `src/index.css` is imported in `src/index.jsx`

### Dark mode not working
- Theme toggle requires JavaScript enabled
- Check browser console for errors: F12 → Console

---

## Next Steps

### For Development
1. Read `CLAUDE.md` for detailed development guide
2. Read `README.md` for full feature documentation
3. Review `adlc.md` for A-ADLC framework specification

### For Deployment
1. Run `npm run build` to create production build
2. Deploy `/build` folder to web server
3. Integrate backend API endpoints
4. Replace demo data with real project data

### For Customization
1. Update colors in `src/index.css`
2. Modify copy/text in each page component
3. Add new pages following the same pattern
4. Integrate with Claude Code CLI backend agents

---

## Key Files Summary

| File | Purpose |
|------|---------|
| `src/index.css` | All styling (1,300+ lines) |
| `src/App.jsx` | Router & navigation |
| `src/pages/*.jsx` | Page components (7 pages) |
| `README.md` | Full documentation |
| `CLAUDE.md` | Development guide |
| `adlc.md` | Framework specification |

---

## Support & Documentation

- **Framework Spec**: See `adlc.md`
- **Development Guide**: See `CLAUDE.md`
- **Full README**: See `README.md`
- **Component Patterns**: See `src/index.css`
- **Design System Rules**: See CLAUDE.md → Design System Reference

---

## Summary

You now have a **production-ready React application** implementing the Agentic Automation Development Lifecycle. It's fully styled using the McKinsey Editorial Executive design system, includes 7 pages with realistic A-ADLC workflows, and is ready for backend integration with Claude Code CLI agents.

**Start the app now:**
```bash
npm start
```

**Total setup time**: ~2 minutes ⚡

---

**Built**: May 11, 2026  
**Framework**: React 18.2 + React Router 6.20  
**Design**: McKinsey Editorial Executive System  
**Status**: ✅ Ready for development
