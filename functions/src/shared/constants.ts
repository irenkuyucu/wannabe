export const FUNCTION_REGION = "europe-west1";

export const CALLABLE_RUNTIME_OPTIONS = {
  region: FUNCTION_REGION,
  timeoutSeconds: 30,
  memory: "256MiB" as const,
};
