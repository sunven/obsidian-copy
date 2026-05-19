import { setIcon, type App } from "obsidian";

import {
  copyToClipboard,
  extractReadingViewCopyText,
  notifyCopyFailure,
  notifyCopySuccess,
  type CopyKind,
} from "./copy-contract";

type CopyTargetText = {
  kind: CopyKind;
  getText: () => string;
};

function createCopyButton(kind: CopyKind, label: string, getText: () => string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = kind === "inline" ? "obsidian-copy-inline-button" : "obsidian-copy-block-button";
  button.ariaLabel = label;
  button.title = label;
  setIcon(button, "copy");

  button.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();

    try {
      await copyToClipboard(getText());
      notifyCopySuccess(kind);
    } catch (error) {
      console.error(error);
      notifyCopyFailure(kind);
    }
  });

  return button;
}

function enhanceInlineCodeElement(codeEl: HTMLElement): void {
  if (codeEl.closest(".obsidian-copy-inline-wrapper")) {
    return;
  }

  const parent = codeEl.parentElement;
  if (!parent) {
    return;
  }

  const wrapper = document.createElement("span");
  wrapper.className = "obsidian-copy-inline-wrapper";
  codeEl.replaceWith(wrapper);
  wrapper.appendChild(codeEl);

  const target: CopyTargetText = {
    kind: "inline",
    getText: () => extractReadingViewCopyText("inline", codeEl.textContent ?? ""),
  };

  wrapper.appendChild(createCopyButton(target.kind, "Copy inline code", target.getText));
}

function enhanceCodeBlockElement(codeEl: HTMLElement): void {
  const pre = codeEl.parentElement;
  if (!pre || pre.classList.contains("obsidian-copy-code-block")) {
    return;
  }

  pre.classList.add("obsidian-copy-code-block");

  const target: CopyTargetText = {
    kind: "block",
    getText: () => extractReadingViewCopyText("block", codeEl.textContent ?? ""),
  };

  pre.appendChild(createCopyButton(target.kind, "Copy code block", target.getText));
}

export function enhanceReadingView(containerEl: HTMLElement, _app?: App): void {
  containerEl.querySelectorAll("code:not(pre code)").forEach((codeEl) => {
    if (codeEl instanceof HTMLElement) {
      enhanceInlineCodeElement(codeEl);
    }
  });

  containerEl.querySelectorAll("pre > code").forEach((codeEl) => {
    if (codeEl instanceof HTMLElement) {
      enhanceCodeBlockElement(codeEl);
    }
  });
}
