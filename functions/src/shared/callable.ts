import {
  type CallableOptions,
  type CallableRequest,
  HttpsError,
  onCall,
} from "firebase-functions/v2/https";

import { CALLABLE_RUNTIME_OPTIONS } from "./constants";

type AuthedCallableRequest<TData> = CallableRequest<TData> & {
  auth: NonNullable<CallableRequest<TData>["auth"]>;
};

export function requireAuth<TData>(request: CallableRequest<TData>) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }
}

export function defineCallable<TData, TResult>(
  handler: (request: CallableRequest<TData>) => Promise<TResult> | TResult,
  options: CallableOptions = {},
) {
  return onCall(
    {
      ...CALLABLE_RUNTIME_OPTIONS,
      ...options,
    },
    async (request) => handler(request as CallableRequest<TData>),
  );
}

export function defineAuthedCallable<TData, TResult>(
  handler: (request: AuthedCallableRequest<TData>) => Promise<TResult> | TResult,
  options: CallableOptions = {},
) {
  return defineCallable<TData, TResult>((request) => {
    requireAuth(request);
    return handler(request as AuthedCallableRequest<TData>);
  }, options);
}
