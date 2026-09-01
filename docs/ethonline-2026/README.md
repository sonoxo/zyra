# Zyra — ETHOnline 2026 Continuity Project

This directory is the pre-hackathon project foundation for Zyra's ETHOnline 2026 Continuity submission.

## Frozen pre-event baseline

- Repository: `sonoxo/zyra`
- Baseline branch: `ethonline-2026-baseline`
- Baseline commit: `4182bb819c1c78ff4f882c1664da726aa48dddf6`
- Prep branch: `ethonline-2026-prep`

The baseline branch is intentionally frozen so reviewers can distinguish the existing Zyra platform from work completed during ETHOnline.

## Existing Zyra capability

Before ETHOnline, Zyra already includes a React/TypeScript interface, Express/TypeScript backend, PostgreSQL/Drizzle data layer, mission parsing/execution, evidence output, and a server-side Palantir Foundry Ontology API gateway.

That existing functionality is **pre-existing work** and will not be represented as hackathon-built functionality.

## Hackathon objective

During the official ETHOnline hacking period, extend Zyra with an Ethereum-native trust layer for agent identity, authorization, and verifiable execution evidence.

Target demo flow:

```text
Human / Wallet
   ↓
Agent authorization
   ↓
Zyra mission plan + execution
   ↓
Offchain evidence hash
   ↓
Onchain execution receipt
   ↓
Independent verification
```

## Planned new work during ETHOnline

The implementation branch will be created when hacking officially begins. Planned event work:

1. Wallet-based authentication and operator identity.
2. Agent authorization policy checks.
3. Smart-contract execution receipt registry.
4. Mission/evidence hashing with only verification material written onchain.
5. Backend receipt creation and verification service.
6. Web3 execution dashboard showing wallet, network, transaction, receipt and verification state.
7. ENSv2 integration on Sepolia for agent namespace / delegated permissions where technically appropriate.
8. World AgentKit integration for human-backed agent authorization where technically appropriate.
9. Contract, backend and frontend tests.
10. Testnet deployment, transaction evidence, demo script and final submission documentation.

## Continuity discipline

No substantive hackathon-specific feature code is being added on this prep branch. Its purpose is documentation, evidence organization, architecture planning and pre-event provenance only.

See [`WORK_BOUNDARY.md`](WORK_BOUNDARY.md) for the exact before/after boundary and [`CREDENTIALS.md`](CREDENTIALS.md) for project credentials and branding notes.
