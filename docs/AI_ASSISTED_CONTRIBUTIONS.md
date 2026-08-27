# AI-assisted contributions

ZYRA accepts meaningful AI-assisted engineering contributions when the human contributor remains accountable for scope, validation, review, and merge decisions.

## Attribution

When an automated contributor materially helps create a commit, preserve that assistance in the commit metadata instead of presenting the work as unaided. Human maintainers remain responsible for verifying correctness, security boundaries, tests, and deployment impact.

## Required review

Before merge:

- verify the diff is intentional;
- run the relevant test and type-check gates;
- confirm no secrets or credentials were introduced;
- preserve contributor and source attribution where applicable;
- require explicit human review for consequential deployment, signing, governance, or data-mutation actions.

This policy keeps automated contribution transparent while preserving human ownership of engineering decisions.
