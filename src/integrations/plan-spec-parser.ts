const QUESTION_BLOCK_OPEN = "[[PLAN_SPEC_QUESTION]]";
const QUESTION_BLOCK_CLOSE = "[[/PLAN_SPEC_QUESTION]]";
const FINAL_BLOCK_OPEN = "[[PLAN_SPEC_FINAL]]";
const FINAL_BLOCK_CLOSE = "[[/PLAN_SPEC_FINAL]]";
const ANSI_ESCAPE_PATTERN = /[\u001B\u009B][[\]()#;?]*(?:(?:[a-zA-Z\d]*(?:;[a-zA-Z\d]*)*)?\u0007|(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~])/gu;
const CONTROL_CHAR_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu;
const MAX_RAW_OUTPUT_LENGTH = 3500;

export type PlanSpecFinalActionId = "create-spec" | "refine" | "cancel";

export interface PlanSpecQuestionOption {
  value: string;
  label: string;
}

export interface PlanSpecQuestionBlock {
  prompt: string;
  options: PlanSpecQuestionOption[];
}

export interface PlanSpecFinalAction {
  id: PlanSpecFinalActionId;
  label: string;
}

export interface PlanSpecFinalBlock {
  title: string;
  summary: string;
  actions: PlanSpecFinalAction[];
}

export type PlanSpecParserEvent =
  | {
      type: "question";
      question: PlanSpecQuestionBlock;
      rawBlock: string;
    }
  | {
      type: "final";
      final: PlanSpecFinalBlock;
      rawBlock: string;
    }
  | {
      type: "raw-sanitized";
      text: string;
    };

export interface PlanSpecParserState {
  pendingChunk: string;
}

interface StructuredBlockMatch {
  start: number;
  end: number;
  kind: "question" | "final";
  rawBlock: string;
  body: string;
}

const DEFAULT_FINAL_ACTIONS: PlanSpecFinalAction[] = [
  {
    id: "create-spec",
    label: "Criar spec",
  },
  {
    id: "refine",
    label: "Refinar",
  },
  {
    id: "cancel",
    label: "Cancelar",
  },
];

export const createPlanSpecParserState = (): PlanSpecParserState => ({
  pendingChunk: "",
});

export const parsePlanSpecOutput = (output: string): PlanSpecParserEvent[] => {
  return parsePlanSpecOutputChunk(createPlanSpecParserState(), output).events;
};

export const parsePlanSpecOutputChunk = (
  state: PlanSpecParserState,
  chunk: string,
): { state: PlanSpecParserState; events: PlanSpecParserEvent[] } => {
  const combined = `${state.pendingChunk}${chunk}`;
  const events: PlanSpecParserEvent[] = [];
  const matches = findStructuredBlocks(combined);
  let cursor = 0;

  for (const match of matches) {
    if (match.start > cursor) {
      pushRawEvent(events, combined.slice(cursor, match.start));
    }

    if (match.kind === "question") {
      const parsedQuestion = parseQuestionBlock(match.body);
      if (parsedQuestion) {
        events.push({
          type: "question",
          question: parsedQuestion,
          rawBlock: match.rawBlock,
        });
      } else {
        pushRawEvent(events, match.rawBlock);
      }
    } else {
      const parsedFinal = parseFinalBlock(match.body);
      if (parsedFinal) {
        events.push({
          type: "final",
          final: parsedFinal,
          rawBlock: match.rawBlock,
        });
      } else {
        pushRawEvent(events, match.rawBlock);
      }
    }

    cursor = match.end;
  }

  const trailing = combined.slice(cursor);
  const pendingStart = resolvePendingStart(trailing);
  if (pendingStart >= 0) {
    if (pendingStart > 0) {
      pushRawEvent(events, trailing.slice(0, pendingStart));
    }

    return {
      state: {
        pendingChunk: trailing.slice(pendingStart),
      },
      events,
    };
  }

  pushRawEvent(events, trailing);

  return {
    state: {
      pendingChunk: "",
    },
    events,
  };
};

export const sanitizePlanSpecRawOutput = (value: string): string => {
  const normalized = value.replace(/\r\n?/gu, "\n");
  const withoutAnsi = normalized.replace(ANSI_ESCAPE_PATTERN, "");
  const withoutControlChars = withoutAnsi.replace(CONTROL_CHAR_PATTERN, "");
  const compactNewLines = withoutControlChars
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();

  if (compactNewLines.length <= MAX_RAW_OUTPUT_LENGTH) {
    return compactNewLines;
  }

  return `${compactNewLines.slice(0, MAX_RAW_OUTPUT_LENGTH)}...`;
};

const pushRawEvent = (events: PlanSpecParserEvent[], value: string): void => {
  const sanitized = sanitizePlanSpecRawOutput(value);
  if (!sanitized) {
    return;
  }

  events.push({
    type: "raw-sanitized",
    text: sanitized,
  });
};

const findStructuredBlocks = (value: string): StructuredBlockMatch[] => {
  const matches: StructuredBlockMatch[] = [];
  const questionPattern = /\[\[PLAN_SPEC_QUESTION\]\]([\s\S]*?)\[\[\/PLAN_SPEC_QUESTION\]\]/gu;
  const finalPattern = /\[\[PLAN_SPEC_FINAL\]\]([\s\S]*?)\[\[\/PLAN_SPEC_FINAL\]\]/gu;

  for (const match of value.matchAll(questionPattern)) {
    if (match.index === undefined) {
      continue;
    }

    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      kind: "question",
      rawBlock: match[0],
      body: match[1] ?? "",
    });
  }

  for (const match of value.matchAll(finalPattern)) {
    if (match.index === undefined) {
      continue;
    }

    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      kind: "final",
      rawBlock: match[0],
      body: match[1] ?? "",
    });
  }

  return matches.sort((left, right) => left.start - right.start);
};

const resolvePendingStart = (value: string): number => {
  const questionStart = findUnclosedMarkerStart(value, QUESTION_BLOCK_OPEN, QUESTION_BLOCK_CLOSE);
  const finalStart = findUnclosedMarkerStart(value, FINAL_BLOCK_OPEN, FINAL_BLOCK_CLOSE);

  if (questionStart < 0) {
    return finalStart;
  }

  if (finalStart < 0) {
    return questionStart;
  }

  return Math.min(questionStart, finalStart);
};

const findUnclosedMarkerStart = (
  value: string,
  openMarker: string,
  closeMarker: string,
): number => {
  const openIndex = value.lastIndexOf(openMarker);
  if (openIndex < 0) {
    return -1;
  }

  const closeIndex = value.lastIndexOf(closeMarker);
  if (closeIndex > openIndex) {
    return -1;
  }

  return openIndex;
};

const parseQuestionBlock = (body: string): PlanSpecQuestionBlock | null => {
  const lines = normalizeLines(body);
  let prompt: string | null = null;
  const optionLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const promptMatch = trimmed.match(/^(?:pergunta|question)\s*:\s*(.+)$/iu);
    if (promptMatch) {
      prompt = promptMatch[1]?.trim() ?? null;
      continue;
    }

    if (/^(?:op[cç][oõ]es|options)\s*:/iu.test(trimmed)) {
      continue;
    }

    if (isOptionLine(trimmed)) {
      optionLines.push(trimmed);
      continue;
    }

    if (!prompt) {
      prompt = trimmed;
    }
  }

  if (!prompt) {
    return null;
  }

  const options = parseQuestionOptions(optionLines);
  if (options.length === 0) {
    return null;
  }

  return {
    prompt,
    options,
  };
};

const isOptionLine = (value: string): boolean => {
  return /^(?:[-*]|\d+[.)])\s+/u.test(value);
};

const parseQuestionOptions = (lines: string[]): PlanSpecQuestionOption[] => {
  const options: PlanSpecQuestionOption[] = [];
  const usedValues = new Set<string>();

  for (const [index, line] of lines.entries()) {
    const optionMatch = line.match(/^(?:[-*]|\d+[.)])\s*(?:\[([^\]]+)\]\s*)?(.+)$/u);
    if (!optionMatch) {
      continue;
    }

    const rawValue = optionMatch[1]?.trim() ?? "";
    const label = optionMatch[2]?.trim() ?? "";
    if (!label) {
      continue;
    }

    const baseValue = normalizeOptionValue(rawValue || label || `option-${index + 1}`);
    const value = ensureUniqueOptionValue(baseValue || `option-${index + 1}`, usedValues);
    options.push({ value, label });
  }

  return options;
};

const normalizeOptionValue = (value: string): string => {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
};

const ensureUniqueOptionValue = (baseValue: string, usedValues: Set<string>): string => {
  if (!usedValues.has(baseValue)) {
    usedValues.add(baseValue);
    return baseValue;
  }

  let suffix = 2;
  while (usedValues.has(`${baseValue}-${suffix}`)) {
    suffix += 1;
  }

  const nextValue = `${baseValue}-${suffix}`;
  usedValues.add(nextValue);
  return nextValue;
};

const parseFinalBlock = (body: string): PlanSpecFinalBlock | null => {
  const lines = normalizeLines(body);
  let title: string | null = null;
  let summaryInlineValue: string | null = null;
  let collectingSummary = false;
  const summaryLines: string[] = [];
  const actions = new Map<PlanSpecFinalActionId, PlanSpecFinalAction>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const titleMatch = trimmed.match(/^(?:titulo|title)\s*:\s*(.+)$/iu);
    if (titleMatch) {
      title = titleMatch[1]?.trim() ?? null;
      collectingSummary = false;
      continue;
    }

    const summaryMatch = trimmed.match(/^(?:resumo|summary)\s*:\s*(.*)$/iu);
    if (summaryMatch) {
      summaryInlineValue = summaryMatch[1]?.trim() ?? "";
      collectingSummary = true;
      continue;
    }

    if (/^(?:a[cç][oõ]es|actions)\s*:/iu.test(trimmed)) {
      collectingSummary = false;
      continue;
    }

    const parsedAction = parseFinalAction(trimmed);
    if (parsedAction) {
      actions.set(parsedAction.id, parsedAction);
      collectingSummary = false;
      continue;
    }

    if (!title) {
      title = trimmed;
      collectingSummary = false;
      continue;
    }

    if (collectingSummary || summaryInlineValue !== null) {
      summaryLines.push(trimmed);
    }
  }

  const summaryParts = [
    ...(summaryInlineValue ? [summaryInlineValue] : []),
    ...summaryLines,
  ].filter(Boolean);
  const summary = summaryParts.join("\n").trim();

  if (!title || !summary) {
    return null;
  }

  return {
    title,
    summary,
    actions: actions.size > 0 ? [...actions.values()] : [...DEFAULT_FINAL_ACTIONS],
  };
};

const parseFinalAction = (line: string): PlanSpecFinalAction | null => {
  const normalized = line
    .replace(/^(?:[-*]|\d+[.)])\s*/u, "")
    .trim()
    .toLowerCase();

  if (!normalized) {
    return null;
  }

  if (normalized.includes("criar spec") || normalized.includes("create spec")) {
    return {
      id: "create-spec",
      label: "Criar spec",
    };
  }

  if (normalized.includes("refinar") || normalized.includes("refine")) {
    return {
      id: "refine",
      label: "Refinar",
    };
  }

  if (normalized.includes("cancelar") || normalized.includes("cancel")) {
    return {
      id: "cancel",
      label: "Cancelar",
    };
  }

  return null;
};

const normalizeLines = (value: string): string[] => {
  return value.replace(/\r\n?/gu, "\n").split("\n");
};
