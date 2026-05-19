# Obsidian Copy

Self-use Obsidian plugin that adds copy buttons for inline code and fenced code blocks.

## Features

- Reading View: copy buttons for inline code and fenced code blocks.
- Live Preview: copy buttons for inline code and fenced code blocks.
- Inline code copies the inner text only, without backtick markers.
- Fenced code blocks copy the body only, without fences or language tags.
- Inner whitespace and newlines are preserved.
- No extra trailing newline is added.

## Supported Markdown

Supported:

- Inline code: `` `value` ``
- Backtick fenced blocks: ` ```js ... ``` `
- Tilde fenced blocks: ` ~~~ ... ~~~ `

Out of scope:

- Indented code blocks
- Code embedded in non-Markdown custom renderers

## Development

Install dependencies:

```bash
npm install
```

Run checks:

```bash
npm run typecheck
npm test
```

Build the plugin bundle:

```bash
npm run build
```

Watch during development:

```bash
npm run dev
```

## Local Installation

Build first, then place these files in your vault plugin directory:

```text
.obsidian/plugins/obsidian-copy/
  manifest.json
  main.js
  styles.css
```

For the current local vault used during development:

```bash
npm run build
cp main.js /Users/sunven/github/codelife/content/.obsidian/plugins/obsidian-copy/main.js
cp manifest.json /Users/sunven/github/codelife/content/.obsidian/plugins/obsidian-copy/manifest.json
cp styles.css /Users/sunven/github/codelife/content/.obsidian/plugins/obsidian-copy/styles.css
```

Reload the plugin or restart Obsidian after replacing `main.js`.

## Notes

Live Preview uses CodeMirror decorations. Inline and block copy buttons share the same copy contract, but block widgets must be provided through a `StateField` because CodeMirror does not allow block decorations from `ViewPlugin` decoration callbacks.
