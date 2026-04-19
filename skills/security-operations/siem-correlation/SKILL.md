---
name: siem-correlation-alert-triage
description: >
  Perform security operations center (SOC) alert triage using SIEM
  correlation rules and structured investigation workflows. Prioritize
  alerts by severity, investigate efficiently, and escalate confirmed
  incidents per runbook. Maintain MTTR metrics and reduce alert fatigue.
domain: cybersecurity
subdomain: security-operations
tags: [siem, soc, alert-triage, correlation, splunk, elastic, sentinel, security-operations]
atlas_techniques: [AML.T0040, AML.T0047]
d3fend_techniques: [D3-NTA, D3-SYS, D3-ANM, D3-MW]
nist_ai_rmf: [MEASURE-2.6, MEASURE-3.4]
nist_csf: [DE.AE-01, DE.AE-02, DE.AE-03, DE.CM-01, DE.CM-03, RS.AN-01, RS.AN-04]
version: "1.0"
author: zyra
license: Apache-2.0
---

## When to Use

Trigger conditions — activate this skill when:

- SIEM generates new alert (any severity)
- EDR flags suspicious process
- User reports suspicious activity
- Threat intel indicates IOCs matching your environment
- Scheduled threat hunting query returns hits

## Prerequisites

Required tools, access levels, and environment setup:

### Tools
- SIEM platform (Splunk, Elastic, Microsoft Sentinel, QRadar)
- EDR console
- Threat intelligence platform (MISP, Recorded Future)
- Knowledge base (internal runbooks)
- Ticketing system (Jira, ServiceNow, TheHive)

### Access Levels
- Read access to SIEM indices
- EDR console access for endpoint investigation
- Ability to create/update incidents
- Out-of-band communication channel

### Environment
- Correlation rules tuned (>70% precision)
- Baseline of normal activity established
- Escalation contacts documented

## Workflow

### Step 1: Alert Receipt & Prioritization

```
1.1 Alert de-duplication
    - Check for existing open incidents with same IOCs
    - Merge duplicates if found

1.2 Initial prioritization
    - Apply CVSS-like scoring:
      * Critical (P1): Active attacker, data exfil, ransomware
      * High (P2): Malware execution, privilege escalation
      * Medium (P3): Reconnaissance, failed authentication
      * Low (P4): Policy violations, informational

1.3 Assign to analyst
    - Route to appropriate queue
    - Set SLA based on severity
```

### Step 2: Context Gathering

```
2.1 Asset correlation
    - Identify affected system(s)
    - Determine asset criticality (Crown Jewel analysis)
    - Check asset owner and contact

2.2 User correlation
    - Identify associated user account
    - Determine user role/privilege level
    - Check recent user activity

2.3 Temporal context
    - Time of alert vs. user's normal hours
    - Correlate with other alerts (same source/destination)
    - Check for scheduled events (maintenance, etc.)
```

### Step 3: Investigation

```
3.1 Rule logic review
    - Understand what triggered the alert
    - Review correlation logic and contributing events
    - Identify gaps in detection

3.2 Endpoint investigation
    - Query EDR for process history
    - Check file modifications
    - Review network connections
    - Examine registry changes (Windows)

3.3 Network investigation
    - Review full packet capture if available
    - Check DNS queries for known malicious domains
    - Analyze HTTP traffic for C2 patterns
    - Identify beacon intervals

3.4 Identity investigation
    - Review authentication logs
    - Check for impossible travel
    - Identify privilege escalation attempts
```

### Step 4: Determination

```
4.1 True Positive (TP)
    - Create incident
    - Execute IR playbook
    - Escalate to IR team
    - Document IOCs

4.2 False Positive (FP)
    - Document root cause
    - Identify why rule fired incorrectly
    - Propose rule tuning
    - Close alert

4.3 Benign Positive (BP)
    - Activity is suspicious but authorized
    - Document justification
    - Add to whitelist if appropriate
    - Update detection rules

4.4 Inconclusive
    - Need more information
    - Escalate to tier 2
    - Set follow-up task
```

### Step 5: Resolution & Reporting

```
5.1 Close alert/ticket
    - Document disposition
    - Record time spent
    - Tag with category

5.2 Metrics collection
    - MTTD (Mean Time to Detect)
    - MTTR (Mean Time to Respond)
    - False positive rate
    - Alert volume by type

5.3 Trend analysis
    - Weekly/monthly reporting
    - Identify top false positive sources
    - Recommend detection improvements
```

## Verification

How to confirm the skill was executed successfully:

- [ ] Alert received and logged in ticketing system
- [ ] Prioritization applied correctly
- [ ] All context gathered (asset, user, temporal)
- [ ] Investigation followed runbook steps
- [ ] Disposition determined (TP/FP/BP/Inconclusive)
- [ ] True positives escalated per IR procedures
- [ ] False positives documented with root cause
- [ ] Alert/ticket closed with complete documentation
- [ ] Metrics recorded
- [ ] Weekly trend report generated

## Framework Mappings

| Framework | Mapping |
|-----------|---------|
| MITRE ATT&CK | T1003, T1021, T1047, T1059, T1078, T1082, T1106, T1110, T1136, T1204, T1210, T1486 |
| NIST CSF 2.0 | DE.AE-01, DE.AE-02, DE.AE-03, DE.CM-01, DE.CM-03, DE.CM-07, RS.AN-01, RS.AN-04, RS.AN-05 |
| MITRE ATLAS | AML.T0040, AML.T0047, AML.T0050 |
| MITRE D3FEND | D3-NTA, D3-SYS, D3-ANM, D3-MW, D3-FV, D3-SAPA |
| NIST AI RMF | MEASURE-2.6, MEASURE-3.4, GOVERN-3.1 |