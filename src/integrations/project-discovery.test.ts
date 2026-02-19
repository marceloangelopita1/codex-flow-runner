import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { FileSystemProjectDiscovery } from "./project-discovery.js";

const createTempRoot = async (): Promise<string> =>
  fs.mkdtemp(path.join(os.tmpdir(), "project-discovery-"));

const cleanupTempRoot = async (rootPath: string): Promise<void> => {
  await fs.rm(rootPath, { recursive: true, force: true });
};

const createProject = async (
  rootPath: string,
  name: string,
  options: { hasGit: boolean; hasOpenTickets: boolean },
): Promise<string> => {
  const projectPath = path.join(rootPath, name);
  await fs.mkdir(projectPath, { recursive: true });

  if (options.hasGit) {
    await fs.mkdir(path.join(projectPath, ".git"), { recursive: true });
  }

  if (options.hasOpenTickets) {
    await fs.mkdir(path.join(projectPath, "tickets", "open"), { recursive: true });
  }

  return projectPath;
};

test("listEligibleProjects retorna apenas projetos validos em ordem alfabetica", async () => {
  const rootPath = await createTempRoot();

  try {
    await createProject(rootPath, "beta", { hasGit: true, hasOpenTickets: true });
    await createProject(rootPath, "alpha", { hasGit: true, hasOpenTickets: true });
    await createProject(rootPath, "codex-flow-runner", { hasGit: true, hasOpenTickets: true });
    await createProject(rootPath, "sem-git", { hasGit: false, hasOpenTickets: true });
    await createProject(rootPath, "sem-open", { hasGit: true, hasOpenTickets: false });

    const discovery = new FileSystemProjectDiscovery();
    const projects = await discovery.listEligibleProjects(rootPath);

    assert.deepEqual(
      projects.map((value) => value.name),
      ["alpha", "beta", "codex-flow-runner"],
    );
    assert.equal(projects[0]?.path, path.join(rootPath, "alpha"));
    assert.equal(projects[1]?.path, path.join(rootPath, "beta"));
    assert.equal(projects[2]?.path, path.join(rootPath, "codex-flow-runner"));
  } finally {
    await cleanupTempRoot(rootPath);
  }
});

test("listEligibleProjects considera apenas o primeiro nivel de PROJECTS_ROOT_PATH", async () => {
  const rootPath = await createTempRoot();

  try {
    await createProject(rootPath, "root-project", { hasGit: true, hasOpenTickets: true });

    const nestedProjectPath = path.join(rootPath, "container", "nested-project");
    await fs.mkdir(path.join(nestedProjectPath, ".git"), { recursive: true });
    await fs.mkdir(path.join(nestedProjectPath, "tickets", "open"), { recursive: true });

    const discovery = new FileSystemProjectDiscovery();
    const projects = await discovery.listEligibleProjects(rootPath);

    assert.deepEqual(projects.map((value) => value.name), ["root-project"]);
  } finally {
    await cleanupTempRoot(rootPath);
  }
});

test("listEligibleProjects falha com erro claro quando raiz nao existe", async () => {
  const discovery = new FileSystemProjectDiscovery();

  await assert.rejects(
    () => discovery.listEligibleProjects("/tmp/nao-existe-project-discovery"),
    /PROJECTS_ROOT_PATH/u,
  );
});
