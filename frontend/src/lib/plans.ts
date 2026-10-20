import catalogue from "../../../backend/app/services/plan_catalog.json";

// Bundled into the initial page: public prices never wait for a backend cold start.
export const PUBLIC_PLANS = Object.entries(catalogue).map(([id, plan]) => ({ id, ...plan }));
