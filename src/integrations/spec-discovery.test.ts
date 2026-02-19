import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { FileSystemSpecDiscovery } from "./spec-discovery.js";

const createTempProject = async (): Promise<string> => {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), "spec-discovery-"));
  await fs.mkdir(path.join(rootPath, "docs", "specs"), { recursive: true });
  return rootPath;
};

const cleanupTempProject = async (projectPath: string): Promise<void> => {
  await fs.rm(projectPath, { recursive: true, force: true });
};

const writeSpecFile = async (
  projectPath: string,
  fileName: string,
  content: string,
): Promise<void> => {
  const specPath = path.join(projectPath, "docs", "specs", fileName);
  await fs.writeFile(specPath, content, "utf8");
};

test("listEligibleSpecs retorna apenas specs approved com spec treatment pending", async () => {
  const projectPath = await createTempProject();
  const discovery = new FileSystemSpecDiscovery();

  try {
    await writeSpecFile(
      projectPath,
      "b-approved-pending.md",
      [
        "# Spec B",
        "",
        "## Metadata",
        "- Status: approved",
        "- Spec treatment: pending",
      ].join("\n"),
    );

    await writeSpecFile(
      projectPath,
      "a-attended.md",
      [
        "# Spec A",
        "",
        "## Metadata",
        "- Status: attended",
        "- Spec treatment: done",
      ].join("\n"),
    );

    await writeSpecFile(
      projectPath,
      "c-approved-missing-treatment.md",
      [
        "# Spec C",
        "",
        "## Metadata",
        "- Status: approved",
      ].join("\n"),
    );

    const specs = await discovery.listEligibleSpecs(projectPath);

    assert.deepEqual(specs, [
      {
        fileName: "b-approved-pending.md",
        specPath: "docs/specs/b-approved-pending.md",
      },
    ]);
  } finally {
    await cleanupTempProject(projectPath);
  }
});

test("validateSpecEligibility retorna eligible para caminho com e sem prefixo docs/specs", async () => {
  const projectPath = await createTempProject();
  const discovery = new FileSystemSpecDiscovery();

  try {
    await writeSpecFile(
      projectPath,
      "2026-02-19-approved.md",
      [
        "# Spec",
        "",
        "## Metadata",
        "- Status: approved",
        "- Spec treatment: pending",
      ].join("\n"),
    );

    const byFileName = await discovery.validateSpecEligibility(
      projectPath,
      "2026-02-19-approved.md",
    );
    assert.equal(byFileName.status, "eligible");

    const byPrefixedPath = await discovery.validateSpecEligibility(
      projectPath,
      "docs/specs/2026-02-19-approved.md",
    );
    assert.equal(byPrefixedPath.status, "eligible");

    if (byPrefixedPath.status === "eligible") {
      assert.equal(byPrefixedPath.spec.fileName, "2026-02-19-approved.md");
      assert.equal(byPrefixedPath.spec.specPath, "docs/specs/2026-02-19-approved.md");
    }
  } finally {
    await cleanupTempProject(projectPath);
  }
});

test("validateSpecEligibility retorna not-eligible quando metadata obrigatoria esta ausente", async () => {
  const projectPath = await createTempProject();
  const discovery = new FileSystemSpecDiscovery();

  try {
    await writeSpecFile(
      projectPath,
      "2026-02-19-no-treatment.md",
      [
        "# Spec sem treatment",
        "",
        "## Metadata",
        "- Status: approved",
      ].join("\n"),
    );

    const result = await discovery.validateSpecEligibility(
      projectPath,
      "2026-02-19-no-treatment.md",
    );

    assert.equal(result.status, "not-eligible");
    if (result.status === "not-eligible") {
      assert.equal(result.spec.fileName, "2026-02-19-no-treatment.md");
      assert.equal(result.metadata.status, "approved");
      assert.equal(result.metadata.specTreatment, null);
    }
  } finally {
    await cleanupTempProject(projectPath);
  }
});

test("validateSpecEligibility retorna not-found quando arquivo nao existe", async () => {
  const projectPath = await createTempProject();
  const discovery = new FileSystemSpecDiscovery();

  try {
    const result = await discovery.validateSpecEligibility(projectPath, "spec-inexistente.md");

    assert.deepEqual(result, {
      status: "not-found",
      spec: {
        fileName: "spec-inexistente.md",
        specPath: "docs/specs/spec-inexistente.md",
      },
    });
  } finally {
    await cleanupTempProject(projectPath);
  }
});

test("validateSpecEligibility retorna invalid-path para entrada malformada", async () => {
  const projectPath = await createTempProject();
  const discovery = new FileSystemSpecDiscovery();

  try {
    const result = await discovery.validateSpecEligibility(
      projectPath,
      "docs/specs/../../etc/passwd",
    );

    assert.equal(result.status, "invalid-path");
    if (result.status === "invalid-path") {
      assert.match(result.message, /Formato invalido/u);
    }
  } finally {
    await cleanupTempProject(projectPath);
  }
});
