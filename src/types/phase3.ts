export type Phase3LoadState = "blocked" | "ready";

export type Phase3SurfaceState = "pending" | "blocked" | "ready";

export type Phase3Surface = {
  id: string;
  titleKey: string;
  purposeKey: string;
  state: Phase3SurfaceState;
  owner: string;
};

export type Phase3Metric = {
  id: string;
  labelKey: string;
  value: string;
  state: Phase3SurfaceState;
};

export type Phase3DashboardData = {
  surfaces: Phase3Surface[];
  metrics: Phase3Metric[];
};

export type Phase3DashboardLoadResult = {
  state: Phase3LoadState;
  reason: string;
  data: Phase3DashboardData;
};
