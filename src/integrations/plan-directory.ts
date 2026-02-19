import { promises as fs } from "node:fs";
import path from "node:path";

export type PlanDirectoryName = "plans" | "execplans";

interface PlanDirectoryDependencies {
  isDirectory: (value: string) => Promise<boolean>;
  hasMarkdownFiles: (value: string) => Promise<boolean>;
}

const defaultDependencies: PlanDirectoryDependencies = {
  isDirectory: async (value: string): Promise<boolean> => {
    try {
      const stat = await fs.stat(value);
      return stat.isDirectory();
    } catch {
      return false;
    }
  },
  hasMarkdownFiles: async (value: string): Promise<boolean> => {
    try {
      const entries = await fs.readdir(value, { withFileTypes: true });
      return entries.some((entry) => entry.isFile() && entry.name.endsWith(".md"));
    } catch {
      return false;
    }
  },
};

export const resolvePlanDirectoryName = async (
  repoPath: string,
  dependencies: Partial<PlanDirectoryDependencies> = {},
): Promise<PlanDirectoryName> => {
  const effectiveDependencies = {
    ...defaultDependencies,
    ...dependencies,
  };

  const plansPath = path.join(repoPath, "plans");
  const execplansPath = path.join(repoPath, "execplans");

  const [hasPlansDirectory, hasExecplansDirectory] = await Promise.all([
    effectiveDependencies.isDirectory(plansPath),
    effectiveDependencies.isDirectory(execplansPath),
  ]);

  if (hasPlansDirectory && !hasExecplansDirectory) {
    return "plans";
  }

  if (hasExecplansDirectory && !hasPlansDirectory) {
    return "execplans";
  }

  if (hasPlansDirectory && hasExecplansDirectory) {
    const [plansHasMarkdown, execplansHasMarkdown] = await Promise.all([
      effectiveDependencies.hasMarkdownFiles(plansPath),
      effectiveDependencies.hasMarkdownFiles(execplansPath),
    ]);

    if (plansHasMarkdown && !execplansHasMarkdown) {
      return "plans";
    }

    return "execplans";
  }

  return "execplans";
};

export const resolvePlanDirectoryPath = async (repoPath: string): Promise<string> =>
  path.join(repoPath, await resolvePlanDirectoryName(repoPath));

export const buildExecPlanPath = (
  directoryName: PlanDirectoryName,
  ticketName: string,
): string => `${directoryName}/${ticketName.replace(/\.md$/u, "")}.md`;
