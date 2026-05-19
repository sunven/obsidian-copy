import { describe, expect, it } from "vitest";

import {
  extractReadingViewCopyText,
  extractSourceCopyText,
  stripFencedCodeBlockMarkers,
  stripInlineCodeMarkers,
  trimOneTrailingLineBreak,
} from "../src/copy-contract";

describe("copy contract", () => {
  it("copies inline code without marker backticks", () => {
    expect(extractSourceCopyText("inline", "`abc`")).toBe("abc");
  });

  it("supports empty inline code", () => {
    expect(stripInlineCodeMarkers("``")).toBe("");
  });

  it("preserves literal backticks inside inline code", () => {
    expect(stripInlineCodeMarkers("``a`b``")).toBe("a`b");
  });

  it("leaves rendered inline code text unchanged", () => {
    expect(extractReadingViewCopyText("inline", "a`b")).toBe("a`b");
  });

  it("copies fenced code body without fences or language tag", () => {
    expect(extractSourceCopyText("block", "```ts\nconsole.log(1)\n```")).toBe("console.log(1)");
  });

  it("preserves fenced code indentation and intentional blank lines", () => {
    const source = "```js\n  const x = 1;\n\n  console.log(x);\n\n```";

    expect(stripFencedCodeBlockMarkers(source)).toBe("  const x = 1;\n\n  console.log(x);\n");
  });

  it("supports tilde fenced code blocks", () => {
    expect(extractSourceCopyText("block", "~~~~\na\n~~~~")).toBe("a");
  });

  it("does not add a trailing newline for rendered code blocks", () => {
    expect(extractReadingViewCopyText("block", "console.log(1)\n")).toBe("console.log(1)");
  });

  it("only trims one trailing line break from rendered code blocks", () => {
    expect(trimOneTrailingLineBreak("a\n\n")).toBe("a\n");
  });

  it("leaves indented code blocks unchanged because they are out of scope", () => {
    const source = "    console.log(1)";

    expect(extractSourceCopyText("block", source)).toBe(source);
  });
});
