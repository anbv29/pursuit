# Mobile layout verification, 2026-10-24

## Changes

- Four equal-width bottom navigation targets with compact labels and active states.
- More opens a native-dialog bottom sheet instead of a dropdown below the viewport.
- Sheet links close it after navigation; Escape dismisses it.
- Safe-area viewport configuration and dock/content spacing.
- Larger phone header controls and workspace switcher; compact reading controls.
- Minimum 16px form text and 44px touch controls on small screens.
- Toast placement above the dock; long report text wraps instead of expanding the page.
- Responsive homepage tab grids for narrow screens.

## Executed verification

Playwright CLI checks used a temporary local Next.js frontend and synthetic mocked API
responses. No production reports, accounts or Fo actions were changed.

- Workspace report form and First Look navigation passed at 320, 375, 390, 430,
  768 and 1280 pixels, with zero document-level horizontal overflow.
- Phone dock targets were at least 44 by 44 pixels; all four remained in the viewport.
- The More sheet stayed within the viewport and closed on link navigation.
- Dark phone controls, 16px input sizing and Escape dismissal passed.
- Homepage widths 320 and 390 pixels had zero horizontal overflow after styles settled.
- Final TypeScript and focused ESLint checks passed; whitespace checks passed.

Initial checks exposed narrow homepage tab overflow, which was fixed. Another check
measured the sheet mid-transition; final checks wait for animations to settle.
The Next.js development indicator was hidden only in verification screenshots.

Screenshots are stored locally under .local/mobile-fixed-*.png,
.local/mobile-more-sheet.png, .local/mobile-dark-390.png and .local/mobile-home-390.png.
Browser emulation cannot confirm real-device keyboard, sticky-hover or home-indicator
behaviour. Verify those on Safari/iOS and Android before calling hardware QA complete.
This change is local and has not been pushed or deployed.
