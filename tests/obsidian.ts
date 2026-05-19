export class Notice {
  static messages: string[] = [];

  constructor(message: string) {
    Notice.messages.push(message);
  }
}

export class App {}

export class Plugin {
  app = new App();

  registerMarkdownPostProcessor(_processor: (element: HTMLElement) => void): void {}

  registerEditorExtension(_extension: unknown): void {}
}

export function setIcon(element: HTMLElement, icon: string): void {
  element.setAttribute("data-icon", icon);
}
