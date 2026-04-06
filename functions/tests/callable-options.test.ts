import assert from "node:assert/strict";
import test from "node:test";

import { CALLABLE_RUNTIME_OPTIONS } from "../src/shared/constants";

test("callable runtime options keep Cloud Run invoker public", () => {
  assert.equal(CALLABLE_RUNTIME_OPTIONS.invoker, "public");
});
