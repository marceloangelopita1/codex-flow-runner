import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Logger } from "../core/logger.js";
import {
  buildNonInteractiveCodexArgs,
  CodexAuthenticationError,
  CodexChatSessionError,
  CodexCliTicketFlowClient,
  CodexDiscoverSpecSessionError,
  CodexPlanSessionError,
  CodexSpecTicketValidationAutoCorrectError,
  CodexSpecTicketValidationSessionError,
  CodexStageExecutionError,
} from "./codex-client.js";
import { buildRuntimeShellGuidance } from "./runtime-shell-guidance.js";
import { TicketRef } from "./ticket-queue.js";

class SpyLogger extends Logger {
  override info(): void {}
  override warn(): void {}
  override error(): void {}
}

const ticket: TicketRef = {
  name: "2026-02-19-example-ticket.md",
  openPath: "/tmp/tickets/open/2026-02-19-example-ticket.md",
  closedPath: "/tmp/tickets/closed/2026-02-19-example-ticket.md",
};

const spec = {
  fileName: "2026-02-19-approved-spec-triage-run-specs.md",
  path: "docs/specs/2026-02-19-approved-spec-triage-run-specs.md",
};
const workflowRepoPath = fileURLToPath(new URL("../../", import.meta.url));

const plannedOutline = {
  objective: "Transformar a sessao /plan em uma spec rica e reutilizavel.",
  actors: ["Operador do Telegram", "Runner do Codex"],
  journey: [
    "Operador descreve o objetivo em linguagem natural.",
    "Codex devolve um bloco final estruturado.",
  ],
  requirements: [
    "RF-01 - A materializacao deve preservar RFs aprovados.",
    "RF-02 - A spec criada deve manter CAs observaveis.",
  ],
  acceptanceCriteria: [
    "CA-01 - O prompt recebe RFs, CAs e jornada aprovados.",
    "CA-02 - A spec criada nao perde nao-escopo e riscos conhecidos.",
  ],
  nonScope: ["Nao implementar o produto final nesta etapa."],
  technicalConstraints: ["Manter o protocolo parseavel e sequencial."],
  mandatoryValidations: ["Conferir se RFs e CAs aparecem na spec criada."],
  pendingManualValidations: ["Revisar a clareza da jornada com um operador humano."],
  knownRisks: ["Resumo curto demais reduz a qualidade da spec materializada."],
};

const plannedSpec = {
  fileName: "2026-02-19-bridge-interativa-do-codex.md",
  path: "docs/specs/2026-02-19-bridge-interativa-do-codex.md",
  plannedTitle: "Bridge interativa do Codex",
  plannedSummary: "Sessao /plan com parser e callbacks no Telegram.",
  plannedOutline,
  sourceCommand: "/discover_spec" as const,
  assumptionsAndDefaults: ["Assumir monorepo Node.js 20+."],
  decisionsAndTradeOffs: ["Reutilizar callbacks existentes em vez de abrir novo protocolo."],
  categoryCoverage: [
    {
      categoryId: "assumptions-defaults" as const,
      label: "Assumptions e defaults",
      status: "covered" as const,
      detail: "Defaults conscientes aprovados.",
    },
  ],
  criticalAmbiguities: [],
  tracePaths: {
    requestPath: "spec_planning/requests/20260219t220400z-s1-request.md",
    responsePath: "spec_planning/responses/20260219t220400z-s1-materialize.md",
    decisionPath: "spec_planning/decisions/20260219t220400z-s1-decision.json",
  },
};

test("runStage(plan) substitui placeholder e nao injeta api key no ambiente", async () => {
  let capturedPrompt = "";
  let capturedEnv: NodeJS.ProcessEnv | undefined;
  const originalCodexApiKey = process.env.CODEX_API_KEY;
  const originalOpenaiApiKey = process.env.OPENAI_API_KEY;
  process.env.CODEX_API_KEY = "ambient-codex";
  process.env.OPENAI_API_KEY = "ambient-openai";

  try {
    const client = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
      loadPromptTemplate: async () =>
        [
          "# Prompt: Criar ExecPlan para Ticket",
          "",
          "Ticket alvo:",
          "- `<tickets/open/YYYY-MM-DD-slug.md>`",
        ].join("\n"),
      runCodexCommand: async (request) => {
        capturedPrompt = request.prompt;
        capturedEnv = request.env;
        return { stdout: "ok", stderr: "" };
      },
      resolvePlanDirectoryName: async () => "execplans",
    });

  const result = await client.runStage("plan", ticket);

  assert.equal(result.stage, "plan");
  assert.equal(result.execPlanPath, "execplans/2026-02-19-example-ticket.md");
  assert.match(result.promptTemplatePath, /02-criar-execplan-para-ticket\.md$/u);
  assert.equal(result.promptText, capturedPrompt);

  assert.match(capturedPrompt, /tickets\/open\/2026-02-19-example-ticket\.md/u);
    assert.doesNotMatch(capturedPrompt, /YYYY-MM-DD-slug/u);
    assert.match(capturedPrompt, /ExecPlan esperado: `execplans\/2026-02-19-example-ticket\.md`/u);

    assert.equal(capturedEnv?.CODEX_API_KEY, process.env.CODEX_API_KEY);
    assert.equal(capturedEnv?.OPENAI_API_KEY, process.env.OPENAI_API_KEY);
  } finally {
    if (originalCodexApiKey === undefined) {
      delete process.env.CODEX_API_KEY;
    } else {
      process.env.CODEX_API_KEY = originalCodexApiKey;
    }

    if (originalOpenaiApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalOpenaiApiKey;
    }
  }
});

test("runStage(implement) resolve checklist compartilhado para projeto externo", async () => {
  let capturedPrompt = "";

  const client = new CodexCliTicketFlowClient("/tmp/alpha-project", new SpyLogger(), {
    loadPromptTemplate: async () => "Checklist: <WORKFLOW_QUALITY_GATES_PATH>",
    runCodexCommand: async (request) => {
      capturedPrompt = request.prompt;
      return { stdout: "ok", stderr: "" };
    },
    resolvePlanDirectoryName: async () => "execplans",
  });

  const result = await client.runStage("implement", ticket);

  assert.equal(result.promptText, capturedPrompt);
  assert.match(capturedPrompt, /Checklist: \.\.\/codex-flow-runner\/docs\/workflows\/codex-quality-gates\.md/u);
  assert.doesNotMatch(capturedPrompt, /Checklist: docs\/workflows\/codex-quality-gates\.md/u);
});

test("runTargetPrepare injeta allowlist, fontes gerenciadas e contexto do runner", async () => {
  let capturedPrompt = "";

  const client = new CodexCliTicketFlowClient("/tmp/target-project", new SpyLogger(), {
    loadPromptTemplate: async () =>
      [
        "# Prompt",
        "Allowlist:",
        "<TARGET_PREPARE_ALLOWLIST>",
        "Copies:",
        "<TARGET_PREPARE_COPY_SOURCES>",
        "Merges:",
        "<TARGET_PREPARE_MERGE_SOURCES>",
        "Runner path: <RUNNER_REPO_PATH>",
        "Runner ref: <RUNNER_REFERENCE>",
        "Target name: <TARGET_PROJECT_NAME>",
        "Target path: <TARGET_PROJECT_PATH>",
      ].join("\n"),
    runCodexCommand: async (request) => {
      capturedPrompt = request.prompt;
      return { stdout: "ok", stderr: "" };
    },
  });

  const result = await client.runTargetPrepare({
    targetProject: {
      name: "alpha-project",
      path: "/home/mapita/projetos/alpha-project",
    },
    runnerRepoPath: "/home/mapita/projetos/codex-flow-runner",
    runnerReference: "codex-flow-runner@/home/mapita/projetos/codex-flow-runner",
    allowlistedPaths: ["AGENTS.md", "docs/workflows/"],
    copySources: [
      {
        targetPath: "PLANS.md",
        sourcePath: "/home/mapita/projetos/codex-flow-runner/PLANS.md",
      },
    ],
    mergeSources: [
      {
        targetPath: "README.md",
        sourcePath:
          "/home/mapita/projetos/codex-flow-runner/docs/workflows/target-prepare-managed-readme-section.md",
        markerId: "codex-flow-runner:target-prepare-managed-readme",
      },
    ],
  });

  assert.match(result.promptTemplatePath, /13-target-prepare-controlled-onboarding\.md$/u);
  assert.equal(result.promptText, capturedPrompt);
  assert.match(capturedPrompt, /- `AGENTS\.md`/u);
  assert.match(capturedPrompt, /copy-exact `PLANS\.md` <= `\/home\/mapita\/projetos\/codex-flow-runner\/PLANS\.md`/u);
  assert.match(
    capturedPrompt,
    /merge-managed-block `README\.md` <= `\/home\/mapita\/projetos\/codex-flow-runner\/docs\/workflows\/target-prepare-managed-readme-section\.md` \| marker: `codex-flow-runner:target-prepare-managed-readme`/u,
  );
  assert.match(capturedPrompt, /Runner ref: codex-flow-runner@\/home\/mapita\/projetos\/codex-flow-runner/u);
  assert.match(capturedPrompt, /Target name: alpha-project/u);
  assert.match(capturedPrompt, /Target path: \/home\/mapita\/projetos\/alpha-project/u);
});

test("runTargetCheckup injeta payload factual e caminhos de artefato", async () => {
  let capturedPrompt = "";

  const client = new CodexCliTicketFlowClient("/tmp/target-project", new SpyLogger(), {
    loadPromptTemplate: async () =>
      [
        "# Prompt",
        "Runner path: <RUNNER_REPO_PATH>",
        "Runner ref: <RUNNER_REFERENCE>",
        "Target name: <TARGET_PROJECT_NAME>",
        "Target path: <TARGET_PROJECT_PATH>",
        "JSON path: <TARGET_CHECKUP_REPORT_JSON_PATH>",
        "Markdown path: <TARGET_CHECKUP_REPORT_MARKDOWN_PATH>",
        "Facts:",
        "<TARGET_CHECKUP_FACTS_JSON>",
      ].join("\n"),
    runCodexCommand: async (request) => {
      capturedPrompt = request.prompt;
      return { stdout: "### Executive summary\nok", stderr: "" };
    },
  });

  const result = await client.runTargetCheckup({
    targetProject: {
      name: "alpha-project",
      path: "/home/mapita/projetos/alpha-project",
    },
    runnerRepoPath: "/home/mapita/projetos/codex-flow-runner",
    runnerReference: "codex-flow-runner@/home/mapita/projetos/codex-flow-runner",
    reportJsonPath: "docs/checkups/history/report.json",
    reportMarkdownPath: "docs/checkups/history/report.md",
    reportFactsJson: JSON.stringify(
      {
        overall_verdict: "invalid_for_gap_ticket_derivation",
        analyzed_head_sha: "abc123",
      },
      null,
      2,
    ),
  });

  assert.match(result.promptTemplatePath, /14-target-checkup-readiness-audit\.md$/u);
  assert.equal(result.promptText, capturedPrompt);
  assert.match(capturedPrompt, /Runner ref: codex-flow-runner@\/home\/mapita\/projetos\/codex-flow-runner/u);
  assert.match(capturedPrompt, /Target name: alpha-project/u);
  assert.match(capturedPrompt, /JSON path: docs\/checkups\/history\/report\.json/u);
  assert.match(capturedPrompt, /Markdown path: docs\/checkups\/history\/report\.md/u);
  assert.match(capturedPrompt, /"overall_verdict": "invalid_for_gap_ticket_derivation"/u);
});

test("runTargetDeriveGapAnalysis injeta facts serializados do report e caminhos canonicos", async () => {
  let capturedPrompt = "";

  const client = new CodexCliTicketFlowClient("/tmp/target-project", new SpyLogger(), {
    loadPromptTemplate: async () =>
      [
        "# Prompt",
        "Runner path: <RUNNER_REPO_PATH>",
        "Runner ref: <RUNNER_REFERENCE>",
        "Target name: <TARGET_PROJECT_NAME>",
        "Target path: <TARGET_PROJECT_PATH>",
        "JSON path: <TARGET_DERIVE_REPORT_JSON_PATH>",
        "Markdown path: <TARGET_DERIVE_REPORT_MARKDOWN_PATH>",
        "Facts:",
        "<TARGET_DERIVE_FACTS_JSON>",
      ].join("\n"),
    runCodexCommand: async (request) => {
      capturedPrompt = request.prompt;
      return { stdout: "[[TARGET_DERIVE_GAP_ANALYSIS]]\n{}\n[[/TARGET_DERIVE_GAP_ANALYSIS]]", stderr: "" };
    },
  });

  const result = await client.runTargetDeriveGapAnalysis({
    targetProject: {
      name: "alpha-project",
      path: "/home/mapita/projetos/alpha-project",
    },
    runnerRepoPath: "/home/mapita/projetos/codex-flow-runner",
    runnerReference: "codex-flow-runner@/home/mapita/projetos/codex-flow-runner",
    reportJsonPath: "docs/checkups/history/report.json",
    reportMarkdownPath: "docs/checkups/history/report.md",
    reportFactsJson: JSON.stringify(
      {
        analyzed_head_sha: "abc123",
        dimensions: [{ key: "validation_delivery_health", verdict: "gap" }],
      },
      null,
      2,
    ),
  });

  assert.match(result.promptTemplatePath, /15-target-derive-gaps-idempotent-readiness-materialization\.md$/u);
  assert.equal(result.promptText, capturedPrompt);
  assert.match(capturedPrompt, /Target name: alpha-project/u);
  assert.match(capturedPrompt, /JSON path: docs\/checkups\/history\/report\.json/u);
  assert.match(capturedPrompt, /Markdown path: docs\/checkups\/history\/report\.md/u);
  assert.match(capturedPrompt, /"analyzed_head_sha": "abc123"/u);
});

test("runTargetInvestigateCaseRoundMaterialization injeta manifesto, round e allowlists explicitas", async () => {
  let capturedPrompt = "";

  const client = new CodexCliTicketFlowClient("/tmp/target-project", new SpyLogger(), {
    loadPromptTemplate: async () =>
      [
        "# Prompt",
        "Runner path: <RUNNER_REPO_PATH>",
        "Runner ref: <RUNNER_REFERENCE>",
        "Target name: <TARGET_PROJECT_NAME>",
        "Target path: <TARGET_PROJECT_PATH>",
        "Manifest: <TARGET_INVESTIGATE_CASE_MANIFEST_PATH>",
        "Runbook: <TARGET_INVESTIGATE_CASE_RUNBOOK_PATH>",
        "Round ID: <TARGET_INVESTIGATE_CASE_ROUND_ID>",
        "Round directory: <TARGET_INVESTIGATE_CASE_ROUND_DIRECTORY>",
        "Artifacts:",
        "<TARGET_INVESTIGATE_CASE_ARTIFACT_PATHS_JSON>",
        "Facts:",
        "<TARGET_INVESTIGATE_CASE_FACTS_JSON>",
      ].join("\n"),
    runCodexCommand: async (request) => {
      capturedPrompt = request.prompt;
      return { stdout: "materialized", stderr: "" };
    },
  });

  const result = await client.runTargetInvestigateCaseRoundMaterialization({
    targetProject: {
      name: "alpha-project",
      path: "/home/mapita/projetos/alpha-project",
    },
    runnerRepoPath: "/home/mapita/projetos/codex-flow-runner",
    runnerReference: "codex-flow-runner@/home/mapita/projetos/codex-flow-runner",
    manifestPath: "docs/workflows/target-case-investigation-manifest.json",
    runbookPath: "docs/workflows/target-case-investigation-runbook.md",
    canonicalCommand:
      "/target_investigate_case alpha-project case-001 --workflow extract_address --request-id req-001",
    roundId: "2026-04-03T19-00-00Z",
    roundDirectory: "investigations/2026-04-03T19-00-00Z",
    officialTargetEntrypointCommand: "npm run case-investigation --",
    officialTargetEntrypointScriptPath: "scripts/materialize-case-investigation-round.js",
    artifactPaths: {
      caseResolutionPath: "investigations/2026-04-03T19-00-00Z/case-resolution.json",
      evidenceBundlePath: "investigations/2026-04-03T19-00-00Z/evidence-bundle.json",
      assessmentPath: "investigations/2026-04-03T19-00-00Z/assessment.json",
      dossierPath: "investigations/2026-04-03T19-00-00Z/dossier.md",
      semanticReviewRequestPath:
        "investigations/2026-04-03T19-00-00Z/semantic-review.request.json",
      semanticReviewResultPath:
        "investigations/2026-04-03T19-00-00Z/semantic-review.result.json",
      publicationDecisionPath:
        "investigations/2026-04-03T19-00-00Z/publication-decision.json",
    },
    caseRefAuthorities: ["propertyId", "requestId", "runArtifact"],
    attemptRefAuthorities: ["requestId", "runArtifact", "workflow+window"],
    targetProjectAcceptedSelectors: [
      "propertyId",
      "requestId",
      "workflow",
      "window",
      "runArtifact",
    ],
    investigableWorkflows: ["extract_address", "extract_condominium_info"],
    acceptedPurgeIdentifiers: [
      "propertyId",
      "pdfFileName",
      "matriculaNumber",
      "transcriptHint",
    ],
    dossierLocalPathTemplate: "output/case-investigation/<request-id>/",
    authoritativeDossierLocalPath: "output/case-investigation/2026-04-03T19-00-00Z",
  });

  assert.match(
    result.promptTemplatePath,
    /16-target-investigate-case-round-materialization\.md$/u,
  );
  assert.equal(result.promptText, capturedPrompt);
  assert.match(capturedPrompt, /Manifest: docs\/workflows\/target-case-investigation-manifest\.json/u);
  assert.match(capturedPrompt, /Runbook: docs\/workflows\/target-case-investigation-runbook\.md/u);
  assert.match(capturedPrompt, /Round directory: investigations\/2026-04-03T19-00-00Z/u);
  assert.match(capturedPrompt, /Entrypoint oficial do alvo: `npm run case-investigation --`/u);
  assert.match(
    capturedPrompt,
    /Dossier local autoritativo esperado: `output\/case-investigation\/2026-04-03T19-00-00Z`/u,
  );
  assert.match(capturedPrompt, /"attemptRefAuthorities": \[/u);
  assert.match(capturedPrompt, /"acceptedPurgeIdentifiers": \[/u);
  assert.match(capturedPrompt, /"extract_condominium_info"/u);
  assert.match(capturedPrompt, /"officialTargetEntrypointScriptPath": "scripts\/materialize-case-investigation-round\.js"/u);
});

test("runTargetInvestigateCaseSemanticReview injeta packet bounded e contexto minimo serializado", async () => {
  let capturedPrompt = "";

  const client = new CodexCliTicketFlowClient("/tmp/target-project", new SpyLogger(), {
    loadPromptTemplate: async () =>
      [
        "# Prompt",
        "Runner path: <RUNNER_REPO_PATH>",
        "Runner ref: <RUNNER_REFERENCE>",
        "Target name: <TARGET_PROJECT_NAME>",
        "Target path: <TARGET_PROJECT_PATH>",
        "Manifest: <TARGET_INVESTIGATE_CASE_MANIFEST_PATH>",
        "Request path: <TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_REQUEST_PATH>",
        "Result path: <TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_RESULT_PATH>",
        "Request:",
        "<TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_REQUEST_JSON>",
        "Context:",
        "<TARGET_INVESTIGATE_CASE_SEMANTIC_REVIEW_CONTEXT_JSON>",
      ].join("\n"),
    runCodexCommand: async (request) => {
      capturedPrompt = request.prompt;
      return { stdout: "{\"schema_version\":\"semantic_review_result_v1\"}", stderr: "" };
    },
  });

  const result = await client.runTargetInvestigateCaseSemanticReview({
    targetProject: {
      name: "alpha-project",
      path: "/home/mapita/projetos/alpha-project",
    },
    runnerRepoPath: "/home/mapita/projetos/codex-flow-runner",
    runnerReference: "codex-flow-runner@/home/mapita/projetos/codex-flow-runner",
    manifestPath: "docs/workflows/target-case-investigation-manifest.json",
    reviewRequestPath: "investigations/2026-04-05T15-47-00Z/semantic-review.request.json",
    reviewResultPath: "investigations/2026-04-05T15-47-00Z/semantic-review.result.json",
    reviewRequestJson: JSON.stringify(
      {
        schema_version: "semantic_review_request_v1",
        review_readiness: {
          status: "ready",
          reason_code: "READY",
          summary: "bounded review ready",
        },
        prompt_contract: {
          declared_surfaces_only: true,
          new_evidence_discovery_allowed: false,
        },
      },
      null,
      2,
    ),
    reviewContextJson: JSON.stringify(
      {
        target_fields: [
          {
            field_path: "extract_address.value.current.complemento",
            extracted_value: "apartamento n",
          },
        ],
      },
      null,
      2,
    ),
  });

  assert.match(result.promptTemplatePath, /17-target-investigate-case-semantic-review\.md$/u);
  assert.equal(result.promptText, capturedPrompt);
  assert.match(
    capturedPrompt,
    /Request path: investigations\/2026-04-05T15-47-00Z\/semantic-review\.request\.json/u,
  );
  assert.match(
    capturedPrompt,
    /Result path: investigations\/2026-04-05T15-47-00Z\/semantic-review\.result\.json/u,
  );
  assert.match(capturedPrompt, /"schema_version": "semantic_review_request_v1"/u);
  assert.match(capturedPrompt, /"field_path": "extract_address\.value\.current\.complemento"/u);
  assert.match(
    capturedPrompt,
    /Nao descubra novas evidencias nem leia arquivos fora do contexto serializado neste prompt\./u,
  );
});

test("runStage injeta guia operacional de shell no prompt", async () => {
  let capturedPrompt = "";

  const client = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
    loadPromptTemplate: async () => "# prompt",
    runCodexCommand: async (request) => {
      capturedPrompt = request.prompt;
      return { stdout: "ok", stderr: "" };
    },
    resolvePlanDirectoryName: async () => "execplans",
    buildRuntimeShellGuidance: () => ({
      text: [
        "Contexto operacional do shell desta execucao (obrigatorio seguir):",
        "- Prefixo obrigatorio para comandos Node: `export HOME=\"/home/test\"; export PATH=\"/opt/node/bin:$PATH\";`.",
      ].join("\n"),
      homePath: "/home/test",
      nodeExecutablePath: "/opt/node/bin/node",
      nodeBinPath: "/opt/node/bin",
      npmExecutablePath: "/opt/node/bin/npm",
      codexExecutablePath: "/usr/local/bin/codex",
      isSnapCodex: false,
      hostGitExecutablePath: null,
      hostGitExecPath: null,
      hostGhExecutablePath: null,
    }),
  });

  await client.runStage("implement", ticket);

  assert.match(capturedPrompt, /Contexto operacional do shell desta execucao/u);
  assert.match(capturedPrompt, /export HOME="\/home\/test"; export PATH="\/opt\/node\/bin:\$PATH";/u);
});

test("args nao interativos usam full access explicito por chamada", () => {
  const args = buildNonInteractiveCodexArgs();

  assert.deepEqual(args, [
    "-a",
    "never",
    "exec",
    "--skip-git-repo-check",
    "-s",
    "danger-full-access",
    "--color",
    "never",
    "-",
  ]);
  assert.equal(args.includes("--dangerously-bypass-approvals-and-sandbox"), false);
});

test("args nao interativos desativam fast mode explicitamente quando velocidade standard e informada", () => {
  const args = buildNonInteractiveCodexArgs({
    model: "gpt-5.4",
    reasoningEffort: "xhigh",
    speed: "standard",
  });

  assert.equal(args.includes("features.fast_mode=false"), true);
  assert.equal(args.includes('service_tier="fast"'), false);
});

test("args nao interativos aceitam modelo e reasoning explicitos", () => {
  const args = buildNonInteractiveCodexArgs({
    model: "gpt-5.4",
    reasoningEffort: "xhigh",
    speed: "fast",
  });

  assert.deepEqual(args, [
    "-a",
    "never",
    "exec",
    "--skip-git-repo-check",
    "-s",
    "danger-full-access",
    "--color",
    "never",
    "-m",
    "gpt-5.4",
    "-c",
    'model_reasoning_effort="xhigh"',
    "-c",
    "features.fast_mode=true",
    "-c",
    'service_tier="fast"',
    "-",
  ]);
});

test("runStage encaminha preferencias resolvidas para codex exec", async () => {
  let capturedPreferences:
    | { model: string; reasoningEffort: string; speed?: "standard" | "fast" }
    | null
    | undefined;

  const client = new CodexCliTicketFlowClient(
    "/tmp/repo",
    new SpyLogger(),
    {
      loadPromptTemplate: async () => "# prompt",
      runCodexCommand: async (request) => {
        capturedPreferences = request.preferences;
        return { stdout: "ok", stderr: "" };
      },
      resolvePlanDirectoryName: async () => "execplans",
    },
    {
      resolveInvocationPreferences: async () => ({
        model: "gpt-5.4",
        reasoningEffort: "high",
        speed: "fast",
      }),
    },
  );

  await client.runStage("implement", ticket);

  assert.deepEqual(capturedPreferences, {
    model: "gpt-5.4",
    reasoningEffort: "high",
    speed: "fast",
  });
});

test("runStage(plan) adapta caminho esperado para repositorio com plans", async () => {
  let capturedPrompt = "";

  const client = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
      loadPromptTemplate: async () =>
        [
          "# Prompt: Criar ExecPlan para Ticket",
          "",
          "Ticket alvo:",
          "- `<tickets/open/YYYY-MM-DD-slug.md>`",
          "",
          "Instrucoes:",
          "- Salve o plano em `execplans/<yyyy-mm-dd>-<slug>.md` (mesmo slug do ticket).",
        ].join("\n"),
      runCodexCommand: async (request) => {
        capturedPrompt = request.prompt;
        return { stdout: "ok", stderr: "" };
      },
      resolvePlanDirectoryName: async () => "plans",
    });

  const result = await client.runStage("plan", ticket);

  assert.equal(result.execPlanPath, "plans/2026-02-19-example-ticket.md");
  assert.match(capturedPrompt, /Salve o plano em `plans\/<yyyy-mm-dd>-<slug>\.md`/u);
  assert.match(capturedPrompt, /ExecPlan esperado: `plans\/2026-02-19-example-ticket\.md`/u);
});

test("runStage retorna diagnosticos resumidos de stdout/stderr do Codex CLI", async () => {
  const client = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
    loadPromptTemplate: async () => "# prompt",
    runCodexCommand: async () => ({
      stdout: "resultado final: commit criado",
      stderr: "\u001b[33mOpenAI Codex v0.111.0\u001b[0m\n...\npush nao concluido",
    }),
    resolvePlanDirectoryName: async () => "execplans",
  });

  const result = await client.runStage("close-and-version", ticket);

  assert.equal(result.diagnostics?.stdoutPreview, "resultado final: commit criado");
  assert.match(result.diagnostics?.stderrPreview ?? "", /OpenAI Codex v0\.111\.0/u);
  assert.match(result.diagnostics?.stderrPreview ?? "", /push nao concluido/u);
});

test("buildRuntimeShellGuidance inclui bridge de git remoto quando codex vem de snap", () => {
  const guidance = buildRuntimeShellGuidance({
    homePath: "/home/mapita",
    nodeExecutablePath: "/home/mapita/.nvm/versions/node/v24.14.0/bin/node",
    codexExecutablePath: "/snap/bin/codex",
  });

  assert.equal(guidance.isSnapCodex, true);
  assert.equal(guidance.hostGitExecutablePath, "/var/lib/snapd/hostfs/usr/bin/git");
  assert.equal(guidance.hostGitExecPath, "/var/lib/snapd/hostfs/usr/lib/git-core");
  assert.equal(guidance.hostGhExecutablePath, "/var/lib/snapd/hostfs/usr/bin/gh");
  assert.match(
    guidance.text,
    /export HOME="\/home\/mapita"; export PATH="\/home\/mapita\/\.nvm\/versions\/node\/v24\.14\.0\/bin:\$PATH";/u,
  );
  assert.match(guidance.text, /Nunca use `git push`/u);
  assert.match(guidance.text, /\/var\/lib\/snapd\/hostfs\/usr\/bin\/git/u);
  assert.match(guidance.text, /\/var\/lib\/snapd\/hostfs\/usr\/bin\/gh/u);
});

test("buildRuntimeShellGuidance omite bridge de git remoto fora de snap", () => {
  const guidance = buildRuntimeShellGuidance({
    homePath: "/home/mapita",
    nodeExecutablePath: "/opt/node/bin/node",
    codexExecutablePath: "/usr/local/bin/codex",
  });

  assert.equal(guidance.isSnapCodex, false);
  assert.equal(guidance.hostGitExecutablePath, null);
  assert.equal(guidance.hostGitExecPath, null);
  assert.equal(guidance.hostGhExecutablePath, null);
  assert.match(guidance.text, /export PATH="\/opt\/node\/bin:\$PATH"/u);
  assert.doesNotMatch(guidance.text, /\/var\/lib\/snapd\/hostfs/u);
});

test("runSpecStage(spec-triage) substitui placeholder <SPEC_PATH>", async () => {
  let capturedPrompt = "";

  const client = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
    loadPromptTemplate: async () =>
      [
        "# Prompt",
        "",
        "SPEC alvo:",
        "- <SPEC_PATH>",
      ].join("\n"),
    runCodexCommand: async (request) => {
      capturedPrompt = request.prompt;
      return { stdout: "ok", stderr: "" };
    },
  });

  const result = await client.runSpecStage("spec-triage", spec);

  assert.equal(result.stage, "spec-triage");
  assert.match(result.promptTemplatePath, /01-avaliar-spec-e-gerar-tickets\.md$/u);
  assert.equal(result.promptText, capturedPrompt);
  assert.match(capturedPrompt, /docs\/specs\/2026-02-19-approved-spec-triage-run-specs\.md/u);
  assert.doesNotMatch(capturedPrompt, /<SPEC_PATH>/u);
});

test("runSpecStage(spec-triage) resolve checklist compartilhado para projeto externo", async () => {
  let capturedPrompt = "";

  const client = new CodexCliTicketFlowClient("/tmp/alpha-project", new SpyLogger(), {
    loadPromptTemplate: async () =>
      [
        "# Prompt",
        "Checklist: <WORKFLOW_QUALITY_GATES_PATH>",
        "Spec alvo: <SPEC_PATH>",
      ].join("\n"),
    runCodexCommand: async (request) => {
      capturedPrompt = request.prompt;
      return { stdout: "ok", stderr: "" };
    },
  });

  const result = await client.runSpecStage("spec-triage", spec);

  assert.equal(result.promptText, capturedPrompt);
  assert.match(capturedPrompt, /Checklist: \.\.\/codex-flow-runner\/docs\/workflows\/codex-quality-gates\.md/u);
  assert.doesNotMatch(capturedPrompt, /Checklist: docs\/workflows\/codex-quality-gates\.md/u);
  assert.match(capturedPrompt, /Spec alvo: docs\/specs\/2026-02-19-approved-spec-triage-run-specs\.md/u);
});

test("prompts reais da cadeia relevante carregam o guardrail de allowlists finitas", async () => {
  let capturedSpecPrompt = "";
  const specClient = new CodexCliTicketFlowClient(workflowRepoPath, new SpyLogger(), {
    runCodexCommand: async (request) => {
      capturedSpecPrompt = request.prompt;
      return { stdout: "ok", stderr: "" };
    },
  });

  const specResult = await specClient.runSpecStage("spec-triage", spec);

  assert.match(specResult.promptTemplatePath, /01-avaliar-spec-e-gerar-tickets\.md$/u);
  assert.equal(specResult.promptText, capturedSpecPrompt);
  assert.match(capturedSpecPrompt, /docs\/workflows\/codex-quality-gates\.md/u);
  assert.match(capturedSpecPrompt, /allowlists\/enumerações finitas ou matrizes pequenas de valores aceitos/u);
  assert.match(capturedSpecPrompt, /membros explicitos de allowlists\/enumerações finitas relevantes da spec/u);
  assert.match(capturedSpecPrompt, /cobertura positiva dos membros aceitos e negativa fora do conjunto/u);

  const ticketStages = [
    {
      stage: "plan" as const,
      promptPath: /02-criar-execplan-para-ticket\.md$/u,
      patterns: [
        /allowlists\/enumerações finitas relevantes/u,
        /membros explicitos herdados do ticket\/spec/u,
        /cobertura positiva dos aceitos e negativa fora do conjunto/u,
      ],
    },
    {
      stage: "implement" as const,
      promptPath: /03-executar-execplan-atual\.md$/u,
      patterns: [
        /allowlist\/enumeração finita/u,
        /membros explicitos declarados na matriz/u,
        /valor valido/u,
      ],
    },
    {
      stage: "close-and-version" as const,
      promptPath: /04-encerrar-ticket-commit-push\.md$/u,
      patterns: [
        /allowlist\/enumeração finita/u,
        /cada membro aceito tiver evidência positiva correspondente/u,
        /justificativa objetiva já registrada/u,
      ],
    },
  ];

  for (const ticketStage of ticketStages) {
    let capturedTicketPrompt = "";
    const ticketClient = new CodexCliTicketFlowClient(workflowRepoPath, new SpyLogger(), {
      runCodexCommand: async (request) => {
        capturedTicketPrompt = request.prompt;
        return { stdout: "ok", stderr: "" };
      },
      resolvePlanDirectoryName: async () => "execplans",
    });

    const ticketResult = await ticketClient.runStage(ticketStage.stage, ticket);

    assert.match(ticketResult.promptTemplatePath, ticketStage.promptPath);
    assert.equal(ticketResult.promptText, capturedTicketPrompt);
    assert.match(capturedTicketPrompt, /docs\/workflows\/codex-quality-gates\.md/u);
    for (const pattern of ticketStage.patterns) {
      assert.match(capturedTicketPrompt, pattern);
    }
  }
});

test("prompt real de spec-triage exige reconciliacao de backlog aberto da linhagem", async () => {
  let capturedPrompt = "";

  const client = new CodexCliTicketFlowClient(workflowRepoPath, new SpyLogger(), {
    runCodexCommand: async (request) => {
      capturedPrompt = request.prompt;
      return { stdout: "ok", stderr: "" };
    },
  });

  const result = await client.runSpecStage("spec-triage", spec);

  assert.match(result.promptTemplatePath, /01-avaliar-spec-e-gerar-tickets\.md$/u);
  assert.equal(result.promptText, capturedPrompt);
  assert.match(
    capturedPrompt,
    /Source spec`, `Related tickets` ou `hybrid`/u,
  );
  assert.match(capturedPrompt, /`reutilizar\/atualizar ticket aberto`/u);
  assert.match(capturedPrompt, /`dividir ownership com fronteira observável`/u);
  assert.match(capturedPrompt, /`justificar coexistência`/u);
  assert.match(capturedPrompt, /normalizar o ticket histórico no mesmo ciclo/u);
  assert.match(capturedPrompt, /`Closure criteria` ou aceite funcional duplicados/u);
});

test("runSpecStage(spec-close-and-version) inclui commit padrao e regra de Status attended", async () => {
  let capturedPrompt = "";

  const client = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
    runCodexCommand: async (request) => {
      capturedPrompt = request.prompt;
      return { stdout: "ok", stderr: "" };
    },
  });

  const result = await client.runSpecStage("spec-close-and-version", spec);

  assert.equal(result.stage, "spec-close-and-version");
  assert.match(result.promptTemplatePath, /05-encerrar-tratamento-spec-commit-push\.md$/u);
  assert.match(
    capturedPrompt,
    /chore\(specs\): triage 2026-02-19-approved-spec-triage-run-specs\.md/u,
  );
  assert.match(capturedPrompt, /Status: attended/u);
  assert.match(capturedPrompt, /docs\/specs\/2026-02-19-approved-spec-triage-run-specs\.md/u);
});

test("runSpecStage(spec-audit) usa commit de auditoria e prompt dedicado", async () => {
  let capturedPrompt = "";

  const client = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
    runCodexCommand: async (request) => {
      capturedPrompt = request.prompt;
      return { stdout: "ok", stderr: "" };
    },
  });

  const result = await client.runSpecStage("spec-audit", spec);

  assert.equal(result.stage, "spec-audit");
  assert.match(result.promptTemplatePath, /08-auditar-spec-apos-run-all\.md$/u);
  assert.equal(result.promptText, capturedPrompt);
  assert.match(
    capturedPrompt,
    /chore\(specs\): audit 2026-02-19-approved-spec-triage-run-specs\.md/u,
  );
  assert.match(capturedPrompt, /docs\/specs\/2026-02-19-approved-spec-triage-run-specs\.md/u);
});

test("runSpecStage(spec-workflow-retrospective) usa prompt dedicado sem exigir commit", async () => {
  let capturedPrompt = "";
  const retrospectiveSpec = {
    ...spec,
    workflowRetrospectiveContext: [
      "# Contexto estruturado do workflow-gap-analysis",
      "- Input mode esperado: follow-up-tickets",
      "- Follow-up tickets declarados por spec-audit: 1",
      "- Contexto do codex-flow-runner a consultar: .",
    ].join("\n"),
  };

  const client = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
    runCodexCommand: async (request) => {
      capturedPrompt = request.prompt;
      return { stdout: "ok", stderr: "" };
    },
  });

  const result = await client.runSpecStage("spec-workflow-retrospective", retrospectiveSpec);

  assert.equal(result.stage, "spec-workflow-retrospective");
  assert.match(result.promptTemplatePath, /11-retrospectiva-workflow-apos-spec-audit\.md$/u);
  assert.equal(result.promptText, capturedPrompt);
  assert.doesNotMatch(capturedPrompt, /Commit esperado:/u);
  assert.match(capturedPrompt, /docs\/specs\/2026-02-19-approved-spec-triage-run-specs\.md/u);
  assert.match(capturedPrompt, /Input mode esperado: follow-up-tickets/u);
  assert.match(capturedPrompt, /Contexto estruturado do workflow-gap-analysis/u);
});

test("runSpecStage(plan-spec-materialize) injeta contexto estruturado e caminho da spec planejada", async () => {
  let capturedPrompt = "";

  const client = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
    loadPromptTemplate: async () =>
      [
        "# Prompt",
        "",
        "Spec alvo: <SPEC_PATH>",
        "Arquivo: <SPEC_FILE_NAME>",
        "Fluxo: <SPEC_SOURCE_COMMAND>",
        "Titulo: <SPEC_TITLE>",
        "Resumo: <SPEC_SUMMARY>",
        "Objetivo: <SPEC_OBJECTIVE>",
        "Atores:",
        "<SPEC_ACTORS>",
        "Jornada:",
        "<SPEC_JOURNEY>",
        "RFs:",
        "<SPEC_REQUIREMENTS>",
        "CAs:",
        "<SPEC_ACCEPTANCE_CRITERIA>",
        "Nao-escopo:",
        "<SPEC_NON_SCOPE>",
        "Restricoes tecnicas:",
        "<SPEC_TECHNICAL_CONSTRAINTS>",
        "Validacoes obrigatorias:",
        "<SPEC_MANDATORY_VALIDATIONS>",
        "Validacoes manuais pendentes:",
        "<SPEC_PENDING_MANUAL_VALIDATIONS>",
        "Riscos conhecidos:",
        "<SPEC_KNOWN_RISKS>",
        "Assumptions and defaults:",
        "<SPEC_ASSUMPTIONS_AND_DEFAULTS>",
        "Decisoes e trade-offs:",
        "<SPEC_DECISIONS_AND_TRADE_OFFS>",
      ].join("\n"),
    runCodexCommand: async (request) => {
      capturedPrompt = request.prompt;
      return { stdout: "ok", stderr: "" };
    },
  });

  const result = await client.runSpecStage("plan-spec-materialize", plannedSpec);

  assert.equal(result.stage, "plan-spec-materialize");
  assert.match(capturedPrompt, /docs\/specs\/2026-02-19-bridge-interativa-do-codex\.md/u);
  assert.match(capturedPrompt, /Fluxo: \/discover_spec/u);
  assert.match(capturedPrompt, /Titulo: Bridge interativa do Codex/u);
  assert.match(capturedPrompt, /Resumo: Sessao \/plan com parser e callbacks no Telegram\./u);
  assert.match(capturedPrompt, /Objetivo: Transformar a sessao \/plan em uma spec rica e reutilizavel\./u);
  assert.match(capturedPrompt, /- Operador do Telegram/u);
  assert.match(capturedPrompt, /- RF-01 - A materializacao deve preservar RFs aprovados\./u);
  assert.match(capturedPrompt, /- CA-01 - O prompt recebe RFs, CAs e jornada aprovados\./u);
  assert.match(capturedPrompt, /- Nao implementar o produto final nesta etapa\./u);
  assert.match(capturedPrompt, /- Manter o protocolo parseavel e sequencial\./u);
  assert.match(capturedPrompt, /- Revisar a clareza da jornada com um operador humano\./u);
  assert.match(capturedPrompt, /- Resumo curto demais reduz a qualidade da spec materializada\./u);
  assert.match(capturedPrompt, /- Assumir monorepo Node\.js 20\+\./u);
  assert.match(capturedPrompt, /- Reutilizar callbacks existentes em vez de abrir novo protocolo\./u);
  assert.doesNotMatch(
    capturedPrompt,
    /<SPEC_SOURCE_COMMAND>|<SPEC_TITLE>|<SPEC_SUMMARY>|<SPEC_OBJECTIVE>|<SPEC_ACTORS>|<SPEC_JOURNEY>|<SPEC_REQUIREMENTS>|<SPEC_ACCEPTANCE_CRITERIA>|<SPEC_NON_SCOPE>|<SPEC_TECHNICAL_CONSTRAINTS>|<SPEC_MANDATORY_VALIDATIONS>|<SPEC_PENDING_MANUAL_VALIDATIONS>|<SPEC_KNOWN_RISKS>|<SPEC_ASSUMPTIONS_AND_DEFAULTS>|<SPEC_DECISIONS_AND_TRADE_OFFS>/u,
  );
});

test("runSpecStage(plan-spec-materialize) falha quando o contexto estruturado nao e informado", async () => {
  const client = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
    loadPromptTemplate: async () => "# Prompt sem placeholders",
    runCodexCommand: async () => ({ stdout: "ok", stderr: "" }),
  });

  await assert.rejects(
    () =>
      client.runSpecStage("plan-spec-materialize", {
        fileName: plannedSpec.fileName,
        path: plannedSpec.path,
        plannedTitle: plannedSpec.plannedTitle,
        plannedSummary: plannedSpec.plannedSummary,
      }),
    (error: unknown) => {
      assert.ok(error instanceof CodexStageExecutionError);
      assert.match(error.message, /contexto estruturado aprovado/u);
      assert.equal(error.stage, "plan-spec-materialize");
      return true;
    },
  );
});

test("runSpecStage(plan-spec-version-and-push) injeta commit dedicado feat(spec) e trilha spec_planning", async () => {
  let capturedPrompt = "";

  const client = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
    loadPromptTemplate: async () =>
      [
        "# Prompt",
        "",
        "Commit: <COMMIT_MESSAGE>",
        "Request: <TRACE_REQUEST_PATH>",
        "Response: <TRACE_RESPONSE_PATH>",
        "Decision: <TRACE_DECISION_PATH>",
      ].join("\n"),
    runCodexCommand: async (request) => {
      capturedPrompt = request.prompt;
      return { stdout: "ok", stderr: "" };
    },
  });

  const result = await client.runSpecStage("plan-spec-version-and-push", plannedSpec);

  assert.equal(result.stage, "plan-spec-version-and-push");
  assert.match(capturedPrompt, /feat\(spec\): add 2026-02-19-bridge-interativa-do-codex\.md/u);
  assert.match(capturedPrompt, /spec_planning\/requests\/20260219t220400z-s1-request\.md/u);
  assert.match(capturedPrompt, /spec_planning\/responses\/20260219t220400z-s1-materialize\.md/u);
  assert.match(capturedPrompt, /spec_planning\/decisions\/20260219t220400z-s1-decision\.json/u);
  assert.match(capturedPrompt, /Fluxo de origem: `\/discover_spec`/u);
  assert.doesNotMatch(capturedPrompt, /<TRACE_REQUEST_PATH>|<TRACE_RESPONSE_PATH>|<TRACE_DECISION_PATH>/u);
});

test("runSpecStage(plan-spec-version-and-push) falha quando trilha spec_planning nao e informada", async () => {
  const client = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
    loadPromptTemplate: async () => "# Prompt sem placeholders",
    runCodexCommand: async () => ({ stdout: "ok", stderr: "" }),
  });

  await assert.rejects(
    () =>
      client.runSpecStage("plan-spec-version-and-push", {
        fileName: plannedSpec.fileName,
        path: plannedSpec.path,
      }),
    (error: unknown) => {
      assert.ok(error instanceof CodexStageExecutionError);
      assert.match(error.message, /trilha spec_planning completa/u);
      assert.equal(error.stage, "plan-spec-version-and-push");
      return true;
    },
  );
});

test("ensureAuthenticated falha com instrucao de codex login quando sessao esta ausente", async () => {
  const client = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
    runCodexAuthStatusCommand: async () => ({
      stdout: "Not logged in",
      stderr: "",
    }),
  });

  await assert.rejects(
    () => client.ensureAuthenticated(),
    (error: unknown) => {
      assert.ok(error instanceof CodexAuthenticationError);
      assert.match(error.message, /codex login/u);
      return true;
    },
  );
});

test("ensureAuthenticated aceita sessao valida do Codex CLI", async () => {
  let checks = 0;
  const client = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
    runCodexAuthStatusCommand: async () => {
      checks += 1;
      return {
        stdout: "Logged in using ChatGPT",
        stderr: "",
      };
    },
  });

  await client.ensureAuthenticated();
  assert.equal(checks, 1);
});

test("ensureAuthenticated propaga falha do comando com erro contextualizado", async () => {
  const client = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
    runCodexAuthStatusCommand: async () => {
      throw new Error("codex login status terminou com codigo 1: unauthorized");
    },
  });

  await assert.rejects(
    () => client.ensureAuthenticated(),
    (error: unknown) => {
      assert.ok(error instanceof CodexAuthenticationError);
      assert.match(error.message, /codex login status terminou com codigo 1/u);
      return true;
    },
  );
});

test("runStage falhando encapsula erro com stage e ticket", async () => {
  const client = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
      loadPromptTemplate: async () => "# prompt",
      runCodexCommand: async () => {
        throw new Error("codex exec terminou com codigo 1");
      },
      resolvePlanDirectoryName: async () => "execplans",
    });

  await assert.rejects(
    () => client.runStage("implement", ticket),
    (error: unknown) => {
      assert.ok(error instanceof CodexStageExecutionError);
      assert.equal(error.stage, "implement");
      assert.equal(error.ticketName, ticket.name);
      assert.match(error.message, /codex exec terminou com codigo 1/u);
      return true;
    },
  );
});

test("startPlanSession usa codex exec/resume --json e parseia pergunta/final", async () => {
  const events: Array<{ type: string; payload?: unknown }> = [];
  const capturedArgs: string[][] = [];
  const threadId = "019c7f32-4dda-71a0-a33f-00b65eca7c2b";

  const client = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
    runCodexExecJsonCommand: async (request) => {
      capturedArgs.push([...request.args]);
      const isResume = request.args.includes("resume");
      if (!isResume) {
        return {
          stdout: [
            `{"type":"thread.started","thread_id":"${threadId}"}`,
            '{"type":"turn_context","payload":{"model":"gpt-5.4","effort":"xhigh"}}',
            '{"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"[[PLAN_SPEC_QUESTION]]\\nPergunta: Qual escopo devemos priorizar?\\nOpcoes:\\n- [api] API\\n- [bot] Bot Telegram\\n[[/PLAN_SPEC_QUESTION]]"}}',
            '{"type":"turn.completed","usage":{"input_tokens":1,"output_tokens":1}}',
          ].join("\n"),
          stderr: "",
        };
      }

      return {
        stdout: [
          `{"type":"thread.started","thread_id":"${threadId}"}`,
          '{"type":"turn_context","payload":{"model":"gpt-5.4","effort":"xhigh"}}',
          '{"type":"item.completed","item":{"id":"item_1","type":"agent_message","text":"[[PLAN_SPEC_FINAL]]\\nTitulo: Plano final\\nResumo: Implementar migracao para exec resume json.\\nObjetivo: Criar spec rica a partir do bloco final.\\nAtores:\\n- Operador\\nJornada:\\n- Operador aprova o plano\\nRFs:\\n- RF-01 - Persistir contexto estruturado\\nCAs:\\n- CA-01 - Final estruturado parseado com sucesso\\nNao-escopo:\\n- Nenhum\\nRestricoes tecnicas:\\n- Manter protocolo parseavel\\nValidacoes obrigatorias:\\n- Conferir os campos na spec materializada\\nValidacoes manuais pendentes:\\n- Revisar o documento final\\nRiscos conhecidos:\\n- Perda de contexto entre planejamento e spec\\nAcoes:\\n- Criar spec\\n- Refinar\\n- Cancelar\\n[[/PLAN_SPEC_FINAL]]"}}',
          '{"type":"turn.completed","usage":{"input_tokens":1,"output_tokens":1}}',
        ].join("\n"),
        stderr: "",
      };
    },
  }, {
    resolveInvocationPreferences: async () => ({
      model: "gpt-5.4",
      reasoningEffort: "xhigh",
      speed: "fast",
    }),
  });

  const session = await client.startPlanSession({
    callbacks: {
      onEvent: (event) => events.push({ type: event.type, payload: event }),
      onFailure: (error) => {
        throw error;
      },
    },
  });

  await session.sendUserInput("brief inicial da spec");
  await session.sendUserInput("refine com mais detalhes");

  assert.equal(capturedArgs.length, 2);
  assert.equal(capturedArgs[0]?.includes("resume"), false);
  assert.equal(capturedArgs[0]?.includes("--json"), true);
  assert.equal(capturedArgs[0]?.includes("-s"), true);
  assert.equal(capturedArgs[0]?.includes("danger-full-access"), true);
  assert.equal(capturedArgs[0]?.includes("-m"), true);
  assert.equal(capturedArgs[0]?.includes("gpt-5.4"), true);
  assert.equal(capturedArgs[0]?.includes('model_reasoning_effort="xhigh"'), true);
  assert.equal(capturedArgs[0]?.includes("features.fast_mode=true"), true);
  assert.equal(capturedArgs[0]?.includes('service_tier="fast"'), true);
  assert.equal(capturedArgs[0]?.includes("/plan"), false);
  assert.match(capturedArgs[0]?.[capturedArgs[0].length - 1] ?? "", /Brief do operador: brief inicial/u);
  assert.match(capturedArgs[0]?.[capturedArgs[0].length - 1] ?? "", /\[\[PLAN_SPEC_QUESTION\]\]/u);

  assert.equal(capturedArgs[1]?.includes("resume"), true);
  assert.equal(capturedArgs[1]?.includes("--dangerously-bypass-approvals-and-sandbox"), true);
  assert.equal(capturedArgs[1]?.includes("-s"), false);
  assert.equal(capturedArgs[1]?.includes("danger-full-access"), false);
  assert.equal(capturedArgs[1]?.includes("-m"), true);
  assert.equal(capturedArgs[1]?.includes('model_reasoning_effort="xhigh"'), true);
  assert.equal(capturedArgs[1]?.includes("features.fast_mode=true"), true);
  assert.equal(capturedArgs[1]?.includes('service_tier="fast"'), true);
  const resumeThreadIdIndex = capturedArgs[1]?.findIndex((value) => value === threadId) ?? -1;
  assert.equal(resumeThreadIdIndex >= 0, true);
  assert.equal(capturedArgs[1]?.[capturedArgs[1].length - 1], "refine com mais detalhes");

  const questionEvent = events.find((event) => event.type === "question");
  assert.ok(questionEvent);
  assert.deepEqual(
    (questionEvent?.payload as { question: { options: Array<{ value: string; label: string }> } }).question
      .options,
    [{ value: "api", label: "API" }, { value: "bot", label: "Bot Telegram" }],
  );

  const finalEvent = events.find((event) => event.type === "final");
  assert.ok(finalEvent);
  assert.equal(
    (finalEvent?.payload as { final: { title: string } }).final.title,
    "Plano final",
  );
  assert.equal(
    (finalEvent?.payload as { final: { outline: { objective: string } } }).final.outline.objective,
    "Criar spec rica a partir do bloco final.",
  );

  await session.cancel();
});

test("startPlanSession repassa saida nao parseavel como raw e emite atividade stdout/stderr", async () => {
  const rawEvents: string[] = [];
  const activities: Array<{ source: string; bytes: number; preview: string }> = [];

  const client = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
    runCodexExecJsonCommand: async () => ({
      stdout: [
        '{"type":"thread.started","thread_id":"thread-plan-spec-1"}',
        '{"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"Resposta livre sem bloco estruturado"}}',
        '{"type":"turn.completed","usage":{"input_tokens":1,"output_tokens":1}}',
      ].join("\n"),
      stderr: "\u001b[33mWARN de runtime\u001b[0m\n",
    }),
  });

  const session = await client.startPlanSession({
    callbacks: {
      onEvent: (event) => {
        if (event.type === "raw-sanitized") {
          rawEvents.push(event.text);
          return;
        }

        if (event.type === "activity") {
          activities.push({
            source: event.activity.source,
            bytes: event.activity.bytes,
            preview: event.activity.preview,
          });
        }
      },
      onFailure: (error) => {
        throw error;
      },
    },
  });

  await session.sendUserInput("entrada livre");

  assert.deepEqual(rawEvents, ["Resposta livre sem bloco estruturado"]);
  assert.equal(activities.some((activity) => activity.source === "stdout"), true);
  assert.equal(activities.some((activity) => activity.source === "stderr"), true);
  assert.equal(activities.every((activity) => activity.bytes > 0), true);

  await session.cancel();
});

test("startPlanSession falha quando codex exec --json nao retorna thread_id", async () => {
  const failures: CodexPlanSessionError[] = [];

  const client = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
    runCodexExecJsonCommand: async () => ({
      stdout: [
        '{"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"[[PLAN_SPEC_FINAL]]\\nTitulo: X\\nResumo: Y\\nAcoes:\\n- Criar spec\\n[[/PLAN_SPEC_FINAL]]"}}',
        '{"type":"turn.completed","usage":{"input_tokens":1,"output_tokens":1}}',
      ].join("\n"),
      stderr: "",
    }),
  });

  const session = await client.startPlanSession({
    callbacks: {
      onEvent: () => undefined,
      onFailure: (error) => failures.push(error),
    },
  });

  await assert.rejects(() => session.sendUserInput("mensagem"), /nao retornou thread_id/u);
  assert.equal(failures.length, 1);
  assert.equal(failures[0]?.phase, "runtime");
  assert.match(failures[0]?.message ?? "", /nao retornou thread_id/u);

  await session.cancel();
});

test("startPlanSession falha quando codex exec --json nao retorna agent_message", async () => {
  const failures: CodexPlanSessionError[] = [];

  const client = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
    runCodexExecJsonCommand: async () => ({
      stdout: [
        '{"type":"thread.started","thread_id":"thread-plan-spec-sem-msg"}',
        '{"type":"item.completed","item":{"id":"item_0","type":"reasoning","text":"analisando"}}',
        '{"type":"turn.completed","usage":{"input_tokens":1,"output_tokens":1}}',
      ].join("\n"),
      stderr: "",
    }),
  });

  const session = await client.startPlanSession({
    callbacks: {
      onEvent: () => undefined,
      onFailure: (error) => failures.push(error),
    },
  });

  await assert.rejects(() => session.sendUserInput("mensagem"), /nao retornou agent_message/u);
  assert.equal(failures.length, 1);
  assert.equal(failures[0]?.phase, "runtime");
  assert.match(failures[0]?.message ?? "", /nao retornou agent_message/u);

  await session.cancel();
});

test("startDiscoverSession injeta protocolo estruturado e parseia pergunta/final enriquecidos (CA-04, CA-06)", async () => {
  const events: Array<{ type: string; payload?: unknown; text?: string; model?: string; reasoningEffort?: string }> = [];
  const capturedArgs: string[][] = [];
  const threadId = "019c7f32-4dda-71a0-a33f-00b65eca7c2b";

  const client = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
    runCodexExecJsonCommand: async (request) => {
      capturedArgs.push([...request.args]);
      const isResume = request.args.includes("resume");
      if (!isResume) {
        return {
          stdout: [
            `{"type":"thread.started","thread_id":"${threadId}"}`,
            '{"type":"turn_context","payload":{"model":"gpt-5.4","effort":"high"}}',
            '{"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"[[PLAN_SPEC_QUESTION]]\\nPergunta: Qual ambiguidade devemos fechar primeiro?\\nOpcoes:\\n- [scope] Escopo funcional\\n- [tradeoff] Trade-off principal\\n[[/PLAN_SPEC_QUESTION]]"}}',
            '{"type":"turn.completed","usage":{"input_tokens":1,"output_tokens":1}}',
          ].join("\n"),
          stderr: "",
        };
      }

      return {
        stdout: [
          `{"type":"thread.started","thread_id":"${threadId}"}`,
          '{"type":"turn_context","payload":{"model":"gpt-5.4","effort":"high"}}',
          '{"type":"item.completed","item":{"id":"item_1","type":"agent_message","text":"[[PLAN_SPEC_FINAL]]\\nTitulo: Descoberta profunda consolidada\\nResumo: Entrevista estruturada com coverage explicita para /discover_spec.\\nObjetivo: Consolidar lacunas criticas antes da spec.\\nAtores:\\n- Operador do Telegram\\nJornada:\\n- Operador descreve o contexto\\nRFs:\\n- RF-10 - Cobrir categorias obrigatorias\\nCAs:\\n- CA-04 - Cada categoria fica explicita\\nNao-escopo:\\n- Nao materializar a spec nesta etapa\\nRestricoes tecnicas:\\n- Reutilizar parser compartilhado\\nValidacoes obrigatorias:\\n- Rodar testes do discover\\nValidacoes manuais pendentes:\\n- Validar o fluxo em Telegram real\\nRiscos conhecidos:\\n- Gate permissivo demais\\nCategorias obrigatorias:\\n- [objective-value][covered] Objetivo e valor esperado: objetivo e valor explicitados pelo operador\\n- [actors-journey][covered] Atores e jornada: atores centrais e jornada principal aprovados\\n- [functional-scope][covered] Escopo funcional: escopo detalhado e fechado\\n- [non-scope][covered] Nao-escopo: exclusoes explicitas\\n- [constraints-dependencies][not-applicable] Restricoes tecnicas e dependencias: nenhuma dependencia adicional nesta rodada\\n- [validations-acceptance][covered] Validacoes e criterios de aceite: validacoes e CAs listados\\n- [risks][covered] Riscos operacionais e funcionais: riscos conhecidos listados\\n- [assumptions-defaults][covered] Assumptions e defaults: default de monorepo aprovado\\n- [decisions-tradeoffs][covered] Decisoes e trade-offs: follow-up automatico escolhido para lacunas criticas\\nAssumptions/defaults:\\n- Assumir monorepo Node.js 20+ como base\\nDecisoes e trade-offs:\\n- Reutilizar callbacks de /plan_spec\\nAmbiguidades criticas abertas:\\n- Nenhum\\nAcoes:\\n- Criar spec\\n- Refinar\\n- Cancelar\\n[[/PLAN_SPEC_FINAL]]"}}',
          '{"type":"turn.completed","usage":{"input_tokens":1,"output_tokens":1}}',
        ].join("\n"),
        stderr: "WARN codex_core::state_db: fallback\n",
      };
    },
  }, {
    resolveInvocationPreferences: async () => ({
      model: "gpt-5.4",
      reasoningEffort: "high",
      speed: "fast",
    }),
  });

  const session = await client.startDiscoverSession({
    callbacks: {
      onEvent: (event) => {
        if (event.type === "question" || event.type === "final") {
          events.push({ type: event.type, payload: event });
          return;
        }

        if (event.type === "raw-sanitized") {
          events.push({ type: event.type, text: event.text, payload: event });
          return;
        }

        if (event.type === "turn-context") {
          events.push({
            type: event.type,
            model: event.model,
            reasoningEffort: event.reasoningEffort,
          });
          return;
        }

        events.push({ type: event.type });
      },
      onFailure: (error) => {
        throw error;
      },
    },
  });

  await session.sendUserInput("brief inicial");
  await session.sendUserInput("mais detalhes");

  assert.equal(capturedArgs.length, 2);
  assert.equal(capturedArgs[0]?.includes("resume"), false);
  assert.equal(capturedArgs[0]?.includes("--json"), true);
  assert.equal(capturedArgs[0]?.includes("-s"), true);
  assert.equal(capturedArgs[0]?.includes("danger-full-access"), true);
  assert.equal(capturedArgs[0]?.includes("-m"), true);
  assert.equal(capturedArgs[0]?.includes('model_reasoning_effort="high"'), true);
  assert.equal(capturedArgs[0]?.includes("features.fast_mode=true"), true);
  assert.equal(capturedArgs[0]?.includes('service_tier="fast"'), true);
  assert.equal(capturedArgs[0]?.includes("/plan"), false);
  assert.match(capturedArgs[0]?.[capturedArgs[0].length - 1] ?? "", /Brief do operador: brief inicial/u);
  assert.match(capturedArgs[0]?.[capturedArgs[0].length - 1] ?? "", /\[\[PLAN_SPEC_FINAL\]\]/u);

  assert.equal(capturedArgs[1]?.includes("resume"), true);
  assert.equal(capturedArgs[1]?.includes("--dangerously-bypass-approvals-and-sandbox"), true);
  assert.equal(capturedArgs[1]?.includes("-s"), false);
  assert.equal(capturedArgs[1]?.includes("danger-full-access"), false);
  assert.equal(capturedArgs[1]?.includes("-m"), true);
  assert.equal(capturedArgs[1]?.includes('model_reasoning_effort="high"'), true);
  assert.equal(capturedArgs[1]?.includes("features.fast_mode=true"), true);
  assert.equal(capturedArgs[1]?.includes('service_tier="fast"'), true);
  const resumeThreadIdIndex = capturedArgs[1]?.findIndex((value) => value === threadId) ?? -1;
  assert.equal(resumeThreadIdIndex >= 0, true);
  assert.equal(capturedArgs[1]?.[capturedArgs[1].length - 1], "mais detalhes");

  const questionEvent = events.find((event) => event.type === "question");
  assert.ok(questionEvent);
  assert.deepEqual(
    (questionEvent?.payload as { question: { options: Array<{ value: string; label: string }> } }).question.options,
    [{ value: "scope", label: "Escopo funcional" }, { value: "tradeoff", label: "Trade-off principal" }],
  );

  const finalEvent = events.find((event) => event.type === "final");
  assert.ok(finalEvent);
  assert.deepEqual(
    (finalEvent?.payload as { final: { assumptionsAndDefaults: string[] } }).final.assumptionsAndDefaults,
    ["Assumir monorepo Node.js 20+ como base"],
  );
  assert.equal(
    (finalEvent?.payload as { final: { categoryCoverage: Array<{ categoryId: string }> } }).final
      .categoryCoverage.length,
    9,
  );
  assert.deepEqual(
    (finalEvent?.payload as { final: { criticalAmbiguities: string[] } }).final.criticalAmbiguities,
    [],
  );

  const rawMessages = events.filter((event) => event.type === "raw-sanitized").map((event) => event.text);
  const turnCompletions = events.filter((event) => event.type === "turn-complete");
  const turnContexts = events.filter((event) => event.type === "turn-context");
  assert.deepEqual(rawMessages, []);
  assert.equal(turnCompletions.length, 0);
  assert.deepEqual(
    turnContexts.map((event) => ({
      model: event.model,
      reasoningEffort: event.reasoningEffort,
    })),
    [
      { model: "gpt-5.4", reasoningEffort: "high" },
      { model: "gpt-5.4", reasoningEffort: "high" },
    ],
  );

  await session.cancel();
});

test("falha da sessao discover retorna hint de retry para /discover_spec", async () => {
  const failures: CodexDiscoverSpecSessionError[] = [];

  const client = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
    runCodexExecJsonCommand: async () => {
      throw new Error("codex exec terminou com codigo 1: unauthorized");
    },
  });

  const session = await client.startDiscoverSession({
    callbacks: {
      onEvent: () => undefined,
      onFailure: (error) => failures.push(error),
    },
  });
  await assert.rejects(() => session.sendUserInput("falhar"), /codex exec terminou com codigo 1/u);

  assert.equal(failures.length, 1);
  assert.equal(failures[0]?.phase, "runtime");
  assert.match(failures[0]?.message ?? "", /Use \/discover_spec para tentar novamente/u);
});

test("startFreeChatSession usa codex exec/resume e mantém contexto por thread_id", async () => {
  const events: Array<{ type: string; text?: string; model?: string; reasoningEffort?: string }> = [];
  const capturedArgs: string[][] = [];
  const threadId = "019c7f32-4dda-71a0-a33f-00b65eca7c2b";

  const client = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
    runCodexExecJsonCommand: async (request) => {
      capturedArgs.push([...request.args]);

      const isResume = request.args.includes("resume");
      if (!isResume) {
        return {
          stdout: [
            `{"type":"thread.started","thread_id":"${threadId}"}`,
            '{"type":"turn_context","payload":{"model":"gpt-5.4","effort":"high"}}',
            '{"type":"item.completed","item":{"id":"item_0","type":"reasoning","text":"**analisando**"}}',
            '{"type":"item.completed","item":{"id":"item_1","type":"agent_message","text":"Primeira resposta"}}',
            '{"type":"turn.completed","usage":{"input_tokens":1,"output_tokens":1}}',
          ].join("\n"),
          stderr: "",
        };
      }

      return {
        stdout: [
          `{"type":"thread.started","thread_id":"${threadId}"}`,
          '{"type":"turn_context","payload":{"model":"gpt-5.4","effort":"high"}}',
          '{"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"Segunda resposta"}}',
          '{"type":"turn.completed","usage":{"input_tokens":1,"output_tokens":1}}',
        ].join("\n"),
        stderr: "2026-02-21T07:55:36Z WARN codex_core::state_db: fallback\n",
      };
    },
  }, {
    resolveInvocationPreferences: async () => ({
      model: "gpt-5.4",
      reasoningEffort: "high",
      speed: "fast",
    }),
  });

  const session = await client.startFreeChatSession({
    callbacks: {
      onEvent: (event) => {
        if (event.type === "raw-sanitized") {
          events.push({ type: event.type, text: event.text });
          return;
        }

        if (event.type === "turn-context") {
          events.push({
            type: event.type,
            model: event.model,
            reasoningEffort: event.reasoningEffort,
          });
          return;
        }

        events.push({ type: event.type });
      },
      onFailure: (error) => {
        throw error;
      },
    },
  });

  await session.sendUserInput("primeira mensagem");
  await session.sendUserInput("segunda mensagem");

  const rawMessages = events.filter((event) => event.type === "raw-sanitized").map((event) => event.text);
  const turnCompletions = events.filter((event) => event.type === "turn-complete");
  const turnContexts = events.filter((event) => event.type === "turn-context");
  assert.deepEqual(rawMessages, ["Primeira resposta", "Segunda resposta"]);
  assert.equal(turnCompletions.length, 2);
  assert.deepEqual(
    turnContexts.map((event) => ({
      model: event.model,
      reasoningEffort: event.reasoningEffort,
    })),
    [
      { model: "gpt-5.4", reasoningEffort: "high" },
      { model: "gpt-5.4", reasoningEffort: "high" },
    ],
  );

  assert.equal(capturedArgs.length, 2);
  assert.equal(capturedArgs[0]?.includes("resume"), false);
  assert.equal(capturedArgs[0]?.includes("--json"), true);
  assert.equal(capturedArgs[0]?.includes("-s"), true);
  assert.equal(capturedArgs[0]?.includes("danger-full-access"), true);
  assert.equal(capturedArgs[0]?.includes("-m"), true);
  assert.equal(capturedArgs[0]?.includes('model_reasoning_effort="high"'), true);
  assert.equal(capturedArgs[0]?.includes("features.fast_mode=true"), true);
  assert.equal(capturedArgs[0]?.includes('service_tier="fast"'), true);
  assert.equal(capturedArgs[0]?.includes("/plan"), false);

  assert.equal(capturedArgs[1]?.includes("resume"), true);
  assert.equal(capturedArgs[1]?.includes("--dangerously-bypass-approvals-and-sandbox"), true);
  assert.equal(capturedArgs[1]?.includes("-s"), false);
  assert.equal(capturedArgs[1]?.includes("danger-full-access"), false);
  assert.equal(capturedArgs[1]?.includes("-m"), true);
  assert.equal(capturedArgs[1]?.includes('model_reasoning_effort="high"'), true);
  assert.equal(capturedArgs[1]?.includes("features.fast_mode=true"), true);
  assert.equal(capturedArgs[1]?.includes('service_tier="fast"'), true);
  const resumeThreadIdIndex = capturedArgs[1]?.findIndex((value) => value === threadId) ?? -1;
  assert.equal(resumeThreadIdIndex >= 0, true);

  await session.cancel();
});

test("startFreeChatSession falha quando codex exec --json nao retorna agent_message", async () => {
  const failures: CodexChatSessionError[] = [];

  const client = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
    runCodexExecJsonCommand: async () => ({
      stdout: [
        '{"type":"thread.started","thread_id":"thread-sem-mensagem"}',
        '{"type":"item.completed","item":{"id":"item_0","type":"reasoning","text":"analisando"}}',
        '{"type":"turn.completed","usage":{"input_tokens":1,"output_tokens":1}}',
      ].join("\n"),
      stderr: "WARN codex_core::state_db: fallback\n",
    }),
  });

  const session = await client.startFreeChatSession({
    callbacks: {
      onEvent: () => undefined,
      onFailure: (error) => failures.push(error),
    },
  });

  await assert.rejects(
    () => session.sendUserInput("mensagem sem agent_message"),
    /nao retornou agent_message/u,
  );

  assert.equal(failures.length, 1);
  assert.equal(failures[0]?.phase, "runtime");
  assert.match(failures[0]?.message ?? "", /nao retornou agent_message/u);

  await session.cancel();
});

test("falha da sessao livre retorna hint de retry para /codex_chat", async () => {
  const failures: CodexChatSessionError[] = [];

  const client = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
    runCodexExecJsonCommand: async () => {
      throw new Error("codex exec terminou com codigo 1: unauthorized");
    },
  });

  const session = await client.startFreeChatSession({
    callbacks: {
      onEvent: () => undefined,
      onFailure: (error) => failures.push(error),
    },
  });
  await assert.rejects(() => session.sendUserInput("falhar"), /codex exec terminou com codigo 1/u);

  assert.equal(failures.length, 1);
  assert.equal(failures[0]?.phase, "runtime");
  assert.match(failures[0]?.message ?? "", /Use \/codex_chat para tentar novamente/u);
});

test("startSpecTicketValidationSession usa codex exec/resume com thread local do gate e ignora thread_id externo", async () => {
  const capturedArgs: string[][] = [];
  const threadId = "thread-spec-ticket-validation-1";
  const triageThreadId = "thread-spec-triage-externa";

  const client = new CodexCliTicketFlowClient(
    "/tmp/repo",
    new SpyLogger(),
    {
      loadPromptTemplate: async () => "# protocolo do gate",
      runCodexExecJsonCommand: async (request) => {
        capturedArgs.push([...request.args]);

        const isResume = request.args.includes("resume");
        if (!isResume) {
          return {
            stdout: [
              JSON.stringify({ type: "thread.started", thread_id: threadId }),
              JSON.stringify({
                type: "item.completed",
                item: {
                  id: "item_0",
                  type: "agent_message",
                  text: [
                    "[[SPEC_TICKET_VALIDATION]]",
                    JSON.stringify(
                      {
                        verdict: "NO_GO",
                        confidence: "medium",
                        summary: "Ainda existe um gap corrigivel.",
                        gaps: [
                          {
                            gapType: "coverage-gap",
                            summary: "RF-02 ainda nao esta coberto.",
                            affectedArtifactPaths: ["tickets/open/example.md"],
                            requirementRefs: ["RF-02"],
                            evidence: ["Ticket atual nao menciona RF-02."],
                            probableRootCause: "ticket",
                            isAutoCorrectable: true,
                          },
                        ],
                        appliedCorrections: [],
                      },
                      null,
                      2,
                    ),
                    "[[/SPEC_TICKET_VALIDATION]]",
                  ].join("\n"),
                },
              }),
              JSON.stringify({ type: "turn.completed", usage: { input_tokens: 1, output_tokens: 1 } }),
            ].join("\n"),
            stderr: "",
          };
        }

        return {
          stdout: [
            JSON.stringify({ type: "thread.started", thread_id: threadId }),
            JSON.stringify({
              type: "item.completed",
              item: {
                id: "item_1",
                type: "agent_message",
                text: [
                  "[[SPEC_TICKET_VALIDATION]]",
                  JSON.stringify(
                    {
                      verdict: "GO",
                      confidence: "high",
                      summary: "Pacote corrigido e pronto para seguir.",
                      gaps: [],
                      appliedCorrections: [
                        {
                          description: "Adicionar cobertura explicita de RF-02.",
                          affectedArtifactPaths: ["tickets/open/example.md"],
                          linkedGapTypes: ["coverage-gap"],
                          outcome: "applied",
                        },
                      ],
                    },
                    null,
                    2,
                  ),
                  "[[/SPEC_TICKET_VALIDATION]]",
                ].join("\n"),
              },
            }),
            JSON.stringify({ type: "turn.completed", usage: { input_tokens: 1, output_tokens: 1 } }),
          ].join("\n"),
          stderr: "",
        };
      },
    },
    {
      resolveInvocationPreferences: async () => ({
        model: "gpt-5.4",
        reasoningEffort: "high",
        speed: "fast",
      }),
    },
  );

  const session = await client.startSpecTicketValidationSession({
    spec,
    triageThreadId,
  });

  const first = await session.runTurn({
    packageContext: "Pacote derivado inicial",
  });
  const second = await session.runTurn({
    packageContext: "Pacote derivado apos correcao",
    appliedCorrectionsSummary: ["Adicionar cobertura explicita de RF-02. [applied]"],
    previousPass: {
      verdict: "NO_GO",
      confidence: "medium",
      summary: "Ainda existe um gap corrigivel.",
      gaps: [
        {
          gapType: "coverage-gap",
          summary: "RF-02 ainda nao esta coberto.",
          affectedArtifactPaths: ["tickets/open/example.md"],
          requirementRefs: ["RF-02"],
          evidence: ["Ticket atual nao menciona RF-02."],
          probableRootCause: "ticket",
          isAutoCorrectable: true,
        },
      ],
      appliedCorrections: [],
    },
  });

  assert.equal(first.threadId, threadId);
  assert.equal(first.parsed.verdict, "NO_GO");
  assert.equal(first.parsed.gaps.length, 1);
  assert.equal(second.threadId, threadId);
  assert.equal(second.parsed.verdict, "GO");
  assert.equal(second.parsed.confidence, "high");
  assert.equal(second.parsed.appliedCorrections.length, 1);

  assert.equal(capturedArgs.length, 2);
  assert.equal(capturedArgs[0]?.includes("resume"), false);
  assert.equal(capturedArgs[0]?.includes("--json"), true);
  assert.equal(capturedArgs[0]?.includes("-s"), true);
  assert.equal(capturedArgs[0]?.includes("danger-full-access"), true);
  assert.equal(capturedArgs[0]?.includes("-m"), true);
  assert.equal(capturedArgs[0]?.includes('model_reasoning_effort="high"'), true);
  assert.equal(capturedArgs[0]?.includes("features.fast_mode=true"), true);
  assert.equal(capturedArgs[0]?.includes('service_tier="fast"'), true);
  assert.equal(capturedArgs[0]?.includes(triageThreadId), false);
  assert.match(capturedArgs[0]?.[capturedArgs[0].length - 1] ?? "", /Pacote derivado inicial/u);
  assert.match(capturedArgs[0]?.[capturedArgs[0].length - 1] ?? "", /nao deve ser reutilizado/u);

  assert.equal(capturedArgs[1]?.includes("resume"), true);
  assert.equal(capturedArgs[1]?.includes("--dangerously-bypass-approvals-and-sandbox"), true);
  assert.equal(capturedArgs[1]?.includes("-s"), false);
  assert.equal(capturedArgs[1]?.includes("danger-full-access"), false);
  assert.equal(capturedArgs[1]?.includes(threadId), true);
  assert.equal(capturedArgs[1]?.includes(triageThreadId), false);
  assert.match(capturedArgs[1]?.[capturedArgs[1].length - 1] ?? "", /Adicionar cobertura explicita/u);
  assert.match(
    capturedArgs[1]?.[capturedArgs[1].length - 1] ?? "",
    /## Gaps abertos no passe anterior/u,
  );
  assert.match(
    capturedArgs[1]?.[capturedArgs[1].length - 1] ?? "",
    /coverage-gap\|tickets\/open\/example\.md\|rf-02/u,
  );
  assert.match(
    capturedArgs[1]?.[capturedArgs[1].length - 1] ?? "",
    /remanescente reancorado do gap anterior/u,
  );

  await session.cancel();
});

test("startSpecTicketValidationSession falha quando codex exec --json nao retorna thread_id ou agent_message", async () => {
  const clientWithoutThread = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
    loadPromptTemplate: async () => "# protocolo do gate",
    runCodexExecJsonCommand: async () => ({
      stdout: [
        JSON.stringify({
          type: "item.completed",
          item: {
            id: "item_0",
            type: "agent_message",
            text: [
              "[[SPEC_TICKET_VALIDATION]]",
              JSON.stringify({
                verdict: "GO",
                confidence: "high",
                summary: "Pacote pronto.",
                gaps: [],
                appliedCorrections: [],
              }),
              "[[/SPEC_TICKET_VALIDATION]]",
            ].join("\n"),
          },
        }),
      ].join("\n"),
      stderr: "",
    }),
  });

  const sessionWithoutThread = await clientWithoutThread.startSpecTicketValidationSession({
    spec,
  });
  await assert.rejects(
    () => sessionWithoutThread.runTurn({ packageContext: "Pacote inicial" }),
    (error: unknown) => {
      assert.ok(error instanceof CodexSpecTicketValidationSessionError);
      assert.equal(error.phase, "runtime");
      assert.match(error.message, /nao retornou thread_id/u);
      return true;
    },
  );
  await sessionWithoutThread.cancel();

  const clientWithoutMessage = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
    loadPromptTemplate: async () => "# protocolo do gate",
    runCodexExecJsonCommand: async () => ({
      stdout: [
        JSON.stringify({ type: "thread.started", thread_id: "thread-sem-agent-message" }),
        JSON.stringify({
          type: "item.completed",
          item: {
            id: "item_0",
            type: "reasoning",
            text: "analisando",
          },
        }),
      ].join("\n"),
      stderr: "",
    }),
  });

  const sessionWithoutMessage = await clientWithoutMessage.startSpecTicketValidationSession({
    spec,
  });
  await assert.rejects(
    () => sessionWithoutMessage.runTurn({ packageContext: "Pacote inicial" }),
    (error: unknown) => {
      assert.ok(error instanceof CodexSpecTicketValidationSessionError);
      assert.equal(error.phase, "runtime");
      assert.match(error.message, /nao retornou agent_message/u);
      return true;
    },
  );
  await sessionWithoutMessage.cancel();
});

test("startSpecTicketValidationSession falha deterministicamente quando o payload estruturado e invalido", async () => {
  const client = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
    loadPromptTemplate: async () => "# protocolo do gate",
    runCodexExecJsonCommand: async () => ({
      stdout: [
        JSON.stringify({ type: "thread.started", thread_id: "thread-payload-invalido" }),
        JSON.stringify({
          type: "item.completed",
          item: {
            id: "item_0",
            type: "agent_message",
            text: [
              "[[SPEC_TICKET_VALIDATION]]",
              JSON.stringify({
                verdict: "NO_GO",
                confidence: "high",
                summary: "Payload fora da taxonomia.",
                gaps: [
                  {
                    gapType: "invented-gap",
                    summary: "Gap inventado.",
                    affectedArtifactPaths: ["tickets/open/example.md"],
                    requirementRefs: ["RF-02"],
                    evidence: ["Campo fora da allowlist."],
                    probableRootCause: "ticket",
                    isAutoCorrectable: true,
                  },
                ],
                appliedCorrections: [],
              }),
              "[[/SPEC_TICKET_VALIDATION]]",
            ].join("\n"),
          },
        }),
      ].join("\n"),
      stderr: "",
    }),
  });

  const session = await client.startSpecTicketValidationSession({
    spec,
  });

  await assert.rejects(
    () => session.runTurn({ packageContext: "Pacote inicial" }),
    (error: unknown) => {
      assert.ok(error instanceof CodexSpecTicketValidationSessionError);
      assert.equal(error.phase, "runtime");
      assert.match(error.message, /gapType invalido/u);
      return true;
    },
  );

  await session.cancel();
});

test("runSpecTicketValidationAutoCorrect executa prompt dedicado e parseia correcoes aplicadas", async () => {
  const capturedArgs: string[][] = [];
  let capturedPrompt = "";

  const client = new CodexCliTicketFlowClient(
    "/tmp/repo",
    new SpyLogger(),
    {
      loadPromptTemplate: async () => "# protocolo da autocorrecao do gate",
      runCodexExecJsonCommand: async (request) => {
        capturedArgs.push([...request.args]);
        capturedPrompt = request.args[request.args.length - 1] ?? "";
        return {
          stdout: [
            JSON.stringify({ type: "thread.started", thread_id: "thread-spec-ticket-validation-autocorrect" }),
            JSON.stringify({
              type: "item.completed",
              item: {
                id: "item_0",
                type: "agent_message",
                text: [
                  "[[SPEC_TICKET_AUTOCORRECT]]",
                  JSON.stringify(
                    {
                      appliedCorrections: [
                        {
                          description: "Explicitar cobertura de RF-02 no ticket derivado.",
                          affectedArtifactPaths: ["tickets/open/example.md"],
                          linkedGapTypes: ["coverage-gap"],
                          outcome: "applied",
                        },
                      ],
                    },
                    null,
                    2,
                  ),
                  "[[/SPEC_TICKET_AUTOCORRECT]]",
                ].join("\n"),
              },
            }),
            JSON.stringify({ type: "turn.completed", usage: { input_tokens: 1, output_tokens: 1 } }),
          ].join("\n"),
          stderr: "",
        };
      },
    },
    {
      resolveInvocationPreferences: async () => ({
        model: "gpt-5.4",
        reasoningEffort: "high",
        speed: "fast",
      }),
    },
  );

  const result = await client.runSpecTicketValidationAutoCorrect({
    spec,
    cycleNumber: 1,
    packageContext: "Pacote derivado inicial",
    allowedArtifactPaths: ["tickets/open/example.md"],
    latestPass: {
      verdict: "NO_GO",
      confidence: "high",
      summary: "RF-02 ainda nao esta coberto.",
      gaps: [
        {
          gapType: "coverage-gap",
          summary: "RF-02 ainda nao esta coberto.",
          affectedArtifactPaths: ["tickets/open/example.md"],
          requirementRefs: ["RF-02"],
          evidence: ["Ticket atual nao menciona RF-02."],
          probableRootCause: "ticket",
          isAutoCorrectable: true,
        },
      ],
      appliedCorrections: [],
    },
  });

  assert.equal(result.appliedCorrections.length, 1);
  assert.match(result.promptTemplatePath, /10-autocorrigir-tickets-derivados-da-spec\.md$/u);
  assert.match(result.promptText, /Natureza desta rodada: pre-run-all/u);
  assert.match(result.promptText, /Veredito do ultimo passe: `NO_GO`/u);
  assert.match(result.promptText, /Confianca do ultimo passe: `high`/u);
  assert.match(result.promptText, /Resumo do ultimo passe: RF-02 ainda nao esta coberto\./u);
  assert.match(result.promptText, /## Artefatos permitidos para escrita/u);
  assert.match(result.promptText, /tickets\/open\/example\.md/u);
  assert.match(result.promptText, /coverage-gap: RF-02 ainda nao esta coberto\./u);
  assert.match(result.promptText, /## Checagem final obrigatoria antes de encerrar esta rodada/u);
  assert.match(capturedPrompt, /Pacote derivado inicial/u);
  assert.equal(capturedArgs.length, 1);
  assert.equal(capturedArgs[0]?.includes("resume"), false);
  assert.equal(capturedArgs[0]?.includes("--json"), true);
  assert.equal(capturedArgs[0]?.includes("-s"), true);
  assert.equal(capturedArgs[0]?.includes("danger-full-access"), true);
  assert.equal(capturedArgs[0]?.includes("-m"), true);
  assert.equal(capturedArgs[0]?.includes('model_reasoning_effort="high"'), true);
  assert.equal(capturedArgs[0]?.includes("features.fast_mode=true"), true);
  assert.equal(capturedArgs[0]?.includes('service_tier="fast"'), true);
});

test("runSpecTicketValidationAutoCorrect falha deterministicamente quando o payload estruturado e invalido", async () => {
  const client = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
    loadPromptTemplate: async () => "# protocolo da autocorrecao do gate",
    runCodexExecJsonCommand: async () => ({
      stdout: [
        JSON.stringify({ type: "thread.started", thread_id: "thread-spec-ticket-validation-autocorrect-invalido" }),
        JSON.stringify({
          type: "item.completed",
          item: {
            id: "item_0",
            type: "agent_message",
            text: [
              "[[SPEC_TICKET_AUTOCORRECT]]",
              JSON.stringify({
                appliedCorrections: [
                  {
                    description: "Correcao invalida fora da taxonomia.",
                    affectedArtifactPaths: ["tickets/open/example.md"],
                    linkedGapTypes: ["invented-gap"],
                    outcome: "applied",
                  },
                ],
              }),
              "[[/SPEC_TICKET_AUTOCORRECT]]",
            ].join("\n"),
          },
        }),
      ].join("\n"),
      stderr: "",
    }),
  });

  await assert.rejects(
    () =>
      client.runSpecTicketValidationAutoCorrect({
        spec,
        cycleNumber: 1,
        packageContext: "Pacote derivado inicial",
        allowedArtifactPaths: ["tickets/open/example.md"],
        latestPass: {
          verdict: "NO_GO",
          confidence: "high",
          summary: "RF-02 ainda nao esta coberto.",
          gaps: [
            {
              gapType: "coverage-gap",
              summary: "RF-02 ainda nao esta coberto.",
              affectedArtifactPaths: ["tickets/open/example.md"],
              requirementRefs: ["RF-02"],
              evidence: ["Ticket atual nao menciona RF-02."],
              probableRootCause: "ticket",
              isAutoCorrectable: true,
            },
          ],
          appliedCorrections: [],
        },
      }),
    (error: unknown) => {
      assert.ok(error instanceof CodexSpecTicketValidationAutoCorrectError);
      assert.equal(error.phase, "runtime");
      assert.match(error.message, /linkedGapTypes invalido/u);
      return true;
    },
  );
});

test("sendUserInput apos encerramento da sessao retorna erro de input", async () => {
  const closes: Array<{ exitCode: number | null; cancelled: boolean }> = [];

  const client = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
    runCodexExecJsonCommand: async () => ({
      stdout: [
        '{"type":"thread.started","thread_id":"thread-plan-spec-fechada"}',
        '{"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"resposta inicial"}}',
      ].join("\n"),
      stderr: "",
    }),
  });

  const session = await client.startPlanSession({
    callbacks: {
      onEvent: () => undefined,
      onFailure: () => undefined,
      onClose: (result) => closes.push(result),
    },
  });

  await session.cancel();

  await assert.rejects(
    () => session.sendUserInput("nova mensagem"),
    (error: unknown) => {
      assert.ok(error instanceof CodexPlanSessionError);
      assert.equal(error.phase, "input");
      assert.match(error.message, /sessao interativa ja foi encerrada/u);
      return true;
    },
  );

  assert.equal(closes.length, 1);
  assert.equal(closes[0]?.cancelled, true);
});

test("falha da sessao interativa retorna erro acionavel sem fallback batch (CA-19)", async () => {
  let batchCalls = 0;
  const failures: CodexPlanSessionError[] = [];

  const client = new CodexCliTicketFlowClient("/tmp/repo", new SpyLogger(), {
    runCodexCommand: async () => {
      batchCalls += 1;
      return { stdout: "nao deveria executar", stderr: "" };
    },
    runCodexExecJsonCommand: async () => {
      throw new Error("codex exec terminou com codigo 1: unauthorized");
    },
  });

  const session = await client.startPlanSession({
    callbacks: {
      onEvent: () => undefined,
      onFailure: (error) => failures.push(error),
    },
  });

  await assert.rejects(() => session.sendUserInput("falhar"), /codex exec terminou com codigo 1/u);
  assert.equal(batchCalls, 0);
  assert.equal(failures.length, 1);
  assert.equal(failures[0]?.phase, "runtime");
  assert.match(failures[0]?.message ?? "", /Use \/plan_spec para tentar novamente/u);
});
