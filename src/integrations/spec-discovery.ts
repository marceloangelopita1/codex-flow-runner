import { Dirent, promises as fs } from "node:fs";
import path from "node:path";

const SPEC_FILE_NAME_PATTERN = /^[A-Za-z0-9._-]+\.md$/u;
const METADATA_HEADING_PATTERN = /^##\s+Metadata\s*$/imu;
const TOP_LEVEL_HEADING_PATTERN = /^##\s+/mu;

export interface SpecMetadata {
  status: string | null;
  specTreatment: string | null;
}

export interface EligibleSpecRef {
  fileName: string;
  specPath: string;
}

export type SpecEligibilityResult =
  | {
      status: "eligible";
      spec: EligibleSpecRef;
      metadata: SpecMetadata;
    }
  | {
      status: "not-found";
      spec: EligibleSpecRef;
    }
  | {
      status: "not-eligible";
      spec: EligibleSpecRef;
      metadata: SpecMetadata;
    }
  | {
      status: "invalid-path";
      input: string;
      message: string;
    };

export interface SpecDiscovery {
  listEligibleSpecs(projectPath: string): Promise<EligibleSpecRef[]>;
  validateSpecEligibility(projectPath: string, specInput: string): Promise<SpecEligibilityResult>;
}

export class FileSystemSpecDiscovery implements SpecDiscovery {
  async listEligibleSpecs(projectPath: string): Promise<EligibleSpecRef[]> {
    const specsDir = resolveSpecsDir(projectPath);
    let entries: Dirent[] = [];

    try {
      entries = await fs.readdir(specsDir, { withFileTypes: true });
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      throw new Error(`Falha ao listar specs em ${specsDir}: ${details}`);
    }

    const markdownFiles = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right, "pt-BR"));

    const metadataByFile = await Promise.all(
      markdownFiles.map(async (fileName) => {
        const metadata = await this.readSpecMetadata(specsDir, fileName);
        return {
          fileName,
          metadata,
        };
      }),
    );

    return metadataByFile
      .filter((item) => isEligibleMetadata(item.metadata))
      .map((item) => ({
        fileName: item.fileName,
        specPath: buildSpecPath(item.fileName),
      }));
  }

  async validateSpecEligibility(projectPath: string, specInput: string): Promise<SpecEligibilityResult> {
    const normalized = normalizeSpecInput(specInput);
    if (normalized.status === "invalid-path") {
      return normalized;
    }

    const specsDir = resolveSpecsDir(projectPath);
    const spec = {
      fileName: normalized.fileName,
      specPath: buildSpecPath(normalized.fileName),
    };
    const targetPath = path.join(specsDir, normalized.fileName);

    let content: string;
    try {
      content = await fs.readFile(targetPath, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return {
          status: "not-found",
          spec,
        };
      }

      const details = error instanceof Error ? error.message : String(error);
      throw new Error(`Falha ao ler spec ${spec.specPath}: ${details}`);
    }

    const metadata = extractSpecMetadata(content);
    if (isEligibleMetadata(metadata)) {
      return {
        status: "eligible",
        spec,
        metadata,
      };
    }

    return {
      status: "not-eligible",
      spec,
      metadata,
    };
  }

  private async readSpecMetadata(specsDir: string, fileName: string): Promise<SpecMetadata> {
    const specPath = path.join(specsDir, fileName);
    try {
      const content = await fs.readFile(specPath, "utf8");
      return extractSpecMetadata(content);
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      throw new Error(`Falha ao ler metadata da spec ${buildSpecPath(fileName)}: ${details}`);
    }
  }
}

const resolveSpecsDir = (projectPath: string): string =>
  path.join(projectPath, "docs", "specs");

const buildSpecPath = (fileName: string): string =>
  path.posix.join("docs", "specs", fileName);

const normalizeSpecInput = (
  specInput: string,
):
  | {
      status: "ok";
      fileName: string;
    }
  | {
      status: "invalid-path";
      input: string;
      message: string;
    } => {
  const trimmed = specInput.trim();
  if (!trimmed) {
    return {
      status: "invalid-path",
      input: specInput,
      message:
        "Informe somente o arquivo da spec (.md) ou o caminho docs/specs/<arquivo>.md.",
    };
  }

  const withoutPrefix = trimmed.startsWith("docs/specs/")
    ? trimmed.slice("docs/specs/".length)
    : trimmed;

  if (
    withoutPrefix.includes("/") ||
    withoutPrefix.includes("\\") ||
    withoutPrefix.includes("..") ||
    !SPEC_FILE_NAME_PATTERN.test(withoutPrefix)
  ) {
    return {
      status: "invalid-path",
      input: trimmed,
      message:
        "Formato invalido para spec. Use apenas <arquivo-da-spec.md> ou docs/specs/<arquivo-da-spec.md>.",
    };
  }

  return {
    status: "ok",
    fileName: withoutPrefix,
  };
};

const extractSpecMetadata = (content: string): SpecMetadata => {
  const metadataSection = extractMetadataSection(content);
  const status = extractMetadataField(metadataSection, "Status");
  const specTreatment = extractMetadataField(metadataSection, "Spec treatment");

  return {
    status,
    specTreatment,
  };
};

const extractMetadataSection = (content: string): string => {
  const metadataHeadingMatch = content.match(METADATA_HEADING_PATTERN);
  if (!metadataHeadingMatch || metadataHeadingMatch.index === undefined) {
    return "";
  }

  const metadataBodyStart = metadataHeadingMatch.index + metadataHeadingMatch[0].length;
  const remainder = content.slice(metadataBodyStart);
  const nextHeadingMatch = remainder.match(TOP_LEVEL_HEADING_PATTERN);
  if (!nextHeadingMatch || nextHeadingMatch.index === undefined) {
    return remainder;
  }

  return remainder.slice(0, nextHeadingMatch.index);
};

const extractMetadataField = (metadataSection: string, fieldName: string): string | null => {
  const escapedFieldName = fieldName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const fieldPattern = new RegExp(
    `^\\s*(?:-\\s*)?${escapedFieldName}\\s*:\\s*(.+?)\\s*$`,
    "imu",
  );
  const value = metadataSection.match(fieldPattern)?.[1]?.trim();
  return value || null;
};

const isEligibleMetadata = (metadata: SpecMetadata): boolean => {
  const status = metadata.status?.trim().toLowerCase();
  const specTreatment = metadata.specTreatment?.trim().toLowerCase();

  return status === "approved" && specTreatment === "pending";
};
