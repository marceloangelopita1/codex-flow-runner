import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { FileSystemTargetProjectResolver } from "./target-project-resolver.js";

const createTempRoot = async (): Promise<string> =>
  fs.mkdtemp(path.join(os.tmpdir(), "target-project-resolver-"));

const cleanupTempRoot = async (rootPath: string): Promise<void> => {
  await fs.rm(rootPath, { recursive: true, force: true });
};

test("resolveProject aceita repo Git inelegivel para /projects mas valido para prepare", async () => {
  const rootPath = await createTempRoot();

  try {
    const projectPath = path.join(rootPath, "alpha-project");
    await fs.mkdir(path.join(projectPath, ".git"), { recursive: true });

    const resolver = new FileSystemTargetProjectResolver(rootPath);
    const resolution = await resolver.resolveProject("alpha-project");

    assert.deepEqual(resolution, {
      name: "alpha-project",
      path: projectPath,
      eligibleForProjects: false,
    });
  } finally {
    await cleanupTempRoot(rootPath);
  }
});

test("resolveProject rejeita nome invalido com tentativa de path traversal", async () => {
  const rootPath = await createTempRoot();

  try {
    const resolver = new FileSystemTargetProjectResolver(rootPath);
    await assert.rejects(() => resolver.resolveProject("../fora"), /Nome invalido/u);
  } finally {
    await cleanupTempRoot(rootPath);
  }
});

test("resolveProject rejeita ponto isolado como nome invalido", async () => {
  const rootPath = await createTempRoot();

  try {
    const resolver = new FileSystemTargetProjectResolver(rootPath);
    await assert.rejects(() => resolver.resolveProject("."), /Nome invalido/u);
  } finally {
    await cleanupTempRoot(rootPath);
  }
});

test("resolveProject falha quando diretorio alvo nao existe", async () => {
  const rootPath = await createTempRoot();

  try {
    const resolver = new FileSystemTargetProjectResolver(rootPath);
    await assert.rejects(() => resolver.resolveProject("nao-existe"), /nao encontrado/u);
  } finally {
    await cleanupTempRoot(rootPath);
  }
});

test("resolveProject falha quando diretorio existe mas nao contem .git", async () => {
  const rootPath = await createTempRoot();

  try {
    await fs.mkdir(path.join(rootPath, "sem-git"), { recursive: true });
    const resolver = new FileSystemTargetProjectResolver(rootPath);
    await assert.rejects(() => resolver.resolveProject("sem-git"), /repositorio Git valido/u);
  } finally {
    await cleanupTempRoot(rootPath);
  }
});
