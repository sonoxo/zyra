# Deep Technical Reference: Hypothesis-Driven Threat Hunting

## Hunter's Killer Methodology

The Hunter's Killer methodology is a structured approach to proactive threat hunting developed by The Air Force's Threat Detection Framework. It shifts the security posture from reactive to proactive.

### Core Principles

1. **Assume Compromise** - Act as though an adversary is already in the environment
2. **Hypothesis-Driven** - Form testable hypotheses based on threat intelligence
3. **Evidence-Based** - Require proof before escalation
4. **Repeatable Process** - Document everything for consistency

## Hypothesis Templates

### Template 1: Actor-Based
```
If <actor/APT group> is present, we would expect:
- <specific TTP indicator>
- <network artifact>
- <endpoint artifact>
```

### Template 2: Anomaly-Based
```
If <normal behavior> has changed to <observed anomaly>, 
this could indicate <threat actor/attack vector>
```

### Template 3: Intelligence-Based
```
Given <new CVE/threat intel>, we would expect to see:
- <exploitation indicators>
- <affected systems>
- <attack progression>
```

## Search Query Examples

### Splunk SPL

#### Kerberoasting Detection
```spl
index=windows EventCode=4769 
| where TicketOptions == "0x40810010" 
  AND ServiceName != "krbtgt" 
  AND ServiceName != "$" 
| stats count by Account_Name, ServiceName, IpAddress 
| where count > 5
```

#### PowerShell Spawned from Office
```spl
index=endpoint EventCode=4688 
| where ParentProcessName LIKE "%winword.exe%" 
   OR ParentProcessName LIKE "%excel.exe%" 
   OR ParentProcessName LIKE "%outlook.exe%" 
| where ProcessName == "powershell.exe" 
| stats min(_time) as first_seen, max(_time) as last_seen by ComputerName, Account_Name
```

#### Lateral Movement via SMB
```spl
index=network source_port=445 
| stats dc(dest_ip) as unique_destinations, 
       count as connection_count 
       by src_ip 
| where unique_destinations > 10
```

### Elastic EQL

#### Process Injection
```eql
process where parent.name == "explorer.exe" 
  and name == "rundll32.exe" 
  and stdin == "true"
```

#### Suspicious DLL Load
```eql
library where process.name == "svchost.exe" 
  and dll.name : "*.dll" 
  and not dll.path : "C:\\Windows\\System32\\*"
```

### Microsoft Sentinel KQL

```kql
SecurityEvent
| where TimeGenerated > ago(7d)
| where ActionType == "UserLogon"
| where AccountType == "User"
| where IpAddress !in (known_corporate_ips)
| summarize logon_count = count() by Account, IpAddress, bin(TimeGenerated, 1h)
| where logon_count > 5
```

## BloodHound Queries

### Find Kerberoastable Accounts
```cypher
MATCH (u:User)-[:HavePassword]->(:Password {kerberoastable:true})
RETURN u.name, u.displayname
```

### Find AS-REP Roastable Accounts
```cypher
MATCH (u:User)-[:HavePassword]->(:Password {asrep_roastable:true})
RETURN u.name, u.displayname
```

### Find Shortest Path to Domain Admin
```cypher
MATCH (u:User)-[:AdminTo|DCSync|MemberOf*1..]->(dc:Domain)
WHERE u.name <> "krbtgt"
RETURN u.name, length(apoc.paths.all(u,dc)) as hops
ORDER BY hops ASC
LIMIT 10
```

## Memory Forensics (Volatility3)

### Process Discovery
```bash
vol -f memory.raw windows.pslist.PsList
```

### Network Connections
```bash
vol -f memory.raw windows.netscan.NetScan
```

### Malicious Process Injection
```bash
vol -f memory.raw windows.malfind.Malfind
```

### Credential Dump Detection
```bash
vol -f memory.raw windows.lsadump.Lsadump
```

## Output Format

### Hunt Report Template

```
# Threat Hunting Report: <Hypothesis>

## Executive Summary
<Brief summary of hunt findings>

## Hypothesis
<Original hypothesis statement>

## Scope
- Time Window: <start> - <end>
- Data Sources: <list>
- Assets: <list>

## Methodology
1. <Step 1>
2. <Step 2>
3. ...

## Findings

### True Positives
| ID | System | Finding | Severity | TTP |
|----|--------|---------|----------|-----|
| 1  | ...    | ...     | High     | T1003 |

### False Positives
| ID | System | Finding | Root Cause |
|----|--------|---------|------------|
| 1  | ...    | ...     | ...        |

## Recommendations
- <Recommendation 1>
- <Recommendation 2>

## Metrics
- Time to Complete: <X hours>
- Events Analyzed: <X million>
- True Positives: <X>
- False Positives: <X>
```

## Automation Script Example

```python
#!/usr/bin/env python3
"""
Hypothesis-driven threat hunting automation
"""
import subprocess
import json
from datetime import datetime, timedelta

class ThreatHunter:
    def __init__(self, siem_connector):
        self.siem = siem_connector
        
    def run_hypothesis(self, hypothesis, query):
        """Execute a hunting hypothesis"""
        results = self.siem.query(query)
        
        findings = {
            'hypothesis': hypothesis,
            'timestamp': datetime.utcnow().isoformat(),
            'results': results,
            'disposition': self.triage(results)
        }
        
        return findings
    
    def triage(self, results):
        """Determine if results are TP, FP, or inconclusive"""
        if not results:
            return 'inconclusive'
            
        # Apply triage logic here
        return 'true_positive' if self.confidence(results) > 0.8 else 'inconclusive'
```

## References

- MITRE ATT&CK: https://attack.mitre.org/
- NIST Cybersecurity Framework: https://www.nist.gov/cyberframework
- Hunter's Killer Methodology: https://www.sans.org/white-papers/hunters-killer/
- Elastic Security: https://www.elastic.co/security
- BloodHound: https://github.com/BloodHoundAD/BloodHound