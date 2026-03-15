const DISPLAY_NAME_ALLOWED_REGEX = /^[A-Za-z -]{1,12}$/;

/**
 * @param {string} displayName
 * @returns {"empty" | "invalid" | null}
 */
export function getDisplayNameIssue(displayName) {
  if (typeof displayName !== "string") {
    return "invalid";
  }

  const trimmed = displayName.trim();

  if (trimmed.length === 0) {
    return "empty";
  }

  if (trimmed.length > 12) {
    return "invalid";
  }

  if (trimmed !== displayName) {
    return "invalid";
  }

  if (!DISPLAY_NAME_ALLOWED_REGEX.test(trimmed) || !/[A-Za-z]/.test(trimmed)) {
    return "invalid";
  }

  return null;
}

/**
 * @param {"empty" | "invalid"} issue
 * @returns {string}
 */
export function getDisplayNameIssueMessage(issue) {
  return issue === "empty"
    ? "Enter your name to continue"
    : "Only letters A-Z, spaces, and hyphens are allowed";
}
