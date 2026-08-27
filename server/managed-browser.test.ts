import assert from "node:assert/strict";
import test from "node:test";
import { MANAGED_BROWSER_POLICY, validateBrowserUrl } from "./managed-browser";

test("managed browser is local-only and does not export credentials", () => {
  assert.equal(MANAGED_BROWSER_POLICY.localOnly, true);
  assert.equal(MANAGED_BROWSER_POLICY.credentialExport, false);
  assert.equal(MANAGED_BROWSER_POLICY.rawCookieExport, false);
  assert.equal(MANAGED_BROWSER_POLICY.passwordExtraction, false);
  assert.equal(MANAGED_BROWSER_POLICY.authenticatedReadBrowsing, true);
  assert.equal(MANAGED_BROWSER_POLICY.consequentialActionsRequireHumanApproval, true);
});

test("managed browser allows authenticated http(s) navigation only", () => {
  assert.equal(validateBrowserUrl("https://github.com/sonoxo/zyra").protocol, "https:");
  assert.equal(validateBrowserUrl("http://localhost:5000").protocol, "http:");
  assert.throws(() => validateBrowserUrl("file:///etc/passwd"), /ONLY_HTTP_HTTPS_ALLOWED/);
  assert.throws(() => validateBrowserUrl("javascript:alert(1)"), /ONLY_HTTP_HTTPS_ALLOWED/);
});
