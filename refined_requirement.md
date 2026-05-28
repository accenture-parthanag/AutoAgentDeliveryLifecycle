# Requirement: Generate New Power Platform Solution for Import

## Reference Solution

I have created a reference Power Platform solution containing:
- One dummy PowerApps Canvas screen
- One dummy Cloud Flow
- One dummy Dataverse table

This solution has been exported, unzipped, and placed at the following path for reference:
`C:\Users\nitin.varshneya\Downloads\Github_Project\test_Nitin_GraphicNumber_1_0_0_2\`

Use this as the **structural template** for the new solution.

## Objective

Generate a **new Power Platform solution** that includes the following components, derived from the attached PDD (Project Definition Document):

1. **PowerApps Canvas Screens** — with all required controls and code
2. **Power Automate Cloud Flows** — with required logic and code
3. **Dataverse Tables** — with required schema
4. **Connection References** — for all dependent connectors
5. **Any other dependent objects** required for the solution to function

## Input Documents

- **PDD** — Source of functional requirements, business logic, and screen-level specifications
- **SDD** (Solution Design Document) — Already generated; attached for reference
- **TDD** (Technical Design Document) — Already generated; attached for reference

Use the **PDD as the primary functional source**. Use the **SDD/TDD for architectural and technical alignment**.

## Critical Packaging Requirement: Import Compatibility

The generated solution **must be directly importable** into the target environment via the **"Import Solution"** option in Power Automate.

The importer expects a **standard solution `.zip` file format**. This zip file must include:

- `Workflows/` — Cloud flow definitions
- `CanvasApps/` — Canvas app packages
- `customizations.xml` — Customizations file
- `solution.xml` — Solution manifest
- `[Content_Types].xml` — Content types file

## Coding Standards (Apply to All Generated Code)

Follow **Microsoft's official best practices** along with the following:

- Clean, modular code
- Meaningful inline comments explaining intent
- Robust error handling
- Performance optimization
- Consistent naming conventions throughout

## PowerApps Canvas Screen — Specific Guidelines

### Naming Conventions
- **Controls**: PascalCase with descriptive prefixes
  - Examples: `btnSubmitForm`, `lblErrorMessage`, `galEmployeeList`
- **Variables**: camelCase

### Code Quality
- Add inline comments using `/* comment */` syntax to explain complex formulas
- Break long formulas into named variables using `Set()` or `UpdateContext()` for clarity
- Avoid duplicated logic — consolidate reusable expressions into **global** or **context** variables

### Screen Architecture
- Design **one screen per functional area**: Home, Detail, Edit, Confirmation, Error
- Use a **consistent header / body / footer layout** across all screens for UX cohesion
- Implement screen navigation using `Navigate()` with named transitions and back-stack awareness

## Visual Design / Theme

Apply the **Accenture corporate theme** (colors, typography, layout) to all Canvas screens.

---

## Reference Files & Environment

| Item | Path |
|------|------|
| PDD | `C:\Users\nitin.varshneya\Downloads\Github_Project\Approved_PDD_Graphic_Autonumber_v2.0.docx` |
| SDD | `C:\Users\nitin.varshneya\Downloads\Github_Project\SDD_Graphic_Autonumber.docx` |
| TDD | `C:\Users\nitin.varshneya\Downloads\Github_Project\TDD_Graphic_Autonumber.docx` |
| Accenture theme | `C:\Users\nitin.varshneya\Downloads\Github_Project\AccentureThemes.png` |
| Color theme | `C:\Users\nitin.varshneya\Downloads\Github_Project\ColorThemes.png` |
| Target environment | `ACN_DEV_FUTUREENTERPRISE` |
