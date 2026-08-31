# ETHOnline 2026 Work Boundary

## Pre-existing before ETHOnline

The following capabilities existed before the event and are not claimed as hackathon-built work:

- Zyra React + TypeScript application shell and protected routes.
- Express + TypeScript backend services.
- PostgreSQL + Drizzle persistence.
- Existing authentication, security, reporting and operational modules.
- VIRGINIA mission parsing and execution workflow.
- Palantir Foundry Ontology API gateway.
- Existing evidence/result rendering.
- Existing repository CI/security tooling and documentation.

Frozen evidence point:

```text
branch: etholine-2026-baseline
commit: 4182bb819c1c78ff4f882c1664da726aa48dddf6
```

## Pre-event preparation allowed on this branch

`ethonline-2026-prep` contains only provenance, planning, credential/brand documentation, architecture notes and submission organization. It must not contain the substantive Ethereum/partner feature implementation intended for judging.

## New work to implement during the event

The event implementation branch should contain incremental commits for:

- Ethereum wallet connection/authentication.
- Human-backed agent authorization.
- ENSv2 agent identity / delegated permissions integration on Sepolia if selected for the final project.
- Execution receipt smart contract.
- Mission and evidence hashing.
- Backend transaction submission and receipt verification.
- Frontend Web3 execution/verification dashboard.
- Contract deployment scripts and testnet addresses.
- Automated tests and smoke tests.
- Demo evidence and final README comparison.

## Required submission evidence

Maintain all of the following during the event:

- Incremental Git commit history.
- Contract addresses.
- Transaction hashes.
- Network and chain IDs.
- Test output.
- Screenshots of working flows.
- Demo video link.
- Final diff against `ethonline-2026-baseline`.
- A README section explicitly titled **Pre-existing Zyra** and another titled **Built during ETHOnline 2026**.

## Final verification command

At submission time, compare the frozen baseline against the event branch and review every changed file before making any claim about hackathon work.
