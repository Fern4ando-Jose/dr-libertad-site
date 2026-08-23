---
target: home (drlibertad.com)
total_score: 23
max_score: 32
na_heuristics: 7,10
p0_count: 1
p1_count: 2
timestamp: 2026-08-23T11-20-37Z
slug: src-app-lang-page-tsx
---
# Critique — Home (drlibertad.com) — 2026-08-23

Method: dual-agent (A: design review · B: detector+contrast) + technical audit. Live production home inspected.

## Design Health Score: 23/32 (Good, 72%) — heuristics 7 & 10 n/a (landing page)

## Design Specificity Verdict
Copy is unmistakably Dr. Libertad and genuinely strong; the layout underneath is the default 2024-26 dark-luxury editorial template (glass cards, eyebrow+serif title+gradient hairline every section, marquee, radial meshes, floating deck, grain). Provocation lives 100% in text, 0% in form. Category-interchangeable shell.

## Priority Issues
- [P0] A11y: placeholder contrast 3.05:1 fails AA; editorial modal has no Escape / no focus trap; marquee/deck/scroll-dot/ping ignore prefers-reduced-motion. Also muted-red small text 3.92 and CTA offwhite-on-red 4.41 under 4.5. -> harden
- [P1] Design category-interchangeable; doesn't embody the confrontational brand. muted-red used timidly. -> bolder
- [P1] AI-slop scaffolding: eyebrow + 01/02/03 + hairline on every section (5 SectionHeading eyebrows + 18 uppercase labels total; 3 padStart number markers); identical card grids cause orientation failure. -> distill / typeset
- [P2] Hero asks too much reading before payoff; two equal-weight CTAs; dense 4-sentence lead on mobile IG arrival. -> clarify
- [P2] Weak ending; book pre-sale offer + social proof exist in dictionaries but never surface in main scroll. -> craft / delight

## Detector: 4 warnings, all in OTHER-route components, none on home (side-tab quiz, layout-transition dopamina/survey, broken-image book3d).

## Personas
Jordan: paragraph wall + two low-commitment equal CTAs, no offer. Riley: Esc dead on modal, focus not trapped, outline-none input, reduced-motion ignored. Casey: floating deck hidden on mobile, backdrop-blur+grain+Lenis GPU tax.

## Strengths
Bilingual market-regenerated copy with italic muted-red typographic signature; HeroFloatingDeck considered engineering; EditorialGrid is the one brand-integrated section and the model for the rest.
