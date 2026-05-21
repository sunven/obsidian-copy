import { markdown } from "@codemirror/lang-markdown";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { collectCopyTargets, createLivePreviewExtension, updateActiveCopyWidget } from "../src/live-preview";

function createMarkdownState(doc: string): EditorState {
  return EditorState.create({
    doc,
    extensions: [markdown()],
  });
}

describe("collectCopyTargets", () => {
  it("collects inline code copy targets from markdown syntax tree", () => {
    const doc = "Use `abc` here.\n\n```ts\nconsole.log(1)\n```";
    const state = createMarkdownState(doc);

    expect(collectCopyTargets(state, [{ from: 0, to: state.doc.length }])).toEqual([
      {
        kind: "inline",
        from: 4,
        to: 9,
        text: "abc",
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

  it("falls back to source scanning without adding fenced code block targets", () => {
    const doc = "Use `abc` here.\n\n```js\nconst value = `not inline`;\n```";
    const state = EditorState.create({ doc });

    expect(collectCopyTargets(state, [{ from: 0, to: state.doc.length }])).toEqual([
      {
        kind: "inline",
        from: 4,
        to: 9,
        text: "abc",
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
      const widget = parent.querySelector<HTMLElement>(".obsidian-copy-editor-inline-widget");

      expect(button).toBeInstanceOf(HTMLButtonElement);
      expect(button?.getAttribute("data-copy-kind")).toBe("inline");
      expect(widget?.dataset.copyFrom).toBe("4");
      expect(widget?.dataset.copyTo).toBe("9");

      button?.click();

      await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith("abc"));
    } finally {
      view.destroy();
      parent.remove();
    }
  });

  it("leaves fenced code blocks without plugin copy widgets", () => {
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
      const widget = parent.querySelector<HTMLElement>(".obsidian-copy-editor-block-widget");

      expect(button).toBeNull();
      expect(widget).toBeNull();
      expect(writeText).not.toHaveBeenCalled();
    } finally {
      view.destroy();
      parent.remove();
    }
  });

  it("keeps Live Preview inline copy widgets hidden until code hover activates them", () => {
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

      expect(computed.opacity).toBe("0");
      expect(computed.pointerEvents).toBe("none");
      expect(computed.position).toBe("absolute");
      expect(computed.transform).toBe("translateY(-50%)");
      expect(styles).toContain("box-sizing: border-box");
      expect(styles).toContain("font-size: 16px");
      expect(styles).toContain("height: 1em");
      expect(styles).toContain("padding: 2px");
      expect(styles).toContain("height: calc(1em - 4px)");
      expect(styles).toContain("width: calc(1em - 4px)");
      expect(styles).toContain("width: 1em");
      expect(styles).toContain("margin-right: 0");
      expect(styles).toContain("width: 0");
      expect(styles).toContain("right: 0");
      expect(styles).toContain("top: 50%");
      expect(styles).toContain("vertical-align: text-bottom");

      wrapper.classList.add("obsidian-copy-editor-widget-active");
      const activeComputed = getComputedStyle(button);

      expect(activeComputed.opacity).toBe("1");
      expect(activeComputed.pointerEvents).toBe("auto");
      expect(styles).toContain(
        ".obsidian-copy-editor-inline-widget.obsidian-copy-editor-widget-active > .obsidian-copy-editor-inline-button"
      );
      expect(styles).not.toContain(
        ".obsidian-copy-editor-inline-widget:hover > .obsidian-copy-editor-inline-button"
      );
      expect(styles).toContain(
        ".obsidian-copy-editor-inline-widget:focus-within > .obsidian-copy-editor-inline-button"
      );
    } finally {
      wrapper.remove();
      styleEl.remove();
    }
  });

  it("activates the copy widget for the hovered code range", () => {
    const parent = document.createElement("div");
    parent.innerHTML = [
      '<span class="obsidian-copy-editor-inline-widget" data-copy-from="4" data-copy-to="9"></span>',
      '<span class="obsidian-copy-editor-inline-widget" data-copy-from="14" data-copy-to="19"></span>',
    ].join("");

    const [first, second] = Array.from(
      parent.querySelectorAll<HTMLElement>(".obsidian-copy-editor-inline-widget")
    );

    updateActiveCopyWidget(parent, 6);

    expect(first.classList.contains("obsidian-copy-editor-widget-active")).toBe(true);
    expect(second.classList.contains("obsidian-copy-editor-widget-active")).toBe(false);

    updateActiveCopyWidget(parent, 16);

    expect(first.classList.contains("obsidian-copy-editor-widget-active")).toBe(false);
    expect(second.classList.contains("obsidian-copy-editor-widget-active")).toBe(true);

    updateActiveCopyWidget(parent, null);

    expect(first.classList.contains("obsidian-copy-editor-widget-active")).toBe(false);
    expect(second.classList.contains("obsidian-copy-editor-widget-active")).toBe(false);
  });
});
