---
name: Pursuit Frontend
description: Flat neutral workspace surfaces, compact Inter typography, and purposeful orange actions.
colors:
  bg: "#f6f7f8"
  surface-solid: "#ffffff"
  surface-sunken: "#f8f9fa"
  ink: "#18191b"
  ink-soft: "#50535a"
  muted: "#666970"
  hairline: "#e8e9ec"
  hairline-strong: "#858991"
  accent: "#ff6b00"
  accent-strong: "#b74700"
  accent-soft: "#fff1e7"
  accent-ink: "#ffffff"
  primary-ink: "#291300"
  inset: "rgba(12, 42, 43, 0.07)"
  success: "#15803d"
  success-soft: "#dcf3e4"
  warning: "#b45309"
  warning-soft: "#fbeeda"
  danger: "#be123c"
  danger-soft: "#fbe4ea"
  demo: "#6d3fb8"
  demo-soft: "#ece2fb"
  d-continue: "#15803d"
  d-iterate: "#b45309"
  d-pivot: "#6b4fc4"
  d-stop: "#be123c"
  d-inconclusive: "#475569"
  dark-bg: "#101214"
  dark-surface-solid: "#17191c"
  dark-surface-sunken: "#1d2024"
  dark-ink: "#eceae4"
  dark-ink-soft: "#c7cbce"
  dark-muted: "#9ba1a6"
  dark-hairline: "#262a2f"
  dark-hairline-strong: "#737881"
  dark-accent: "#ff9a52"
  dark-accent-strong: "#ff9a52"
  dark-accent-soft: "#382416"
  dark-accent-ink: "#291300"
  dark-inset: "rgba(0, 0, 0, 0.28)"
  dark-success: "#4ade80"
  dark-success-soft: "#0e3320"
  dark-warning: "#e8a44d"
  dark-warning-soft: "#341f0c"
  dark-danger: "#f17c93"
  dark-danger-soft: "#3b0f1b"
  dark-demo: "#bdb4cf"
  dark-demo-soft: "#2a1d45"
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
    lineHeight: 1.55
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
  lg: "16px"
  xl: "20px"
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
    rounded: "{rounded.pill}"
    height: "40px"
    padding: "0 16px"
  button-primary-dark:
    backgroundColor: "{colors.dark-accent-strong}"
    textColor: "{colors.dark-accent-ink}"
    rounded: "{rounded.pill}"
  button-secondary:
    backgroundColor: "{colors.surface-solid}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
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
    backgroundColor: "{colors.inset}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    height: "40px"
    padding: "8px 12px"
---

# Design System: Pursuit Frontend

## Overview

**Creative North Star: "The Pursuit Workspace"**

Pursuit's finished frontend uses a neutral gray canvas, white panels, compact sans typography, quiet borders, and orange actions. The interface supports scanning research, experiments, evidence, and decisions. Dark mode retains the same hierarchy through charcoal surfaces and lighter orange accents.

This app-local record describes the shipped redesign. It does not replace the user-owned root `../DESIGN.md`, whose marketing identity differs from this frontend. Product context comes from `PRODUCT.md`, the working direction in `../.local/workspace-ui.todo.md`, and the evidence contract in `../.local/ui-direction-contract.md`. Authentication, API behavior, permissions, stored content, guided reading, keyboard interactions, and backend behavior remain existing product constraints; this documentation introduces no backend changes.

The visual reference is the [AI-Powered LinkedIn Automation Dashboard](https://dribbble.com/shots/27836982-AI-Powered-LinkedIn-Automation-Dashboard), inspected through the supplied original raster at `C:/Users/anubh/Downloads/5bd8a8aac6fd923d1555d94984ca8ade.png`. Its exact font is unknown. Inter is the chosen visual match, not an identification of the reference font. The build preserves Pursuit's content and ascending-step SVG identity rather than adopting the reference's outreach product.

Evidence: `src/app/globals.css`, `src/app/layout.tsx`, `src/app/w/[ws]/page.tsx`, `src/components/{shell,mobile-navigation,reading-mode,brand}.tsx`, shared `src/components/ui/styles.ts`, and shared `src/components/ui/{core,surface,form,data}.tsx`. Visual evidence: `../.local/ui-desktop-light.png`, `ui-desktop-dark.png`, `ui-mobile-light.png`, and `ui-mobile-dark.png`. Screenshots corroborate the visual direction; current source owns exact values where capture and code differ.

**Key Characteristics:**
- Flat opaque panels on a neutral canvas.
- Inter across headings, navigation, and body copy.
- Orange actions with separate readable foreground and fill roles.
- Grouped navigation and reusable shared UI across light, dark, and mobile surfaces.

## Colors

### Primary

The vivid `accent` marks the logo, small highlights, progress, and mobile create action. `accent-strong` supplies standard primary button fills, links through the legacy `trail` alias, and focus outlines. `accent-soft` supports icon tiles and selected mobile navigation; these are deliberately different roles rather than one orange applied everywhere. `accent-ink` pairs with primary fills; `primary-ink` colors the logo details. See frontmatter for exact source values.

### Neutral

`bg` is the page canvas; `surface-solid` is the opaque panel and chrome surface; `surface-sunken` distinguishes table headers and segmented-control tracks. `ink`, `ink-soft`, and `muted` express text hierarchy. `hairline` separates panels and rows; `hairline-strong` delineates fields. `inset` supplies hover and selected-sidebar fills. CSS aliases `paper`, `surface`, `sunken`, `line`, `line-strong`, and `ink-2`/`ink-3` preserve existing callers.

Dark-prefixed documentation tokens record the values applied to the corresponding unprefixed CSS variables in dark mode; they are not new runtime variable names. The OS preference supplies the default unless a saved `pursuit.theme` light/dark choice sets `data-theme` before paint. Decision fills remain the same in both themes; success, warning, danger, and demo surface/text pairs change with theme. Semantic status colors are functional exceptions to the neutral-and-orange brand palette, not additional brand accents.

**The Orange Roles Rule.** Use the existing distinction between accent highlights, strong action fills, soft backgrounds, and their paired foregrounds.

## Typography

**Display and Body Font:** Inter, loaded through `next/font/google` into `--font-interface`, with system-ui and sans-serif fallbacks. `--font-reading` and `--font-editorial` resolve to that same interface family. **Code Font:** JetBrains Mono, loaded into `--font-code` and exposed through the mono stack with platform monospace fallbacks.

The hierarchy is compact and consistent: page headings use the frontmatter's fluid headline role; card titles use the title role; the root body uses the body role; dashboard copy commonly uses compact text; metadata uses label text. Semibold headings and numeric summaries establish hierarchy without a separate display typeface. The six `text-*` entries record declared CSS size tokens; they do not replace Tailwind's independently defined utilities. In particular, the shared medium button uses Tailwind `text-sm` (14px), not the custom `--text-sm` (13px).

Shared headers also carry local 24px/28px classes, but the more specific `.app-shell h1` rule sets workspace headings to the recorded fluid size. Card descriptions include 13px and page descriptions 14.5px. Mobile navigation uses 11px semibold labels. Mono is for code and technical fragments, not the workspace's display voice.

The direction contract requires control/icon contrast of at least 3:1 and normal text contrast of at least 4.5:1. These are acceptance constraints, not a claim that this documentation pass measured every rendered color combination.

**The One Sans Rule.** Keep workspace headings, reading copy, and controls on the shipped Inter family; retain mono only for existing technical uses.

## Layout

The desktop shell has a sticky full-height sidebar: expanded width 248px, collapsed width 80px, with the preference stored as `pursuit.sidebar`. At Tailwind `md` (768px), the sidebar appears and replaces mobile navigation. The sticky header is 64px tall on mobile and 76px from `md`. Main content has 16px horizontal gutters on mobile and 32px from `md`, with 20px top spacing.

The shell owns route-specific centered width limits: report creation 42rem; settings, assistant, first look, and priorities 48rem; reports and approvals 56rem; experiment creation 64rem; other workspace pages 72rem. The dashboard's own wider wrapper remains bounded by that shell. At `xl` (1280px), the dashboard adds a 320px right rail beside an independent flexible left stack: experiment table, workflow choices, and company reports. These supporting panels follow the table immediately without waiting for the taller right rail. Below that the stacks follow document order. Summary metrics stay three columns. Phone experiments use a responsive list exposing stage, verdict, and updated time together; the desktop table remains a separate wider presentation with local overflow handling.

Spacing follows the declared four-pixel family, with recurring 20px panel gutters and section gaps. Card headers use 20px horizontal and 16px vertical padding; rows commonly use 20px horizontal and 14px vertical padding. Cards own their padding rather than imposing one universal value.

Below `md`, a fixed five-position bottom bar exposes Home, Reports, New experiment, Approvals, and Menu. The center action is raised, with an accent fill and `primary-ink` SVG foreground; Menu opens the remaining routes and workspace/account controls in a drawer capped at 75dvh. Content reserves `6rem + env(safe-area-inset-bottom)` below; safe-area padding also protects chrome. Fields/selects use 16px text and minimum 44px heights on mobile; press controls also receive the 44px minimum. Mobile tabs' final minimum height is 44px. Reading controls keep Guided/Advanced selection and the native terms disclosure, with the visible select label suppressed at narrow widths but its accessible name retained.

## Elevation & Depth

**The Flat Panels Rule.** Workspace content panels separate through opaque surface tones and one-pixel borders, with no panel shadows or glass blur.

Legacy `Glass` and `glass-dense` APIs now render flat opaque panels. Orbs, sheen, dot fields, and glow fields are hidden. This does not ban all gradients, blur, or shadows: the shipped skeleton has a shimmer gradient; overlay backdrops blur; popovers, mobile navigation, and existing public-page/report treatments retain contextual depth.

The source declares a subtle card shadow (`0 1px 2px rgb(0 0 0 / 3%)`) and popover shadow (`0 18px 50px -12px var(--shadow), 0 4px 12px -6px var(--shadow)`). The standard workspace surface overrides panel depth to none. Mobile navigation uses `0 -8px 24px rgb(0 0 0 / 5%)`. `--shadow` changes from a low-alpha warm neutral in light mode to black at 32% in dark mode.

Interaction motion is restrained: press scales to 0.97, entry rises 6px, and overlays use fade/scale or drawer translation. Declared durations are 120/160/220/320ms; shared buttons separately use 150ms transitions. Reduced-motion preference reduces global animation and transition duration to 0.01ms and disables repeated iterations; do not infer that animation is absent for all users.

## Shapes

Cards use the large radius, legacy Glass uses extra-large and dense Glass medium. Text fields and sidebar links use the recurring field radius. Buttons, selects, tabs, workflow choices, and status chips use pill geometry. Table wrappers use the medium radius. The logo retains its own rounded-square SVG silhouette; SVG/Lucide icons are real assets rather than text glyph substitutes.

## Components

### Buttons

Shared `Button` and `buttonStyles` in `src/components/ui` supply primary, secondary, ghost, and danger treatments. Primary uses the strong orange fill and paired foreground, a transparent one-pixel border, and a 95% brightness hover. Secondary uses the flat surface with border emphasis on hover; ghost uses inset hover; danger uses semantic red text and a soft danger hover surface. Sizes are 32/40/48px tall with 12/16/24px horizontal padding and 13/14/16px type. All are pills; mobile minimum heights override the smaller sizes. Global focus is a two-pixel themed outline with two-pixel offset. The shared press helper provides the active scale.

### Cards / Containers

`Card`, `CardHeader`, `Glass`, `PageHeader`, `Empty`, and `Notice` retain their existing APIs. Cards are opaque bordered containers, with dividers and compact titles. Empty states pair a concise title and explanation with the real next action. Notices use semantic icon/text/background combinations; they do not introduce ornamental brand colors.

### Inputs / Fields

`Field` links labels, hints, and error descriptions. `Input` and `Textarea` use the field radius, strong neutral border, surface fill, and 12px inline padding; `Select` uses pill geometry. Standard inputs/selects are 40px high before mobile overrides. Focus changes the border to strong orange and adds a two-pixel ring using accent at 22% transparency. Invalid fields use the danger border; disabled fields use 60% opacity and a not-allowed cursor. Password reveal, checkbox, and switch controls keep their existing semantics.

### Tabs, Tables, and Status

`Tabs` uses a bordered sunken pill track and a surface-filled selected pill with a one-pixel line ring. Arrow keys, Home, and End move roving focus and selection. Table wrappers contain horizontal scrolling; shared column headers use sunken fill and sticky positioning. Status/demo/verdict chips retain explicit labels and semantic colors so demo data and real outcomes remain distinguishable.

Below `sm` (640px), dashboard experiments render as list rows with 16px padding: title, use case, wrapping stage/verdict/demo chips, and an explicit Updated timestamp. At `sm` and above, a separately rendered table exposes the same experiment data, with a focusable labelled overflow region and a 600px minimum table width. This dashboard table is distinct from the reusable shared table primitive.

### Navigation

The `nav` array in `src/components/shell.tsx` is the canonical workspace registry. Group rendering, command palette entries, mobile primary tabs, and remaining mobile menu routes derive from it. Keep this registry authoritative rather than duplicating route lists.

| Group | Shipped entries |
| --- | --- |
| Overview | Dashboard; Your priorities |
| Research & strategy | Company reports; GTM strategy; Website first look (owner only) |
| Execution | New experiment; Approvals; Fo Assistant |
| Workspace | Settings |

Desktop rows use 18px Lucide icons, compact text, inset hover, and inset/semibold active states, with `aria-current="page"`. Group labels name actual navigation sections. Collapsed links retain accessible names and titles. Mobile derives Dashboard/Reports/Approvals from the registry, relabels the first two as Home/Reports, and places New experiment centrally. Plans and billing and account commands are shell additions outside the workspace route registry. Command search retains Control/Meta+K support and theme/account commands.

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
