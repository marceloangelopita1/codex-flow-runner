import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

export interface CodexLocalConfigSnapshot {
  loadedAt: Date;
  model: string | null;
  reasoningEffort: string | null;
}

export interface CodexLocalConfigReader {
  readonly configPath: string;
  read(): Promise<CodexLocalConfigSnapshot>;
}

export class CodexLocalConfigReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CodexLocalConfigReadError";
  }
}

export class FileSystemCodexLocalConfigReader implements CodexLocalConfigReader {
  public readonly configPath: string;

  constructor(homePath = os.homedir()) {
    this.configPath = path.join(homePath, ".codex", "config.toml");
  }

  async read(): Promise<CodexLocalConfigSnapshot> {
    let raw = "";
    let stats;
    try {
      [raw, stats] = await Promise.all([
        fs.readFile(this.configPath, "utf8"),
        fs.stat(this.configPath),
      ]);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        return {
          loadedAt: new Date(0),
          model: null,
          reasoningEffort: null,
        };
      }

      const details = error instanceof Error ? error.message : String(error);
      throw new CodexLocalConfigReadError(
        `Falha ao ler configuracao local do Codex em ${this.configPath}: ${details}`,
      );
    }

    try {
      return {
        loadedAt: stats.mtime,
        model: extractTopLevelTomlString(raw, "model"),
        reasoningEffort: extractTopLevelTomlString(raw, "model_reasoning_effort"),
      };
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      throw new CodexLocalConfigReadError(
        `Falha ao interpretar configuracao local do Codex em ${this.configPath}: ${details}`,
      );
    }
  }
}

const extractTopLevelTomlString = (raw: string, key: string): string | null => {
  let currentSection: string | null = null;
  const lines = raw.split(/\r?\n/gu);

  for (const originalLine of lines) {
    const withoutComment = stripTomlComment(originalLine).trim();
    if (!withoutComment) {
      continue;
    }

    if (withoutComment.startsWith("[") && withoutComment.endsWith("]")) {
      const section = withoutComment.slice(1, -1).trim();
      currentSection = section.length > 0 ? section : null;
      continue;
    }

    if (currentSection !== null) {
      continue;
    }

    const match = withoutComment.match(
      new RegExp(`^${escapeRegExp(key)}\\s*=\\s*\"((?:\\\\.|[^\"])*)\"\\s*$`, "u"),
    );
    if (!match) {
      continue;
    }

    return decodeTomlBasicString(match[1] ?? "");
  }

  return null;
};

const stripTomlComment = (line: string): string => {
  let escaped = false;
  let inString = false;
  let result = "";

  for (const char of line) {
    if (char === '"' && !escaped) {
      inString = !inString;
      result += char;
      continue;
    }

    if (char === "#" && !inString) {
      break;
    }

    result += char;
    escaped = char === "\\" && !escaped;
    if (char !== "\\") {
      escaped = false;
    }
  }

  return result;
};

const decodeTomlBasicString = (value: string): string => {
  return value.replace(/\\(["\\btnfr])/gu, (_match, escaped: string) => {
    switch (escaped) {
      case "b":
        return "\b";
      case "t":
        return "\t";
      case "n":
        return "\n";
      case "f":
        return "\f";
      case "r":
        return "\r";
      default:
        return escaped;
    }
  });
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
