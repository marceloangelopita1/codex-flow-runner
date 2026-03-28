export interface ProjectRef {
  name: string;
  path: string;
}

export type ProjectCatalogStatus = "eligible" | "pending_prepare";

export interface ProjectCatalogEntry extends ProjectRef {
  catalogStatus: ProjectCatalogStatus;
}
