# Government Cyber Documentation Safety Boundaries

## Scope

This policy governs ingestion and use of public U.S. government cybersecurity material by ZYRA, XUNIA, GPT-Doug-LLM, Virginia-LLM, agents, retrieval systems, and automated documentation jobs.

## Allowed

The platform may ingest, summarize, index, map, and assess against:

- public NIST cybersecurity and AI publications;
- public CISA defensive guidance, KEV data, CPGs, and secure-development guidance;
- public NSA Cybersecurity Directorate defensive guidance;
- public DISA STIGs/SRGs and public SCAP/checklist material when licensing and access permit;
- public DoD/DoW CIO cyber workforce frameworks, qualification policy, Zero Trust material, and reference architectures;
- public Platform One GitHub mirrors and documentation;
- public government Git repositories whose provenance can be verified.

## Prohibited ingestion

The system MUST reject or quarantine:

- classified information or material marked Confidential, Secret, Top Secret, SCI, SAP, or equivalent;
- CUI/FOUO or other controlled material unless the project later has a lawful, documented handling environment and explicit authorization;
- CAC-only, authentication-gated, restricted, internal-only, or access-controlled government material;
- leaked credentials, API keys, tokens, certificates, private keys, session cookies, or authentication artifacts;
- personal data that is unnecessary to the defensive-control purpose;
- non-public service-member location, movement, duty schedule, family, medical, financial, CAC, DoD ID, or contact data;
- exploit instructions whose primary value is unauthorized compromise rather than defensive validation;
- malware payloads or operational intrusion tooling imported merely because a government repository discusses them;
- export-controlled or otherwise legally restricted technical data.

## Personnel policy

The `workforce` layer stores **roles**, not targets.

Allowed examples:

- DCWF work-role identifier;
- public work-role title;
- task statements;
- knowledge, skill, and ability requirements;
- proficiency or qualification metadata;
- public organizational leadership title when needed for source provenance.

Disallowed examples:

- private service-member roster;
- personal DoD identifiers;
- private phone/email/address data;
- precise non-public deployment or schedule information;
- aggregation intended to enable targeting or surveillance of personnel.

## Model and agent restrictions

Agents that consume government cyber documentation MUST:

1. operate with least privilege;
2. distinguish source requirements from XUNIA interpretations;
3. cite source IDs from `sources.yaml` in generated compliance findings;
4. never infer an authorization, clearance, certification, government relationship, or military status;
5. never upgrade a draft publication to a final requirement;
6. never treat archived guidance as current without an explicit legacy profile;
7. never bypass authentication or acquire access-controlled government documents;
8. use offensive-security information only for authorized defensive testing, labs, education, or remediation;
9. redact secrets before logs, embeddings, telemetry, or model context are persisted;
10. require human approval for actions that materially change production access-control, identity, network-boundary, or cryptographic policy.

## Data classification inside XUNIA

Use these internal labels:

- `PUBLIC-AUTHORITATIVE` — verified public government source.
- `PUBLIC-DERIVED` — XUNIA normalization or mapping derived from a public source.
- `INTERNAL` — project implementation detail not intended as a government statement.
- `SENSITIVE-LOCAL` — secrets, credentials, private infrastructure details; never committed to Git.
- `REJECTED-RESTRICTED` — content that violates ingestion boundaries.

No internal label changes the legal classification of source material.

## Claims policy

Documentation MUST use language such as:

- "mapped to NIST SP 800-53";
- "designed with reference to DISA STIG guidance";
- "uses public DCWF role definitions";
- "OSCAL-compatible internal representation".

Documentation MUST NOT state or imply:

- "DoD approved";
- "NSA certified";
- "military system";
- "FedRAMP authorized";
- "CMMC certified";
- "ATO granted";

unless documentary evidence for that exact formal status exists.

## Fail-closed rule

If source classification, access status, license, provenance, or sensitivity is uncertain, the ingestion job MUST stop and require review rather than automatically importing the material.
