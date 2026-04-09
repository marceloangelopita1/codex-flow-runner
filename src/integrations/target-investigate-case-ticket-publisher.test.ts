import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import type { GitSyncEvidence, GitVersioning } from "./git-client.js";
import { parseTargetInvestigateCaseCommand } from "../core/target-investigate-case.js";
import type { TargetInvestigateCaseTicketPublicationRequest } from "../core/target-investigate-case.js";
import { FileSystemTargetInvestigateCaseTicketPublisher } from "./target-investigate-case-ticket-publisher.js";
import {
  cleanupTargetInvestigateCaseProjectFixture,
  createTargetInvestigateCaseManifest,
  createTargetInvestigateCaseProjectFixture,
  createTargetInvestigateCaseTicketProposal,
  writeTargetInvestigateCaseManifest,
  writeTargetInvestigateCasePromptFiles,
} from "../test-support/target-investigate-case-fixtures.js";

class SpyGitVersioning implements GitVersioning {
  public readonly commitCalls: Array<{
    paths: string[];
    subject: string;
    bodyParagraphs?: string[];
  }> = [];

  async commitTicketClosure(): Promise<void> {}

  async commitAndPushPaths(
    paths: string[],
    subject: string,
    bodyParagraphs?: string[],
  ): Promise<GitSyncEvidence | null> {
    this.commitCalls.push({ paths, subject, bodyParagraphs });
    return null;
  }

  async commitCheckupArtifacts(): Promise<null> {
    return null;
  }

  async assertSyncedWithRemote(): Promise<GitSyncEvidence> {
    return {
      commitHash: "abc123",
      upstream: "origin/main",
      commitPushId: "push-001",
    };
  }
}

const buildPublicationRequest = (
  projectPath: string,
): TargetInvestigateCaseTicketPublicationRequest => ({
  targetProject: {
    name: "alpha-project",
    path: projectPath,
  },
  normalizedInput: parseTargetInvestigateCaseCommand(
    "/target_investigate_case_v2 alpha-project case-001 --workflow billing-core --request-id req-001",
  ),
  manifest: createTargetInvestigateCaseManifest({
    ticketPublicationPolicy: true,
  }),
  caseResolution: {
    case_ref: "case-001",
    selectors: {
      workflow: "billing-core",
      request_id: "req-001",
    },
    resolved_case: {
      ref: "case-001",
      summary: "Caso resolvido pela capability diagnosis-first.",
    },
    attempt_resolution: {
      status: "resolved" as const,
      attempt_ref: "req-001",
      reason: "Tentativa correlacionada pelo target.",
    },
    relevant_workflows: ["billing-core"],
    replay_decision: {
      status: "not-required" as const,
      reason: "A evidencia historica ja e suficiente.",
    },
    attempt_candidates: null,
    replay_readiness: null,
    resolution_reason: "Resolucao diagnosis-first concluida.",
    lineage: ["target-investigate-case-v2"],
  },
  evidenceBundle: {
    collection_plan: {
      manifest_path: "docs/workflows/target-case-investigation-v2-manifest.json",
      strategy_ids: ["history"],
    },
    historical_sources: [
      {
        source_id: "history",
        surface: "bundle",
        consulted: true,
      },
    ],
    sensitive_artifact_refs: [
      {
        ref: "bundle-ref-1",
        path: "output/case-investigation/round-1/case-bundle.json",
        sha256: "a".repeat(64),
        record_count: 1,
      },
    ],
    replay: {
      used: false,
      mode: "historical-only" as const,
      request_id: "req-001",
      update_db: false,
      cache_policy: null,
      purge_policy: null,
      namespace: "case-investigation/round-1",
    },
    collection_sufficiency: "sufficient",
    normative_conflicts: [],
    factual_sufficiency_reason: "A bundle autoritativa ja explica o caso.",
  },
  diagnosis: {
    schema_version: "diagnosis_v1",
    bundle_artifact: "output/case-investigation/round-1/case-bundle.json",
    verdict: "not_ok" as const,
    summary: "O target encontrou um gap reutilizavel.",
    why: "A evidencia confirma um desvio do comportamento esperado.",
    expected_behavior: "Emitir o artefato esperado.",
    observed_behavior: "O workflow emitiu um artefato incorreto.",
    confidence: "high" as const,
    behavior_to_change: "Corrigir a superficie do workflow.",
    probable_fix_surface: ["workflow"],
    evidence_used: ["case-resolution.json"],
    next_action: "Publicar o ticket somente na continuacao publication.",
    lineage: ["target-investigate-case-v2"],
  },
  ticketProposal: createTargetInvestigateCaseTicketProposal({
    suggestedSlug: "workflow-gap",
  }),
  summary: {
    case_ref: "case-001",
    resolved_attempt_ref: "req-001",
    attempt_resolution_status: "resolved" as const,
    attempt_candidates_status: null,
    replay_readiness_state: null,
    replay_used: false,
    diagnosis: {
      verdict: "not_ok" as const,
      summary: "O target encontrou um gap reutilizavel.",
      why: "A evidencia confirma um desvio do comportamento esperado.",
      expected_behavior: "Emitir o artefato esperado.",
      observed_behavior: "O workflow emitiu um artefato incorreto.",
      confidence: "high" as const,
      behavior_to_change: "Corrigir a superficie do workflow.",
      probable_fix_surface: ["workflow"],
      next_action: "Publicar o ticket somente na continuacao publication.",
      bundle_artifact: "output/case-investigation/round-1/case-bundle.json",
      diagnosis_md_path: "output/case-investigation/round-1/diagnosis.md",
      diagnosis_json_path: "output/case-investigation/round-1/diagnosis.json",
    },
    confidence: "high" as const,
    investigation_outcome: "actionable-remediation-identified" as const,
    investigation_reason: "Publicar o ticket somente na continuacao publication.",
    remediation_proposal_path: null,
    publication_status: "eligible" as const,
    overall_outcome: "ticket-published" as const,
    outcome_reason: "Ticket elegivel para publication.",
    ticket_path: null,
    next_action: "Revisar o ticket publicado.",
  },
});

test("FileSystemTargetInvestigateCaseTicketPublisher publica apenas a proposta target-owned e commita com o comando v2", async () => {
  const fixture = await createTargetInvestigateCaseProjectFixture();
  const gitVersioning = new SpyGitVersioning();

  try {
    await writeTargetInvestigateCasePromptFiles(fixture.project.path);
    await writeTargetInvestigateCaseManifest(
      fixture.project.path,
      createTargetInvestigateCaseManifest({
        ticketPublicationPolicy: true,
      }),
    );

    const publisher = new FileSystemTargetInvestigateCaseTicketPublisher(
      fixture.project.path,
      gitVersioning,
      {
        now: () => new Date("2026-04-09T12:00:00.000Z"),
      },
    );

    const result = await publisher.publish(buildPublicationRequest(fixture.project.path));
    const ticketContent = await fs.readFile(
      path.join(fixture.project.path, ...result.ticketPath.split("/")),
      "utf8",
    );

    assert.equal(result.ticketPath, "tickets/open/2026-04-09-workflow-gap.md");
    assert.match(ticketContent, /# \[TICKET\] Workflow gap on diagnosis-first investigation/u);
    assert.equal(gitVersioning.commitCalls[0]?.paths[0], result.ticketPath);
    assert.deepEqual(gitVersioning.commitCalls[0]?.bodyParagraphs, [
      "Flow: /target_investigate_case_v2",
      "Case-ref: case-001",
    ]);
  } finally {
    await cleanupTargetInvestigateCaseProjectFixture(fixture);
  }
});

test("FileSystemTargetInvestigateCaseTicketPublisher falha quando a v2 nao recebeu ticket-proposal target-owned", async () => {
  const fixture = await createTargetInvestigateCaseProjectFixture();

  try {
    await writeTargetInvestigateCasePromptFiles(fixture.project.path);
    await writeTargetInvestigateCaseManifest(
      fixture.project.path,
      createTargetInvestigateCaseManifest({
        ticketPublicationPolicy: true,
      }),
    );

    const publisher = new FileSystemTargetInvestigateCaseTicketPublisher(
      fixture.project.path,
      new SpyGitVersioning(),
    );

    const request = buildPublicationRequest(fixture.project.path);
    request.ticketProposal = null;

    await assert.rejects(
      () => publisher.publish(request),
      /ticket-proposal\.json com ticket_markdown target-owned/u,
    );
  } finally {
    await cleanupTargetInvestigateCaseProjectFixture(fixture);
  }
});
