import { accessSync, constants, realpathSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const PATH_SEPARATOR = process.platform === "win32" ? ";" : ":";

export interface RuntimeShellGuidanceOptions {
  homePath?: string;
  nodeExecutablePath?: string;
  codexExecutablePath?: string | null;
  hostGitExecutablePath?: string;
  hostGitExecPath?: string;
  hostGhExecutablePath?: string;
  pathValue?: string;
}

export interface RuntimeShellGuidance {
  text: string;
  homePath: string;
  nodeExecutablePath: string;
  nodeBinPath: string;
  npmExecutablePath: string;
  codexExecutablePath: string | null;
  isSnapCodex: boolean;
  hostGitExecutablePath: string | null;
  hostGitExecPath: string | null;
  hostGhExecutablePath: string | null;
}

export const buildRuntimeShellGuidance = (
  options: RuntimeShellGuidanceOptions = {},
): RuntimeShellGuidance => {
  const homePath = normalizeHomePath(options.homePath);
  const nodeExecutablePath = normalizeNodeExecutablePath(options.nodeExecutablePath);
  const nodeBinPath = path.dirname(nodeExecutablePath);
  const npmExecutablePath = path.join(
    nodeBinPath,
    process.platform === "win32" ? "npm.cmd" : "npm",
  );
  const codexExecutablePath =
    options.codexExecutablePath === undefined
      ? resolveExecutableInPath("codex", options.pathValue ?? process.env.PATH ?? "")
      : options.codexExecutablePath;
  const isSnapCodex = detectSnapCodex(codexExecutablePath);
  const hostGitExecutablePath = isSnapCodex
    ? normalizeHostBridgePath(options.hostGitExecutablePath, "/var/lib/snapd/hostfs/usr/bin/git")
    : null;
  const hostGitExecPath = isSnapCodex
    ? normalizeHostBridgePath(options.hostGitExecPath, "/var/lib/snapd/hostfs/usr/lib/git-core")
    : null;
  const hostGhExecutablePath = isSnapCodex
    ? normalizeHostBridgePath(options.hostGhExecutablePath, "/var/lib/snapd/hostfs/usr/bin/gh")
    : null;

  const lines = [
    "Contexto operacional do shell desta execucao (obrigatorio seguir):",
    "- Cada comando shell do Codex roda isolado; repita os exports no mesmo comando sempre que usar node/npm/npx ou git remoto.",
    `- Prefixo obrigatorio para comandos Node: \`export HOME="${homePath}"; export PATH="${nodeBinPath}:$PATH";\`.`,
    `- Exemplo para scripts do repositorio: \`export HOME="${homePath}"; export PATH="${nodeBinPath}:$PATH"; npm test\`.`,
    `- Runtime Node do host detectado: \`${nodeExecutablePath}\` e \`${npmExecutablePath}\`.`,
  ];

  if (isSnapCodex) {
    lines.push(
      `- Codex CLI detectado via Snap: \`${codexExecutablePath}\`. O git padrao dentro da sessao nao suporta HTTPS remoto nem enxerga o HOME real.`,
      "- Nunca use `git push`, `git pull`, `git fetch` ou `git ls-remote` diretamente dentro do snap; isso reaplica o `credential.helper` do host (ex.: `!/usr/bin/gh auth git-credential`) e pode falhar com `/usr/bin/gh: not found`.",
      `- Para \`git push\`, \`git pull\`, \`git fetch\` ou \`git ls-remote\`, use o bridge do host no mesmo comando: \`export HOME="${homePath}"; HOST_GIT="${hostGitExecutablePath}"; HOST_GIT_EXEC="${hostGitExecPath}"; HOST_GH="${hostGhExecutablePath}"; GIT_EXEC_PATH="$HOST_GIT_EXEC" "$HOST_GIT" -c credential.https://github.com.helper= -c "credential.https://github.com.helper=!$HOST_GH auth git-credential" <git-args>\`.`,
      `- Exemplo de push: \`export HOME="${homePath}"; HOST_GIT="${hostGitExecutablePath}"; HOST_GIT_EXEC="${hostGitExecPath}"; HOST_GH="${hostGhExecutablePath}"; GIT_EXEC_PATH="$HOST_GIT_EXEC" "$HOST_GIT" -c credential.https://github.com.helper= -c "credential.https://github.com.helper=!$HOST_GH auth git-credential" push\`.`,
    );
  }

  return {
    text: lines.join("\n"),
    homePath,
    nodeExecutablePath,
    nodeBinPath,
    npmExecutablePath,
    codexExecutablePath,
    isSnapCodex,
    hostGitExecutablePath,
    hostGitExecPath,
    hostGhExecutablePath,
  };
};

const normalizeHomePath = (value?: string): string => {
  const trimmed = value?.trim();
  if (trimmed) {
    return trimmed;
  }

  const envHome = process.env.HOME?.trim();
  if (envHome) {
    return envHome;
  }

  return os.homedir();
};

const normalizeNodeExecutablePath = (value?: string): string => {
  const trimmed = value?.trim();
  if (trimmed) {
    return trimmed;
  }

  return process.execPath;
};

const normalizeHostBridgePath = (value: string | undefined, fallback: string): string => {
  const trimmed = value?.trim();
  if (trimmed) {
    return trimmed;
  }

  return fallback;
};

const detectSnapCodex = (codexExecutablePath: string | null): boolean => {
  if (!codexExecutablePath) {
    return false;
  }

  return codexExecutablePath.startsWith("/snap/") || codexExecutablePath.includes("/snap/bin/");
};

const resolveExecutableInPath = (name: string, pathValue: string): string | null => {
  if (!pathValue) {
    return null;
  }

  for (const directory of pathValue.split(PATH_SEPARATOR)) {
    const trimmedDirectory = directory.trim();
    if (!trimmedDirectory) {
      continue;
    }

    const candidate = path.join(trimmedDirectory, name);
    try {
      accessSync(candidate, constants.X_OK);
      return realpathSync(candidate);
    } catch {
      continue;
    }
  }

  return null;
};
