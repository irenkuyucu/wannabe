import assert from "node:assert/strict";
import test from "node:test";

import entryValidationModule from "../src/lib/entry-validation.js";

const {
  getDisplayNameIssue,
  getDisplayNameIssueMessage,
} = entryValidationModule;

test("entry display-name validation distinguishes empty and invalid states", () => {
  assert.equal(getDisplayNameIssue(""), "empty");
  assert.equal(getDisplayNameIssue("   "), "empty");
  assert.equal(getDisplayNameIssue("Alice"), null);
  assert.equal(getDisplayNameIssue("Jean-Luc"), null);
  assert.equal(getDisplayNameIssue("john doe"), null);
  assert.equal(getDisplayNameIssue("abcdefghijkl"), null);
  assert.equal(getDisplayNameIssue("john-doe96"), "invalid");
  assert.equal(getDisplayNameIssue("O'Neil"), "invalid");
  assert.equal(getDisplayNameIssue(" Alice"), "invalid");
  assert.equal(getDisplayNameIssue("abcdefghijklm"), "invalid");
  assert.equal(getDisplayNameIssue("ABCDEFGHIJKLMNOPQ"), "invalid");
});

test("entry display-name validation maps notices to figma copy", () => {
  assert.equal(getDisplayNameIssueMessage("empty"), "Enter your name to continue");
  assert.equal(
    getDisplayNameIssueMessage("invalid"),
    "Only letters A-Z, spaces, and hyphens are allowed",
  );
});
