import { createHash } from "node:crypto";
import { constants as fsConstants, promises as fs } from "node:fs";
import path from "node:path";
import { GitVersioning, GitCliVersioning } from "./git-client.js";
import {
  WorkflowImprovementTicketCandidate,
  WorkflowImprovementTicketLimitationCode,
  WorkflowImprovementTicketPublicationResult,
  WorkflowImprovementTicketTargetRepoKind,
} from "../types/workflow-improvement-ticket.js";

const TARGET_REPO_NAME = "codex-flow-runner";
const TICKET_SOURCE_SPEC_CANONICAL_PATTERN =
  /^\s*-\s*Source spec canonical path(?:\s*\(when applicable\))?\s*:\s*(.+?)\s*$/imu;
const TICKET_SOURCE_SPEC_PATTERN =
  /^\s*-\s*Source spec(?:\s*\(when applicable\))?\s*:\s*(.+?)\s*$/imu;
const TICKET_GAP_FINGERPRINTS_PATTERN =
  /^\s*-\s*Systemic gap fingerprints\s*:\s*(.+?)\s*$/imu;
const WORKFLOW_REPO_RELATIVE_ROOTS = [
  "AGENTS.md",
  "DOCUMENTATION.md",
  "INTERNAL_TICKETS.md",
  "PLANS.md",
  "SPECS.md",
  "README.md",
  "package.json",
  "tsconfig.json",
  "src/",
  "prompts/",
  "execplans/",
  "tickets/templates/",
  "docs/workflows/",
  "docs/checkups/",
  "docs/specs/templates/",
] as const;

export interface WorkflowImprovementTicketPublisher {
  publish(
    candidate: WorkflowImprovementTicketCandidate,
  ): Promise<WorkflowImprovementTicketPublicationResult>;
}

interface WorkflowImprovementTicketPublisherDependencies {
  now: () => Date;
  createGitVersioning: (repoPath: string) => GitVersioning;
}

interface ResolvedTargetRepo {
  kind: WorkflowImprovementTicketTargetRepoKind;
  path: string;
  displayPath: string;
}

interface ReusedWorkflowImprovementTicket {
  ticketFileName: string;
  ticketPath: string;
}

export const createWorkflowImprovementNotNeededResult = (
  detail = "Nenhum gap sistemico elegivel exigiu ticket transversal nesta execucao.",
): WorkflowImprovementTicketPublicationResult => ({
  status: "not-needed",
  targetRepoKind: "unresolved",
  targetRepoPath: null,
  targetRepoDisplayPath: null,
  ticketFileName: null,
  ticketPath: null,
  detail,
  limitationCode: null,
  commitHash: null,
  pushUpstream: null,
  commitPushId: null,
  gapFingerprints: [],
});

export class FileSystemWorkflowImprovementTicketPublisher
  implements WorkflowImprovementTicketPublisher
{
  private readonly dependencies: WorkflowImprovementTicketPublisherDependencies;

  constructor(dependencies: Partial<WorkflowImprovementTicketPublisherDependencies> = {}) {
    this.dependencies = {
      now: () => new Date(),
      createGitVersioning: (repoPath) => new GitCliVersioning(repoPath),
      ...dependencies,
    };
  }

  async publish(
    candidate: WorkflowImprovementTicketCandidate,
  ): Promise<WorkflowImprovementTicketPublicationResult> {
    const targetRepo = await this.resolveTargetRepo(candidate);
    if ("status" in targetRepo) {
      return targetRepo;
    }

    const validatedTarget = await this.validateTargetRepo(candidate, targetRepo);
    if ("status" in validatedTarget) {
      return validatedTarget;
    }

    const reusedTicket = await this.findReusableTicket(candidate, targetRepo);
    if (reusedTicket) {
      return {
        status: "reused-open-ticket",
        targetRepoKind: targetRepo.kind,
        targetRepoPath: targetRepo.path,
        targetRepoDisplayPath: targetRepo.displayPath,
        ticketFileName: reusedTicket.ticketFileName,
        ticketPath: reusedTicket.ticketPath,
        detail:
          "Ticket transversal ja existia aberto para a mesma spec com sobreposicao de gaps sistemicos.",
        limitationCode: null,
        commitHash: null,
        pushUpstream: null,
        commitPushId: null,
        gapFingerprints: [...candidate.gapFingerprints],
      };
    }

    const ticketFileName = this.buildTicketFileName(candidate);
    const ticketPath = path.posix.join("tickets/open", ticketFileName);
    const ticketAbsolutePath = path.join(targetRepo.path, ...ticketPath.split("/"));
    const ticketContent = this.renderTicketContent(candidate, targetRepo);

    const writeResult = await this.writeTicketAtomically(ticketAbsolutePath, ticketContent);
    if (writeResult !== null) {
      return this.buildOperationalLimitationResult(
        candidate,
        targetRepo,
        "ticket-write-failed",
        `Falha ao materializar ticket transversal em ${ticketPath}: ${writeResult}`,
        {
          ticketFileName,
          ticketPath,
        },
      );
    }

    try {
      const evidence = await this.dependencies.createGitVersioning(targetRepo.path).commitAndPushPaths(
        [ticketPath],
        `chore(tickets): open workflow improvement for ${candidate.sourceSpecFileName}`,
        [
          `Source spec: ${candidate.sourceSpecPath}`,
          `Systemic gap fingerprints: ${candidate.gapFingerprints.join(", ") || "none"}`,
        ],
      );

      if (!evidence) {
        return this.buildOperationalLimitationResult(
          candidate,
          targetRepo,
          "git-publish-failed",
          `Ticket transversal ${ticketPath} foi materializado, mas nao houve alteracao staged para commit/push dedicado.`,
          {
            ticketFileName,
            ticketPath,
          },
        );
      }

      return {
        status: "created-and-pushed",
        targetRepoKind: targetRepo.kind,
        targetRepoPath: targetRepo.path,
        targetRepoDisplayPath: targetRepo.displayPath,
        ticketFileName,
        ticketPath,
        detail: `Ticket transversal publicado com commit/push em ${ticketPath}.`,
        limitationCode: null,
        commitHash: evidence.commitHash,
        pushUpstream: evidence.upstream,
        commitPushId: evidence.commitPushId,
        gapFingerprints: [...candidate.gapFingerprints],
      };
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      return this.buildOperationalLimitationResult(
        candidate,
        targetRepo,
        "git-publish-failed",
        `Ticket transversal ${ticketPath} foi materializado localmente, mas o publish git falhou: ${details}`,
        {
          ticketFileName,
          ticketPath,
        },
      );
    }
  }

  private async resolveTargetRepo(
    candidate: WorkflowImprovementTicketCandidate,
  ): Promise<ResolvedTargetRepo | WorkflowImprovementTicketPublicationResult> {
    if (candidate.activeProjectName === TARGET_REPO_NAME) {
      return {
        kind: "current-project",
        path: candidate.activeProjectPath,
        displayPath: ".",
      };
    }

    const siblingRepoPath = path.resolve(candidate.activeProjectPath, "..", TARGET_REPO_NAME);
    try {
      await fs.access(siblingRepoPath, fsConstants.R_OK);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      const reason =
        code === "ENOENT"
          ? `Repositorio ${TARGET_REPO_NAME} nao encontrado em ../${TARGET_REPO_NAME}.`
          : `Repositorio ${TARGET_REPO_NAME} indisponivel em ../${TARGET_REPO_NAME}.`;
      return this.buildOperationalLimitationResult(
        candidate,
        {
          kind: "workflow-sibling",
          path: siblingRepoPath,
          displayPath: `../${TARGET_REPO_NAME}`,
        },
        code === "ENOENT" ? "target-repo-missing" : "target-repo-inaccessible",
        reason,
      );
    }

    return {
      kind: "workflow-sibling",
      path: siblingRepoPath,
      displayPath: normalizeTargetRepoDisplayPath(
        path.relative(candidate.activeProjectPath, siblingRepoPath),
      ),
    };
  }

  private async validateTargetRepo(
    candidate: WorkflowImprovementTicketCandidate,
    targetRepo: ResolvedTargetRepo,
  ): Promise<ResolvedTargetRepo | WorkflowImprovementTicketPublicationResult> {
    const gitPath = path.join(targetRepo.path, ".git");
    const openTicketsPath = path.join(targetRepo.path, "tickets", "open");

    try {
      await fs.access(gitPath, fsConstants.R_OK);
    } catch (error) {
      return this.buildOperationalLimitationResult(
        candidate,
        targetRepo,
        classifyRepoAccessError(error, "target-repo-invalid"),
        `Repositorio alvo ${targetRepo.displayPath} nao possui estrutura git acessivel.`,
      );
    }

    try {
      await fs.access(openTicketsPath, fsConstants.R_OK | fsConstants.W_OK);
    } catch (error) {
      return this.buildOperationalLimitationResult(
        candidate,
        targetRepo,
        classifyRepoAccessError(error, "target-repo-invalid"),
        `Repositorio alvo ${targetRepo.displayPath} nao possui tickets/open/ gravavel.`,
      );
    }

    return targetRepo;
  }

  private async findReusableTicket(
    candidate: WorkflowImprovementTicketCandidate,
    targetRepo: ResolvedTargetRepo,
  ): Promise<ReusedWorkflowImprovementTicket | null> {
    const openTicketsPath = path.join(targetRepo.path, "tickets", "open");
    const openTicketEntries = await fs.readdir(openTicketsPath, { withFileTypes: true });

    for (const entry of openTicketEntries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) {
        continue;
      }

      const ticketPath = path.posix.join("tickets/open", entry.name);
      const ticketContent = await fs.readFile(
        path.join(openTicketsPath, entry.name),
        "utf8",
      );
      const sourceSpec = extractTicketCanonicalSourceSpec(ticketContent);
      if (sourceSpec !== candidate.sourceSpecPath) {
        continue;
      }

      const fingerprints = extractTicketGapFingerprints(ticketContent);
      if (!hasFingerprintOverlap(candidate.gapFingerprints, fingerprints)) {
        continue;
      }

      return {
        ticketFileName: entry.name,
        ticketPath,
      };
    }

    return null;
  }

  private buildTicketFileName(candidate: WorkflowImprovementTicketCandidate): string {
    const datePrefix = this.dependencies.now().toISOString().slice(0, 10);
    const specSlug = normalizeSlug(candidate.sourceSpecFileName.replace(/\.md$/u, ""));
    const fingerprintHash = createHash("sha1")
      .update(candidate.sourceSpecPath)
      .update("\n")
      .update(candidate.gapFingerprints.join("\n"))
      .digest("hex")
      .slice(0, 8);

    return `${datePrefix}-workflow-improvement-${specSlug}-${fingerprintHash}.md`;
  }

  private renderTicketContent(
    candidate: WorkflowImprovementTicketCandidate,
    targetRepo: ResolvedTargetRepo,
  ): string {
    const createdAtUtc = formatTicketTimestamp(this.dependencies.now());
    const analysisStageLabel = describeAnalysisStage(candidate.analysisStage);
    const workflowArea = `${candidate.analysisStage} -> workflow-ticket-publication`;
    const isPreRunAllRetrospective =
      candidate.analysisStage === "spec-ticket-derivation-retrospective";
    const activeProjectWorkspacePath = normalizeWorkspaceRelativePath(
      path.relative(targetRepo.path, candidate.activeProjectPath),
    );
    const sourceRequirements =
      candidate.sourceRequirements.length > 0 ? candidate.sourceRequirements.join(", ") : "";
    const inheritedAssumptions =
      candidate.inheritedAssumptionsDefaults.length > 0
        ? candidate.inheritedAssumptionsDefaults.join("; ")
        : "";
    const sourceSpecDisplayPath = buildProjectQualifiedPath(
      candidate.activeProjectName,
      candidate.sourceSpecPath,
    );
    const qualifiedWorkflowArtifacts = sortUniqueStrings(
      candidate.workflowArtifactsConsulted.map((artifactPath) =>
        qualifyArtifactPathForDisplay(artifactPath, candidate),
      ),
    );
    const qualifiedFollowUpTickets = sortUniqueStrings(
      candidate.followUpTicketPaths.map((ticketPath) =>
        buildProjectQualifiedPath(candidate.activeProjectName, ticketPath),
      ),
    );
    const qualifiedFindingArtifacts = sortUniqueStrings(
      candidate.findings.flatMap((finding) =>
        finding.affectedArtifactPaths.map((artifactPath) =>
          qualifyArtifactPathForDisplay(artifactPath, candidate),
        ),
      ),
    );
    const relatedDocs = sortUniqueStrings([
      sourceSpecDisplayPath,
      ...qualifiedWorkflowArtifacts,
      ...qualifiedFollowUpTickets,
      ...qualifiedFindingArtifacts,
    ]);
    const findingSummaries = candidate.findings.map((finding) => `- ${finding.summary}`);
    const findingEvidenceLines = candidate.findings.flatMap((finding) => {
      const lines = [`- ${finding.summary}`];
      if (finding.requirementRefs.length > 0) {
        lines.push(`  - Requisitos relacionados: ${finding.requirementRefs.join(", ")}`);
      }
      if (finding.affectedArtifactPaths.length > 0) {
        const qualifiedArtifacts = sortUniqueStrings(
          finding.affectedArtifactPaths.map((artifactPath) =>
            qualifyArtifactPathForDisplay(artifactPath, candidate),
          ),
        );
        lines.push(`  - Artefatos afetados: ${qualifiedArtifacts.join(", ")}`);
      }
      if (finding.evidence.length > 0) {
        lines.push(`  - Evidencias: ${finding.evidence.join(" | ")}`);
      }
      lines.push(`  - Fingerprint: ${finding.fingerprint}`);
      return lines;
    });
    const followUpSummary =
      qualifiedFollowUpTickets.length > 0
        ? qualifiedFollowUpTickets.join(", ")
        : "fallback controlado em spec + resultado do spec-audit";
    const traceId = candidate.trace?.traceId ?? "N/A - trilha desta retrospectiva nao foi persistida";
    const requestFile = candidate.trace
      ? qualifyArtifactPathForDisplay(candidate.trace.requestPath, candidate)
      : "N/A - trilha desta retrospectiva nao foi persistida";
    const responseFile = candidate.trace
      ? qualifyArtifactPathForDisplay(candidate.trace.responsePath, candidate)
      : "N/A - trilha desta retrospectiva nao foi persistida";
    const decisionFile = candidate.trace
      ? qualifyArtifactPathForDisplay(candidate.trace.decisionPath, candidate)
      : "N/A - trilha desta retrospectiva nao foi persistida";
    const activeProjectDescription = `${candidate.activeProjectName} (${activeProjectWorkspacePath})`;
    const targetRepoDescription = `${TARGET_REPO_NAME} (${targetRepo.displayPath})`;
    const scenario = isPreRunAllRetrospective
      ? `a retrospectiva sistemica pre-run-all da spec ${candidate.sourceSpecFileName} concluiu elegibilidade automatica com input mode ${candidate.inputMode}.`
      : `a retrospectiva sistemica pos-spec-audit da spec ${candidate.sourceSpecFileName} concluiu elegibilidade automatica com input mode ${candidate.inputMode}.`;
    const problemStatement = isPreRunAllRetrospective
      ? `A retrospectiva pre-run-all da spec ${candidate.sourceSpecFileName} encontrou evidencia de que a derivacao ainda introduz backlog sistemico reaproveitavel antes do /run-all. O follow-up precisa capturar a menor correcao plausivel no proprio workflow para reduzir recorrencia em specs futuras.`
      : `A retrospectiva pos-spec-audit da spec ${candidate.sourceSpecFileName} encontrou evidencia de que o workflow atual contribuiu materialmente para gaps residuais reaproveitaveis. O follow-up precisa capturar a menor correcao plausivel no proprio workflow para reduzir recorrencia em specs futuras.`;
    const detectionSummary = isPreRunAllRetrospective
      ? "derivation-gap-analysis com high confidence antes do /run-all"
      : "workflow-gap-analysis com high confidence apos spec-audit";
    const expectedBehavior = isPreRunAllRetrospective
      ? `O workflow deve prevenir ou absorver automaticamente a causa sistemica registrada durante a retrospectiva pre-run-all, reduzindo recorrencia observada em ${candidate.sourceSpecFileName} e em specs futuras equivalentes antes do consumo da fila real.`
      : `O workflow deve prevenir ou absorver automaticamente a causa sistemica registrada, reduzindo a recorrencia observada em ${candidate.sourceSpecFileName} e em specs futuras equivalentes.`;
    const reproductionSteps = isPreRunAllRetrospective
      ? [
          `1. Executar /run_specs para ${candidate.sourceSpecFileName}.`,
          "2. Revisar o historico completo de spec-ticket-validation e o pacote final de tickets derivados antes do /run-all.",
          "3. Observar derivation-gap-analysis e confirmar o diagnostico causal com evidencia suficiente para backlog sistemico reaproveitavel.",
        ]
      : [
          `1. Executar /run_specs para ${candidate.sourceSpecFileName}.`,
          "2. Revisar o resultado de spec-audit e os follow-ups funcionais abertos para a spec auditada.",
          "3. Observar workflow-gap-analysis e confirmar o diagnostico causal com evidencia suficiente para backlog sistemico reaproveitavel.",
        ];
    const decisionLogSummary = isPreRunAllRetrospective
      ? "Ticket aberto automaticamente a partir da retrospectiva sistemica pre-run-all da derivacao - follow-up sistemico reaproveitavel identificado com high confidence."
      : "Ticket aberto automaticamente a partir da retrospectiva sistemica pos-spec-audit - follow-up sistemico reaproveitavel identificado com high confidence.";

    const closureRequirementLabel =
      candidate.sourceRequirements.length > 0
        ? candidate.sourceRequirements.join(", ")
        : "workflow-improvement-follow-up";

    return [
      `# [TICKET] Melhoria transversal de workflow derivada de ${candidate.sourceSpecTitle}`,
      "",
      "## Metadata",
      "- Status: open",
      "- Priority: P1",
      "- Severity: S2",
      `- Created at (UTC): ${createdAtUtc}`,
      "- Reporter: Codex",
      "- Owner:",
      "- Source: local-run",
      "- Parent ticket (optional):",
      "- Parent execplan (optional):",
      "- Parent commit (optional):",
      `- Analysis stage (when applicable): ${candidate.analysisStage}`,
      `- Active project (when applicable): ${activeProjectDescription}`,
      `- Target repository (when applicable): ${targetRepoDescription}`,
      `- Request ID: ${traceId}`,
      `- Source spec (when applicable): ${sourceSpecDisplayPath}`,
      `- Source spec canonical path (when applicable): ${candidate.sourceSpecPath}`,
      `- Source requirements (RFs/CAs, when applicable): ${sourceRequirements}`,
      `- Inherited assumptions/defaults (when applicable): ${inheritedAssumptions}`,
      "- Workflow root cause (required for tickets created from workflow retrospectives or post-implementation audit/review): systemic-instruction",
      `- Smallest plausible explanation (audit/review only): ${candidate.causalHypothesis}`,
      "- Remediation scope (audit/review only): generic-repository-instruction",
      `- Systemic gap fingerprints: ${JSON.stringify(candidate.gapFingerprints)}`,
      "- Related artifacts:",
      `  - Request file: ${requestFile}`,
      `  - Response file: ${responseFile}`,
      `  - Decision file: ${decisionFile}`,
      "- Related docs/execplans:",
      ...relatedDocs.map((artifactPath) => `  - ${artifactPath}`),
      "",
      "## Classificacao de risco (check-up nao funcional, quando aplicavel)",
      "- Matriz aplicavel: nao",
      "- Severidade (1-5):",
      "- Frequencia (1-5):",
      "- Custo de atraso (1-5):",
      "- Risco operacional (1-5):",
      "- Score ponderado (10-50):",
      "- Prioridade resultante (`P0` | `P1` | `P2`):",
      `- Justificativa objetiva (evidencias e impacto): gaps sistemicos observados com alta confianca durante ${analysisStageLabel}.`,
      "",
      "## Context",
      `- Workflow area: ${workflowArea}`,
      `- Scenario: ${scenario}`,
      `- Active project: ${candidate.activeProjectName}`,
      `- Target repository: ${targetRepo.displayPath}`,
      "- Path conventions: caminhos no formato `<projeto>/<path>` sao exibicoes humanas qualificadas por projeto; a chave canonica de dedupe continua em `Source spec canonical path`.",
      "- Input constraints: a publicacao deste ticket nao deve bloquear a rodada auditada; em projeto externo, o publish deve ocorrer apenas no repositorio do workflow.",
      "",
      "## Problem statement",
      problemStatement,
      "",
      "## Observed behavior",
      "- O que foi observado:",
      ...(findingSummaries.length > 0 ? findingSummaries : ["- Nenhum achado resumido."]),
      "- Frequencia (unico, recorrente, intermitente): recorrente",
      `- Como foi detectado (warning/log/test/assert): ${detectionSummary}`,
      "",
      "## Expected behavior",
      expectedBehavior,
      "",
      "## Reproduction steps",
      ...reproductionSteps,
      "",
      "## Evidence",
      `- Logs relevantes (trechos curtos e redigidos): resumo da retrospectiva = ${candidate.analysisSummary}`,
      `- Artefatos de workflow consultados: ${qualifiedWorkflowArtifacts.join(", ") || "nenhum artefato adicional registrado"}`,
      "- Warnings/codes relevantes:",
      ...findingEvidenceLines,
      `- Tickets funcionais considerados: ${followUpSummary}`,
      `- Hipotese causal consolidada: ${candidate.causalHypothesis}`,
      `- Beneficio esperado consolidado: ${candidate.benefitSummary}`,
      `- Comparativo antes/depois (se houver): fingerprints sistemicos = ${candidate.gapFingerprints.join(", ")}`,
      "",
      "## Impact assessment",
      "- Impacto funcional: novos pacotes derivados podem repetir a mesma lacuna sistemica.",
      "- Impacto operacional: o runner depende de follow-up manual para melhorar o proprio workflow.",
      "- Risco de regressao: medio, porque a correcao tende a tocar instrucoes canonicas, prompts, validacoes ou ordem das etapas compartilhadas.",
      `- Scope estimado (quais fluxos podem ser afetados): ${candidate.findings.flatMap((finding) => finding.affectedArtifactPaths).join(", ") || "artefatos canonicos do workflow"}.`,
      "",
      "## Initial hypotheses (optional)",
      `- ${candidate.causalHypothesis}`,
      "",
      "## Proposed solution (optional)",
      `- ${candidate.benefitSummary}`,
      "",
      "## Closure criteria",
      `- Requisito/RF/CA coberto: ${closureRequirementLabel}`,
      "- Evidencia observavel: a causa sistemica registrada neste ticket deixa de reaparecer em uma rodada equivalente de workflow-gap-analysis/workflow-ticket-publication, com rastreabilidade objetiva nos artefatos afetados.",
      "",
      "## Decision log",
      `- ${this.dependencies.now().toISOString().slice(0, 10)} - ${decisionLogSummary}`,
      "",
      "## Closure",
      "- Closed at (UTC):",
      "- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up",
      "- Related PR/commit/execplan:",
      "- Follow-up ticket (required when `Closure reason: split-follow-up`):",
      "",
    ].join("\n");
  }

  private async writeTicketAtomically(
    ticketAbsolutePath: string,
    content: string,
  ): Promise<string | null> {
    const tempPath = `${ticketAbsolutePath}.tmp`;
    try {
      await fs.writeFile(tempPath, content, "utf8");
      await fs.rename(tempPath, ticketAbsolutePath);
      return null;
    } catch (error) {
      await fs.rm(tempPath, { force: true }).catch(() => undefined);
      return error instanceof Error ? error.message : String(error);
    }
  }

  private buildOperationalLimitationResult(
    candidate: WorkflowImprovementTicketCandidate,
    targetRepo: Pick<ResolvedTargetRepo, "kind" | "path" | "displayPath">,
    limitationCode: WorkflowImprovementTicketLimitationCode,
    detail: string,
    ticket: {
      ticketFileName?: string;
      ticketPath?: string;
    } = {},
  ): WorkflowImprovementTicketPublicationResult {
    return {
      status: "operational-limitation",
      targetRepoKind: targetRepo.kind,
      targetRepoPath: targetRepo.path,
      targetRepoDisplayPath: targetRepo.displayPath,
      ticketFileName: ticket.ticketFileName ?? null,
      ticketPath: ticket.ticketPath ?? null,
      detail,
      limitationCode,
      commitHash: null,
      pushUpstream: null,
      commitPushId: null,
      gapFingerprints: [...candidate.gapFingerprints],
    };
  }
}

const describeAnalysisStage = (stage: WorkflowImprovementTicketCandidate["analysisStage"]): string =>
  stage === "spec-ticket-derivation-retrospective"
    ? "derivation-gap-analysis pre-run-all"
    : "workflow-gap-analysis pos-spec-audit";

const buildProjectQualifiedPath = (projectName: string, relativePath: string): string => {
  const normalizedPath = normalizePathForDisplay(relativePath);
  if (!normalizedPath || normalizedPath === ".") {
    return projectName;
  }

  if (normalizedPath.startsWith(`${projectName}/`)) {
    return normalizedPath;
  }

  return `${projectName}/${normalizedPath}`;
};

const qualifyArtifactPathForDisplay = (
  artifactPath: string,
  candidate: WorkflowImprovementTicketCandidate,
): string => {
  const normalizedPath = normalizePathForDisplay(artifactPath);
  if (!normalizedPath) {
    return normalizedPath;
  }

  if (normalizedPath.startsWith(`${candidate.activeProjectName}/`)) {
    return normalizedPath;
  }
  if (normalizedPath.startsWith(`${TARGET_REPO_NAME}/`)) {
    return normalizedPath;
  }
  if (normalizedPath.startsWith(`../${TARGET_REPO_NAME}/`)) {
    return buildProjectQualifiedPath(
      TARGET_REPO_NAME,
      normalizedPath.slice(`../${TARGET_REPO_NAME}/`.length),
    );
  }
  if (normalizedPath.startsWith(`../${candidate.activeProjectName}/`)) {
    return buildProjectQualifiedPath(
      candidate.activeProjectName,
      normalizedPath.slice(`../${candidate.activeProjectName}/`.length),
    );
  }
  if (normalizedPath.startsWith("./")) {
    return qualifyArtifactPathForDisplay(normalizedPath.slice(2), candidate);
  }
  if (normalizedPath.startsWith("../")) {
    return normalizedPath;
  }
  if (candidate.activeProjectName === TARGET_REPO_NAME) {
    return buildProjectQualifiedPath(TARGET_REPO_NAME, normalizedPath);
  }
  if (isLikelyWorkflowRepoArtifact(normalizedPath)) {
    return buildProjectQualifiedPath(TARGET_REPO_NAME, normalizedPath);
  }

  return buildProjectQualifiedPath(candidate.activeProjectName, normalizedPath);
};

const isLikelyWorkflowRepoArtifact = (artifactPath: string): boolean =>
  WORKFLOW_REPO_RELATIVE_ROOTS.some((root) =>
    root.endsWith("/") ? artifactPath.startsWith(root) : artifactPath === root,
  );

const sortUniqueStrings = (values: string[]): string[] =>
  [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right, "pt-BR"),
  );

const normalizePathForDisplay = (value: string): string =>
  value.trim().replace(/\\/gu, "/");

const normalizeWorkspaceRelativePath = (value: string): string => {
  const normalized = normalizePathForDisplay(value);
  if (!normalized || normalized === ".") {
    return ".";
  }

  return normalized;
};

const extractTicketCanonicalSourceSpec = (content: string): string | null => {
  const canonicalMatch = TICKET_SOURCE_SPEC_CANONICAL_PATTERN.exec(content);
  if (canonicalMatch?.[1]?.trim()) {
    return canonicalMatch[1].trim();
  }

  const match = TICKET_SOURCE_SPEC_PATTERN.exec(content);
  return match?.[1]?.trim() || null;
};

const extractTicketGapFingerprints = (content: string): string[] => {
  const match = TICKET_GAP_FINGERPRINTS_PATTERN.exec(content);
  if (!match?.[1]) {
    return [];
  }

  try {
    const parsed = JSON.parse(match[1]);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return [];
  }
};

const hasFingerprintOverlap = (left: string[], right: string[]): boolean => {
  const rightSet = new Set(right);
  return left.some((value) => rightSet.has(value));
};

const classifyRepoAccessError = (
  error: unknown,
  fallback: WorkflowImprovementTicketLimitationCode,
): WorkflowImprovementTicketLimitationCode => {
  const code = (error as NodeJS.ErrnoException)?.code;
  if (code === "ENOENT") {
    return fallback;
  }

  return "target-repo-inaccessible";
};

const formatTicketTimestamp = (value: Date): string => {
  const iso = value.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}Z`;
};

const normalizeTargetRepoDisplayPath = (value: string): string => {
  if (!value || value === ".") {
    return ".";
  }

  return value.split(path.sep).join("/");
};

const normalizeSlug = (value: string): string => {
  const normalized = value
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]+/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/gu, "-")
    .replace(/-{2,}/gu, "-")
    .replace(/^-+/u, "")
    .replace(/-+$/u, "");

  return normalized || "spec";
};
