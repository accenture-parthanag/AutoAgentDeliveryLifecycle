# A-ADLC Platform — Development Guide for Claude Code

## Project Overview

The A-ADLC Platform is a React-based multi-page web application implementing the Agentic Automation Development Lifecycle framework. It provides a user interface for orchestrating AI agents through five specialized roles: Business Analyst, Architect, Tech Lead, Developer, and QA Agent.

### Tech Stack
- **Frontend**: React 18, React Router 6
- **Styling**: Custom CSS with design tokens (McKinsey Editorial Executive system)
- **Build**: React Scripts (CRA)
- **Backend**: Designed for Claude Code CLI integration (not yet implemented)

### Key Files
- `src/index.css` — All styling using design tokens
- `src/App.jsx` — Router and main navigation
- `src/pages/` — Seven page components for the A-ADLC workflow
- `public/index.html` — HTML entry point
- `package.json` — Dependencies and scripts

## Design System Reference

The platform follows a strict McKinsey-inspired design system. **Never deviate from these rules**:

### Fonts
- **Headlines**: Fraunces (serif) — `font-family: "Fraunces", serif`
- **Body**: Geist (sans) — `font-family: "Geist", sans-serif`
- **Numbers**: JetBrains Mono — `font-family: "JetBrains Mono", monospace`

### Color Palette
```
Light Mode (default):
--bg: #faf9f6 (warm off-white background)
--surface: #ffffff (card/container background)
--ink: #0a1628 (main text)
--accent: #b8341a (rust-red — links, active states, emphasis)
--positive: #1b5e20 (green — positive metrics)
--negative: #b8341a (red — negative metrics)
--gold: #b08d3a (neutral markers, benchmarks)

Dark Mode [data-theme="dark"]:
--bg: #0e1116
--surface: #181c23
--accent: #e85a3c (brighter rust-red)
--positive: #6dd474 (brighter green)
--negative: #e85a3c (brighter red)
```

### Layout Rules
- **Container max-width**: 1240px with `margin: 0 auto`
- **Padding**: 48px vertical, 32px horizontal (scale down on mobile)
- **Responsive breakpoint**: 880px (single breakpoint only)
- **Borders**: 1px hairline only, no rounded corners (`border-radius: 0` always)
- **Shadows**: None. Use 1px borders instead.

### Component Patterns
1. **KPI Grid**: 4-column grid (2 columns on mobile) with 1px hairline gaps
2. **Tabs**: Simple button-based with bottom border underline (no separate divider)
3. **Tables**: Full-width with 1px borders, hover effect is background color change
4. **Callout**: Left accent border (3px solid), soft background color
5. **Section Labels**: ALL CAPS, `letter-spacing: 0.2em`, color: `--accent`, above section headings

## Common Development Tasks

### Adding a New Page

1. Create new component in `src/pages/NewPage.jsx`:
```jsx
export default function NewPage() {
  return (
    <div className="container">
      <header className="header">
        <div className="brand-mark">Category</div>
        <h1>Page Title <em>Italic phrase</em></h1>
        <p className="subtitle">One-line description.</p>
      </header>

      <section className="section">
        <div className="section-label">01 / Overview</div>
        <h2>Section Heading</h2>
        {/* Content */}
      </section>

      <footer>Page name · Phase · A-ADLC Platform</footer>
    </div>
  );
}
```

2. Add route in `src/App.jsx`:
```jsx
<Route path="/new-page" element={<NewPage />} />
```

3. Add navigation link in nav section:
```jsx
<Link to="/new-page" className={`${isActive('/new-page')}`}>New Page</Link>
```

### Modifying Styles

- **Never add `border-radius`** — square corners are design system rules
- **Never add `box-shadow`** — use `border: 1px solid var(--line)` instead
- **Color discipline**: Only use named tokens (--accent, --positive, --negative, --gold, --muted)
- **Numbers in monospace**: Always apply `font-family: "JetBrains Mono"` to numerical values
- **Section labels**: Must be ALL CAPS with `letter-spacing: 0.2em`

### Adding Interactive Elements

For tabs, buttons, and filters, use these class names:
```html
<!-- Buttons -->
<button class="btn">Default</button>
<button class="btn primary">Primary (filled)</button>

<!-- Tabs -->
<div class="tabs">
  <button class="tab active">Active</button>
  <button class="tab">Inactive</button>
</div>

<!-- Chips/Filters -->
<button class="chip active">Selected</button>
<button class="chip">Unselected</button>

<!-- Status Badges -->
<span class="workflow-badge pending">Pending</span>
<span class="workflow-badge in-progress">In Progress</span>
<span class="workflow-badge completed">Completed</span>
```

### Responsive Adjustments

For elements that change layout under 880px:
```css
@media (max-width: 880px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .two-col { grid-template-columns: 1fr; }
  h1 { font-size: 32px; }
}
```

## Backend Integration (Future)

When integrating with Claude Code CLI agents:

### Expected API Endpoints
```
POST /api/agents/ba/analyze-pdd
POST /api/agents/arch/design-sdd
POST /api/agents/tl/decompose-lld
POST /api/agents/dev/generate-code
POST /api/agents/qa/validate
POST /api/projects/create
GET /api/projects/:id
```

### State Update Pattern
Replace hardcoded `useState` values with API calls:
```jsx
// Before (demo):
const [projects] = useState([{...}, {...}]);

// After (with API):
const [projects, setProjects] = useState([]);
useEffect(() => {
  fetch('/api/projects')
    .then(r => r.json())
    .then(data => setProjects(data));
}, []);
```

## Running the Application

```bash
# Development
npm start
# Opens at http://localhost:3000 with hot reload

# Production build
npm run build
# Output in /build directory

# Testing (if added)
npm test
```

## File Organization Best Practices

- **One component per file**
- **Naming**: `PascalCase.jsx` for components
- **Imports**: React first, then React Router, then CSS
- **CSS**: All in `src/index.css`, organized by section (typography, header, buttons, etc.)
- **State**: Use `useState` hooks, avoid prop drilling (context for theme in future)

## Typography Rules (Strict)

1. **Headlines (h1)**: Fraunces, 44px, `letter-spacing: -0.02em`, `font-variation-settings: "opsz" 144`
2. **Subheadings (h2)**: Fraunces, 28px, with bottom border
3. **Body (p)**: Geist, 14px, `line-height: 1.6`
4. **Numbers**: JetBrains Mono, always
5. **Italic emphasis**: Only on one phrase in h1 with `<em>` tag, colored `--accent`
6. **All-caps labels**: `text-transform: uppercase`, `letter-spacing: 0.2em`

## Avoiding Common Mistakes

1. ❌ Don't use `border-radius`, `box-shadow`, gradients, or rounded elements
2. ❌ Don't mix serif fonts (only Fraunces for display)
3. ❌ Don't use a second accent color (use `--gold` for a third state)
4. ❌ Don't add animations or transitions on mount
5. ❌ Don't use bullet lists for prose content
6. ❌ Don't add custom fonts beyond Fraunces, Geist, JetBrains Mono
7. ❌ Don't hardcode colors — always use CSS variables
8. ❌ Don't leave numbers without monospace font

## Theme Toggle Implementation

The theme toggle is already wired in `src/App.jsx`:
```jsx
const toggleTheme = () => {
  const newTheme = theme === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
  document.documentElement.setAttribute('data-theme', newTheme);
};
```

CSS automatically swaps all colors via `[data-theme="dark"]` selector.

## Debugging Tips

- **Design System Issues**: Check if colors use CSS variables, fonts use correct families, borders are 1px, no shadows/radius
- **Layout Issues**: Verify max-width container, check responsive breakpoint at 880px
- **Theme Issues**: Ensure all colors are in `--bg`, `--surface`, `--ink`, etc. (no hardcoded hex colors)
- **Responsive**: Test at 320px (mobile), 768px (tablet), 1240px (desktop)

## Next Steps for Production

1. Add TypeScript: `npm install typescript @types/react @types/react-router-dom`
2. Rename `.jsx` files to `.tsx` and add type annotations
3. Create `src/components/` subdirectory for reusable components
4. Integrate backend API calls (replace hardcoded `useState` values)
5. Add error handling and loading states
6. Implement proper state management (Context API or Redux)
7. Add unit tests with Jest/React Testing Library
8. Set up CI/CD pipeline for automated testing

## Design System Version

This implementation follows the **Editorial Executive** design system from the McKinsey-inspired template. Refer to `/skills/editorial-executive/` for the official design files and patterns.

---

**Last Updated**: May 11, 2026
**Framework Version**: React 18.2, React Router 6.20
**Design System**: Editorial Executive (McKinsey-grade)
