import {
  targetInvestigateCaseRootCauseReviewResultSchema,
  TargetInvestigateCaseRootCauseReviewResult,
} from "../types/target-investigate-case.js";

const ANSI_ESCAPE_PATTERN =
  /[\u001B\u009B][[\]()#;?]*(?:(?:[a-zA-Z\d]*(?:;[a-zA-Z\d]*)*)?\u0007|(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~])/gu;
const CONTROL_CHAR_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu;

export class TargetInvestigateCaseRootCauseReviewParserError extends Error {
  constructor(details: string) {
    super(`Falha ao parsear a resposta do root-cause-review: ${details}`);
    this.name = "TargetInvestigateCaseRootCauseReviewParserError";
  }
}

export const parseTargetInvestigateCaseRootCauseReviewOutput = (
  output: string,
): TargetInvestigateCaseRootCauseReviewResult => {
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
    throw new TargetInvestigateCaseRootCauseReviewParserError(
      `payload JSON invalido: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const parsed = targetInvestigateCaseRootCauseReviewResultSchema.safeParse(decoded);
  if (!parsed.success) {
    throw new TargetInvestigateCaseRootCauseReviewParserError(
      parsed.error.issues.map((issue) => issue.message).join(" | "),
    );
  }

  return parsed.data;
};
