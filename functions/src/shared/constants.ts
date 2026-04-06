export const FUNCTION_REGION = "europe-west1";

export const CALLABLE_RUNTIME_OPTIONS = {
  region: FUNCTION_REGION,
  timeoutSeconds: 30,
  memory: "256MiB" as const,
  // Callable endpoints must stay publicly invokable at the transport layer;
  // Firebase Auth is enforced inside the handler via request.auth.
  invoker: "public" as const,
};
