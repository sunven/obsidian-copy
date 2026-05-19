import { Notice } from "obsidian";

export type CopyKind = "inline" | "block";

export function stripInlineCodeMarkers(source: string): string {
  if (source.indexOf("\n") !== -1 || source.indexOf("\r") !== -1) {
    return source;
  }

  const match = source.match(/^(`+)([\s\S]*?)\1$/);
  if (!match) {
    return source;
  }

  return match[2];
}

export function stripFencedCodeBlockMarkers(source: string): string {
  const match = source.match(
    /^(?:[ \t]*)([`~]{3,})([^\n\r]*)\r?\n([\s\S]*?)\r?\n[ \t]*\1[ \t]*$/
  );

  if (!match) {
    return source;
  }

  return match[3];
}

export function trimOneTrailingLineBreak(source: string): string {
  return source.replace(/\r?\n$/, "");
}

export function normalizeCopySource(kind: CopyKind, source: string): string {
  if (kind === "inline") {
    return stripInlineCodeMarkers(source);
  }

  return stripFencedCodeBlockMarkers(source);
}

export function extractReadingViewCopyText(kind: CopyKind, text: string): string {
  const normalized = normalizeCopySource(kind, text);
  return kind === "block" ? trimOneTrailingLineBreak(normalized) : normalized;
}

export function extractSourceCopyText(kind: CopyKind, source: string): string {
  return normalizeCopySource(kind, source);
}

export async function copyToClipboard(text: string): Promise<void> {
  const clipboard = navigator.clipboard;
  if (clipboard?.writeText) {
    await clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "-9999px";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  const ok = document.execCommand("copy");
  textarea.remove();

  if (!ok) {
    throw new Error("Clipboard copy failed");
  }
}

export function notifyCopySuccess(kind: CopyKind): void {
  new Notice(kind === "inline" ? "Copied inline code" : "Copied code block");
}

export function notifyCopyFailure(kind: CopyKind): void {
  new Notice(kind === "inline" ? "Failed to copy inline code" : "Failed to copy code block");
}
