# MITRE ATT&CK Coverage

## Technique Mapping

| Skill | ATT&CK Techniques | Tactics |
|-------|-------------------|---------|
| hypothesis-driven-threat-hunt | T1003, T1005, T1021, T1047, T1059, T1082, T1083, T1110, T1136, T1204, T1210, T1219 | TA0002, TA0003, TA0004, TA0005, TA0006, TA0007, TA0008, TA0011 |

## Coverage by Tactic

### Reconnaissance (TA0043)
- Not covered directly in this skill

### Resource Development (TA0042)
- Not covered directly in this skill

### Initial Access (TA0001)
- Phishing: T1566
- Exploit Public-Facing Application: T1190

### Execution (TA0002)
- Command and Scripting Interpreter: T1059
- PowerShell: T1086
- Windows Management Instrumentation: T1047

### Persistence (TA0003)
- Account Manipulation: T1098
- Create Account: T1136
- Scheduled Task/Job: T1053
- Service Execution: T1569

### Privilege Escalation (TA0004)
- Access Token Manipulation: T1134
- Exploitation for Privilege Escalation: T1068

### Defense Evasion (TA0005)
- Obfuscated Files or Information: T1027
- Process Injection: T1055

### Credential Access (TA0006)
- Credential Dumping: T1003
- Brute Force: T1110
- Credential Stuffing: T1078

### Discovery (TA0007)
- Account Discovery: T1087
- Network Service Discovery: T1046
- System Information Discovery: T1082

### Lateral Movement (TA0008)
- Remote Services: T1021
- Taint Shared Content: T1080
- Exploitation of Remote Services: T1210

### Collection (TA0009)
- Automated Collection: T1119
- Email Collection: T1074

### Command and Control (TA0011)
- Application Layer Protocol: T1071
- Encrypted Channel: T1573

### Exfiltration (TA0010)
- Exfiltration Over C2 Channel: T1041

### Impact (TA0040)
- Data Encrypted for Impact: T1486
- Service Stop: T1489