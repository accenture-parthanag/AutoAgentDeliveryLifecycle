# AASDI Project: Global README & Documentation

## Project Overview
The Auto Agentic Solution Development with Human in Lead (AASDI) is a high-fidelity web application designed to orchestrate AI Agents through the automation delivery process. This project follows McKinsey's design principles, emphasizing strategic clarity, professional minimalism, and authoritative typography.

## Tech Stack
- **Frontend:** React (Vite/CRA)
- **Styling:** Tailwind CSS (McKinsey Blue theme)
- **Icons:** Lucide-React
- **Typography:** Source Serif 4 (Headers), Inter (Body)

## Project Structure
```text
/
├── public/              # Static assets (logos, favicons)
├── src/
│   ├── components/      # Shared UI (Navigation, Layout, Footers)
│   ├── views/           # Full Page Implementations
│   │   ├── ExecutiveOverview.jsx
│   │   ├── RequirementHardening.jsx
│   │   ├── ArchitectureStrategy.jsx
│   │   ├── TechnicalDecomposition.jsx
│   │   └── BuildValidation.jsx
│   ├── theme/           # Design System Tokens & Tailwind Config
│   ├── App.js           # Main Routing Logic
│   └── index.js         # Entry Point
├── tailwind.config.js   # Custom McKinsey Color Palette
└── package.json         # Dependencies
```

## Setup Instructions
1. **Install Dependencies:** `npm install lucide-react clsx tailwind-merge`
2. **Configure Tailwind:** Copy the provided `tailwind.config.js` to your root.
3. **Typography:** Ensure Google Fonts for 'Source Serif 4' and 'Inter' are linked in your HTML head.

## Governance
This solution includes built-in "Human-in-the-Loop" validation points for BT Colleagues and mandatory Architectural Review Gates for high-risk processes.
