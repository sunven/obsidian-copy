# Obsidian Copy

Self-use Obsidian plugin that adds copy buttons for inline code.

## Features

- Reading View: copy buttons for inline code.
- Live Preview: copy buttons for inline code.
- Inline code copies the inner text only, without backtick markers.
- Code blocks use Obsidian's built-in copy control.

## Supported Markdown

Supported:

- Inline code: `` `value` ``

Out of scope:

- Fenced and indented code blocks
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

Live Preview uses CodeMirror decorations for inline code only. Fenced code blocks are still detected while scanning source so inline-looking backticks inside a block do not get copy buttons.
