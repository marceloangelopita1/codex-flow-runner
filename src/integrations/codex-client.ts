import { Logger } from "../core/logger.js";

export interface CodexTicketFlowClient {
  runTicketFlow(ticketName: string): Promise<void>;
}

/**
 * Placeholder para integração real com Codex SDK.
 *
 * Fluxo esperado (mesma thread/contexto):
 * 1) Buscar contexto e criar ExecPlan
 * 2) Executar plano
 * 3) Encerrar ticket + commit/push
 */
export class StubCodexTicketFlowClient implements CodexTicketFlowClient {
  constructor(private readonly logger: Logger) {}

  async runTicketFlow(ticketName: string): Promise<void> {
    this.logger.info("Iniciando fluxo Codex (stub)", { ticketName });
    await sleep(600);
    this.logger.info("[1/3] Planejamento concluído (stub)", { ticketName });
    await sleep(600);
    this.logger.info("[2/3] Implementação concluída (stub)", { ticketName });
    await sleep(600);
    this.logger.info("[3/3] Fechamento e versionamento concluídos (stub)", { ticketName });
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
