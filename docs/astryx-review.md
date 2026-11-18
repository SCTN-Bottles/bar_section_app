# Astryx UI review — 2026-11-17

Scope: the uncommitted Astryx visual changes on `theme-neutral-testing`, reviewed against the generated root `AGENTS.md`. Existing routes and reservation behavior take priority over replacing native controls merely to silence diagnostics.

## Corrections

- Replaced raw `div`/`span` layout and text in the edited screens with Astryx `HStack`, `VStack`, `Grid`, and `Text`. Converted remaining headings to `Heading`, preserving their document levels. Calendar columns and layout gaps use component props.
- Removed status uses of `Badge`; badges are reserved for counts.
- Moved palette overrides out of global selectors into `themes/sctn/sctn.theme.ts`. This extends the editor-generated settings, which extend the installed Neutral theme. Dark mode, Figtree, the gold accent, gradients, and application design values now come from the theme. Primary button styling uses theme component overrides.
- Added the official Tailwind token bridge. Replaced arbitrary layout classes with token-backed equivalents. The custom topographic SVG remains artwork as requested.
- Registered the theme with `npx astryx theme add sctn`. The CLI owns the generated `src/astryx-themes.js` module and `src/themes/sctn/` copy. Edit the source in `themes/sctn/`, then run `npx astryx experimental theme compile themes/sctn/sctn.theme.ts`.
- Established the CSS cascade layers before importing the theme module. Visual verification caught and corrected a load-order issue that allowed Tailwind's reset to remove Astryx spacing.

Native forms, inputs, labels, tables, definition lists, semantic page regions, and the interactive section-map SVG remain where their HTML behavior matters. Application CSS still provides token-backed styling for these controls, responsive layout, and the custom artwork. Handlers, validation, state, navigation destinations, payment calculations, and database logic were not changed by this review.

## Validation and limits

- Production build and TypeScript check pass.
- Source ESLint passes with one existing image-optimization warning in `SectionDetails`.
- Six existing Node regression suites pass: additional bands and step navigation, booking history, moderation, payment email, reservation/payment confirmation, and vendor bookings.
- `npx astryx doctor --built bar_app` exits successfully with **19 passes, 4 warnings, and no failures**. Its source-purity warning still reports 638 findings, including native HTML and `className` usage. A successful doctor run is not a claim of zero warnings or complete component-only markup.
- Doctor cannot prove Figtree loading from the Fontsource imports. Browser verification confirmed the actual computed Figtree family and `document.fonts.check('600 16px Figtree') === true`.
- Doctor also flags the Windows npm command shim. The commands executed here resolve the installed Astryx CLI 0.7.16 successfully; no machine-wide PATH changes were made.
- `editor show sctn --png` fails with an unknown `.css` extension error in Astryx's renderer. Used its supported in-app preview fallback, inspected the rendered theme and login page, then removed the temporary preview route. Final login rendering was checked again after theme compilation.
- Full authenticated dashboard and live booking browser flows were not verified: the local server's backend requests were blocked by network permissions. Regression tests exercise the existing behavior without live transactions.
