import { Notice } from "obsidian";

export type CopyKind = "inline";

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

export function normalizeCopySource(_kind: CopyKind, source: string): string {
  return stripInlineCodeMarkers(source);
}

export function extractReadingViewCopyText(kind: CopyKind, text: string): string {
  return normalizeCopySource(kind, text);
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

export function notifyCopySuccess(_kind: CopyKind): void {
  new Notice("Copied inline code");
}

export function notifyCopyFailure(_kind: CopyKind): void {
  new Notice("Failed to copy inline code");
}
