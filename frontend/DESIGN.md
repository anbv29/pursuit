---
name: Pursuit Research Studio
description: Monochrome evidence research with editorial structure and tactile controls.
colors:
  primary: "#171717"
  canvas: "#fafafa"
  panel: "#ffffff"
  text-secondary: "#444444"
  text-muted: "#616161"
  hairline: "#d7d7d7"
  dark-canvas: "#111111"
  dark-panel: "#1c1c1c"
  dark-text: "#f5f5f5"
  dark-muted: "#aaaaaa"
  dark-hairline: "#383838"
typography:
  display:
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: "clamp(40px, 5.7vw, 72px)"
    fontWeight: 600
    lineHeight: 0.98
    letterSpacing: "-0.04em"
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "15px"
    fontWeight: 400
rounded:
  control: "8px"
  panel: "12px"
spacing:
  compact: "8px"
  group: "16px"
  section: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.panel}"
    rounded: "{rounded.control}"
---
# Pursuit research studio

Pursuit uses a monochrome research studio identity. Bauhaus composition supplies the grid and type hierarchy, restrained brutalist structure makes actions and boundaries explicit, and paper surfaces keep evidence readable. Tactile controls provide a small skeuomorphic influence. These are one system, not separate themes.

## Overview

Marketing earns attention through a bold typographic proposition and an inspectable report artifact. The workspace prioritizes action and scanability. Reports prioritize reading and source receipts. Authentication and onboarding stay compact and predictable.

## Colors

All authored colors are black, white or neutral gray. Light canvas is #fafafa, panels are #ffffff, primary text is #171717, secondary text is #444444 and muted text is #616161. Hairlines are #d7d7d7. Primary actions are dark with white text.

Dark canvas is #111111, panels are #1c1c1c, primary text is #f5f5f5, secondary text is #c7c7c7 and muted text is #aaaaaa. Hairlines are #383838. Primary actions are pale with dark text.

The desktop navigation rail remains #171717 in both themes. Its active item is pale with dark text. Status meaning always has text or an icon and never relies on a hue.

## Typography

Space Grotesk is the self hosted display face. Inter is the reading and interface face. JetBrains Mono is reserved for code, source identifiers and measurements. Marketing headings use a larger scale than workspace headings. Heading tracking never goes below minus 0.04em. Body copy has comfortable line height and a bounded reading measure.

## Layout

Shared panel radii are 12px, compact panels 8px and controls 6px to 8px. Avoid pill shaped large containers. Use fine borders to separate task regions. Paper depth belongs to report previews, not every card. Explicit page utilities override shared component defaults.

Page headers separate title and description from grouped actions with a bottom rule. Forms group related fields, show useful hints, and keep advanced context optional. Labels stay above inputs. Long titles, source URLs and button labels wrap without moving controls outside the viewport.

## Components

Existing routes, permissions, requests, validation and research workflows remain intact. Hover and press responses are short and restrained. Focus rings remain visible in both themes. Reduced motion disables decorative movement. Mobile controls preserve touch target size and safe area spacing.

## Do's and Don'ts

Verify public pages, auth, account, onboarding, workspace, report generation, report reading, sharing, watches, experiments, settings and supporting states at phone, tablet and desktop sizes. Check geometry, keyboard operation, monochrome colors and both themes. Backend files are outside this redesign.
