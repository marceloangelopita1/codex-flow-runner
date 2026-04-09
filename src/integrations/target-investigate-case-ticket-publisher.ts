import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  TargetInvestigateCaseTicketProposal,
} from "../types/target-investigate-case.js";
import {
  TargetInvestigateCaseTicketPublicationRequest,
  TargetInvestigateCaseTicketPublicationResult,
  TargetInvestigateCaseTicketPublisher,
} from "../core/target-investigate-case.js";
import { GitVersioning } from "./git-client.js";

interface TargetInvestigateCaseTicketPublisherDependencies {
  now: () => Date;
}

const trimmedString = z.string().trim().min(1);

const ticketPublicationPolicySchema = z
  .object({
    internalTicketTemplatePath: trimmedString,
    causalBlockSourcePath: trimmedString,
    mandatoryCausalBlockSources: z.array(trimmedString).min(1),
    versionedArtifactsDefault: z.tuple([z.literal("ticket")]),
    nonVersionedArtifactsDefault: z.array(trimmedString).min(1),
    semanticAuthority: z.literal("target-project"),
    finalPublicationAuthority: z.literal("runner"),
  })
  .strict();

type TicketPublicationPolicy = z.infer<typeof ticketPublicationPolicySchema>;

const TARGET_OWNED_TICKET_REQUIRED_HEADINGS = [
  "## Metadata",
  "## Context",
  "## Problem statement",
  "## Observed behavior",
  "## Expected behavior",
  "## Reproduction steps",
  "## Evidence",
  "## Impact assessment",
  "## Investigacao Causal",
  "### Hypotheses considered",
  "### QA escape",
  "### Prompt / guardrail opportunities",
  "### Ticket readiness",
  "## Closure criteria",
  "## Decision log",
  "## Closure",
] as const;

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
    const ticketProposal = this.requireTicketProposal(request);
    const causalBlockHeadings = await this.assertTemplateCompatibility(policy);
    assertTargetOwnedTicketProposalQuality(ticketProposal, causalBlockHeadings);

    const ticketSlug = buildTicketSlug(request.caseResolution.resolved_case.ref, ticketProposal);
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
    await fs.writeFile(absoluteTicketPath, normalizeMarkdown(ticketProposal.ticket_markdown), {
      encoding: "utf8",
      flag: "wx",
    });

    await this.gitVersioning.commitAndPushPaths(
      [ticketPath],
      `chore(tickets): open ${path.posix.basename(ticketPath, ".md")}`,
      [
        "Flow: /target_investigate_case_v2",
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
    const parsed = ticketPublicationPolicySchema.safeParse(
      request.manifest.ticketPublicationPolicy,
    );
    if (!parsed.success) {
      throw new Error(
        "Manifesto sem ticketPublicationPolicy valido: o runner nao pode materializar ticket elegivel.",
      );
    }

    return parsed.data;
  }

  private requireTicketProposal(
    request: TargetInvestigateCaseTicketPublicationRequest,
  ): TargetInvestigateCaseTicketProposal {
    if (!request.ticketProposal?.ticket_markdown) {
      throw new Error(
        "Publication runner-side v2 exige ticket-proposal.json com ticket_markdown target-owned.",
      );
    }

    return request.ticketProposal;
  }

  private async assertTemplateCompatibility(policy: TicketPublicationPolicy): Promise<string[]> {
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
    const mandatoryCausalHeadings = causalHeadings.filter(
      (entry) =>
        entry === "## Investigacao Causal" ||
        policy.mandatoryCausalBlockSources.includes(entry.replace(/^###\s+/u, "")),
    );

    for (const heading of mandatoryCausalHeadings) {
      if (!internalHeadings.includes(heading)) {
        throw new Error(
          `Template interno de ticket nao contem o heading obrigatorio ${heading}.`,
        );
      }
    }

    return mandatoryCausalHeadings;
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

const assertTargetOwnedTicketProposalQuality = (
  ticketProposal: TargetInvestigateCaseTicketProposal,
  causalBlockHeadings: readonly string[],
): void => {
  const markdown = ticketProposal.ticket_markdown;
  if (!markdown.startsWith("# [TICKET] ")) {
    throw new Error(
      "ticket-proposal.json target-owned precisa iniciar com um heading `# [TICKET] ...`.",
    );
  }

  const headings = extractMarkdownHeadings(markdown);
  for (const heading of causalBlockHeadings) {
    if (!headings.includes(heading)) {
      throw new Error(
        `ticket-proposal.json target-owned nao contem o heading causal obrigatorio ${heading}.`,
      );
    }
  }

  if (ticketProposal.publication_hints?.quality_gate !== "target-ticket-quality-v1") {
    return;
  }

  for (const heading of TARGET_OWNED_TICKET_REQUIRED_HEADINGS) {
    if (!headings.includes(heading)) {
      throw new Error(
        `ticket-proposal.json target-owned nao contem o heading obrigatorio ${heading} para quality_gate=target-ticket-quality-v1.`,
      );
    }
  }

  const lines = markdown.split(/\r?\n/u).map((line) => line.trim());
  let previousBulletLine: string | null = null;
  for (const line of lines) {
    if (line.length === 0) {
      previousBulletLine = null;
      continue;
    }

    if (!/^(?:- |\d+\. )/u.test(line)) {
      previousBulletLine = null;
      continue;
    }

    if (line === previousBulletLine) {
      throw new Error(
        "ticket-proposal.json target-owned contem linhas de lista duplicadas em sequencia para quality_gate=target-ticket-quality-v1.",
      );
    }
    previousBulletLine = line;
  }

  const hasThreeStepReproduction =
    lines.some((line) => /^1\. /u.test(line)) &&
    lines.some((line) => /^2\. /u.test(line)) &&
    lines.some((line) => /^3\. /u.test(line));
  if (!hasThreeStepReproduction) {
    throw new Error(
      "ticket-proposal.json target-owned precisa conter ao menos tres passos observaveis em `## Reproduction steps` para quality_gate=target-ticket-quality-v1.",
    );
  }

  if (!ticketProposal.competing_hypotheses?.length) {
    throw new Error(
      "ticket-proposal.json target-owned precisa declarar `competing_hypotheses[]` quando quality_gate=target-ticket-quality-v1.",
    );
  }
  for (const entry of ticketProposal.competing_hypotheses) {
    assertMarkdownIncludesExplicitTrail(
      markdown,
      entry.label,
      "ticket-proposal.json target-owned precisa expor explicitamente as hipoteses consideradas quando quality_gate=target-ticket-quality-v1.",
    );
  }

  if (!ticketProposal.qa_escape) {
    throw new Error(
      "ticket-proposal.json target-owned precisa declarar `qa_escape` quando quality_gate=target-ticket-quality-v1.",
    );
  }
  assertMarkdownIncludesExplicitTrail(
    markdown,
    ticketProposal.qa_escape.why_not_caught,
    "ticket-proposal.json target-owned precisa expor explicitamente o motivo de `qa_escape` quando quality_gate=target-ticket-quality-v1.",
  );

  if (!ticketProposal.prompt_guardrail_opportunities?.length) {
    throw new Error(
      "ticket-proposal.json target-owned precisa declarar `prompt_guardrail_opportunities[]` quando quality_gate=target-ticket-quality-v1.",
    );
  }
  for (const entry of ticketProposal.prompt_guardrail_opportunities) {
    assertMarkdownIncludesExplicitTrail(
      markdown,
      entry.summary,
      "ticket-proposal.json target-owned precisa expor explicitamente as oportunidades de prompt/guardrails quando quality_gate=target-ticket-quality-v1.",
    );
  }

  if (!ticketProposal.ticket_readiness) {
    throw new Error(
      "ticket-proposal.json target-owned precisa declarar `ticket_readiness` quando quality_gate=target-ticket-quality-v1.",
    );
  }
  assertMarkdownIncludesExplicitTrail(
    markdown,
    ticketProposal.ticket_readiness.summary,
    "ticket-proposal.json target-owned precisa expor explicitamente `ticket_readiness.summary` quando quality_gate=target-ticket-quality-v1.",
  );
  assertMarkdownIncludesExplicitTrail(
    markdown,
    ticketProposal.ticket_readiness.status,
    "ticket-proposal.json target-owned precisa expor explicitamente `ticket_readiness.status` quando quality_gate=target-ticket-quality-v1.",
  );

  for (const gap of ticketProposal.remaining_gaps ?? []) {
    assertMarkdownIncludesExplicitTrail(
      markdown,
      gap.summary,
      "ticket-proposal.json target-owned precisa expor explicitamente `remaining_gaps` quando quality_gate=target-ticket-quality-v1.",
    );
  }
};

const buildTicketSlug = (
  caseRef: string,
  ticketProposal: Pick<
    TargetInvestigateCaseTicketProposal,
    "suggested_slug" | "suggested_title" | "publication_hints"
  >,
): string => {
  const caseRefSlug = slugify(caseRef, 48);
  const titleSlug = slugify(
    ticketProposal.suggested_slug || ticketProposal.suggested_title || "case-investigation-gap",
    80,
  );
  if (
    ticketProposal.publication_hints?.ticket_scope === "generalizable" &&
    ticketProposal.publication_hints.slug_strategy === "suggested-slug-only"
  ) {
    return titleSlug;
  }

  return `${caseRefSlug}-${titleSlug}`;
};

const normalizeMarkdownSearchText = (value: string): string =>
  value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/gu, " ")
    .trim();

const assertMarkdownIncludesExplicitTrail = (
  markdown: string,
  expectedText: string,
  errorMessage: string,
): void => {
  if (!normalizeMarkdownSearchText(markdown).includes(normalizeMarkdownSearchText(expectedText))) {
    throw new Error(errorMessage);
  }
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

const extractMarkdownHeadings = (markdown: string): string[] =>
  markdown
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("## ") || line.startsWith("### "));

const normalizeMarkdown = (markdown: string): string =>
  markdown.endsWith("\n") ? markdown : `${markdown}\n`;
