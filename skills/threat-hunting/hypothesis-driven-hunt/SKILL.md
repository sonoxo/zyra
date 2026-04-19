---
name: hypothesis-driven-threat-hunt
description: >
  Conduct hypothesis-driven threat hunting engagements using the
  Hunter's Killer methodology. Form testable hypotheses based on
  threat intelligence, actor TTPs, and environmental anomalies,
  then systematically validate or refute each hypothesis with
  forensic evidence.
domain: cybersecurity
subdomain: threat-hunting
tags: [threat-hunting, hunter-killer, apt-detection, dfir, intelligence-driven]
atlas_techniques: [AML.T0040, AML.T0047]
d3fend_techniques: [D3-NTA, D3-SYS, D3-ANM]
nist_ai_rmf: [MEASURE-2.6, GOVERN-3.1]
nist_csf: [DE.CM-01, DE.CM-03, DE.AE-01, RS.AN-01]
version: "1.0"
author: zyra
license: Apache-2.0
---

## When to Use

Trigger conditions — activate this skill when:

- Security telemetry shows anomalous behavior lacking clear root cause
- New threat intelligence indicates active actor targeting your sector
- Unusual network traffic patterns detected (lateral movement, C2 beacons)
- Privileged account anomalies (impossible travel, unusual hours)
- Endpoint detection flags suspicious process injection or LOTL activity

## Prerequisites

Required tools, access levels, and environment setup:

### Tools
- SIEM platform (Splunk, Elastic, Microsoft Sentinel)
- EDR solution (CrowdStrike, Carbon Black, SentinelOne)
- Network traffic analysis tools (Zeek, Wireshark, NetworkMiner)
- Memory forensics (Volatility3, Redline)
- Log aggregation (Graylog, ELK Stack)

### Access Levels
- Read access to security telemetry (30+ days retention)
- Admin/EDR console access for endpoint investigation
- Network tap/mirror access for full packet capture
- Privileged account for AD reconstruction (BloodHound)

### Environment
- Baseline of "normal" behavior established (minimum 14 days)
- Threat intelligence feeds integrated (STIX/TAXII, MISP)
- Logging correlation rules active for key assets

## Workflow

### Step 1: Hypothesis Formulation

```
1.1 Collect threat intelligence
    - Review recent CVEs affecting your stack
    - Query threat feeds for actor TTPs targeting your industry
    - Analyze internal incident reports for patterns

1.2 Identify environmental gaps
    - Inventory assets lacking telemetry
    - Assess coverage blind spots (legacy systems, IoT)

1.3 Form testable hypotheses
    Format: "If <actor> is present, we would expect <evidence>"

    Examples:
    - "If attacker is performing Kerberoasting, we would see TGS-REQ to unusual SPNs"
    - "If LOTL is in use, we would see PowerShell spawning from Office processes"
    - "If lateral movement occurred, we would see SMB sessions to new subnets"
```

### Step 2: Hypothesis Testing

```
2.1 Define search parameters
    - Time window: 7-30 days (expand if initial search inconclusive)
    - Data sources: endpoint, network, identity, cloud logs

2.2 Execute structured queries
    Splunk SPL:
    | search index=endpoint EventCode=4688 ParentImage!="*\\explorer.exe" 
      | where timestamp < relative_time(now(), "-7d")

    Elastic EQL:
    any where process.parent_name == "winword.exe" 
      and process.name != "powershell.exe"

2.3 Triage findings
    - True positive: matches hypothesis → escalate to Step 3
    - False positive: benign explanation → document and close
    - Inconclusive: refine hypothesis or expand search
```

### Step 3: Evidence Collection

```
3.1 Endpoint forensics
    - Acquire memory dump from suspect endpoint
    - Run Volatility3: plugins processlist, netscan, malfind
    - Extract persisted artifacts (registry, scheduled tasks)

3.2 Network forensics
    - Export PCAP for identified suspicious flows
    - Parse DNS logs for known malicious domains
    - Correlate beacon intervals with C2 patterns

3.3 Identity forensics
    - Run BloodHound queries for privilege escalation paths
    - Review Azure AD sign-in logs for impossible travel
    - ExportKerberos TGS requests for anomaly detection
```

### Step 4: Hypothesis Resolution

```
4.1 True Positive Response
    - Initiate incident response playbook
    - Scope compromise (lateral movement, data access)
    - Eradicate attacker presence
    - Recover to known-good state

4.2 False Positive Documentation
    - Document benign root cause
    - Update detection rules to reduce noise
    - Refine baseline for future hunts

4.3 Inconclusive Handling
    - Expand time window
    - Add additional data sources
    - Escalate to extended hunting team
```

## Verification

How to confirm the skill was executed successfully:

- [ ] Hypothesis clearly documented before search
- [ ] Search queries logged and reproducible
- [ ] All findings triaged with disposition (TP/FP/Inconclusive)
- [ ] True positives escalated per IR procedures
- [ ] Hunt report completed with lessons learned
- [ ] New detection rules created from findings
- [ ] Metrics recorded: time-to-detect, coverage improvement

## Framework Mappings

| Framework | Mapping |
|-----------|---------|
| MITRE ATT&CK | T1003, T1005, T1021, T1047, T1059, T1082, T1083, T1110, T1136, T1204, T1210, T1219 |
| NIST CSF 2.0 | DE.CM-01, DE.CM-03, DE.AE-01, DE.AE-03, RS.AN-01, RS.AN-04 |
| MITRE ATLAS | AML.T0040, AML.T0047, AML.T0050, AML.T0055 |
| MITRE D3FEND | D3-NTA, D3-SYS, D3-ANM, D3-PLMD, D3-SSPA |
| NIST AI RMF | GOVERN-3.1, MEASURE-2.6, MEASURE-3.4 |