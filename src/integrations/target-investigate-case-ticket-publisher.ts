import { promises as fs } from "node:fs";
import path from "node:path";
import {
  TargetInvestigateCaseTicketPublicationRequest,
  TargetInvestigateCaseTicketPublicationResult,
  TargetInvestigateCaseTicketPublisher,
} from "../core/target-investigate-case.js";
import { GitVersioning } from "./git-client.js";

interface TargetInvestigateCaseTicketPublisherDependencies {
  now: () => Date;
}

interface TicketPublicationPolicy {
  internalTicketTemplatePath: string;
  causalBlockSourcePath: string;
  mandatoryCausalBlockSources: readonly string[];
  versionedArtifactsDefault: readonly string[];
  nonVersionedArtifactsDefault: readonly string[];
  semanticAuthority: "target-project";
  finalPublicationAuthority: "runner";
}

export class FileSystemTargetInvestigateCaseTicketPublisher
  implements TargetInvestigateCaseTicketPublisher
{
  private readonly dependencies: TargetInvestigateCaseTicketPublisherDependencies;

  constructor(
    private readonly projectPath: string,
    private readonly gitVersioning: GitVersioning,
    dependencies: Partial<TargetInvestigateCaseTicketPublisherDependencies> = {},
  ) {
    this.dependencies = {
      now: () => new Date(),
      ...dependencies,
    };
  }

  async publish(
    request: TargetInvestigateCaseTicketPublicationRequest,
  ): Promise<TargetInvestigateCaseTicketPublicationResult> {
    if (request.targetProject.path !== this.projectPath) {
      throw new Error(
        `Publisher de case-investigation ligado a ${this.projectPath}, mas recebeu ${request.targetProject.path}.`,
      );
    }

    const policy = this.requirePublicationPolicy(request);
    await this.assertTemplateCompatibility(policy);

    const ticketSlug = buildTicketSlug(request);
    const existingTicketPath = await this.findExistingTicketPath(ticketSlug);
    if (existingTicketPath) {
      return {
        ticketPath: existingTicketPath,
      };
    }

    const ticketPath = path.posix.join(
      "tickets/open",
      `${formatDateUtc(this.dependencies.now())}-${ticketSlug}.md`,
    );
    const absoluteTicketPath = path.join(this.projectPath, ...ticketPath.split("/"));
    await fs.mkdir(path.dirname(absoluteTicketPath), { recursive: true });
    const createdAt = this.dependencies.now();
    await fs.writeFile(
      absoluteTicketPath,
      renderTicketContent(request, policy, ticketPath, createdAt),
      {
        encoding: "utf8",
        flag: "wx",
      },
    );

    await this.gitVersioning.commitAndPushPaths(
      [ticketPath],
      `chore(tickets): open ${path.posix.basename(ticketPath, ".md")}`,
      [
        `Flow: /target_investigate_case`,
        `Case-ref: ${request.caseResolution.case_ref}`,
      ],
    );

    return {
      ticketPath,
    };
  }

  private requirePublicationPolicy(
    request: TargetInvestigateCaseTicketPublicationRequest,
  ): TicketPublicationPolicy {
    const policy = request.manifest.ticketPublicationPolicy;
    if (!policy) {
      throw new Error(
        "Manifesto sem ticketPublicationPolicy: o runner nao pode materializar ticket elegivel.",
      );
    }

    if (
      policy.versionedArtifactsDefault.length !== 1 ||
      policy.versionedArtifactsDefault[0] !== "ticket"
    ) {
      throw new Error(
        "ticketPublicationPolicy.versionedArtifactsDefault precisa declarar apenas `ticket`.",
      );
    }

    return policy;
  }

  private async assertTemplateCompatibility(policy: TicketPublicationPolicy): Promise<void> {
    const internalTemplate = await fs.readFile(
      path.join(this.projectPath, ...policy.internalTicketTemplatePath.split("/")),
      "utf8",
    );
    const causalTemplate = await fs.readFile(
      path.join(this.projectPath, ...policy.causalBlockSourcePath.split("/")),
      "utf8",
    );

    const causalHeadings = extractMarkdownHeadings(causalTemplate);
    const internalHeadings = extractMarkdownHeadings(internalTemplate);

    const block = causalHeadings.filter(
      (entry) => entry === "## Investigacao Causal" || entry.startsWith("### "),
    );
    for (const heading of block) {
      if (!internalHeadings.includes(heading)) {
        throw new Error(
          `Template interno de ticket nao contem o heading obrigatorio ${heading}.`,
        );
      }
    }
  }

  private async findExistingTicketPath(slug: string): Promise<string | null> {
    for (const directory of ["tickets/open", "tickets/closed"] as const) {
      const absoluteDirectory = path.join(this.projectPath, ...directory.split("/"));
      let entries: string[] = [];
      try {
        entries = await fs.readdir(absoluteDirectory);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          continue;
        }
        throw error;
      }

      const match = entries
        .filter((entry) => entry.endsWith(`-${slug}.md`))
        .sort((left, right) => left.localeCompare(right, "pt-BR"))[0];
      if (match) {
        return path.posix.join(directory, match);
      }
    }

    return null;
  }
}

const renderTicketContent = (
  request: TargetInvestigateCaseTicketPublicationRequest,
  policy: TicketPublicationPolicy,
  ticketPath: string,
  createdAt: Date,
): string => {
  const requestIdHint = request.evidenceBundle.replay.request_id ?? "N/A";
  const investigationInputs = [
    `Comando canonico: ${request.normalizedInput.canonicalCommand}`,
    `Workflow: ${request.normalizedInput.workflow ?? "N/A"}`,
    `Request ID: ${request.normalizedInput.requestId ?? "N/A"}`,
    `Window: ${request.normalizedInput.window ?? "N/A"}`,
    `Symptom: ${request.normalizedInput.symptom ?? "N/A"}`,
  ];
  const generalizationBasis =
    request.assessment.generalization_basis.length > 0
      ? request.assessment.generalization_basis.map((entry) => `${entry.code}: ${entry.summary}`)
      : ["N/A"];
  const overfitVetoes =
    request.assessment.overfit_vetoes.length > 0
      ? request.assessment.overfit_vetoes.map(
          (entry) => `${entry.code}: ${entry.reason} (blocking=${entry.blocking ? "yes" : "no"})`,
        )
      : ["Nenhum veto registrado."];
  const blockers =
    (request.assessment.blockers?.length ?? 0) > 0
      ? request.assessment.blockers.map(
          (entry) =>
            `${entry.code}: ${entry.summary} (source=${entry.source}; member=${entry.member ?? "N/A"})`,
        )
      : ["Nenhum blocker registrado."];
  const capabilityLimits =
    (request.assessment.capability_limits?.length ?? 0) > 0
      ? request.assessment.capability_limits.map((entry) => `${entry.code}: ${entry.summary}`)
      : ["Nenhum capability_limit registrado."];
  const replayReadiness = request.caseResolution.replay_readiness;
  const attemptCandidates = request.caseResolution.attempt_candidates;

  return [
    `# [TICKET] ${request.assessment.publication_recommendation.suggested_title}`,
    "",
    "## Metadata",
    "",
    "- Status: open",
    "- Priority: P1",
    "- Severity: S2",
    `- Created at (UTC): ${formatTimestampUtc(createdAt)}`,
    "- Reporter: codex-flow-runner",
    "- Owner:",
    "- Source: production-observation",
    "- Parent spec: N/A",
    "- Parent ticket: N/A",
    "- Parent execplan: N/A",
    "- Parent commit: N/A",
    `- Request ID: ${request.normalizedInput.requestId ?? request.evidenceBundle.replay.request_id ?? "N/A"}`,
    "- Related artifacts:",
    `  - Request file: ${request.evidenceBundle.replay.request_id ?? "N/A"}`,
    `  - Response file: ${request.summary.dossier_path}`,
    "  - Log file: N/A",
    "- Related docs/execplans:",
    `  - ${request.manifest.supportingArtifacts.docs[0] ?? request.summary.dossier_path}`,
    `  - ${policy.internalTicketTemplatePath}`,
    `  - ${policy.causalBlockSourcePath}`,
    "",
    "## Context",
    "",
    `- Workflow/extractor area: ${request.normalizedInput.workflow ?? "case-investigation"}`,
    `- Scenario: ${request.assessment.ticket_decision_reason}`,
    "- Input constraints:",
    "  - respeitar a autoridade semantica do projeto alvo e a publication final do runner",
    `  - manter artefatos versionados restritos a ${policy.versionedArtifactsDefault.join(", ")}`,
    "",
    "## Problem statement",
    "",
    request.assessment.publication_recommendation.proposed_ticket_scope,
    "",
    "## Observed behavior",
    "",
    "- O que foi observado:",
    `  - ${request.assessment.causal_surface.summary}`,
    `  - ${request.assessment.publication_recommendation.reason}`,
    "- Frequencia (unico, recorrente, intermitente): recorrente o bastante para ticket generalizavel segundo a rodada atual",
    "- Como foi detectado (warning/log/test/assert): investigacao causal guiada por capability `case-investigation`",
    "",
    "## Expected behavior",
    "",
    "O projeto alvo deve eliminar a superficie causal identificada sem depender deste caso isolado e sem ampliar a persistencia de artefatos sensiveis.",
    "",
    "## Reproduction steps",
    "",
    "1. Reexecutar o caso com a capability `case-investigation` e os mesmos seletores normalizados.",
    "2. Confirmar os vereditos semanticos registrados nesta rodada e a superficie causal apontada pelo dossier local.",
    "3. Validar a correcao na menor superficie causal executavel indicada neste ticket.",
    "",
    "## Evidence",
    "",
    "- Logs relevantes (trechos curtos e redigidos): N/A",
    "- Warnings/codes relevantes:",
    `  - publication_status=${request.summary.publication_status}`,
    `  - overall_outcome=${request.summary.overall_outcome}`,
    `  - causal_surface=${request.assessment.causal_surface.owner}/${request.assessment.causal_surface.kind}`,
    "- Comparativo antes/depois (se houver): N/A",
    "",
    "## Impact assessment",
    "",
    `- Impacto funcional: ${request.assessment.ticket_decision_reason}`,
    "- Impacto operacional: a capability conseguiu generalizar o caso e recomendou publication automatica.",
    "- Risco de regressao: medio, porque a menor superficie causal ainda depende de evidencia investigativa especializada.",
    `- Scope estimado (quais fluxos podem ser afetados): ${request.assessment.causal_surface.systems.join(", ")}`,
    "",
    "## Initial hypotheses (optional)",
    "",
    `- ${request.assessment.publication_recommendation.proposed_ticket_scope}`,
    "",
    "## Proposed solution (optional)",
    "",
    `- ${request.assessment.publication_recommendation.proposed_ticket_scope}`,
    "",
    "## Investigacao Causal",
    "",
    "Obrigatorio preencher esta secao quando `Source: production-observation`. Para outras fontes, marcar `N/A` explicitamente quando nao se aplicar.",
    "",
    "### Resolved case",
    "",
    `- ${request.caseResolution.resolved_case.ref}: ${request.caseResolution.resolved_case.summary}`,
    "",
    "### Resolved attempt",
    "",
    `- ${request.caseResolution.attempt_resolution.attempt_ref ?? request.caseResolution.attempt_resolution.status}: ${request.caseResolution.attempt_resolution.reason}`,
    `- attempt_candidates_status: ${attemptCandidates?.status ?? "N/A"}`,
    `- attempt_candidate_request_ids: ${attemptCandidates?.candidate_request_ids.join(", ") || "N/A"}`,
    `- selected_attempt_candidate_request_id: ${attemptCandidates?.selected_request_id ?? "N/A"}`,
    "",
    "### Investigation inputs",
    "",
    ...investigationInputs.map((entry) => `- ${entry}`),
    "",
    "### Replay used",
    "",
    `- ${request.evidenceBundle.replay.used ? "Sim" : "Nao"}; mode=${request.evidenceBundle.replay.mode}; requestId=${request.evidenceBundle.replay.request_id ?? "N/A"}; updateDb=${request.evidenceBundle.replay.update_db ?? "N/A"}`,
    `- replay_readiness_state: ${replayReadiness?.state ?? "N/A"}; required=${replayReadiness?.required ?? "N/A"}; reason_code=${replayReadiness?.reason_code ?? "N/A"}`,
    `- replay_readiness_next_step: ${replayReadiness?.next_step ? `${replayReadiness.next_step.code} - ${replayReadiness.next_step.summary}` : "N/A"}`,
    "",
    "### Verdicts",
    "",
    `- houve_gap_real: ${request.assessment.houve_gap_real}`,
    `- era_evitavel_internamente: ${request.assessment.era_evitavel_internamente}`,
    `- merece_ticket_generalizavel: ${request.assessment.merece_ticket_generalizavel}`,
    `- primary_taxonomy: ${request.assessment.primary_taxonomy ?? "legacy-not-declared"}`,
    `- operational_class: ${request.assessment.operational_class ?? "not_applicable"}`,
    "",
    "### Confidence and evidence sufficiency",
    "",
    `- confidence: ${request.assessment.confidence}`,
    `- evidence_sufficiency: ${request.assessment.evidence_sufficiency}`,
    `- assessment_next_action: ${request.assessment.next_action ? `${request.assessment.next_action.code} (${request.assessment.next_action.source}) - ${request.assessment.next_action.summary}` : "N/A"}`,
    "",
    "### Causal surface",
    "",
    `- owner: ${request.assessment.causal_surface.owner}`,
    `- kind: ${request.assessment.causal_surface.kind}`,
    `- summary: ${request.assessment.causal_surface.summary}`,
    `- actionable: ${request.assessment.causal_surface.actionable ? "yes" : "no"}`,
    `- systems: ${request.assessment.causal_surface.systems.join(", ")}`,
    "",
    "### Generalization basis",
    "",
    ...generalizationBasis.map((entry) => `- ${entry}`),
    "",
    "### Overfit vetoes considered",
    "",
    ...overfitVetoes.map((entry) => `- ${entry}`),
    "",
    "### Publication decision",
    "",
    `- semanticAuthority: ${policy.semanticAuthority}`,
    `- finalPublicationAuthority: ${policy.finalPublicationAuthority}`,
    `- recommended_action: ${request.assessment.publication_recommendation.recommended_action}`,
    `- reason: ${request.assessment.publication_recommendation.reason}`,
    `- blockers: ${blockers.join(" | ")}`,
    `- capability_limits: ${capabilityLimits.join(" | ")}`,
    `- dossier_path: ${request.summary.dossier_path}`,
    `- ticket_path: ${ticketPath}`,
    `- non_versioned_defaults: ${policy.nonVersionedArtifactsDefault.join(", ")}`,
    "",
    "## Closure criteria",
    "",
    `- Corrigir a menor superficie causal plausivel descrita em \`${request.assessment.publication_recommendation.proposed_ticket_scope}\`.`,
    "- Validar a correcao com uma rodada observavel que nao dependa apenas deste caso isolado.",
    "- Preservar a politica de artefatos versionados restrita ao ticket e manter dados sensiveis fora do repositorio.",
    "",
    "## Decision log",
    "",
    `- ${formatDateUtc(createdAt)} - Ticket publicado automaticamente a partir de /target_investigate_case para ${request.caseResolution.case_ref}.`,
    "",
    "## Closure",
    "",
    "- Closed at (UTC):",
    "- Closure reason: fixed | duplicate | invalid | wont-fix | split-follow-up",
    "- Related PR/commit/execplan:",
    "- Follow-up ticket (required when `Closure reason: split-follow-up`):",
    "",
    `<!-- request-id-hint: ${requestIdHint} -->`,
  ].join("\n");
};

const buildTicketSlug = (request: TargetInvestigateCaseTicketPublicationRequest): string => {
  const caseRefSlug = slugify(request.caseResolution.resolved_case.ref, 48);
  const titleSlug = slugify(
    request.assessment.publication_recommendation.suggested_title || "case-investigation-gap",
    80,
  );
  return `${caseRefSlug}-${titleSlug}`;
};

const slugify = (value: string, maxLength: number): string => {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
  const truncated = normalized.slice(0, maxLength).replace(/-+$/gu, "");
  return truncated || "case-investigation";
};

const formatDateUtc = (value: Date): string => value.toISOString().slice(0, 10);
const formatTimestampUtc = (value: Date): string =>
  value.toISOString().replace(/\.\d{3}Z$/u, "Z");

const extractMarkdownHeadings = (markdown: string): string[] =>
  markdown
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("## ") || line.startsWith("### "));
