---
name: bs
description: Generate rich visual plans with diagrams and structured layouts, then publish to a shareable URL. Triggers on "brainstorm", "bs", or "create a plan".
---

# bs — brainstorm

# Purpose
Generate self-contained plans that are visually rich, structurally clear, and publishable to a shareable URL.

# Authentication

Before publishing, read the user's fp token so plans are associated to their account:

```bash
FP_TOKEN=$(grep -m1 'token' ~/.fiberplane/credentials.toml 2>/dev/null | sed 's/.*= *"\(.*\)"/\1/')
```

- If `FP_TOKEN` is non-empty, include `-H "Authorization: Bearer $FP_TOKEN"` on all publish/update/delete requests.
- If the file is missing or the token is empty, fall back to anonymous publishing (plans expire after 3 days).
- Authenticated plans are permanent, editable, and visible in the user's console at app.fp.dev.

# Guidelines
- Use Mermaid diagrams for architecture, flows, and sequences. **Read `references/mermaid-guide.md` before writing any mermaid markup** — it covers syntax pitfalls that cause parse failures.
- Use structured layouts (cards, tables, file trees) for information density.
- Always include a "Publish" step to generate a shareable URL.
- Ensure the plan is self-contained (all CSS/JS inlined).
- Follow the design language: Instrument Serif headers, Spline Sans Mono body, and electric orange accents.
- Be concise and focus on visual structure over large blocks of text.

# Theme support (critical)
Plans are rendered inside a sandboxed iframe. The hosting page toggles themes by setting `data-theme="light"` or `data-theme="dark"` on the iframe's `<html>` element via postMessage. The `@media (prefers-color-scheme)` query alone is NOT sufficient — it cannot be overridden from JavaScript.

**Every plan MUST include both:**
1. `@media (prefers-color-scheme: light) { :root:not([data-theme]) { ... } }` — for system preference
2. `[data-theme="light"] { ... }` — for manual toggle from the hosting page

Both blocks must override the **complete** set of tokens: surfaces, borders, text, shadows, badge backgrounds, and status colors. See `references/design-tokens.md` for the exact values. If either block is missing, the plan will appear dark-mode-only when the user toggles themes.

Never hardcode dark-mode colors directly — always use CSS custom properties so both themes work.
