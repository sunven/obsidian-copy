import { syntaxTree } from "@codemirror/language";
import { StateField, type EditorState, type Extension, type Range, type Transaction } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  type DecorationSet,
} from "@codemirror/view";
import { setIcon } from "obsidian";

import {
  copyToClipboard,
  extractSourceCopyText,
  notifyCopyFailure,
  notifyCopySuccess,
} from "./copy-contract";

type CopyTarget = {
  kind: "inline";
  from: number;
  to: number;
  text: string;
};

type RangeLike = {
  from: number;
  to: number;
};

type FenceRange = RangeLike;

const activeCopyWidgetClass = "obsidian-copy-editor-widget-active";
const copyWidgetSelector = ".obsidian-copy-editor-inline-widget";

class CopyButtonWidget extends WidgetType {
  constructor(
    private readonly from: number,
    private readonly to: number,
    private readonly text: string
  ) {
    super();
  }

  eq(other: WidgetType): boolean {
    return other instanceof CopyButtonWidget
      && other.from === this.from
      && other.to === this.to
      && other.text === this.text;
  }

  toDOM(): HTMLElement {
    const wrapper = document.createElement("span");
    wrapper.className = "obsidian-copy-editor-inline-widget";
    wrapper.dataset.copyFrom = String(this.from);
    wrapper.dataset.copyTo = String(this.to);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "obsidian-copy-editor-inline-button";
    button.ariaLabel = "Copy inline code";
    button.title = button.ariaLabel;
    button.setAttribute("data-copy-kind", "inline");
    setIcon(button, "copy");

    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();

      try {
        await copyToClipboard(this.text);
        notifyCopySuccess("inline");
      } catch (error) {
        console.error(error);
        notifyCopyFailure("inline");
      }
    });

    wrapper.appendChild(button);
    return wrapper;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

function parseCopyWidgetRange(widget: HTMLElement): RangeLike | null {
  const from = Number(widget.dataset.copyFrom);
  const to = Number(widget.dataset.copyTo);

  if (!Number.isInteger(from) || !Number.isInteger(to)) {
    return null;
  }

  return { from, to };
}

function findCopyWidgetForPosition(container: ParentNode, position: number): HTMLElement | null {
  let activeWidget: HTMLElement | null = null;
  let activeLength = Number.POSITIVE_INFINITY;

  container.querySelectorAll<HTMLElement>(copyWidgetSelector).forEach((widget) => {
    const range = parseCopyWidgetRange(widget);
    if (!range || position < range.from || position > range.to) {
      return;
    }

    const length = range.to - range.from;
    if (length < activeLength) {
      activeWidget = widget;
      activeLength = length;
    }
  });

  return activeWidget;
}

export function updateActiveCopyWidget(
  container: ParentNode,
  position: number | null,
  eventTarget: EventTarget | null = null
): void {
  const hoveredWidget = eventTarget instanceof Element ? eventTarget.closest(copyWidgetSelector) : null;
  const activeWidget = hoveredWidget instanceof HTMLElement
    ? hoveredWidget
    : position === null
      ? null
      : findCopyWidgetForPosition(container, position);

  container.querySelectorAll<HTMLElement>(copyWidgetSelector).forEach((widget) => {
    widget.classList.toggle(activeCopyWidgetClass, widget === activeWidget);
  });
}

const copyButtonHoverPlugin = ViewPlugin.define(() => ({}), {
  eventHandlers: {
    mousemove(event, view) {
      updateActiveCopyWidget(
        view.dom,
        view.posAtCoords({ x: event.clientX, y: event.clientY }),
        event.target
      );
    },
    mouseleave(_event, view) {
      updateActiveCopyWidget(view.dom, null);
    },
  },
});

function collectVisibleRanges(view: EditorView): readonly RangeLike[] {
  return view.visibleRanges.length > 0 ? view.visibleRanges : [{ from: 0, to: view.state.doc.length }];
}

function rangesIntersect(a: RangeLike, b: RangeLike): boolean {
  return a.from < b.to && b.from < a.to;
}

function targetIsVisible(target: RangeLike, visibleRanges: readonly RangeLike[]): boolean {
  return visibleRanges.some((range) => rangesIntersect(target, range));
}

function addTarget(targets: CopyTarget[], seen: Set<string>, target: CopyTarget): void {
  const key = `${target.kind}:${target.from}:${target.to}`;
  if (seen.has(key)) {
    return;
  }

  seen.add(key);
  targets.push(target);
}

function lineBreakLength(source: string, index: number): number {
  if (source[index] === "\r" && source[index + 1] === "\n") {
    return 2;
  }

  return source[index] === "\n" || source[index] === "\r" ? 1 : 0;
}

function findLineEnd(source: string, from: number): number {
  let index = from;
  while (index < source.length && source[index] !== "\n" && source[index] !== "\r") {
    index++;
  }

  return index;
}

function findClosingFence(
  source: string,
  from: number,
  marker: "`" | "~",
  markerLength: number
): { start: number; end: number } | null {
  let lineStart = from;

  while (lineStart < source.length) {
    const lineEnd = findLineEnd(source, lineStart);
    const line = source.slice(lineStart, lineEnd);
    const match = line.match(/^[ \t]{0,3}([`~]{3,})[ \t]*$/);

    if (match && match[1][0] === marker && match[1].length >= markerLength) {
      return { start: lineStart, end: lineEnd };
    }

    const breakLength = lineBreakLength(source, lineEnd);
    if (breakLength === 0) {
      break;
    }
    lineStart = lineEnd + breakLength;
  }

  return null;
}

function collectFenceRanges(source: string): FenceRange[] {
  const ranges: FenceRange[] = [];
  let lineStart = 0;

  while (lineStart < source.length) {
    const lineEnd = findLineEnd(source, lineStart);
    const line = source.slice(lineStart, lineEnd);
    const match = line.match(/^[ \t]{0,3}([`~]{3,})[^\r\n]*$/);

    if (match) {
      const marker = match[1][0] as "`" | "~";
      const markerLength = match[1].length;
      const contentFrom = lineEnd + lineBreakLength(source, lineEnd);
      const closingFence = findClosingFence(source, contentFrom, marker, markerLength);

      if (closingFence) {
        ranges.push({ from: lineStart, to: closingFence.end });

        const closingBreakLength = lineBreakLength(source, closingFence.end);
        lineStart = closingFence.end + closingBreakLength;
        continue;
      }
    }

    const breakLength = lineBreakLength(source, lineEnd);
    if (breakLength === 0) {
      break;
    }
    lineStart = lineEnd + breakLength;
  }

  return ranges;
}

function isInsideFence(position: number, fenceRanges: readonly FenceRange[]): boolean {
  return fenceRanges.some((range) => position >= range.from && position < range.to);
}

function collectInlineSourceTargets(source: string, fenceRanges: readonly FenceRange[]): CopyTarget[] {
  const targets: CopyTarget[] = [];
  let lineStart = 0;

  while (lineStart < source.length) {
    const lineEnd = findLineEnd(source, lineStart);

    if (!isInsideFence(lineStart, fenceRanges)) {
      let index = lineStart;

      while (index < lineEnd) {
        if (source[index] !== "`") {
          index++;
          continue;
        }

        let markerEnd = index + 1;
        while (markerEnd < lineEnd && source[markerEnd] === "`") {
          markerEnd++;
        }

        const markerLength = markerEnd - index;
        const marker = "`".repeat(markerLength);
        const closingStart = source.indexOf(marker, markerEnd);

        if (closingStart === -1 || closingStart >= lineEnd) {
          index = markerEnd;
          continue;
        }

        const to = closingStart + markerLength;
        targets.push({
          kind: "inline",
          from: index,
          to,
          text: extractSourceCopyText("inline", source.slice(index, to)),
        });
        index = to;
      }
    }

    const breakLength = lineBreakLength(source, lineEnd);
    if (breakLength === 0) {
      break;
    }
    lineStart = lineEnd + breakLength;
  }

  return targets;
}

function collectSourceTargets(state: EditorState, visibleRanges: readonly RangeLike[]): CopyTarget[] {
  const source = state.doc.toString();
  const fenceRanges = collectFenceRanges(source);
  return collectInlineSourceTargets(source, fenceRanges).filter((target) =>
    targetIsVisible(target, visibleRanges)
  );
}

function collectSyntaxTreeTargets(
  state: EditorState,
  visibleRanges: readonly RangeLike[],
  targets: CopyTarget[],
  seen: Set<string>
): void {
  const tree = syntaxTree(state);

  for (const range of visibleRanges) {
    tree.iterate({
      from: range.from,
      to: range.to,
      enter: (node) => {
        const name = node.type.name;
        if (name !== "InlineCode") {
          return;
        }

        const source = state.doc.sliceString(node.from, node.to);
        addTarget(targets, seen, {
          kind: "inline",
          from: node.from,
          to: node.to,
          text: extractSourceCopyText("inline", source),
        });
      },
    });
  }
}

export function collectCopyTargets(state: EditorState, visibleRanges: readonly RangeLike[]): CopyTarget[] {
  const targets: CopyTarget[] = [];
  const seen = new Set<string>();

  collectSyntaxTreeTargets(state, visibleRanges, targets, seen);

  for (const target of collectSourceTargets(state, visibleRanges)) {
    addTarget(targets, seen, target);
  }

  return targets.sort((a, b) => a.from - b.from || a.to - b.to);
}

function buildDecorations(state: EditorState, visibleRanges: readonly RangeLike[]): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  for (const target of collectCopyTargets(state, visibleRanges)) {
    decorations.push(
      Decoration.widget({
        widget: new CopyButtonWidget(target.from, target.to, target.text),
        side: 1,
      }).range(target.to)
    );
  }

  return Decoration.set(decorations, true);
}

const copyButtonDecorations = StateField.define<DecorationSet>({
  create: (state) => buildDecorations(state, [{ from: 0, to: state.doc.length }]),
  update: (decorations, transaction: Transaction) => {
    if (!transaction.docChanged) {
      return decorations;
    }

    return buildDecorations(transaction.state, [{ from: 0, to: transaction.state.doc.length }]);
  },
  provide: (field) => EditorView.decorations.from(field),
});

export function createLivePreviewExtension(): Extension {
  return [copyButtonDecorations, copyButtonHoverPlugin];
}
