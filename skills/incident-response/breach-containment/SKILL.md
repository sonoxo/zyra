---
name: incident-response-breach-containment
description: >
  Execute structured incident response for confirmed security breaches.
  Follow the NIST SP 800-61 framework: detection, containment, eradication,
  recovery, and lessons learned. Coordinate with stakeholders and maintain
  legal defensibility through proper chain of custody.
domain: cybersecurity
subdomain: incident-response
tags: [incident-response, ir, breach, dfir, containment, eradication, recovery]
atlas_techniques: [AML.T0040, AML.T0047, AML.T0050]
d3fend_techniques: [D3-MA, D3-VM, D3-FV, D3-SYS]
nist_ai_rmf: [MEASURE-2.6, GOVERN-3.1, GOVERN-3.4]
nist_csf: [RS.RP-01, RS.CO-01, RS.AN-01, RS.MI-01, RS.MI-02, RS.IM-01]
version: "1.0"
author: zyra
license: Apache-2.0
---

## When to Use

Trigger conditions — activate this skill when:

- EDR/antivirus confirms malware execution
- SIEM generates high-fidelity alert (confirmed true positive)
- User reports ransom note or encrypted files
- Unauthorized privileged account activity detected
- Data exfiltration detected (DLP alert, unusual outbound traffic)

## Prerequisites

Required tools, access levels, and environment setup:

### Tools
- Forensic toolkit (FTK Imager, Autopsy)
- Memory acquisition (WinPmem, Magikit)
- EDR console (CrowdStrike, SentinelOne, Microsoft Defender)
- SIEM (Splunk, Elastic, Sentinel)
- Malware sandbox
- Communication channels (out-of-band)

### Access Levels
- IR team with pre-authorized escalation paths
- Privileged access to affected systems
- Legal/compliance pre-approval for containment actions

### Environment
- IR playbook documentation
- Contact list (internal + external IR retainer)
- Evidence collection kits ready
- Isolated IR network/workspace

## Workflow

### Step 1: Detection & Analysis

```
1.1 Alert validation
    - Confirm alert is not false positive
    - Gather initial IOCs
    - Determine alert severity

1.2 Initial scoping
    - Identify affected systems (EDR, SIEM)
    - Determine compromise timeline
    - Identify attack vector

1.3 Stakeholder notification
    - Notify CISO/IR lead
    - Engage legal/compliance
    - Prepare executive briefing
```

### Step 2: Containment

```
2.1 Short-term containment (immediate)
    - Isolate affected endpoint (EDR isolate)
    - Block malicious IPs/domains at perimeter
    - Disable compromised accounts
    - Stop malicious services/processes

2.2 Long-term containment (controlled)
    - Implement network segmentation
    - Apply additional monitoring
    - Create containment boundaries

2.3 Evidence preservation
    - Image affected systems
    - Capture memory
    - Export relevant logs
    - Document chain of custody
```

### Step 3: Eradication

```
3.1 Root cause identification
    - Determine initial access vector
    - Identify persistence mechanisms
    - Map lateral movement paths

3.2 Malware removal
    - Remove malware/integrated tools
    - Clean registry/autorun entries
    - Reinstall compromised binaries
    - Rotate compromised credentials

3.3 Patch/improve security
    - Apply missing patches
    - Fix misconfigurations
    - Update detection rules
```

### Step 4: Recovery

```
4.1 System restoration
    - Rebuild from known-good backups
    - Restore from imaging
    - Validate system integrity (hash verification)

4.2 Data restoration
    - Validate backup integrity (pre-incident)
    - Restore affected data
    - Verify data completeness

4.3 Return to operations
    - Monitor for re-infection
    - Gradual reconnection of systems
    - Enhanced monitoring period (30 days)
```

### Step 5: Post-Incident

```
5.1 Lessons learned
    - Conduct blameless post-mortem
    - Document timeline and actions
    - Identify improvement areas

5.2 Reporting
    - Executive summary
    - Technical deep-dive
    - Regulatory notifications (if required)

5.3 Process improvement
    - Update IR playbook
    - Add new detection rules
    - Improve automation
    - Schedule follow-up exercises
```

## Verification

How to confirm the skill was executed successfully:

- [ ] Alert confirmed and validated
- [ ] Incident declared and tracked
- [ ] Stakeholders notified per chain
- [ ] Containment achieved without data loss
- [ ] Evidence preserved with chain of custody
- [ ] Root cause identified and remediated
- [ ] Systems restored and validated
- [ ] Post-mortem completed
- [ ] Report delivered to stakeholders
- [ ] Process improvements documented
- [ ] Detection rules updated

## Framework Mappings

| Framework | Mapping |
|-----------|---------|
| MITRE ATT&CK | T1003, T1021, T1047, T1059, T1078, T1082, T1110, T1210, T1486, T1569, T1573 |
| NIST CSF 2.0 | RS.RP-01, RS.CO-01, RS.AN-01, RS.AN-04, RS.MI-01, RS.MI-02, RS.IM-01, RC.RP-01 |
| MITRE ATLAS | AML.T0040, AML.T0047, AML.T0050, AML.T0055 |
| MITRE D3FEND | D3-MA, D3-VM, D3-FV, D3-SYS, D3-ANM, D3-PLMD |
| NIST AI RMF | GOVERN-3.1, GOVERN-3.4, MEASURE-2.6 |