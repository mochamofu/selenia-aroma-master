export type AppTarget = "all" | "customer" | "admin" | "operator";

export const appTarget = (process.env.NEXT_PUBLIC_APP_TARGET ?? "all") as AppTarget;

export const isCustomerOnlyApp = appTarget === "customer";
