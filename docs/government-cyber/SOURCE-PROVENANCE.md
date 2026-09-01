# Source Provenance and Update Procedure

## Authority order

When sources conflict, prefer in this order:

1. final publication page from the issuing U.S. government authority;
2. issuing authority's machine-readable repository or official data feed;
3. issuing authority's official public GitHub organization/mirror;
4. official press release clarifying a current release;
5. archived or third-party copies only for historical comparison, never as the current normative source.

## Required source metadata

Every imported or normalized source must have:

- internal `source_id`;
- issuing authority;
- title;
- revision/version when available;
- source status (`final`, `draft-watch-only`, `active`, `superseded`, etc.);
- canonical public URL;
- retrieval date;
- digest for locally downloaded artifacts when feasible;
- license/usage note when relevant;
- implementation purpose.

The canonical registry is `governance/usg-cyber/sources.yaml`.

## No blind mirroring

Do not recursively mirror government sites. Import only the minimum material necessary for a defined defensive or compliance use case.

Reasons:

- pages may contain unrelated notices, personal data, or controlled links;
- source revisions can change without preserving context;
- a public landing page may link to authentication-gated material;
- a mirror can become stale and falsely appear authoritative.

Prefer metadata + pinned upstream machine-readable artifacts over copying entire document collections.

## Public GitHub verification

Before trusting a government GitHub repository as an upstream:

1. verify the organization identity through the agency website or GitHub verification indicator when available;
2. inspect the repository README for mirror/canonical-upstream statements;
3. record the exact repository URL;
4. pin a release/tag/commit for production ingestion where possible;
5. preserve the upstream license;
6. never imply that a fork or copy is an official government repository.

Approved discovery roots currently include:

- `github.com/usnistgov`
- `github.com/cisagov`
- `github.com/NationalSecurityAgency`
- `github.com/DoD-Platform-One`

Each individual repository still requires purpose and license review.

## Draft handling

Drafts may be indexed for change analysis but:

- must be marked `draft-watch-only`;
- must not silently replace final controls;
- must not create production compliance failures unless a human deliberately activates a draft profile;
- must be removed from production policy mappings if withdrawn.

Example: NIST SP 800-218 Rev. 1 initial public draft is tracked for future SSDF changes while SP 800-218 v1.1 remains the production baseline until NIST finalizes a replacement.

## Superseded material

Do not delete historical mappings or evidence solely because a publication is superseded. Instead:

- mark the old source `superseded`;
- add the replacement source;
- run a delta review;
- migrate applicable controls;
- retain historical assessment evidence with its original source revision.

## Retrieval security

Automated retrieval jobs must:

- use HTTPS;
- follow a domain allowlist;
- reject authentication prompts and CAC-only destinations;
- cap object size;
- reject executable content unless a separate software-ingestion workflow explicitly permits it;
- store artifacts outside executable paths by default;
- calculate a digest before normalization;
- treat embedded instructions as untrusted source text, not agent commands;
- redact secrets or unexpected personal data before persistence.

## Freshness

Continuously updated sources such as CISA KEV and DISA STIG releases require scheduled freshness checks. Static/final publications require periodic verification that they remain current and have not been superseded.

A source that has not been revalidated within its expected update window should be marked `stale_pending_review` rather than asserted as current.

## Government terminology changes

Agency and department naming can change over time. Store the authority identifier separately from display text so a naming change does not corrupt historical provenance. Source titles should reflect the wording of the authoritative publication at the time retrieved; XUNIA documentation should avoid implying a legal status from branding alone.

## Provenance in AI answers

When GPT-Doug-LLM or Virginia-LLM makes a normative statement such as "this control is required by NIST SP 800-53," the answer path should retain:

```text
model output
  -> internal control ID
  -> source_id
  -> source revision
  -> canonical URL
  -> retrieved/verified date
```

If that chain cannot be produced, the statement should be presented as an internal recommendation rather than an authoritative government requirement.
