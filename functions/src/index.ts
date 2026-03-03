import { logger } from "firebase-functions";
import { HttpsError } from "firebase-functions/v2/https";

import { defineAuthedCallable } from "./shared/callable";
import { FUNCTION_REGION } from "./shared/constants";

type PingRequest = {
  message?: string;
};

type PingResponse = {
  ok: true;
  echo: string;
  region: string;
  uid: string;
};

export const ping = defineAuthedCallable<PingRequest, PingResponse>(
  async (request) => {
    const message = request.data?.message?.trim() || "pong";

    if (message.length > 64) {
      throw new HttpsError(
        "invalid-argument",
        "message must be 64 characters or fewer",
      );
    }

    logger.info("ping callable invoked", { uid: request.auth.uid });

    return {
      ok: true,
      echo: message,
      region: FUNCTION_REGION,
      uid: request.auth.uid,
    };
  },
);
