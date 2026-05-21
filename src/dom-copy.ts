import { setIcon, type App } from "obsidian";

import {
  copyToClipboard,
  extractReadingViewCopyText,
  notifyCopyFailure,
  notifyCopySuccess,
} from "./copy-contract";

type CopyTargetText = {
  getText: () => string;
};

function createInlineCopyButton(label: string, getText: () => string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "obsidian-copy-inline-button";
  button.ariaLabel = label;
  button.title = label;
  setIcon(button, "copy");

  button.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();

    try {
      await copyToClipboard(getText());
      notifyCopySuccess("inline");
    } catch (error) {
      console.error(error);
      notifyCopyFailure("inline");
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
    getText: () => extractReadingViewCopyText("inline", codeEl.textContent ?? ""),
  };

  wrapper.appendChild(createInlineCopyButton("Copy inline code", target.getText));
}

export function enhanceReadingView(containerEl: HTMLElement, _app?: App): void {
  containerEl.querySelectorAll("code:not(pre code)").forEach((codeEl) => {
    if (codeEl instanceof HTMLElement) {
      enhanceInlineCodeElement(codeEl);
    }
  });
}
