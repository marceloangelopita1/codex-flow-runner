const QUESTION_BLOCK_OPEN = "[[PLAN_SPEC_QUESTION]]";
const QUESTION_BLOCK_CLOSE = "[[/PLAN_SPEC_QUESTION]]";
const FINAL_BLOCK_OPEN = "[[PLAN_SPEC_FINAL]]";
const FINAL_BLOCK_CLOSE = "[[/PLAN_SPEC_FINAL]]";
const ANSI_ESCAPE_PATTERN = /[\u001B\u009B][[\]()#;?]*(?:(?:[a-zA-Z\d]*(?:;[a-zA-Z\d]*)*)?\u0007|(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~])/gu;
const ORPHAN_PARAMETERIZED_CSI_PATTERN = /\[(?:\?|>|\d)[0-9;?]*[ -/]*[@-~]/gu;
const ORPHAN_PARAMETERLESS_CSI_PATTERN = /\[[ABCDHFJKSTfhlmnrsu](?![A-Za-z0-9_-])/gu;
const CONTROL_CHAR_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu;
const MAX_RAW_OUTPUT_LENGTH = 3500;
const OPEN_BLOCK_MARKERS = [QUESTION_BLOCK_OPEN, FINAL_BLOCK_OPEN] as const;
const CODEX_UI_NOISE_PATTERNS = [
  /openai codex/u,
  /\/model to change/u,
  /for shortcuts/u,
  /\b\d+%?\s*context left\b/u,
  /\/?plan\s*\d+%?\s*context left/u,
  /shift\+tab to cycle/u,
  /esc to interr?upt/u,
  /tip:\s*visit the codex community forum/u,
  /tip:\s*new\s+\d+x\s+rate limits/u,
] as const;
const SHORT_TOKEN_NOISE_MAX_LENGTH = 6;
const SHORT_TOKEN_MEANINGFUL_ALLOWLIST = new Set([
  "erro",
  "error",
  "falha",
  "fatal",
  "panic",
  "warn",
  "warning",
  "failed",
  "abort",
]);
const PLAN_SPEC_PROTOCOL_ECHO_COMPACT_SNIPPETS = [
  "contextovoceestaemumapontelegramparaplanejamentodespec",
  "respondasempreemblocosparseaveisparaautomacao",
  "quandoprecisardedesambiguacaorespondaexatamentenesteformato",
  "quandoconcluiroplanejamentorespondaexatamentenesteformato",
  "naoincluatextoforadosblocosacima",
  "briefdooperador",
  "planspecquestionperguntaperguntaobjetiva",
  "planspecfinaltitulotitulofinaldaspec",
  "resumoresumofinalobjetivo",
  "objetivoobjetivocentraldaspec",
  "atoresatorprincipal",
  "jornadapassoprincipaldajornada",
  "rfsrf01descricaoobjetiva",
  "casca01validacaoobservavel",
  "naoescopoitemforadeescopo",
  "restricoestecnicasrestricaotecnicaounenhum",
  "validacoesobrigatoriasvalidacaoobrigatoriaounenhum",
  "validacoesmanuaispendentesvalidacaomanualpendenteounenhum",
  "riscosconhecidosriscoconhecidoounenhum",
  "naocomprimarfscasjornadariscosenaoescopoemumunicoresumo",
] as const;

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

export interface PlanSpecFinalOutline {
  objective: string;
  actors: string[];
  journey: string[];
  requirements: string[];
  acceptanceCriteria: string[];
  nonScope: string[];
  technicalConstraints: string[];
  mandatoryValidations: string[];
  pendingManualValidations: string[];
  knownRisks: string[];
}

export interface PlanSpecFinalBlock {
  title: string;
  summary: string;
  outline: PlanSpecFinalOutline;
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

const FINAL_BLOCK_STOP_LABELS_PATTERN = [
  "(?:titulo|title)",
  "(?:resumo|summary)",
  "(?:objetivo|objective)",
  "(?:atores|actors)",
  "(?:jornada|journey)",
  "(?:rfs|requisitos funcionais|requirements)",
  "(?:cas|criterios de aceitacao|acceptance criteria)",
  "(?:nao-escopo|nao escopo|non-scope|non scope)",
  "(?:restricoes tecnicas|technical constraints)",
  "(?:validacoes obrigatorias|mandatory validations)",
  "(?:validacoes manuais pendentes|pending manual validations|manual validations pending)",
  "(?:riscos conhecidos|known risks)",
  "(?:a[cç][oõ]es|actions)",
].join("|");

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
  const normalizedChunk = normalizePlanSpecChunk(chunk);
  const combined = `${state.pendingChunk}${normalizedChunk}`;
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
  const withoutControlChars = normalizePlanSpecChunk(value);
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

export const isPlanSpecRawOutputMeaningful = (value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  if (isLikelyCodexUiNoise(trimmed)) {
    return false;
  }

  if (trimmed.length < 3) {
    return false;
  }

  const lines = trimmed
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) {
    return false;
  }

  if (lines.length >= 4 && lines.every((line) => line.length <= 2)) {
    return false;
  }

  if (lines.every((line) => isLikelyShortTokenNoiseLine(line))) {
    return false;
  }

  if (lines.every((line) => isLikelyFragmentedTokenNoiseLine(line))) {
    return false;
  }

  const compact = lines.join("");
  const alphanumericCount = Array.from(compact).filter((char) => /[\p{L}\p{N}]/u.test(char)).length;
  if (alphanumericCount < 3) {
    return false;
  }

  return true;
};

const isLikelyCodexUiNoise = (value: string): boolean => {
  const normalized = normalizeComparableText(value);
  if (!normalized) {
    return false;
  }

  if (CODEX_UI_NOISE_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return true;
  }

  const compact = toCompactComparableText(normalized);
  return PLAN_SPEC_PROTOCOL_ECHO_COMPACT_SNIPPETS.some((snippet) => compact.includes(snippet));
};

const isLikelyShortTokenNoiseLine = (value: string): boolean => {
  const normalized = normalizeComparableText(value).trim();
  if (!normalized || /\s/u.test(normalized)) {
    return false;
  }

  const compactTokens = extractCompactTokens(normalized);
  if (compactTokens.length !== 1) {
    return false;
  }

  const compact = compactTokens[0] ?? "";
  if (!compact || compact.length > SHORT_TOKEN_NOISE_MAX_LENGTH) {
    return false;
  }

  if (SHORT_TOKEN_MEANINGFUL_ALLOWLIST.has(compact)) {
    return false;
  }

  return true;
};

const isLikelyFragmentedTokenNoiseLine = (value: string): boolean => {
  const normalized = normalizeComparableText(value).trim();
  if (!normalized || !/\s/u.test(normalized)) {
    return false;
  }

  const compactTokens = extractCompactTokens(normalized);
  if (compactTokens.length === 0) {
    return true;
  }

  if (compactTokens.some((token) => SHORT_TOKEN_MEANINGFUL_ALLOWLIST.has(token))) {
    return false;
  }

  const hasSingleCharToken = compactTokens.some((token) => token.length <= 1);
  if (hasSingleCharToken && compactTokens.every((token) => token.length <= 2)) {
    return true;
  }

  if (
    compactTokens.length === 1 &&
    compactTokens[0] !== undefined &&
    compactTokens[0].length <= 4 &&
    value.length <= 8 &&
    /[^\p{L}\p{N}\s]/u.test(value)
  ) {
    return true;
  }

  return false;
};

const extractCompactTokens = (value: string): string[] => {
  return value
    .split(/\s+/u)
    .map((token) => token.replace(/[^a-z0-9]+/gu, ""))
    .filter((token) => token.length > 0);
};

const pushRawEvent = (events: PlanSpecParserEvent[], value: string): void => {
  const sanitized = sanitizePlanSpecRawOutput(value);
  if (!sanitized || !isPlanSpecRawOutputMeaningful(sanitized)) {
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
    return finalStart >= 0 ? finalStart : findPartialOpenMarkerStart(value);
  }

  if (finalStart < 0) {
    return questionStart;
  }

  return Math.min(questionStart, finalStart);
};

const findPartialOpenMarkerStart = (value: string): number => {
  if (!value) {
    return -1;
  }

  let candidate = -1;
  for (const marker of OPEN_BLOCK_MARKERS) {
    const maxPrefixLength = Math.min(marker.length - 1, value.length);
    for (let length = maxPrefixLength; length >= 1; length -= 1) {
      if (!value.endsWith(marker.slice(0, length))) {
        continue;
      }

      const start = value.length - length;
      if (candidate < 0 || start < candidate) {
        candidate = start;
      }
      break;
    }
  }

  return candidate;
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
      const promptCandidate = extractQuestionPrompt(promptMatch[1] ?? "");
      if (promptCandidate) {
        prompt = promptCandidate;
      }
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

  const resolvedPrompt = prompt || extractQuestionPromptFromBody(body);
  if (!resolvedPrompt) {
    return null;
  }

  const optionsFromLines = parseQuestionOptions(optionLines);
  const options = optionsFromLines.length > 0 ? optionsFromLines : parseQuestionOptionsFromBody(body);
  if (options.length === 0) {
    return null;
  }

  const question: PlanSpecQuestionBlock = {
    prompt: resolvedPrompt,
    options,
  };

  if (isQuestionProtocolTemplate(question)) {
    return null;
  }

  return question;
};

const isOptionLine = (value: string): boolean => {
  return /^(?:[-*]|\d+[.)])(?:\s+|(?=\[))/u.test(value);
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

const parseQuestionOptionsFromBody = (body: string): PlanSpecQuestionOption[] => {
  const optionPattern = /(?:[-*]|\d+[.)])\s*\[([^\]]+)\]\s*([\s\S]*?)(?=(?:[-*]|\d+[.)])\s*\[|$)/gu;
  const options: PlanSpecQuestionOption[] = [];
  const usedValues = new Set<string>();
  let fallbackIndex = 0;

  for (const match of body.matchAll(optionPattern)) {
    const rawValue = match[1]?.trim() ?? "";
    const label = cleanupInlineSegment(match[2] ?? "");
    if (!label) {
      continue;
    }

    fallbackIndex += 1;
    const baseValue = normalizeOptionValue(rawValue || label || `option-${fallbackIndex}`);
    const value = ensureUniqueOptionValue(baseValue || `option-${fallbackIndex}`, usedValues);
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
      const titleCandidate = cleanupInlineSegment(titleMatch[1] ?? "");
      if (titleCandidate) {
        title = titleCandidate;
      }
      collectingSummary = false;
      continue;
    }

    const summaryMatch = trimmed.match(/^(?:resumo|summary)\s*:\s*(.*)$/iu);
    if (summaryMatch) {
      summaryInlineValue = cleanupInlineSegment(summaryMatch[1] ?? "");
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
  let summary = summaryParts.join("\n").trim();
  const outline: PlanSpecFinalOutline = {
    objective:
      extractTaggedField(body, "(?:objetivo|objective)", FINAL_BLOCK_STOP_LABELS_PATTERN) ?? "",
    actors: extractTaggedListField(body, "(?:atores|actors)", FINAL_BLOCK_STOP_LABELS_PATTERN),
    journey: extractTaggedListField(body, "(?:jornada|journey)", FINAL_BLOCK_STOP_LABELS_PATTERN),
    requirements: extractTaggedListField(
      body,
      "(?:rfs|requisitos funcionais|requirements)",
      FINAL_BLOCK_STOP_LABELS_PATTERN,
    ),
    acceptanceCriteria: extractTaggedListField(
      body,
      "(?:cas|criterios de aceitacao|acceptance criteria)",
      FINAL_BLOCK_STOP_LABELS_PATTERN,
    ),
    nonScope: extractTaggedListField(
      body,
      "(?:nao-escopo|nao escopo|non-scope|non scope)",
      FINAL_BLOCK_STOP_LABELS_PATTERN,
    ),
    technicalConstraints: extractTaggedListField(
      body,
      "(?:restricoes tecnicas|technical constraints)",
      FINAL_BLOCK_STOP_LABELS_PATTERN,
    ),
    mandatoryValidations: extractTaggedListField(
      body,
      "(?:validacoes obrigatorias|mandatory validations)",
      FINAL_BLOCK_STOP_LABELS_PATTERN,
    ),
    pendingManualValidations: extractTaggedListField(
      body,
      "(?:validacoes manuais pendentes|pending manual validations|manual validations pending)",
      FINAL_BLOCK_STOP_LABELS_PATTERN,
    ),
    knownRisks: extractTaggedListField(
      body,
      "(?:riscos conhecidos|known risks)",
      FINAL_BLOCK_STOP_LABELS_PATTERN,
    ),
  };

  const taggedTitle = extractTaggedField(
    body,
    "(?:titulo|title)",
    FINAL_BLOCK_STOP_LABELS_PATTERN,
  );
  if (
    taggedTitle &&
    (!title || hasInlineFieldMarker(title, FINAL_BLOCK_STOP_LABELS_PATTERN))
  ) {
    title = taggedTitle;
  }

  const taggedSummary = extractTaggedField(
    body,
    "(?:resumo|summary)",
    FINAL_BLOCK_STOP_LABELS_PATTERN,
  );
  if (taggedSummary && (!summary || hasInlineFieldMarker(summary, FINAL_BLOCK_STOP_LABELS_PATTERN))) {
    summary = taggedSummary;
  }

  if (actions.size === 0) {
    for (const action of parseFinalActionsFromBody(body)) {
      actions.set(action.id, action);
    }
  }

  if (!title || !summary) {
    return null;
  }

  const finalBlock: PlanSpecFinalBlock = {
    title,
    summary,
    outline,
    actions: actions.size > 0 ? [...actions.values()] : [...DEFAULT_FINAL_ACTIONS],
  };

  if (isFinalProtocolTemplate(finalBlock)) {
    return null;
  }

  return finalBlock;
};

const parseFinalAction = (line: string): PlanSpecFinalAction | null => {
  const normalized = line
    .replace(/^(?:[-*]|\d+[.)])\s*/u, "")
    .trim()
    .toLowerCase();
  const compact = normalized.replace(/[^a-z0-9]+/gu, "");

  if (!normalized) {
    return null;
  }

  if (
    normalized.includes("criar spec") ||
    normalized.includes("create spec") ||
    compact.includes("criarspec") ||
    compact.includes("createspec")
  ) {
    return {
      id: "create-spec",
      label: "Criar spec",
    };
  }

  if (normalized.includes("refinar") || normalized.includes("refine") || compact.includes("refinar")) {
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

const parseFinalActionsFromBody = (body: string): PlanSpecFinalAction[] => {
  const actions = new Map<PlanSpecFinalActionId, PlanSpecFinalAction>();

  const bulletCandidates = body
    .replace(/\r\n?/gu, "\n")
    .split(/(?=(?:[-*]|\d+[.)])\s*)/gu)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  for (const candidate of bulletCandidates) {
    const parsedAction = parseFinalAction(candidate);
    if (parsedAction) {
      actions.set(parsedAction.id, parsedAction);
    }
  }

  if (actions.size > 0) {
    return [...actions.values()];
  }

  const actionSection = extractTaggedField(body, "(?:a[cç][oõ]es|actions)");
  if (!actionSection) {
    return [];
  }

  const compactActionSection = toCompactComparableText(actionSection);
  if (compactActionSection.includes("criarspec") || compactActionSection.includes("createspec")) {
    actions.set("create-spec", { id: "create-spec", label: "Criar spec" });
  }
  if (compactActionSection.includes("refinar") || compactActionSection.includes("refine")) {
    actions.set("refine", { id: "refine", label: "Refinar" });
  }
  if (compactActionSection.includes("cancelar") || compactActionSection.includes("cancel")) {
    actions.set("cancel", { id: "cancel", label: "Cancelar" });
  }

  return [...actions.values()];
};

const extractQuestionPromptFromBody = (body: string): string | null => {
  const taggedPrompt = extractTaggedField(body, "(?:pergunta|question)", "(?:op[cç][oõ]es|options)");
  if (taggedPrompt) {
    const prompt = extractQuestionPrompt(taggedPrompt);
    if (prompt) {
      return prompt;
    }
  }

  const lines = normalizeLines(body);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || isOptionLine(trimmed)) {
      continue;
    }
    if (/^(?:op[cç][oõ]es|options)\s*:/iu.test(trimmed)) {
      continue;
    }

    return extractQuestionPrompt(trimmed) || null;
  }

  return null;
};

const extractQuestionPrompt = (value: string): string => {
  const withoutOptionsSection = value.replace(/(?:op[cç][oõ]es|options)\s*:.*$/iu, "");
  return cleanupInlineSegment(withoutOptionsSection);
};

const extractTaggedField = (
  body: string,
  labelsPattern: string,
  stopLabelsPattern?: string,
): string | null => {
  const extractedBlock = extractTaggedBlock(body, labelsPattern, stopLabelsPattern);
  if (!extractedBlock) {
    return null;
  }

  const cleaned = cleanupInlineSegment(extractedBlock);
  return cleaned || null;
};

const extractTaggedListField = (
  body: string,
  labelsPattern: string,
  stopLabelsPattern?: string,
): string[] => {
  const extractedBlock = extractTaggedBlock(body, labelsPattern, stopLabelsPattern);
  if (!extractedBlock) {
    return [];
  }

  const listItems = extractedBlock
    .replace(/\r\n?/gu, "\n")
    .split("\n")
    .map((line) => normalizeStructuredListItem(line))
    .filter((line): line is string => Boolean(line));

  if (listItems.length === 0) {
    const inlineItem = normalizeStructuredListItem(extractedBlock);
    return inlineItem ? [inlineItem] : [];
  }

  return listItems;
};

const extractTaggedBlock = (
  body: string,
  labelsPattern: string,
  stopLabelsPattern?: string,
): string | null => {
  const pattern = stopLabelsPattern
    ? new RegExp(
        `(?:${labelsPattern})\\s*:\\s*([\\s\\S]*?)(?=(?:${stopLabelsPattern})\\s*:|$)`,
        "iu",
      )
    : new RegExp(`(?:${labelsPattern})\\s*:\\s*([\\s\\S]*)$`, "iu");
  const match = body.match(pattern);
  if (!match || match[1] === undefined) {
    return null;
  }

  const cleaned = cleanupBlockSegment(match[1]);
  return cleaned || null;
};

const cleanupInlineSegment = (value: string): string => {
  return value.replace(/\s+/gu, " ").trim();
};

const cleanupBlockSegment = (value: string): string => {
  return value
    .replace(/\r\n?/gu, "\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
};

const normalizeStructuredListItem = (value: string): string | null => {
  const cleaned = cleanupInlineSegment(value.replace(/^(?:[-*]|\d+[.)])\s*/u, ""));
  if (!cleaned) {
    return null;
  }

  const compact = toCompactComparableText(cleaned);
  if (compact === "nenhum" || compact === "nenhuma" || compact === "naoaplica" || compact === "na") {
    return null;
  }

  return cleaned;
};

const hasInlineFieldMarker = (value: string, fieldPattern: string): boolean => {
  return new RegExp(`${fieldPattern}\\s*:`, "iu").test(value);
};

const isQuestionProtocolTemplate = (question: PlanSpecQuestionBlock): boolean => {
  const promptCompact = toCompactComparableText(question.prompt);
  const hasTemplatePrompt = promptCompact.includes("perguntaobjetiva");
  if (!hasTemplatePrompt) {
    return false;
  }

  return question.options.some((option) => {
    const valueCompact = toCompactComparableText(option.value);
    const labelCompact = toCompactComparableText(option.label);
    return (
      valueCompact.startsWith("slugopcao") ||
      labelCompact.includes("rotuloopcao") ||
      labelCompact.includes("optionlabel")
    );
  });
};

const isFinalProtocolTemplate = (finalBlock: PlanSpecFinalBlock): boolean => {
  const titleCompact = toCompactComparableText(finalBlock.title);
  const summaryCompact = toCompactComparableText(finalBlock.summary);

  return titleCompact.includes("titulofinaldaspec") && summaryCompact.includes("resumofinalobjetivo");
};

const normalizeComparableText = (value: string): string => {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase();
};

const toCompactComparableText = (value: string): string => {
  return normalizeComparableText(value).replace(/[^a-z0-9]+/gu, "");
};

const normalizeLines = (value: string): string[] => {
  return value.replace(/\r\n?/gu, "\n").split("\n");
};

const normalizePlanSpecChunk = (value: string): string => {
  const normalized = value.replace(/\r\n?/gu, "\n");
  return stripPlanSpecTerminalArtifacts(normalized);
};

const stripPlanSpecTerminalArtifacts = (value: string): string => {
  const withoutAnsi = value.replace(ANSI_ESCAPE_PATTERN, "");
  const withoutOrphanParameterizedCsi = withoutAnsi.replace(ORPHAN_PARAMETERIZED_CSI_PATTERN, "");
  const withoutOrphanCsi = withoutOrphanParameterizedCsi.replace(ORPHAN_PARAMETERLESS_CSI_PATTERN, "");
  return withoutOrphanCsi.replace(CONTROL_CHAR_PATTERN, "");
};
