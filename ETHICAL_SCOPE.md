# US-CZ Ethical Scope of Practice

## ZYRA · XUNIA · NXYZ · RVIA

**Status:** Owner governance baseline  
**Version:** 1.0.0  
**Effective:** 2026-09-01  
**Scope:** U.S. citizen / private-entity civilian operations

> **US-CZ** is an internal project shorthand for **United States Citizen / Civilian Scope**. It is not a government designation, clearance, license, law-enforcement status, military status, intelligence-community status, or grant of governmental authority.

This document defines the ethical and legal operating boundary for ZYRA, XUNIA, NXYZ, and RVIA. It is a governance and engineering control baseline, **not a legal opinion, legal representation, certification of compliance, or substitute for counsel**. Applicable law depends on the facts, jurisdiction, contracts, data, end users, and deployment environment.

---

## 1. Operating identity

The ecosystem operates as private software and private-sector research/development unless a separate written agreement establishes another role.

| System | Permitted role |
|---|---|
| **ZYRA** | Governed orchestration, policy gating, human approval, evidence, audit, and authorized execution |
| **XUNIA** | Application/agent creation, testing, deployment planning, and user-controlled automation |
| **NXYZ** | Data normalization, ontology, public-source analysis, evidence fusion, decision support, and governed workflows |
| **RVIA** | Repository intelligence, capability evidence, provenance, verification, credential/evidence organization, and software assurance |

None of these systems is, by itself, a law-enforcement agency, intelligence agency, military command, court, legal practice, medical practice, licensed engineering practice, security-clearance authority, credit bureau, or government investigative body.

---

## 2. Controlling principles

All ecosystem activity must satisfy these principles:

1. **Authority before access.** Technical capability never substitutes for permission.
2. **Lawful purpose.** A lawful data source does not make every downstream use lawful or ethical.
3. **Minimum necessary access.** Collect, retain, and expose only what the use case actually requires.
4. **Human control for consequential action.** High-impact, destructive, irreversible, legal, financial, employment, security, or government-facing actions require explicit human review and approval unless a narrower lawful automation has been expressly authorized.
5. **Provenance first.** Material facts and intelligence signals retain source, retrieval time, verification state, and uncertainty.
6. **No guilt-by-data.** Public records, search hits, allegations, watchlist-like matches, or docket appearances are not treated as proof of misconduct.
7. **No authority inflation.** Credentials, badges, training, platform access, repository code, or public-government data do not create government authority, endorsement, clearance, or operational permission.
8. **Fail closed.** If authorization, jurisdiction, identity, policy, or data handling is materially uncertain, mutating/high-impact execution is blocked pending review.
9. **Auditability.** Governed actions generate an auditable record appropriate to the sensitivity of the operation.
10. **Reversibility where practical.** Systems should favor staging, simulation, approval gates, rollback, and postcondition verification.

---

## 3. US-CZ operating zones

### GREEN — ordinary permitted civilian activity

Permitted by default when performed lawfully and consistently with platform terms and contracts:

- Software development, testing, documentation, CI/CD, and code review.
- Security testing of systems owned by the operator.
- Security research in isolated labs, CTFs, intentionally vulnerable environments, and other environments expressly provided for testing.
- Testing under a clearly applicable bug-bounty or vulnerability-disclosure authorization, within its stated scope.
- Processing public information for legitimate research, provided access controls are not bypassed and privacy/usage restrictions are respected.
- Public-source intelligence focused on organizations, technology, markets, infrastructure, policy, procurement, cybersecurity, and public events.
- Defensive threat intelligence, indicator analysis, malware analysis in contained environments, and remediation research.
- Synthetic-data and public-data demonstrations.
- Evidence provenance, ontology building, document normalization, and audit logging.
- AI-assisted drafting, summarization, coding, research, planning, and decision support where humans remain responsible for consequential decisions.

### CONTROLLED — permitted only with additional authority and controls

These activities require documented scope, purpose, authorization, and appropriate review before execution:

- Penetration testing or red-team activity against systems not owned solely by the operator.
- Government, defense, critical-infrastructure, healthcare, financial, education, employment, or other regulated-sector deployments.
- Processing sensitive personal data, biometrics, health data, precise location, credentials, nonpublic communications, or protected records.
- Actions touching third-party cloud accounts, APIs, repositories, SaaS systems, or networks.
- Malware detonation or adversary simulation outside an isolated owned lab.
- Collection or analysis that could materially affect an identifiable person's employment, housing, credit, insurance, liberty, access to services, or reputation.
- Export, reexport, transfer, release, or foreign-person access involving controlled encryption, cybersecurity technology, software, technical data, or other controlled items.
- Transactions, services, or access involving sanctioned jurisdictions, persons, entities, or restricted parties.
- Work involving CUI, export-controlled technical data, classified information, law-enforcement-sensitive information, or contractually restricted government information.
- Automated actions that create, modify, delete, deploy, purchase, submit, transmit, or publish externally.

**Minimum CONTROLLED requirements:**

```text
IDENTIFIED OWNER / REQUESTOR
        ↓
LAWFUL PURPOSE
        ↓
WRITTEN AUTHORIZATION / CONTRACT / TERMS
        ↓
DEFINED SCOPE + SYSTEMS + TIME WINDOW
        ↓
DATA CLASSIFICATION / PRIVACY REVIEW
        ↓
EXPORT / SANCTIONS REVIEW WHEN APPLICABLE
        ↓
TECHNICAL SAFETY CONTROLS
        ↓
HUMAN APPROVAL FOR HIGH-IMPACT ACTIONS
        ↓
AUDIT + EVIDENCE + POSTCONDITION REVIEW
```

### PROHIBITED — outside US-CZ scope

The ecosystem must not be intentionally configured or used to perform:

- Unauthorized access to computers, accounts, networks, applications, databases, files, or communications.
- Credential theft, credential stuffing, phishing for unauthorized access, session theft, token theft, or bypass of authentication/access controls.
- Unauthorized interception of wire, oral, or electronic communications.
- Unauthorized access to stored communications.
- Malware deployment, persistence, destructive payloads, ransomware, botnets, data destruction, or disruption against third-party systems without explicit lawful authorization.
- Evasion of law-enforcement, sanctions, export controls, court orders, contractual restrictions, or required security controls.
- Bulk doxxing, stalking, intimidation, harassment, or creation of person-level dossiers for abuse.
- Automated guilt, criminality, dangerousness, loyalty, clearance, or trustworthiness scoring based merely on public records, allegations, associations, or uncorroborated intelligence.
- Impersonation of a U.S. Government agency, official, law-enforcement officer, military command, intelligence service, licensed professional, or other authority.
- Claiming a security clearance, ATO, government approval, partnership, sponsorship, procurement status, or operational government access without documentary support.
- Placement of classified information or CUI into an environment not expressly approved and authorized for that information.
- Autonomous irreversible high-impact action where law, policy, contract, or the use case requires human judgment or approval.

---

## 4. Cybersecurity legal baseline

### Computer access

The ecosystem is designed around an authorization-first interpretation of U.S. computer-access law. The Computer Fraud and Abuse Act, 18 U.S.C. § 1030, addresses unauthorized computer access and related conduct. DOJ's current CFAA charging policy distinguishes access without authorization from access that exceeds authorization and emphasizes confidentiality, integrity, and availability of information systems.

**ZYRA rule:** no offensive or intrusive action against a non-owned system unless the authority to test that system is documented and the requested action falls inside that authorization.

### Communications

The Wiretap Act / Electronic Communications Privacy Act and Stored Communications Act create separate legal restrictions around interception and access to communications and stored communications.

**NXYZ rule:** a public web page may be analyzed as public-source material; private messages, mailboxes, cloud storage, accounts, or stored communications require valid user/owner authorization or another lawful basis.

### Security research

Security research must use owned labs, expressly authorized environments, or clearly applicable testing programs. A research motive does not create access authorization.

---

## 5. Privacy and personal-data practice

The ecosystem follows data minimization even when information is publicly accessible.

### Required controls

- Define a purpose before collecting identifiable personal data.
- Prefer aggregate, organizational, technical, or event-level intelligence when identity is not required.
- Avoid copying unnecessary names, addresses, contact information, identifiers, or other personal data into public repositories.
- Separate a **match**, **identity determination**, **assessment**, and **decision**.
- Retain uncertainty and source context.
- Provide deletion/correction workflows where the product or applicable law requires them.
- Honor privacy representations made to users; do not claim protections the implementation does not provide.
- Apply applicable federal and state privacy, breach-notification, biometric, recording-consent, consumer-protection, employment, and sector-specific requirements.

### Public records

Public availability is a source-access fact, not an ethical permission slip for unlimited profiling.

For court, military-justice, regulatory, disciplinary, or similar public records:

- preserve presumptions and procedural status;
- do not convert allegations into factual findings;
- do not infer guilt or trustworthiness from appearance in a docket;
- do not build bulk person-level public dossiers by default;
- require corroboration before consequential use.

---

## 6. AI and agentic-system governance

ZYRA/XUNIA/NXYZ/RVIA adopt the NIST AI Risk Management Framework as a voluntary governance reference, including the lifecycle functions **GOVERN, MAP, MEASURE, and MANAGE**.

Target trustworthiness characteristics include:

- valid and reliable;
- safe;
- secure and resilient;
- accountable and transparent;
- explainable and interpretable where appropriate;
- privacy-enhanced; and
- fair, with harmful bias managed.

### Agentic control classes

| Class | Example | Default |
|---|---|---|
| `READ_ONLY` | Search authorized sources, summarize, classify | Allowed with source/data policy |
| `ANALYSIS_ONLY` | Score technical risk, compare options, produce recommendation | Allowed; material uncertainty must be visible |
| `PROPOSAL_ONLY` | Draft an action, email, deployment, filing, purchase | Human decides whether to execute |
| `REVERSIBLE_WRITE` | Create branch, draft, sandbox configuration | Authorization + audit required |
| `EXTERNAL_WRITE` | Send email, submit portal form, publish, deploy | Explicit user/owner authorization required |
| `HIGH_IMPACT_WRITE` | Security action, regulated decision, destructive/irreversible change | Explicit authorization + human approval + policy gate + postcondition verification |

AI output never creates legal authority by itself.

---

## 7. Government / defense boundary

Public U.S. Government sources may be researched and modeled as public references.

A public government website, credential, training badge, meeting, email, proposal submission, vendor registration, GitHub interaction, or platform account does **not** mean:

- government employment;
- military command authority;
- law-enforcement authority;
- intelligence-community authority;
- a security clearance;
- an Authority to Operate (ATO);
- classified-system access;
- CUI authorization;
- a contract award;
- sponsorship, endorsement, or partnership.

Those states must be recorded separately and supported by the relevant official documentation.

### Government data rule

```text
PUBLIC / APPROVED DATA → normal governed workflow
CUI / CONTROLLED DATA   → approved environment + contract/policy authorization required
CLASSIFIED DATA         → not permitted in ordinary ZYRA/XUNIA/NXYZ/RVIA civilian infrastructure
```

No system component may self-upgrade its authority classification based on the content it sees.

---

## 8. Export controls and sanctions

Before foreign release, foreign-person access, export, reexport, transfer, or international service delivery involving potentially controlled cybersecurity, encryption, advanced-computing, technical data, software, or defense-related content:

1. determine jurisdiction and classification where required;
2. evaluate the destination, end user, and end use;
3. check applicable EAR/ITAR or other controls;
4. screen applicable sanctions/restricted-party obligations;
5. obtain licenses or legal review where required;
6. retain the compliance decision and supporting evidence.

The Bureau of Industry and Security maintains specific EAR guidance for encryption and cybersecurity items. OFAC publishes a risk-based sanctions-compliance framework emphasizing management commitment, risk assessment, internal controls, testing/auditing, and training.

**Default:** when export/sanctions applicability is uncertain, external transfer is blocked pending review.

---

## 9. Professional scope-of-practice boundary

The ecosystem may assist licensed professionals and users with research, drafting, organization, calculation, documentation, and decision support.

It must not present itself as holding a professional license it does not hold or convert software output into a false claim of licensed practice.

Areas requiring special scope review include:

- legal services;
- medical/clinical services;
- engineering sign-off;
- accounting/audit attestations;
- investment or securities services;
- private investigation where state licensing applies;
- regulated security services;
- credit/employment/tenant screening;
- government contracting representations and certifications.

Where a law reserves an act, representation, certification, or decision to a licensed/authorized person, ZYRA/XUNIA/NXYZ/RVIA remains a tool and the authorized person retains responsibility.

---

## 10. Decision gate

Before a non-routine action executes, the policy engine should answer:

```text
1. WHO requested this?
2. WHAT exact action will occur?
3. WHICH systems/data/people are affected?
4. WHO owns or controls those systems/data?
5. WHAT is the authorization basis?
6. WHAT jurisdiction(s) and contract terms apply?
7. IS personal, regulated, export-controlled, CUI, or classified data involved?
8. CAN the action materially harm rights, safety, property, reputation, or access?
9. IS human approval required?
10. WHAT evidence proves scope, authorization, execution, and outcome?
```

If questions 4–9 cannot be answered adequately, the action remains `BLOCKED_PENDING_REVIEW`.

---

## 11. Evidence and audit requirements

For CONTROLLED operations, retain as appropriate:

- requestor identity or accountable role;
- authorization artifact/reference;
- systems and data in scope;
- start/end dates or engagement window;
- rules of engagement;
- policy decision;
- human approval event when required;
- tools/actions executed;
- source provenance;
- results and postconditions;
- exceptions and escalations;
- retention/deletion disposition.

Never commit passwords, API keys, access tokens, private keys, classified data, CUI, protected personal data, or restricted client/government artifacts to the public repository.

---

## 12. Legal / standards reference baseline

This policy should be reviewed against the current version of applicable authorities, including where relevant:

- 18 U.S.C. § 1030 — Computer Fraud and Abuse Act.
- 18 U.S.C. §§ 2510–2523 — Wiretap Act / electronic-communications interception provisions.
- 18 U.S.C. §§ 2701–2713 — Stored Communications Act.
- Federal Trade Commission privacy, security, consumer-protection, and sector guidance.
- Export Administration Regulations (EAR), including applicable encryption and cybersecurity-item controls administered by BIS.
- ITAR when defense articles, defense services, or controlled technical data are implicated.
- OFAC sanctions programs and compliance guidance.
- Applicable state privacy, computer-crime, biometric, recording-consent, breach-notification, employment, consumer-reporting, and professional-licensing laws.
- NIST AI Risk Management Framework and relevant profiles as voluntary governance references.
- Contractual rules, platform terms, vulnerability-disclosure policies, rules of engagement, and government data-handling requirements applicable to the specific operation.

### Official references

- DOJ CFAA policy: https://www.justice.gov/jm/jm-9-48000-computer-fraud
- U.S. Code, Stored Communications Act § 2701: https://uscode.house.gov/view.xhtml?req=(title:18%20section:2701%20edition:prelim)
- FTC Privacy & Security: https://www.ftc.gov/business-guidance/privacy-security
- BIS cybersecurity/EAR guidance: https://www.bis.gov/guidance-frequently-asked-questions
- BIS encryption controls: https://www.bis.gov/learn-support/encryption-controls
- OFAC compliance framework: https://ofac.treasury.gov/recent-actions/20190502_33
- NIST AI RMF: https://www.nist.gov/itl/ai-risk-management-framework

---

## 13. Enforcement inside the ecosystem

This scope is intended to become executable policy.

Expected runtime states:

- `US_CZ_GREEN`
- `US_CZ_CONTROLLED`
- `BLOCKED_PENDING_AUTHORIZATION`
- `BLOCKED_PENDING_PRIVACY_REVIEW`
- `BLOCKED_PENDING_EXPORT_REVIEW`
- `BLOCKED_PENDING_LEGAL_REVIEW`
- `PROHIBITED_US_CZ`

Every agent, connector, tool, workflow, deployment path, and intelligence source should inherit these boundaries unless a stricter policy applies.

**Stricter rule wins. Written authorization controls technical scope. Human rights, privacy, safety, provenance, and truthfulness remain mandatory.**
