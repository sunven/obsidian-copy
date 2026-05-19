import { markdown } from "@codemirror/lang-markdown";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { collectCopyTargets, createLivePreviewExtension } from "../src/live-preview";

function createMarkdownState(doc: string): EditorState {
  return EditorState.create({
    doc,
    extensions: [markdown()],
  });
}

describe("collectCopyTargets", () => {
  it("collects inline and fenced code copy targets from markdown syntax tree", () => {
    const doc = "Use `abc` here.\n\n```ts\nconsole.log(1)\n```";
    const state = createMarkdownState(doc);

    expect(collectCopyTargets(state, [{ from: 0, to: state.doc.length }])).toEqual([
      {
        kind: "inline",
        from: 4,
        to: 9,
        text: "abc",
      },
      {
        kind: "block",
        from: 17,
        to: 41,
        text: "console.log(1)",
      },
    ]);
  });

  it("deduplicates targets from overlapping visible ranges", () => {
    const doc = "`a` and `b`";
    const state = createMarkdownState(doc);

    expect(
      collectCopyTargets(state, [
        { from: 0, to: 7 },
        { from: 0, to: state.doc.length },
      ])
    ).toEqual([
      {
        kind: "inline",
        from: 0,
        to: 3,
        text: "a",
      },
      {
        kind: "inline",
        from: 8,
        to: 11,
        text: "b",
      },
    ]);
  });

  it("respects visible ranges", () => {
    const doc = "`a`\n\n`b`";
    const state = createMarkdownState(doc);

    expect(collectCopyTargets(state, [{ from: 0, to: 3 }])).toEqual([
      {
        kind: "inline",
        from: 0,
        to: 3,
        text: "a",
      },
    ]);
  });

  it("falls back to source scanning when no markdown syntax tree is available", () => {
    const doc = "Use `abc` here.\n\n```js\nconst value = `not inline`;\n```";
    const state = EditorState.create({ doc });

    expect(collectCopyTargets(state, [{ from: 0, to: state.doc.length }])).toEqual([
      {
        kind: "inline",
        from: 4,
        to: 9,
        text: "abc",
      },
      {
        kind: "block",
        from: 17,
        to: 54,
        text: "const value = `not inline`;",
      },
    ]);
  });
});

describe("createLivePreviewExtension", () => {
  let writeText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText,
      },
    });
  });

  it("renders an inline copy widget that copies inline code text", async () => {
    const parent = document.createElement("div");
    document.body.appendChild(parent);

    const view = new EditorView({
      parent,
      state: EditorState.create({
        doc: "Use `abc` here.",
        extensions: [markdown(), createLivePreviewExtension()],
      }),
    });

    try {
      const button = parent.querySelector<HTMLButtonElement>(".obsidian-copy-editor-inline-button");

      expect(button).toBeInstanceOf(HTMLButtonElement);
      expect(button?.getAttribute("data-copy-kind")).toBe("inline");

      button?.click();

      await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith("abc"));
    } finally {
      view.destroy();
      parent.remove();
    }
  });

  it("renders a fenced code block copy widget without breaking editor creation", async () => {
    const parent = document.createElement("div");
    document.body.appendChild(parent);

    const view = new EditorView({
      parent,
      state: EditorState.create({
        doc: "```js\nabc\n```",
        extensions: [markdown(), createLivePreviewExtension()],
      }),
    });

    try {
      const button = parent.querySelector<HTMLButtonElement>(".obsidian-copy-editor-block-button");

      expect(button).toBeInstanceOf(HTMLButtonElement);
      expect(button?.getAttribute("data-copy-kind")).toBe("block");

      button?.click();

      await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith("abc"));
    } finally {
      view.destroy();
      parent.remove();
    }
  });

  it("keeps Live Preview inline copy widgets discoverable by default", () => {
    const styles = readFileSync(join(process.cwd(), "styles.css"), "utf8");
    const styleEl = document.createElement("style");
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);

    const wrapper = document.createElement("span");
    wrapper.className = "obsidian-copy-editor-inline-widget";
    const button = document.createElement("button");
    button.className = "obsidian-copy-editor-inline-button";
    wrapper.appendChild(button);
    document.body.appendChild(wrapper);

    try {
      const computed = getComputedStyle(button);

      expect(computed.opacity).toBe("0.55");
      expect(computed.position).toBe("static");
      expect(computed.transform).toBe("none");
    } finally {
      wrapper.remove();
      styleEl.remove();
    }
  });
});
