export const DISCOVER_SPEC_CATEGORY_DEFINITIONS = [
  {
    id: "objective-value",
    label: "Objetivo e valor esperado",
    aliases: [
      "objective-value",
      "objetivo e valor esperado",
      "objetivo valor esperado",
      "objective and value",
    ],
  },
  {
    id: "actors-journey",
    label: "Atores e jornada",
    aliases: [
      "actors-journey",
      "atores e jornada",
      "atores jornada",
      "actors and journey",
    ],
  },
  {
    id: "functional-scope",
    label: "Escopo funcional",
    aliases: [
      "functional-scope",
      "escopo funcional",
      "functional scope",
    ],
  },
  {
    id: "non-scope",
    label: "Nao-escopo",
    aliases: [
      "non-scope",
      "nao-escopo",
      "nao escopo",
      "non scope",
    ],
  },
  {
    id: "constraints-dependencies",
    label: "Restricoes tecnicas e dependencias",
    aliases: [
      "constraints-dependencies",
      "restricoes tecnicas e dependencias",
      "restricoes tecnicas",
      "dependencias",
      "technical constraints and dependencies",
    ],
  },
  {
    id: "validations-acceptance",
    label: "Validacoes e criterios de aceite",
    aliases: [
      "validations-acceptance",
      "validacoes e criterios de aceite",
      "criterios de aceite",
      "validations and acceptance criteria",
    ],
  },
  {
    id: "risks",
    label: "Riscos operacionais e funcionais",
    aliases: [
      "risks",
      "riscos",
      "riscos operacionais e funcionais",
      "operational and functional risks",
    ],
  },
  {
    id: "assumptions-defaults",
    label: "Assumptions e defaults",
    aliases: [
      "assumptions-defaults",
      "assumptions e defaults",
      "assumptions/defaults",
      "assumptions and defaults",
    ],
  },
  {
    id: "decisions-tradeoffs",
    label: "Decisoes e trade-offs",
    aliases: [
      "decisions-tradeoffs",
      "decisoes e trade-offs",
      "decisoes trade-offs",
      "decisions and trade-offs",
    ],
  },
] as const;

export type DiscoverSpecCategoryId = (typeof DISCOVER_SPEC_CATEGORY_DEFINITIONS)[number]["id"];

export type DiscoverSpecCoverageStatus = "covered" | "pending" | "not-applicable";

export interface DiscoverSpecCategoryCoverage {
  categoryId: DiscoverSpecCategoryId;
  label: string;
  status: DiscoverSpecCoverageStatus;
  detail: string;
}

export type DiscoverSpecCategoryCoverageRecord = Record<
  DiscoverSpecCategoryId,
  DiscoverSpecCategoryCoverage
>;

export interface DiscoverSpecPendingItem {
  kind: "category" | "ambiguity";
  key: string;
  label: string;
  detail: string;
}

const CATEGORY_ID_BY_COMPACT_ALIAS = new Map<string, DiscoverSpecCategoryId>(
  DISCOVER_SPEC_CATEGORY_DEFINITIONS.flatMap((definition) =>
    definition.aliases.map((alias) => [toCompactComparableText(alias), definition.id]),
  ),
);

const CATEGORY_LABEL_BY_ID = new Map<DiscoverSpecCategoryId, string>(
  DISCOVER_SPEC_CATEGORY_DEFINITIONS.map((definition) => [definition.id, definition.label]),
);

export const resolveDiscoverSpecCategoryId = (value: string): DiscoverSpecCategoryId | null => {
  const compact = toCompactComparableText(value);
  if (!compact) {
    return null;
  }

  return CATEGORY_ID_BY_COMPACT_ALIAS.get(compact) ?? null;
};

export const getDiscoverSpecCategoryLabel = (categoryId: DiscoverSpecCategoryId): string => {
  return CATEGORY_LABEL_BY_ID.get(categoryId) ?? categoryId;
};

export const normalizeDiscoverSpecCoverageStatus = (
  value: string,
): DiscoverSpecCoverageStatus | null => {
  const compact = toCompactComparableText(value);
  if (!compact) {
    return null;
  }

  if (
    compact === "covered" ||
    compact === "coberta" ||
    compact === "coberto" ||
    compact === "resolvida" ||
    compact === "resolved"
  ) {
    return "covered";
  }

  if (
    compact === "notapplicable" ||
    compact === "naoaplicavel" ||
    compact === "naoseaplica" ||
    compact === "na"
  ) {
    return "not-applicable";
  }

  if (
    compact === "pending" ||
    compact === "pendente" ||
    compact === "aberta" ||
    compact === "open"
  ) {
    return "pending";
  }

  return null;
};

export const cloneDiscoverSpecCategoryCoverage = (
  coverage: DiscoverSpecCategoryCoverage,
): DiscoverSpecCategoryCoverage => ({
  categoryId: coverage.categoryId,
  label: coverage.label,
  status: coverage.status,
  detail: coverage.detail,
});

export const createDefaultDiscoverSpecCategoryCoverageRecord =
(): DiscoverSpecCategoryCoverageRecord => {
  const entries = DISCOVER_SPEC_CATEGORY_DEFINITIONS.map((definition) => [
    definition.id,
    {
      categoryId: definition.id,
      label: definition.label,
      status: "pending" as const,
      detail: "",
    },
  ]);

  return Object.fromEntries(entries) as DiscoverSpecCategoryCoverageRecord;
};

export const createDiscoverSpecCategoryCoverageRecord = (
  items: readonly DiscoverSpecCategoryCoverage[] = [],
): DiscoverSpecCategoryCoverageRecord => {
  const record = createDefaultDiscoverSpecCategoryCoverageRecord();
  for (const item of items) {
    record[item.categoryId] = cloneDiscoverSpecCategoryCoverage(item);
  }

  return record;
};

export const listDiscoverSpecCategoryCoverage = (
  record: DiscoverSpecCategoryCoverageRecord,
): DiscoverSpecCategoryCoverage[] => {
  return DISCOVER_SPEC_CATEGORY_DEFINITIONS.map((definition) =>
    cloneDiscoverSpecCategoryCoverage(record[definition.id]),
  );
};

function toCompactComparableText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "");
}
