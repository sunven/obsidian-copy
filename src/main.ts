import { Plugin } from "obsidian";

import { enhanceReadingView } from "./dom-copy";
import { createLivePreviewExtension } from "./live-preview";

export default class ObsidianCopyPlugin extends Plugin {
  async onload(): Promise<void> {
    this.registerMarkdownPostProcessor((element) => {
      enhanceReadingView(element, this.app);
    });

    this.registerEditorExtension(createLivePreviewExtension());
  }
}
