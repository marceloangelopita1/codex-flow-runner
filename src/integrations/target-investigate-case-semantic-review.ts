import { readFileSync } from "node:fs";
import path from "node:path";
import {
  normalizeTargetInvestigateCaseRelativePath,
  targetInvestigateCaseSemanticReviewResultSchema,
  TargetInvestigateCaseSemanticReviewRequest,
  TargetInvestigateCaseSemanticReviewResult,
} from "../types/target-investigate-case.js";

const ANSI_ESCAPE_PATTERN =
  /[\u001B\u009B][[\]()#;?]*(?:(?:[a-zA-Z\d]*(?:;[a-zA-Z\d]*)*)?\u0007|(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~])/gu;
const CONTROL_CHAR_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu;

export interface TargetInvestigateCaseSemanticReviewSlice {
  json_pointer: string;
  value: unknown;
}

export interface TargetInvestigateCaseSemanticReviewTargetFieldContext {
  field_path: string;
  artifact_path: string;
  json_pointer: string;
  selection_reason: string;
  extracted_value: unknown;
}

export interface TargetInvestigateCaseSemanticReviewSupportingRefContext {
  surface_id: string;
  ref: string;
  path: string;
  sha256: string;
  record_count: number;
  selection_reason: string;
  extracted_slices: TargetInvestigateCaseSemanticReviewSlice[];
}

export interface TargetInvestigateCaseSemanticReviewPromptContext {
  target_fields: TargetInvestigateCaseSemanticReviewTargetFieldContext[];
  supporting_refs: TargetInvestigateCaseSemanticReviewSupportingRefContext[];
}

export class TargetInvestigateCaseSemanticReviewContextError extends Error {
  constructor(details: string) {
    super(`Falha ao montar o contexto bounded de semantic-review: ${details}`);
    this.name = "TargetInvestigateCaseSemanticReviewContextError";
  }
}

export class TargetInvestigateCaseSemanticReviewParserError extends Error {
  constructor(details: string) {
    super(`Falha ao parsear a resposta do semantic-review: ${details}`);
    this.name = "TargetInvestigateCaseSemanticReviewParserError";
  }
}

export const buildTargetInvestigateCaseSemanticReviewPromptContext = async (
  projectPath: string,
  request: TargetInvestigateCaseSemanticReviewRequest,
): Promise<TargetInvestigateCaseSemanticReviewPromptContext> => {
  const jsonCache = new Map<string, unknown>();

  return {
    target_fields: await Promise.all(
      request.target_fields.map(async (field) => ({
        field_path: field.field_path,
        artifact_path: field.artifact_path,
        json_pointer: field.json_pointer,
        selection_reason: field.selection_reason,
        extracted_value: resolveArtifactJsonPointer({
          projectPath,
          relativePath: field.artifact_path,
          jsonPointer: field.json_pointer,
          cache: jsonCache,
        }),
      })),
    ),
    supporting_refs: await Promise.all(
      request.supporting_refs.map(async (entry) => ({
        surface_id: entry.surface_id,
        ref: entry.ref,
        path: entry.path,
        sha256: entry.sha256,
        record_count: entry.record_count,
        selection_reason: entry.selection_reason,
        extracted_slices: await Promise.all(
          entry.json_pointers.map(async (jsonPointer) => ({
            json_pointer: jsonPointer,
            value: resolveArtifactJsonPointer({
              projectPath,
              relativePath: entry.path,
              jsonPointer,
              cache: jsonCache,
            }),
          })),
        ),
      })),
    ),
  };
};

export const parseTargetInvestigateCaseSemanticReviewOutput = (
  output: string,
): TargetInvestigateCaseSemanticReviewResult => {
  const normalized = output
    .replace(ANSI_ESCAPE_PATTERN, "")
    .replace(CONTROL_CHAR_PATTERN, "")
    .replace(/\r\n?/gu, "\n")
    .trim();
  const fenced = normalized.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/iu)?.[1]?.trim() ?? normalized;

  let decoded: unknown;
  try {
    decoded = JSON.parse(fenced);
  } catch (error) {
    throw new TargetInvestigateCaseSemanticReviewParserError(
      `payload JSON invalido: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const parsed = targetInvestigateCaseSemanticReviewResultSchema.safeParse(decoded);
  if (!parsed.success) {
    throw new TargetInvestigateCaseSemanticReviewParserError(
      parsed.error.issues.map((issue) => issue.message).join(" | "),
    );
  }

  return parsed.data;
};

const resolveArtifactJsonPointer = (params: {
  projectPath: string;
  relativePath: string;
  jsonPointer: string;
  cache: Map<string, unknown>;
}): unknown => {
  const document = loadJsonArtifact(params.projectPath, params.relativePath, params.cache);
  try {
    return resolveJsonPointer(document, params.jsonPointer);
  } catch (error) {
    throw new TargetInvestigateCaseSemanticReviewContextError(
      `${params.relativePath}#${params.jsonPointer}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};

const loadJsonArtifact = (
  projectPath: string,
  relativePath: string,
  cache: Map<string, unknown>,
): unknown => {
  const normalized = normalizeRelativePath(relativePath);
  const cached = cache.get(normalized);
  if (cached !== undefined) {
    return cached;
  }

  const absolutePath = path.join(projectPath, ...normalized.split("/"));
  const raw = readFileSyncUtf8(absolutePath, normalized);
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch (error) {
    throw new TargetInvestigateCaseSemanticReviewContextError(
      `${normalized} nao contem JSON valido: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  cache.set(normalized, decoded);
  return decoded;
};

const resolveJsonPointer = (document: unknown, pointer: string): unknown => {
  if (!pointer.startsWith("/")) {
    throw new Error("JSON pointer deve comecar com `/`.");
  }

  const segments = pointer
    .split("/")
    .slice(1)
    .map((segment) => segment.replace(/~1/gu, "/").replace(/~0/gu, "~"));

  let current: unknown = document;
  for (const segment of segments) {
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index) || index < 0 || index >= current.length) {
        throw new Error(`indice fora do intervalo em array: ${segment}.`);
      }
      current = current[index];
      continue;
    }

    if (!current || typeof current !== "object") {
      throw new Error(`segmento ausente no documento: ${segment}.`);
    }

    const value = (current as Record<string, unknown>)[segment];
    if (value === undefined) {
      throw new Error(`segmento ausente no objeto: ${segment}.`);
    }
    current = value;
  }

  return current;
};

const normalizeRelativePath = (value: string): string => {
  const normalized = normalizeTargetInvestigateCaseRelativePath(value.trim());
  if (
    !normalized ||
    normalized.startsWith("/") ||
    normalized.startsWith("\\") ||
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.includes("/../")
  ) {
    throw new TargetInvestigateCaseSemanticReviewContextError(
      `caminho relativo invalido: ${value}.`,
    );
  }

  return normalized;
};

const readFileSyncUtf8 = (absolutePath: string, relativePath: string): string => {
  try {
    return readFileSync(absolutePath, "utf8");
  } catch (error) {
    throw new TargetInvestigateCaseSemanticReviewContextError(
      `${relativePath} nao pode ser lido: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};
