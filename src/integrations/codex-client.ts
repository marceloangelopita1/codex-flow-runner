import { promises as fs } from "node:fs";
import path from "node:path";
import { Logger } from "../core/logger.js";
import { TicketRef } from "./ticket-queue.js";

export interface CodexTicketFlowClient {
  runTicketFlow(ticket: TicketRef): Promise<string>;
}

/**
 * MVP local: cria/atualiza um ExecPlan baseado no ticket e registra progresso.
 *
 * A integração com Codex SDK/CLI pode substituir esta classe mantendo a mesma interface.
 */
export class LocalCodexTicketFlowClient implements CodexTicketFlowClient {
  constructor(
    private readonly repoPath: string,
    private readonly logger: Logger,
  ) {}

  async runTicketFlow(ticket: TicketRef): Promise<string> {
    const execPlanPath = path.join(
      this.repoPath,
      "execplans",
      ticket.name.replace(/\.md$/u, "") + ".execplan.md",
    );

    const ticketBody = await fs.readFile(ticket.openPath, "utf8");
    const plan = this.buildPlan(ticket.name, ticketBody);

    await fs.mkdir(path.dirname(execPlanPath), { recursive: true });
    await fs.writeFile(execPlanPath, plan, "utf8");

    this.logger.info("ExecPlan atualizado", {
      ticket: ticket.name,
      execPlanPath,
    });

    return execPlanPath;
  }

  private buildPlan(ticketName: string, ticketBody: string): string {
    const now = new Date().toISOString();
    const title = this.extractTitle(ticketName, ticketBody);

    return [
      `# ExecPlan: ${title}`,
      "",
      `- Ticket: ${ticketName}`,
      `- Atualizado em: ${now}`,
      "",
      "## Objetivo",
      title,
      "",
      "## Escopo",
      this.toBulletList(ticketBody),
      "",
      "## Plano de execução (sequencial)",
      "1. Entender contexto e validar critérios do ticket.",
      "2. Implementar alterações necessárias no código.",
      "3. Rodar validações locais (build/check/test).",
      "4. Fechar ticket movendo de `tickets/open` para `tickets/closed`.",
      "5. Criar commit com código + ticket fechado no mesmo commit.",
      "",
      "## Observabilidade",
      "- Registrar logs de início/fim de etapa no runner.",
      "",
      "## Resultado esperado",
      "- Ticket fechado com rastreabilidade por commit.",
      "",
    ].join("\n");
  }

  private extractTitle(ticketName: string, ticketBody: string): string {
    const firstHeading = ticketBody
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.startsWith("# "));

    if (firstHeading) {
      return firstHeading.replace(/^#\s+/u, "").trim();
    }

    return ticketName.replace(/\.md$/u, "");
  }

  private toBulletList(content: string): string {
    const lines = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .slice(0, 8);

    if (lines.length === 0) {
      return "- Sem detalhes adicionais no ticket.";
    }

    return lines.map((line) => `- ${line}`).join("\n");
  }
}
