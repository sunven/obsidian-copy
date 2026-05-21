import { describe, expect, it } from "vitest";

import {
  extractReadingViewCopyText,
  extractSourceCopyText,
  stripInlineCodeMarkers,
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

  it("leaves multiline source unchanged because inline code cannot span lines", () => {
    const source = "`line 1\nline 2`";

    expect(extractSourceCopyText("inline", source)).toBe(source);
  });
});
