# AltWallet — Design Brainstorm

The prompt strictly defines a design system (color tokens, pill buttons, dark UI, card styles, gauge, Geist typography). The three ideas below respect those non-negotiables while differentiating the overall feel.

## Selected Direction: Idea 1 — "Terminal-Grade Minimalism"

Chosen because it maps perfectly to the prompt's spec (Linear/Vercel/Stripe references, #1D9E75 accent, monospace details, pill buttons, dark canvas) and because the provided app.css / JSX scaffolding already expresses this aesthetic. Committing to this direction means every page, every card, every border is pulled from the same quiet, instrument-panel vocabulary.

---

<response>
<text>
**Idea 1 — Terminal-Grade Minimalism**

- **Design Movement**: Operator tooling / post-Linear darkroom aesthetic — the lineage of Linear.app, Vercel, Stripe docs, Bloomberg terminals, and Arc browser.
- **Core Principles**:
  1. Information density over decoration — every pixel earns its place.
  2. Monochrome canvas with a single signal color (#1D9E75) — the accent only appears where action or truth matters (score, CTA, verified state).
  3. Typographic hierarchy does the heavy lifting; borders are 1px, hairlines.
  4. "Instrument" not "marketing" — the homepage itself is a working tool.
- **Color Philosophy**: Near-black #0A0A0A canvas, #111 cards, 1px #1a1a1a hairlines. Teal-green #1D9E75 is the only saturated hue and must feel earned. Risk yellow and red surface only inside flag contexts. Nothing "pops" except meaning.
- **Layout Paradigm**: Left-biased, single-column-with-inset-grids. Hero is not centered-banner — it is a live scan console pinned to an 880px working width, with a 4-column meta strip sitting on a horizontal hairline beneath it. Feature, pricing and chain sections are full-bleed but internally gridded on 20px gutters.
- **Signature Elements**:
  1. Animated half-circle risk gauge with a three-stop gradient stroke (#1D9E75 → #F5A623 → #E5484D).
  2. Monospace "chain chip" pattern — colored dot + 3-letter ticker on every address row, and a subtle Beta pill on XRP/SUI.
  3. Eyebrow labels (10px, 0.14em tracking, uppercase, muted) above every section — the "section HUD."
- **Interaction Philosophy**: Everything feels like a keyboard-first tool. Buttons acknowledge with a 0.98 scale-down. Inputs grow a 3px accent-ghost ring on focus. Cards tilt 8° max on hover. No confetti except on redeem success. The pulse-ring loader is the only element that breathes.
- **Animation**: 200ms fade + 8px slide for route transitions. Staggered result-card reveals (0/200/400/600ms, 20px→0, 500ms ease). Gauge arc animates stroke-dasharray 0 → target over 1200ms with cubic ease-out and a synchronized count-up number. AI summary streams character-by-character. Scroll-triggered intersection reveals on feature/pricing/chain items (opacity 0→1, 20px→0, 600ms, 80ms stagger). Nav border fades in on scroll.
- **Typography System**: Geist Sans as display + body (800 for hero/display, -0.03em tracking; 700 for section H2; 500 for UI labels; 400/1.7 for paragraphs). Geist Mono for every wallet address, score number, timestamp, and kbd hint. No serif. No decorative fonts.
</text>
<probability>0.08</probability>
</response>

<response>
<text>
**Idea 2 — Neo-Industrial Data HUD**

- **Design Movement**: Cyber-industrial / terminal-brutalism inspired by trading desks and mission-control panels.
- **Core Principles**: explicit grid lines everywhere, ticker-tape motion, high-contrast risk zones, exposed coordinates (every card has tiny metadata coords).
- **Color Philosophy**: Same #0A0A0A base but with noise-textured background and visible 8px baseline grid at 3% opacity. Teal remains the only saturated color but co-exists with a second neutral — cold steel #8A8F98 — for labels.
- **Layout Paradigm**: Wide 12-col grid with visible column guides on desktop. Cards are edge-to-edge with divider lines instead of rounded borders.
- **Signature Elements**: ticker bar under nav streaming "ETH · BTC · SOL…" chain tags; angular chip corners (2px radius); micro-barcode motifs at card corners.
- **Interaction**: magnetic hover on buttons, 2px inner glow on inputs.
- **Animation**: mechanical 80ms staccato reveals, data-flicker on numbers.
- **Typography**: Geist Mono used heavily even in headings for a terminal flavor.
</text>
<probability>0.04</probability>
</response>

<response>
<text>
**Idea 3 — Editorial Darkroom**

- **Design Movement**: Swiss editorial meets dark mode — The Browser Company × Stripe Press.
- **Core Principles**: long-form rhythm, large display type treated as a masthead, generous 120px vertical gutters, left-aligned ragged paragraphs.
- **Color Philosophy**: #0A0A0A with warm undertone (#0B0A0A), #1D9E75 pulled slightly toward muted jade for a calmer read.
- **Layout Paradigm**: Narrow 720px editorial column with margin annotations (footnote-style side notes for disclaimers), then occasional full-bleed instrument panels.
- **Signature Elements**: drop-caps on section openers, hairline dividers with small centered glyphs, pull-quotes for disclaimers.
- **Interaction**: very slow 400ms fades, no tilt, prefers scroll-linked reveals.
- **Animation**: subtle parallax on hero, measured and quiet.
- **Typography**: Geist for display + body but with an added editorial serif (e.g., Instrument Serif) for pull quotes.
</text>
<probability>0.02</probability>
</response>
