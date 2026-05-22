---
name: The Design System
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#43474c'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f1f1f1'
  outline: '#73777d'
  outline-variant: '#c3c7cc'
  surface-tint: '#4c6173'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#061d2d'
  on-primary-container: '#71869a'
  inverse-primary: '#b3c9de'
  secondary: '#5e5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e1dfdf'
  on-secondary-container: '#636262'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#001e31'
  on-tertiary-container: '#258bc8'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cfe5fb'
  primary-fixed-dim: '#b3c9de'
  on-primary-fixed: '#061d2d'
  on-primary-fixed-variant: '#34495b'
  secondary-fixed: '#e4e2e2'
  secondary-fixed-dim: '#c7c6c6'
  on-secondary-fixed: '#1b1c1c'
  on-secondary-fixed-variant: '#464747'
  tertiary-fixed: '#cbe6ff'
  tertiary-fixed-dim: '#90cdff'
  on-tertiary-fixed: '#001e31'
  on-tertiary-fixed-variant: '#004b72'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  display-lg:
    fontFamily: Source Serif 4
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Source Serif 4
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Source Serif 4
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-md:
    fontFamily: Source Serif 4
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-bold:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-tabular:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  container-max: 1280px
  gutter: 24px
---

## Brand & Style
This design system embodies the "Day 1" professional ethos: prepared, analytical, and unquestionably authoritative. It is designed for high-stakes environments where clarity of information and the gravity of the message are paramount. 

The aesthetic is a fusion of **Corporate Modernism** and **Minimalism**. It rejects ephemeral trends like heavy shadows or vibrant gradients in favor of a rigorous, grid-based structure. The emotional response should be one of confidence and stability, utilizing generous whitespace to allow complex data and strategic insights to breathe. Every element serves a functional purpose, reflecting a culture of precision and excellence.

## Colors
The palette is anchored by **Deep McKinsey Blue**, used for primary branding, headers, and navigation to establish immediate authority. **Action Blue** is reserved strictly for interactive elements—links, primary buttons, and active states—to provide clear signposting without distracting from the content.

**Slate Grey** is employed for secondary text and metadata, ensuring a clear visual hierarchy. Backgrounds utilize a combination of **Pure White** for primary content areas and **Light Grey (#F5F5F5)** for structural sectioning or container fills, maintaining a high-contrast environment that prioritizes legibility and focus.

## Typography
The typographic system utilizes a high-contrast pairing to distinguish between narrative authority and data-driven utility.

- **Headlines:** Use **Source Serif 4**. This serif face provides a classical, editorial feel that suggests expertise and heritage. Larger display sizes should use tighter letter spacing for a more "published" appearance.
- **Body & Data:** Use **Inter**. This modern grotesque ensures maximum legibility in dense reports and data tables. For numerical data, the "tabular-nums" property must be used to ensure columns align perfectly in financial or analytical views.
- **Labels:** Use uppercase Inter with slight tracking to distinguish categories and small metadata from body copy.

## Layout & Spacing
This design system follows a **Fixed-Fluid Hybrid Grid**. Content is housed within a 12-column grid with a maximum width of 1280px for desktop to prevent line lengths from becoming unreadable.

- **Desktop (1024px+):** 12 columns, 24px gutters, 48px+ side margins.
- **Tablet (768px-1023px):** 8 columns, 24px gutters, 24px side margins.
- **Mobile (Up to 767px):** 4 columns, 16px gutters, 16px side margins.

Horizontal rhythm is strictly maintained through an **8px base unit**. Generous vertical padding (spacing-xl) is encouraged between major sections to emphasize the minimalist, sophisticated aesthetic. Alignment should always be "flush left" for text to reinforce a structured, document-like feel.

## Elevation & Depth
In keeping with a minimalist and authoritative aesthetic, this design system **eschews drop shadows**. Depth and hierarchy are created through structural means:

1.  **Subtle Outlines:** Use 1px solid borders in #E0E0E0 to define cards and containers.
2.  **Tonal Backgrounds:** Use #F5F5F5 fills to distinguish secondary content areas or sidebars from the primary #FFFFFF canvas.
3.  **Keylines:** Use horizontal rules (1px) to separate list items or header sections, creating a "ledger" or "report" feel.
4.  **Interaction Depth:** Primary interactive states may use a slight fill change (e.g., from #FFFFFF to #F5F5F5 on hover) rather than an elevation lift.

## Shapes
Shapes are **sharp and architectural**. A 0px border radius is used across all primary UI components, including buttons, input fields, and cards. This lack of rounding reinforces the "strict grid" and "professional" tone, leaning into a traditional editorial and corporate aesthetic. 

Small exceptions may be made for status indicators or notification dots which may be circular, but all structural containers must remain rectangular and sharp.

## Components
- **Buttons:** Primary buttons use a solid #051C2C background with white text. Secondary buttons use a 1px border of #051C2C with no fill. Both have 0px corner radius and use `label-bold` typography.
- **Input Fields:** Pure white background with a 1px #707070 border. On focus, the border changes to Action Blue (#007DBA). Error states use a sharp 1px red border with no shadow.
- **Cards:** Defined by a 1px #E0E0E0 border. Cards do not have shadows. Use generous internal padding (spacing-md).
- **Data Tables:** These are a core component. Use 1px horizontal dividers only. Headers should be in #051C2C with `label-bold` type. Rows use `data-tabular` for alignment.
- **Chips/Tags:** Small rectangular boxes with a light grey fill (#F5F5F5) and Slate Grey text. No rounded corners.
- **Navigation:** Top-tier navigation uses the Deep McKinsey Blue as a background or as the primary text color for active states. Use strict vertical alignment with the container grid.