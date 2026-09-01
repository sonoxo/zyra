# ZYRA Education Archive Audit

## Ecosystem binding

This credential evidence set is bound to the owner-designated application ecosystem:

`GPT-DOUG-LLM / ZYRA / XUNIA — GLASS ONION / RVAI`

This binding identifies the project pathway that may consume the credential ledger. It does not convert a training credential into third-party authorization or a government credential.

## Archive source

Source: user-supplied `Education .zip`

Audit rule: count a new record only when the archive contains evidence that supports the named credential/training/professional-development item. Constituent course badges may be listed as supplemental evidence without being double-counted when they are already represented by a professional certificate.

## Newly reconciled records

| Record | Evidence state | Date | Verification / evidence reference | SHA-256 |
|---|---|---|---|---|
| **Google AI Professional Certificate — 7 courses** | **SUPPLIED ISSUER EVIDENCE** | Jul 31, 2026 | https://coursera.org/verify/professional-cert/QBUP5I6Q063G | `eb63796fc6211585692cc15ec15ca28f4806b18f44f932d3ff993c91ee974b26` |
| **AI for Content Creation** — Google / Coursera | **ISSUER COURSE CERTIFICATE** | Jul 30, 2026 | https://coursera.org/verify/5YNKW9L6QXDE | `0ab6a60bbfd2ec52a9ab96523aff1cc34c3a5033a52343682ab4aa2bbd3c4852` |
| **AI for Writing and Communicating** — Google / Coursera | **ISSUER COURSE CERTIFICATE** | Jul 30, 2026 | https://coursera.org/verify/HR3WX505VSIU | `155f27b662c18a4a14e93c40466ab2e3c31300a3c0f4003c025a6672022265a3` |
| **AI for Research and Insights** — Google / Coursera | **ISSUER COURSE CERTIFICATE** | Jul 31, 2026 | https://coursera.org/verify/9EDB14ATGX3V | `0ff3face253c61fa788f03a9a651a7f9b444f7f06288a455f52cd359864f66cf` |
| **AI for App Building** — Google / Coursera | **ISSUER COURSE CERTIFICATE** | Jul 30, 2026 | https://coursera.org/verify/WPB5I4OB1LST | `3a36b091a749677ff5cc354d61d50b0a23b8f688b6d76a0b6454495a9e83a6cf` |
| **Foundations of Business Intelligence** — Google / Coursera | **ISSUER COURSE CERTIFICATE** | Aug 4, 2026 | https://coursera.org/verify/JY87E17F8Y0S | `641301a29746146633b2844493ad54f8316c686bc853214ac660be9cc47772a3` |
| **Data Science Landscape** — IBM SkillsBuild | **SUPPLIED COMPLETION CERTIFICATE** | Jul 23, 2026 | IBM SkillsBuild certificate record `ALM-COURSE_4058878` | `bf69da1eb8d93634f75d9b24c2d1c34adb64e976028e79860cb39f34b7a6a2fd` |
| **Replit Certification — Level 3 Proficient Builder** | **SUPPLIED BADGE ARTIFACT** | 2026 archive evidence | `replit-certification-level-3.gif`; badge image itself does not encode the owner's name | `baa5140f09538b08473df9499dc036876f3e04d62d4897f7eef781cef3618461` |
| **Threat Hunting with Google Threat Intelligence — Episode 7** — BrightTALK | **VIEWING CERTIFICATE** | Aug 24, 2026 | Certificate states Douglas Brown; viewed `1 of 59 minutes` | `11c573dccbf94722401301611f36b3e72a527236ff6fd29839c036c335947d16` |

## Existing record upgraded by archive evidence

**Accelerate Your Job Search with AI** was already present in the ZYRA ledger as a library-referenced Google Career record. The archive contains an issuer-backed Coursera certificate dated Jul 29, 2026, verification code `OQ5XVBCHL374`. It remains one ledger record; its evidence state is upgraded rather than double-counted.

SHA-256: `404cfe88a86a45947dada54d67a9ba01e8ad57658bd5edfedddbad284614f9d2`

Verification: https://coursera.org/verify/OQ5XVBCHL374

## Google AI Professional Certificate — constituent course evidence

The supplied Google AI Professional Certificate documents seven courses:

1. AI Fundamentals
2. AI for Brainstorming and Planning
3. AI for Research and Insights
4. AI for Writing and Communicating
5. AI for Content Creation
6. AI for Data Analysis
7. AI for App Building

The archive also contains course-completion badge images for **AI Fundamentals**, **AI for Brainstorming and Planning**, **AI for Research and Insights**, **AI for Writing and Communicating**, **AI for Content Creation**, **AI for Data Analysis**, and **AI for App Building**. The three badge-only course artifacts are retained as constituent evidence and are not promoted to separate issuer certificates without an individual certificate/verification record.

## Evidence present but not counted as a credential record

The archive also contains supporting material that should not be inflated into credentials, including:

- course resources and worksheets;
- clinical AI practice datasets and exemplars;
- Palantir contract/CLA/account records, which are access/legal evidence rather than training credentials;
- a secondary-school transcript, which is education evidence but not itself a new certification record;
- a 2026 Open Education Award for Excellence nominee image, which is an achievement/nomination rather than a training credential;
- IBM/Google course artwork where completion status is not independently encoded;
- certification guides, vendor acknowledgements, research PDFs, and reference material.

## Controlling rule

**Credential count = distinct reconciled credential/training/professional-development records.**

Professional certificates and separately issued course certificates may both exist as distinct records when each has its own issuer-backed verification identifier. Constituent badge artwork alone does not create an additional certificate count.
