# Zyra Job-Ready Engineering Standard

Zyra should function as both a production-minded security/AI platform and a verifiable engineering portfolio. Job readiness means a recruiter or hiring manager can inspect the repository and quickly understand the problem, architecture, implementation quality, security posture, and engineering tradeoffs.

## Target role families

- AI / software engineering
- Cloud / DevSecOps engineering
- Cybersecurity engineering
- Platform / reliability engineering

## Evidence standard

Every flagship feature should provide evidence across five layers:

1. **Problem** — what real user or operational problem the feature solves.
2. **Architecture** — services, data flows, dependencies, trust boundaries, and deployment assumptions.
3. **Implementation** — readable TypeScript/React/Node code, schemas, APIs, and meaningful commits.
4. **Verification** — type checks, build checks, security scanning, tests where applicable, and documented limitations.
5. **Communication** — screenshots/demo path, concise README or case study, and an interview-ready explanation of tradeoffs and outcomes.

## Job-ready gate

A candidate-facing change is ready when:

- `npm ci` succeeds from a clean checkout.
- `npm run check` succeeds.
- `npm run build` succeeds.
- security workflows remain enabled.
- no credentials, tokens, private customer data, or unverifiable performance claims are committed.
- the feature has a clear route or documented demo path.
- documentation explains what was built and why.

## Interview translation

Use Zyra work to create STAR stories:

- **Situation:** the engineering or security problem.
- **Task:** the outcome or constraint you owned.
- **Action:** architecture, debugging, automation, testing, and tradeoff decisions.
- **Result:** verified build, reduced failure mode, improved workflow, or delivered capability.

Do not inflate metrics. Prefer reproducible proof from code, CI, issues, pull requests, screenshots, and deployed behavior.

## Portfolio safety

Keep public portfolio material free of secrets, credentials, personal data, customer-sensitive information, exploit-ready operational details, and unsupported claims of government or enterprise affiliation.

## Product surface

The in-product `/job-readiness` workspace maps existing Zyra modules to hiring evidence and identifies the next gaps to close before presenting the ecosystem to employers.
