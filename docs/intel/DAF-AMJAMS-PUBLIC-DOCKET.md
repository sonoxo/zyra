# Department of the Air Force Public Docket — OSINT Source Assessment

**Source:** https://legalassistance.law.af.mil/AMJAMS/PublicDocket/docket.html  
**Retrieved/validated:** 2026-09-01  
**Handling:** PUBLIC-SOURCE / UNCLASSIFIED CONTEXT ONLY. This repository does not make an official U.S. Government classification determination.

## Executive assessment

The Department of the Air Force Public Docket is an official public military-justice source suitable for **event and source-provenance monitoring**, not for adverse-personnel scoring or guilt inference.

The public page exposes docket structure for preliminary hearings, cases, and trial results/schedules. Visible fields include projected start date, responsible base, hearing location, rank, first name, last name, and trial end date depending on the table.

The site itself states that:

- Airmen are presumed innocent unless and until proven guilty.
- Information may change without notice.
- Trial-schedule updates may be delayed.
- Users interested in a particular case should contact the servicing installation Public Affairs office.

Those statements are mandatory interpretation controls for any NXYZ ingestion.

## Source role in NXYZ

```text
OFFICIAL PUBLIC DAF DOCKET
        |
        v
SOURCE SNAPSHOT + RETRIEVAL TIME
        |
        v
SCHEMA / EVENT NORMALIZATION
        |
        v
PROVENANCE + CHANGE STATE
        |
        v
ANALYST REVIEW
        |
        v
PUBLIC-RECORD INTELLIGENCE SIGNAL
```

### Permitted intelligence use

- Track public military-justice docket events and schedule changes.
- Identify which installation is publicly listed as responsible for a proceeding.
- Maintain source provenance, retrieval timestamp, and change history.
- Correlate only with other lawful public records when there is a legitimate analytic purpose.
- Produce aggregate trend analysis that does not overstate what the docket proves.

### Prohibited / restricted interpretation

- A docket appearance is **not evidence of guilt**.
- Do not infer criminality, trustworthiness, clearance status, mission fitness, or operational risk from a scheduled proceeding alone.
- Do not use this feed for automated adverse personnel decisions.
- Do not publish bulk person-level dossiers from the source.
- Do not infer installation readiness, force posture, or mission degradation from docket volume without independent evidence.
- Do not retain unnecessary personal identifiers in the public repository.

## Current public schema

Observed public columns:

### Preliminary-hearing table

- projected start date
- base responsible
- hearing location
- rank
- first name
- last name

### Case table

- projected start date
- base
- location
- rank
- first name
- last name

### Trial-results / completed-case table

- trial end date
- base
- location
- rank
- first name
- last name

The static public-page retrieval performed on 2026-09-01 exposed the schema and disclaimers but did not expose populated row data in that retrieval. Therefore automated row-level ingestion is **NOT YET VALIDATED**.

## System lineage and migration risk

AFJAG history identifies the Automated Military Justice Analysis and Management System (AMJAMS) as a long-running military-justice case-management system. AFJAG also states that the legacy AMJAMS system is being replaced by the cloud-based Disciplinary Case Management System (DCMS).

This creates an integration requirement:

```text
SOURCE URL != PERMANENT DATA CONTRACT
```

NXYZ should treat the current docket as a versioned public source and detect schema/endpoint changes rather than hard-code a permanent AMJAMS dependency.

## NXYZ verification model

Every normalized item should retain:

- `sourceUrl`
- `retrievedAt`
- `sourceSystem`
- `sourceStatus`
- `eventType`
- `eventDate`
- `baseOrInstallation`
- `hearingLocation`
- `recordHash` when a stable canonical record can be built
- `verificationState`
- `presumptionOfInnocence=true` for person-associated pending matters

Recommended verification states:

- `SCHEMA_ONLY` — source structure observed; no row-level record validated.
- `PUBLIC_RECORD_OBSERVED` — row observed on the official public source.
- `SCHEDULE_UNCONFIRMED` — public schedule observed but not independently confirmed.
- `PA_CONFIRMED` — installation Public Affairs has confirmed relevant schedule/details.
- `SUPERSEDED` — later public source state changed or replaced the prior record.

## Data-minimization policy

Person-level names are part of the public page schema, but public availability does not require NXYZ to replicate them into the repository.

Default storage should favor:

```text
installation + event date + event type + source provenance + change state
```

over person-name indexing unless a specific authorized analysis requires identity resolution.

## Source reliability assessment

| Dimension | Assessment |
|---|---|
| Publisher | Department of the Air Force / AFJAG public service |
| Source type | Official public docket |
| Authority for schedule/status | High, subject to stated update delays |
| Timeliness | Variable; site explicitly warns of lag |
| Person-level implication | Low without independent adjudicative context |
| Automation readiness | Schema observed; row feed not yet validated |
| Migration risk | Elevated because AMJAMS is a legacy system transitioning toward DCMS |

## References

- Department of the Air Force Public Docket: https://legalassistance.law.af.mil/AMJAMS/PublicDocket/docket.html
- AFJAG homepage, Military Justice resources: https://www.afjag.af.mil/
- AFJAG JAS history / DCMS transition discussion: https://www.afjag.af.mil/Post/Article-Display/Article/4318822/jaj-message/
- AFJAG history of AMJAMS/public docket modernization: https://www.afjag.af.mil/Post/Article-Display/Article/4332350/jas/

## Implementation state

- Source identified: **COMPLETE**
- Official-public provenance: **VERIFIED**
- Schema documented: **COMPLETE**
- Static row ingestion: **NOT VALIDATED**
- Client-side/API row source discovery: **NOT IMPLEMENTED**
- Change detector: **NOT IMPLEMENTED**
- DCMS migration detector: **NOT IMPLEMENTED**
- Person-level repository replication: **DISABLED BY DEFAULT**
