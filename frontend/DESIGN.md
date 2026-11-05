---
name: Pursuit Frontend
description: Warm off-white surfaces, muted sage accents, and readable Inter typography.
colors:
  bg: "#f2f4f0"
  surface-solid: "#fbfcf9"
  surface-sunken: "#edf1e9"
  sidebar-surface: "#edf1e9"
  chrome: "#f8faf5"
  ink: "#25332b"
  ink-soft: "#4d5f53"
  muted: "#637168"
  hairline: "#dfe5dc"
  hairline-strong: "#7b8a80"
  accent: "#547763"
  accent-strong: "#426553"
  accent-soft: "#e6eee4"
  accent-ink: "#ffffff"
  primary-ink: "#f7faf5"
  inset: "rgba(64, 91, 73, 0.06)"
  success: "#47745a"
  success-soft: "#e7eee7"
  warning: "#866039"
  warning-soft: "#f3ecdf"
  danger: "#a34f60"
  danger-soft: "#f4e7e9"
  demo: "#77618f"
  demo-soft: "#eee9f3"
  d-continue: "#47745a"
  d-iterate: "#866039"
  d-pivot: "#77618f"
  d-stop: "#a34f60"
  d-inconclusive: "#58675e"
  dark-bg: "#151c19"
  dark-surface-solid: "#1e2823"
  dark-surface-sunken: "#26332b"
  dark-sidebar-surface: "#19231d"
  dark-chrome: "#1b251f"
  dark-ink: "#e5eae3"
  dark-ink-soft: "#bcc7bc"
  dark-muted: "#a3b0a4"
  dark-hairline: "#35443a"
  dark-hairline-strong: "#7f9485"
  dark-accent: "#9dbca6"
  dark-accent-strong: "#9dbca6"
  dark-accent-soft: "#2c3f32"
  dark-accent-ink: "#18271e"
  dark-inset: "rgba(157, 188, 166, 0.08)"
  dark-success: "#91bba2"
  dark-success-soft: "#263e30"
  dark-warning: "#d0b181"
  dark-warning-soft: "#3b3326"
  dark-danger: "#d49aa5"
  dark-danger-soft: "#402e35"
  dark-demo: "#b7adc8"
  dark-demo-soft: "#352e42"
typography:
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(1.65rem, 2.5vw, 2.15rem)"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
  compact:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "13px"
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "12px"
  button:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
  text-xs:
    fontSize: "0.75rem"
  text-sm:
    fontSize: "0.8125rem"
  text-base:
    fontSize: "0.9375rem"
  text-lg:
    fontSize: "1.125rem"
  text-xl:
    fontSize: "1.5rem"
  text-2xl:
    fontSize: "2rem"
rounded:
  xs: "6px"
  sm: "10px"
  md: "14px"
  lg: "18px"
  xl: "22px"
  field: "12px"
  pill: "9999px"
spacing:
  space-1: "4px"
  space-2: "8px"
  space-3: "12px"
  space-4: "16px"
  space-6: "24px"
  space-8: "32px"
  space-12: "48px"
  panel-inline: "20px"
components:
  button-primary:
    backgroundColor: "{colors.accent-strong}"
    textColor: "{colors.accent-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.field}"
    height: "40px"
    padding: "0 16px"
  button-primary-dark:
    backgroundColor: "{colors.dark-accent-strong}"
    textColor: "{colors.dark-accent-ink}"
    rounded: "{rounded.field}"
  button-secondary:
    backgroundColor: "{colors.surface-solid}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    height: "40px"
    padding: "0 16px"
  card:
    backgroundColor: "{colors.surface-solid}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
  input:
    backgroundColor: "{colors.surface-solid}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    height: "40px"
    padding: "0 12px"
  navigation-active:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-strong}"
    rounded: "{rounded.field}"
    height: "40px"
    padding: "8px 12px"
---

# Design System: Pursuit Frontend

## Overview

**Creative North Star: "The Pursuit Workspace"**

Pursuit uses warm off-white panels, a pale stone canvas, muted sage actions, and soft charcoal text. Inter typography, rounded rectangular controls, quiet boundaries, and subtle panel shadows keep the interface readable. Dark mode uses deep green-gray surfaces and desaturated sage accents.

This app-local record describes the shipped redesign. It does not replace the user-owned root `../DESIGN.md`, whose marketing identity differs from this frontend. Product context comes from `PRODUCT.md`, the working direction in `../.local/workspace-ui.todo.md`, and the evidence contract in `../.local/ui-direction-contract.md`. Authentication, API behavior, permissions, stored content, guided reading, keyboard interactions, and backend behavior remain existing product constraints; this documentation introduces no backend changes.

The visual reference is the [AI-Powered LinkedIn Automation Dashboard](https://dribbble.com/shots/27836982-AI-Powered-LinkedIn-Automation-Dashboard), inspected through the supplied original raster at `C:/Users/anubh/Downloads/5bd8a8aac6fd923d1555d94984ca8ade.png`. Its exact font is unknown. Inter is the chosen visual match, not an identification of the reference font. The build preserves Pursuit's content and ascending-step SVG identity rather than adopting the reference's outreach product.

Evidence: `src/app/globals.css`, `src/app/layout.tsx`, `src/app/w/[ws]/page.tsx`, `src/components/{shell,mobile-navigation,reading-mode,brand}.tsx`, shared `src/components/ui/styles.ts`, and shared `src/components/ui/{core,surface,form,data}.tsx`. Visual evidence: `../.local/ui-desktop-light.png`, `ui-desktop-dark.png`, `ui-mobile-light.png`, and `ui-mobile-dark.png`. Screenshots corroborate the visual direction; current source owns exact values where capture and code differ.

**Key Characteristics:**
- Opaque panels with restrained shadows on a soft stone canvas.
- Inter across headings, navigation, and body copy.
- Muted sage actions with separate readable foreground and fill roles.
- Grouped navigation and reusable shared UI across light, dark, and mobile surfaces.

## Colors

### Primary

The muted `accent` marks the logo, small highlights, progress, and mobile create action. `accent-strong` supplies standard primary button fills, links through the legacy `trail` alias, and focus outlines. `accent-soft` supports icon tiles and selected mobile navigation; these are deliberately different roles rather than one accent applied everywhere. `accent-ink` pairs with primary fills; `primary-ink` colors the logo details. See frontmatter for exact source values.

### Neutral

`bg` is the page canvas; `surface-solid` is the opaque panel surface; `surface-sunken` distinguishes table headers and segmented-control tracks. `sidebar-surface` and `chrome` give navigation a quieter tint. `ink`, `ink-soft`, and `muted` express text hierarchy. `hairline` separates panels and rows; `hairline-strong` delineates fields. `inset` supplies hover fills and `accent-soft` marks active navigation. CSS aliases `paper`, `surface`, `sunken`, `line`, `line-strong`, and `ink-2`/`ink-3` preserve existing callers.

Dark-prefixed documentation tokens record the values applied to the corresponding unprefixed CSS variables in dark mode; they are not new runtime variable names. The OS preference supplies the default unless a saved `pursuit.theme` light/dark choice sets `data-theme` before paint. Decision fills remain the same in both themes; success, warning, danger, and demo surface/text pairs change with theme. Semantic status colors are functional exceptions to the stone-and-sage brand palette, not additional brand accents.

**The Accent Roles Rule.** Use the existing distinction between accent highlights, strong action fills, soft backgrounds, and their paired foregrounds.

## Typography

**Display and Body Font:** Inter, loaded through `next/font/google` into `--font-interface`, with system-ui and sans-serif fallbacks. `--font-reading` and `--font-editorial` resolve to that same interface family. **Code Font:** JetBrains Mono, loaded into `--font-code` and exposed through the mono stack with platform monospace fallbacks.

The hierarchy is compact and consistent: page headings use the frontmatter's fluid headline role; card titles use the title role; the root body uses the body role; dashboard copy commonly uses compact text; metadata uses label text. Semibold headings and numeric summaries establish hierarchy without a separate display typeface. The six `text-*` entries record declared CSS size tokens; they do not replace Tailwind's independently defined utilities. In particular, the shared medium button uses Tailwind `text-sm` (14px), not the custom `--text-sm` (13px).

Shared headers also carry local 24px/28px classes, but the more specific `.app-shell h1` rule sets workspace headings to the recorded fluid size. Card descriptions include 13px and page descriptions 14.5px. Mobile navigation uses 11px semibold labels. Mono is for code and technical fragments, not the workspace's display voice.

The direction contract requires control/icon contrast of at least 3:1 and normal text contrast of at least 4.5:1. These are acceptance constraints, not a claim that this documentation pass measured every rendered color combination.

**The One Sans Rule.** Keep workspace headings, reading copy, and controls on the shipped Inter family; retain mono only for existing technical uses.

## Layout

The desktop shell has a sticky full-height sidebar: expanded width 248px, collapsed width 80px, with the preference stored as `pursuit.sidebar`. At Tailwind `md` (768px), the sidebar appears and replaces mobile navigation. The sticky header is 64px tall on mobile and 76px from `md`. Main content has 16px horizontal gutters on mobile and 32px from `md`, with 20px top spacing.

The shell owns route-specific centered width limits: report creation 42rem; settings, assistant, and priorities 48rem; reports and approvals 56rem; experiment creation 64rem; other workspace pages 72rem. The dashboard's own wider wrapper remains bounded by that shell. At `xl` (1280px), the dashboard adds a 320px right rail beside an independent flexible left stack: experiment table, workflow choices, and company reports. These supporting panels follow the table immediately without waiting for the taller right rail. Below that the stacks follow document order. Summary metrics stay three columns. Phone experiments use a responsive list exposing stage, verdict, and updated time together; the desktop table remains a separate wider presentation with local overflow handling.

Spacing follows the declared four-pixel family, with recurring 20px panel gutters and section gaps. Card headers use 20px horizontal and 16px vertical padding; rows commonly use 20px horizontal and 14px vertical padding. Cards own their padding rather than imposing one universal value.

Below `md`, a fixed five-position bottom bar exposes Home, Reports, New experiment, Approvals, and Menu. The center action is raised, with an accent fill and `primary-ink` SVG foreground; Menu opens the remaining routes and workspace/account controls in a drawer capped at 75dvh. Content reserves `6rem + env(safe-area-inset-bottom)` below; safe-area padding also protects chrome. Fields/selects use 16px text and minimum 44px heights on mobile; press controls also receive the 44px minimum. Mobile tabs' final minimum height is 44px. Reading controls keep Guided/Advanced selection and the native terms disclosure, with the visible select label suppressed at narrow widths but its accessible name retained.

## Elevation & Depth

**The Flat Panels Rule.** Workspace content panels separate through opaque surface tones and one-pixel borders, with no panel shadows or glass blur.

Legacy `Glass` and `glass-dense` APIs render opaque panels with restrained depth. Orbs, sheen, dot fields, and glow fields are hidden. Skeleton shimmer and overlay backdrops retain their existing treatments.

Shared surfaces use `0 2px 4px -3px var(--shadow), 0 12px 28px -22px var(--shadow)` for gentle separation. Sidebar and header surfaces remain flat. Popovers and mobile navigation retain their contextual shadows. `--shadow` uses a low-alpha green-gray in light mode and black at 22% in dark mode.

Interaction motion is restrained: press scales to 0.97, entry rises 6px, and overlays use fade/scale or drawer translation. Declared durations are 120/160/220/320ms; shared buttons separately use 150ms transitions. Reduced-motion preference reduces global animation and transition duration to 0.01ms and disables repeated iterations; do not infer that animation is absent for all users.

## Shapes

Cards use the large radius, legacy Glass uses extra-large and dense Glass medium. Text fields, selects, sidebar links, and shared tabs use rounded rectangles. Button radii are 10px, 12px, and 14px by size. Status chips retain pill geometry. Table wrappers use the medium radius. The logo retains its rounded-square SVG silhouette.

## Components

### Buttons

Shared `Button` and `buttonStyles` supply primary, secondary, ghost, and danger treatments. Primary uses the strong sage fill and paired foreground. Secondary uses a panel surface with border emphasis on hover; ghost uses inset hover; danger uses muted rose text and a soft danger surface. Sizes remain 32/40/48px tall with rounded rectangular corners. Mobile minimum heights override the smaller sizes. Global focus is a two-pixel themed outline with two-pixel offset.

### Cards / Containers

`Card`, `CardHeader`, `Glass`, `PageHeader`, `Empty`, and `Notice` retain their existing APIs. Cards are opaque bordered containers, with dividers and compact titles. Empty states pair a concise title and explanation with the real next action. Notices use semantic icon/text/background combinations; they do not introduce ornamental brand colors.

### Inputs / Fields

`Field` links labels, hints, and error descriptions. Inputs, textareas, and selects share rounded rectangular corners, a readable neutral border, panel fill, and 12px inline padding. Standard inputs/selects are 40px high before mobile overrides. Focus changes the border to strong sage and adds a two-pixel accent ring. Invalid and disabled fields retain their semantic treatments. Password reveal, checkbox, and switch controls keep their existing semantics.

### Tabs, Tables, and Status

`Tabs` uses a rounded rectangular sunken track and a surface-filled selection with a one-pixel line ring. Arrow keys, Home, and End move roving focus and selection. Table wrappers contain horizontal scrolling; shared column headers use sunken fill and sticky positioning. Status/demo/verdict chips retain explicit labels and semantic colors so demo data and real outcomes remain distinguishable.

Below `sm` (640px), dashboard experiments render as list rows with 16px padding: title, use case, wrapping stage/verdict/demo chips, and an explicit Updated timestamp. At `sm` and above, a separately rendered table exposes the same experiment data, with a focusable labelled overflow region and a 600px minimum table width. This dashboard table is distinct from the reusable shared table primitive.

### Navigation

The `nav` array in `src/components/shell.tsx` is the canonical workspace registry. Group rendering, command palette entries, mobile primary tabs, and remaining mobile menu routes derive from it. Keep this registry authoritative rather than duplicating route lists.

| Group | Shipped entries |
| --- | --- |
| Overview | Dashboard; Your priorities |
| Research & strategy | Company reports; GTM strategy |
| Execution | New experiment; Approvals; Fo Assistant |
| Workspace | Settings |

Desktop rows use 18px Lucide icons, compact text, inset hover, and a soft sage active surface with semibold text and `aria-current="page"`. Quiet uppercase group labels separate navigation sections. Collapsed links retain accessible names and titles. Mobile derives its routes from the same registry and retains its existing menu, theme, and account controls.

**The Shared Registry Rule.** Derive workspace navigation surfaces from the shell registry and reuse the shared UI exports; preserve route permissions, authentication, guided reading, and API behavior when extending the visual system.

## Do's and Don'ts

### Do:
- **Do** use the existing semantic CSS variables and their theme mappings.
- **Do** reuse shared UI primitives and the canonical shell navigation registry.
- **Do** retain Pursuit identity, real content, explicit demo labels, keyboard behavior, and guided reading.
- **Do** preserve mobile safe areas, local table scrolling, and both light and dark modes.

### Don't:
- **Don't** apply the root marketing document's cream-and-serif identity to this redesigned workspace.
- **Don't** infer an exact reference typeface from the raster; Inter is the shipped choice.
- **Don't** restore decorative glass, orb, or glow treatments to flat workspace content panels.
- **Don't** change backend contracts or authentication to implement a visual extension.

Not canonized or repaired: PageHeader retains an optional eyebrow API; it is not a rule for future surfaces to inherit. The review removed the mobile create action's legacy teal shadow and uses the dark primary-ink icon foreground; dark control boundaries now use the stronger dark-hairline-strong value. Supplied captures precede the responsive phone list, independent desktop left stack, and these contrast fixes, and also show rounded outer chrome where current shell source explicitly requests square chrome. Current source wins; this documentation does not claim the older captures verify those later details. No source defects are repaired because this pass owns documentation only.
