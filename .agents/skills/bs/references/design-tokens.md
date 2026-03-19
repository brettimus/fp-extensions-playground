# Design Tokens

Full CSS variable palette, font imports, spacing scale, and surface depth tiers.

## Font imports

Always include these Google Fonts imports in the `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Spline+Sans+Mono:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

### Font stacks

```css
--font-display: "Instrument Serif", Georgia, "Times New Roman", serif;
--font-body: "Spline Sans Mono", "SF Mono", "Cascadia Code", monospace;
--font-code: "JetBrains Mono", "Fira Code", "Cascadia Code", monospace;
```

### Usage

| Element | Font | Weight | Size |
|---------|------|--------|------|
| h1 | `--font-display` | 400 (regular) | 2.5rem |
| h2 | `--font-display` | 400 | 1.75rem |
| h3 | `--font-display` | 400 (italic) | 1.25rem |
| Body text | `--font-body` | 400 | 0.9375rem (15px) |
| UI labels, nav | `--font-body` | 500 | 0.8125rem (13px) |
| Code blocks | `--font-code` | 400 | 0.875rem (14px) |
| Inline code | `--font-code` | 400 | 0.85em |
| Status badges | `--font-body` | 600 | 0.75rem (12px) |

## Color palette

### Neutrals (OKLch scale)

```css
--neutral-50:  oklch(0.985 0 0);          /* near-white */
--neutral-100: oklch(0.97  0.001 106.4);  /* light gray */
--neutral-200: oklch(0.922 0.004 106.4);
--neutral-300: oklch(0.869 0.005 106.4);
--neutral-400: oklch(0.708 0.01  106.4);  /* mid gray — secondary text (dark) */
--neutral-500: oklch(0.556 0.013 106.4);  /* muted text */
--neutral-600: oklch(0.442 0.014 106.4);  /* secondary text (light) */
--neutral-700: oklch(0.355 0.014 106.4);
--neutral-800: oklch(0.269 0.01  106.4);  /* surface-2 (dark) */
--neutral-900: oklch(0.205 0.008 106.4);  /* surface-1 (dark) */
--neutral-950: oklch(0.145 0.005 106.4);  /* surface-0 / page bg (dark) */
```

### Primary (electric blue)

```css
--primary:        oklch(0.565 0.239 263.9);  /* core blue */
--primary-light:  oklch(0.685 0.169 263.9);  /* hover, lighter contexts */
--primary-subtle: oklch(0.265 0.08  263.9);  /* backgrounds, badges */
```

### Accent (electric orange)

```css
--accent:        #fe7100;                     /* core orange — highlights, borders, badges */
--accent-light:  #ff8c33;                     /* hover state */
--accent-subtle: oklch(0.285 0.08 55);        /* backgrounds */
```

### Status colors

```css
--success: oklch(0.723 0.191 142.9);  /* green — complete, valid */
--warning: oklch(0.768 0.165 78.5);   /* amber — in-progress, caution */
--danger:  oklch(0.637 0.237 25.3);   /* red — error, blocked */
```

### Semantic surface tokens (dark theme — default)

```css
--surface-0:     var(--neutral-950);           /* page background */
--surface-1:     var(--neutral-900);           /* cards, panels */
--surface-2:     var(--neutral-800);           /* table headers, elevated elements */
--border:        rgba(255, 255, 255, 0.08);   /* subtle borders */
--border-strong: rgba(255, 255, 255, 0.15);   /* visible borders */
--text-primary:  var(--neutral-100);           /* headings, primary text */
--text-secondary: var(--neutral-400);          /* descriptions, secondary */
--text-muted:    var(--neutral-500);           /* timestamps, labels */
--shadow:        0 1px 3px rgba(0, 0, 0, 0.3); /* elevation shadow */
--shadow-lg:     0 8px 24px rgba(0, 0, 0, 0.4); /* modals, popovers */
--hover-row:     rgba(255, 255, 255, 0.02);    /* table row hover */
--surface-recessed: oklch(0.12 0.004 106.4);   /* reference sections */

/* Semantic color overrides — repeated here so dark-mode toggle
   overrides mirror the light-mode block below */
--primary-subtle: oklch(0.265 0.08  263.9);
--primary-light:  oklch(0.685 0.169 263.9);
--accent-subtle:  oklch(0.285 0.08 55);
--success: oklch(0.723 0.191 142.9);
--warning: oklch(0.768 0.165 78.5);
--danger:  oklch(0.637 0.237 25.3);

/* Badge backgrounds — muted tints of the status/primary hues */
--badge-bg-info:    var(--primary-subtle);                /* blue tint */
--badge-bg-success: oklch(0.267 0.085 141.7);             /* green tint */
--badge-bg-warning: oklch(0.267 0.07 78.5);               /* amber tint */
--badge-bg-danger:  oklch(0.25 0.08 25.3);                /* red tint */
```

### Light theme override

Include **both** selectors — the media query handles system preference, `[data-theme="light"]` handles the hosting page's manual toggle:

```css
@media (prefers-color-scheme: light) {
  :root:not([data-theme]) {
    --surface-0:      var(--neutral-50);
    --surface-1:      var(--neutral-100);
    --surface-2:      var(--neutral-200);
    --border:         rgba(0, 0, 0, 0.08);
    --border-strong:  rgba(0, 0, 0, 0.15);
    --text-primary:   var(--neutral-900);
    --text-secondary: var(--neutral-600);
    --text-muted:     var(--neutral-500);
    --shadow:         0 1px 3px rgba(0, 0, 0, 0.08);
    --shadow-lg:      0 8px 24px rgba(0, 0, 0, 0.12);
    --hover-row:      rgba(0, 0, 0, 0.02);
    --surface-recessed: var(--neutral-100);
    --primary-subtle: oklch(0.92 0.04 263.9);
    --primary-light:  oklch(0.45 0.2 263.9);
    --accent-subtle:  oklch(0.92 0.05 55);
    --badge-bg-info:    var(--primary-subtle);
    --badge-bg-success: oklch(0.92 0.06 142.9);
    --badge-bg-warning: oklch(0.92 0.05 78.5);
    --badge-bg-danger:  oklch(0.92 0.06 25.3);
    --success: oklch(0.45 0.15 142.9);
    --warning: oklch(0.45 0.13 78.5);
    --danger:  oklch(0.45 0.18 25.3);
  }
}

[data-theme="light"] {
  --surface-0:      var(--neutral-50);
  --surface-1:      var(--neutral-100);
  --surface-2:      var(--neutral-200);
  --border:         rgba(0, 0, 0, 0.08);
  --border-strong:  rgba(0, 0, 0, 0.15);
  --text-primary:   var(--neutral-900);
  --text-secondary: var(--neutral-600);
  --text-muted:     var(--neutral-500);
  --shadow:         0 1px 3px rgba(0, 0, 0, 0.08);
  --shadow-lg:      0 8px 24px rgba(0, 0, 0, 0.12);
  --hover-row:      rgba(0, 0, 0, 0.02);
  --surface-recessed: var(--neutral-100);
  --primary-subtle: oklch(0.92 0.04 263.9);
  --primary-light:  oklch(0.45 0.2 263.9);
  --accent-subtle:  oklch(0.92 0.05 55);
  --badge-bg-info:    var(--primary-subtle);
  --badge-bg-success: oklch(0.92 0.06 142.9);
  --badge-bg-warning: oklch(0.92 0.05 78.5);
  --badge-bg-danger:  oklch(0.92 0.06 25.3);
  --success: oklch(0.45 0.15 142.9);
  --warning: oklch(0.45 0.13 78.5);
  --danger:  oklch(0.45 0.18 25.3);
}
```

## Spacing scale

Optional convenience tokens. If you use these, define them in `:root` alongside the color palette. Otherwise, hardcoded `rem` values following the same scale are fine.

Based on a 4px grid:

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 0.25rem (4px) | Tight gaps, inline spacing |
| `--space-2` | 0.5rem (8px) | Small gaps between related items |
| `--space-3` | 0.75rem (12px) | List items, compact padding |
| `--space-4` | 1rem (16px) | Default paragraph spacing |
| `--space-6` | 1.5rem (24px) | Card padding, subsection gaps |
| `--space-8` | 2rem (32px) | Section padding, body padding |
| `--space-12` | 3rem (48px) | Major section gaps |
| `--space-16` | 4rem (64px) | Hero padding, page top margin |

### Layout constraints

```css
--max-width: 940px;    /* main content width */
--content-padding: 2rem;
```

## Surface depth tiers

Three visual tiers for creating depth hierarchy:

### Hero (elevated)

Prominent sections like the plan header. Slightly lighter background with subtle shadow.

```css
.hero {
  background: var(--surface-1);
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  padding: 3rem 2rem;
  box-shadow: var(--shadow);
}
```

### Body (flat)

Standard content sections. No elevation, base background.

```css
.section {
  background: var(--surface-0);
  padding: 2rem 0;
}
```

### Reference (recessed)

Supporting info, footnotes, metadata. Darker background, inset feel.

```css
.reference {
  background: var(--surface-recessed);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 1.5rem;
}
```

## Common component styles

### Cards

```css
.card {
  background: var(--surface-1);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 1.5rem;
}
.card:hover {
  border-color: var(--border-strong);
}
```

### Code blocks

```css
pre {
  background: var(--surface-1);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 1rem;
  overflow-x: auto;
  font-family: var(--font-code);
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--text-primary);
}
code {
  font-family: var(--font-code);
  font-size: 0.85em;
  background: var(--surface-1);
  padding: 0.125rem 0.375rem;
  border-radius: 3px;
}
```

### Tables

```css
table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-body);
  font-size: 0.875rem;
}
th {
  background: var(--surface-2);
  font-weight: 600;
  text-align: left;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-strong);
  color: var(--text-primary);
}
td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border);
  color: var(--text-secondary);
}
tr:hover td {
  background: var(--hover-row);
}
```

### Status badges

```css
.badge {
  display: inline-block;
  font-family: var(--font-body);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}
.badge--success { background: var(--badge-bg-success); color: var(--success); }
.badge--warning { background: var(--badge-bg-warning); color: var(--warning); }
.badge--danger  { background: var(--badge-bg-danger);  color: var(--danger); }
.badge--info    { background: var(--badge-bg-info);    color: var(--primary-light); }
```

### File trees

```css
.file-tree {
  font-family: var(--font-body);
  font-size: 0.875rem;
  line-height: 1.7;
  color: var(--text-secondary);
  background: var(--surface-1);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 1rem 1.25rem;
}
.file-tree .dir { color: var(--primary-light); }
.file-tree .file { color: var(--text-primary); }
.file-tree .new { color: var(--accent); }
.file-tree .comment { color: var(--text-muted); font-style: italic; }
```
