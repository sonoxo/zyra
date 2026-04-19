---
name: cloud-hardening-aws-azure-gcp
description: >
  Execute comprehensive cloud security hardening across AWS, Azure, and
  GCP environments. Assess identity, compute, network, and storage
  configurations against security benchmarks. Implement CIS-aligned
  controls and verify compliance.
domain: cybersecurity
subdomain: cloud-security
tags: [cloud-security, aws, azure, gcp, hardening, cspm, compliance, cis]
atlas_techniques: [AML.T0047, AML.T0050]
d3fend_techniques: [D3-AB, D3-NTA, D3-PLMD, D3-IAM]
nist_ai_rmf: [MEASURE-2.6, GOVERN-3.1, GOVERN-3.3]
nist_csf: [PR.AC-01, PR.AC-02, PR.AC-03, PR.DS-01, PR.DS-02, PR.IP-01]
version: "1.0"
author: zyra
license: Apache-2.0
---

## When to Use

Trigger conditions — activate this skill when:

- New cloud environment deployed
- Scheduled quarterly security assessment
- Compliance audit preparation (SOC2, ISO27001, PCI-DSS)
- Incident response reveals cloud misconfiguration
- New subscription/project added

## Prerequisites

Required tools, access levels, and environment setup:

### Tools
- Cloud provider CLI (aws, az, gcloud)
- CSPM tool (Prowler, ScoutSuite, CloudSploit)
- Inventory scanner (CloudMapper, az探险)
- Credential analysis (enumerate-iam, Azure AD)

### Access Levels
- Read-only security auditor role per provider
- API access for automated scanning
- Ability to create read-only service principals

### Environment
- Credentials configured for all three providers
- Baseline "good" configuration documented

## Workflow

### Step 1: Identity & Access Management

```
1.1 AWS IAM Review
    - List users: aws iam list-users
    - Identify unused credentials (>90 days)
    - Enumerate roles and policies
    - Check for overly permissive policies
    - Review MFA enforcement

1.2 Azure AD Review
    - List service principals
    - Check conditional access policies
    - Audit privileged identity (PIM)
    - Review application registrations

1.3 GCP IAM Review
    - List all principals on projects
    - Identify excessive permissions
    - Check service account usage
    - Review organization policies
```

### Step 2: Network Security

```
2.1 AWS Network
    - VPC flow logs enabled?
    - Security groups: overly permissive (0.0.0.0/0)
    - NACLs allow unwanted traffic
    - Public subnets with sensitive resources
    - API Gateway/ALB public exposure

2.2 Azure Network
    - NSG rules analyzed
    - Public IPs attached to VMs
    - ExpressRoute/VPN security
    - Private endpoints used for storage

2.3 GCP Network
    - Firewall rules: allow 0.0.0.0/0
    - VPC flow logs enabled
    - Cloud NAT usage
    - Load balancer backends public
```

### Step 3: Data Protection

```
3.1 Storage Services
    - S3 bucket policies: public access
    - Azure Blob: anonymous read enabled
    - GCP Storage: uniform bucket-level access
    - Encryption at rest enabled

3.2 Database Security
    - RDS/Aurora: public accessibility
    - Azure SQL: auditing enabled
    - Cloud SQL: backups enabled
    - Encryption keys rotated
```

### Step 4: Compute Security

```
4.1 AWS EC2/EKS
    - Instance profiles with excessive IAM
    - EBS volumes unencrypted
    - SSH/RDP key pairs used
    - EKS: public endpoint enabled

4.2 Azure VMs/ACS/AKS
    - Managed identity usage
    - Disk encryption enabled
    - Just-in-time access enabled
    - AKS: network policies enforced

4.3 GCP Compute
    - Service accounts with full access
    - Instance metadata exposing credentials
    - Shielded VMs not used
    - GKE: workload identity configured
```

### Step 5: Monitoring & Logging

```
5.1 Enable Comprehensive Logging
    - AWS: CloudTrail, VPC Flow Logs, GuardDuty
    - Azure: Activity Log, Log Analytics, Defender
    - GCP: Cloud Logging, Cloud Audit Logs, Security Command Center

5.2 Configure Alerts
    - Login anomalies
    - Privilege escalations
    - Data exfiltration
    - New resources in suspicious state
```

### Step 6: Compliance Verification

```
6.1 Run Benchmark Scans
    - AWS: Prowler checks (CIS, NIST, SOC2)
    - Azure: ASC checks
    - GCP: Security Command Center findings

6.2 Document Findings
    - Severity classification
    - Remediation steps
    - Residual risk acceptance
```

## Verification

How to confirm the skill was executed successfully:

- [ ] All three cloud providers scanned
- [ ] IAM findings documented with owners
- [ ] Network exposure findings remediated or accepted
- [ ] Encryption enabled on all data stores
- [ ] Logging fully enabled and functional
- [ ] CSPM scan shows >90% compliance
- [ ] Report delivered to stakeholders
- [ ] Remediation tickets created for critical findings

## Framework Mappings

| Framework | Mapping |
|-----------|---------|
| MITRE ATT&CK | T1078, T1082, T1083, T1106, T1110, T1525, T1526, T1588 |
| NIST CSF 2.0 | PR.AC-01, PR.AC-02, PR.AC-03, PR.DS-01, PR.DS-02, PR.IP-01, DE.AE-01 |
| MITRE ATLAS | AML.T0047, AML.T0050, AML.T0055 |
| MITRE D3FEND | D3-AB, D3-NTA, D3-PLMD, D3-IAM, D3-KAC, D3-SAPA |
| NIST AI RMF | GOVERN-3.1, GOVERN-3.3, MEASURE-2.6 |