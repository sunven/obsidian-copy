import { beforeEach, describe, expect, it, vi } from "vitest";

import { enhanceReadingView } from "../src/dom-copy";

vi.mock("obsidian", () => ({
  Notice: vi.fn(),
  setIcon: (element: HTMLElement, icon: string) => {
    element.setAttribute("data-icon", icon);
  },
}));

describe("enhanceReadingView", () => {
  let writeText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText,
      },
    });
  });

  it("adds copy buttons to inline code and fenced code blocks", () => {
    const container = document.createElement("div");
    container.innerHTML = "<p>Use <code>abc</code></p><pre><code>console.log(1)\n</code></pre>";

    enhanceReadingView(container);

    expect(container.querySelectorAll(".obsidian-copy-inline-button")).toHaveLength(1);
    expect(container.querySelectorAll(".obsidian-copy-block-button")).toHaveLength(1);
    expect(container.querySelectorAll(".obsidian-copy-inline-wrapper")).toHaveLength(1);
    expect(container.querySelector(".obsidian-copy-code-block")).toBeInstanceOf(HTMLPreElement);
  });

  it("does not treat code inside pre as inline code", () => {
    const container = document.createElement("div");
    container.innerHTML = "<pre><code>abc\n</code></pre>";

    enhanceReadingView(container);

    expect(container.querySelectorAll(".obsidian-copy-inline-button")).toHaveLength(0);
    expect(container.querySelectorAll(".obsidian-copy-block-button")).toHaveLength(1);
  });

  it("is idempotent when the same container is enhanced again", () => {
    const container = document.createElement("div");
    container.innerHTML = "<p><code>abc</code></p><pre><code>x\n</code></pre>";

    enhanceReadingView(container);
    enhanceReadingView(container);

    expect(container.querySelectorAll(".obsidian-copy-inline-wrapper")).toHaveLength(1);
    expect(container.querySelectorAll(".obsidian-copy-inline-button")).toHaveLength(1);
    expect(container.querySelectorAll(".obsidian-copy-block-button")).toHaveLength(1);
  });

  it("copies rendered inline code text", async () => {
    const container = document.createElement("div");
    container.innerHTML = "<p><code>a`b</code></p>";
    enhanceReadingView(container);

    const button = container.querySelector<HTMLButtonElement>(".obsidian-copy-inline-button");
    button?.click();

    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith("a`b"));
  });

  it("copies rendered code block text without one renderer-added trailing newline", async () => {
    const container = document.createElement("div");
    container.innerHTML = "<pre><code>  a\n\n</code></pre>";
    enhanceReadingView(container);

    const button = container.querySelector<HTMLButtonElement>(".obsidian-copy-block-button");
    button?.click();

    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith("  a\n"));
  });
});
