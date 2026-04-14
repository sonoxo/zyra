# Zyra API Documentation

This document covers all Zyra API endpoints with request/response examples.

## Base URL

```
Production: https://zyra.host
Local: http://localhost:3001
```

## Authentication

### Register

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

**Response:**

```json
{
  "success": true,
  "user": {
    "id": "usr_123",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "token": "jwt_token_here"
}
```

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

---

## AI Copilot

### Analyze Threat

```http
POST /api/copilot/analyze-threat
Authorization: Bearer <token>
Content-Type: application/json

{
  "threat": {
    "id": "th_001",
    "title": "SQL Injection in /api/users",
    "severity": "CRITICAL",
    "category": "Injection",
    "description": "User input not sanitized in SQL query",
    "affectedSystems": ["/api/users", "/api/posts"],
    "indicators": ["' OR '1'='1"]
  }
}
```

**Response:**

```json
{
  "success": true,
  "analysis": "This CRITICAL SQL injection vulnerability allows attackers to manipulate database queries..."
}
```

### Prioritize Threats

```http
POST /api/copilot/prioritize
Authorization: Bearer <token>
Content-Type: application/json

{
  "threats": [
    { "id": "1", "title": "Outdated TLS", "severity": "HIGH", "category": "Configuration" },
    { "id": "2", "title": "XSS in comments", "severity": "MEDIUM", "category": "XSS" },
    { "id": "3", "title": "Open port 22", "severity": "LOW", "category": "Network" }
  ],
  "context": "Healthcare application handling PHI data"
}
```

**Response:**

```json
{
  "success": true,
  "threats": [
    { "id": "1", "title": "Outdated TLS", "severity": "HIGH", "category": "Configuration" },
    { "id": "2", "title": "XSS in comments", "severity": "MEDIUM", "category": "XSS" },
    { "id": "3", "title": "Open port 22", "severity": "LOW", "category": "Network" }
  ]
}
```

### Generate Report

```http
POST /api/copilot/generate-report
Authorization: Bearer <token>
Content-Type: application/json

{
  "threats": [
    { "title": "SQL Injection", "severity": "CRITICAL", "category": "Injection" },
    { "title": "Weak Password Policy", "severity": "HIGH", "category": "Authentication" }
  ],
  "title": "Q1 2026 Security Review"
}
```

**Response:**

```json
{
  "success": true,
  "report": "Executive Summary\n\nThis report details..."
}
```

---

## GitHub Integration

### Get Security Alerts

```http
GET /api/github/security-alerts?owner=myorg&repo=myrepo
x-github-token: ghp_your_pat_token
```

**Response:**

```json
{
  "success": true,
  "alerts": [
    {
      "id": "GHA-001",
      "cve": "CVE-2026-1234",
      "title": "Prototype pollution in lodash",
      "severity": "HIGH",
      "package": "lodash",
      "ecosystem": "npm",
      "patchedIn": "4.17.21"
    }
  ]
}
```

---

## Blockchain Monitoring

### Monitor Address

```http
GET /api/blockchain/monitor?chain=ethereum&address=0x123...&alertThreshold=10000
```

**Response:**

```json
{
  "success": true,
  "address": "0x123...",
  "chain": "ethereum",
  "balance": 125.5,
  "analysis": {
    "issues": [],
    "largeTransferCount": 0,
    "suspiciousPatterns": 0
  },
  "metrics": {
    "totalTransactions": 150,
    "transactionsLastMinute": 2,
    "riskScore": 15
  },
  "alerts": []
}
```

### Risk Score Interpretation

| Score | Risk Level | Action |
|-------|------------|--------|
| 0-30 | ✅ Low | No action needed |
| 31-70 | ⚠️ Medium | Monitor |
| 71-100 | 🚨 High | Immediate investigation |

---

## Scanning

### Run Vulnerability Scan

```http
POST /api/scan/vulnerability
Authorization: Bearer <token>
Content-Type: application/json

{
  "target": "https://example.com",
  "scanType": "full"
}
```

**Response:**

```json
{
  "success": true,
  "scanId": "scan_abc123",
  "status": "running",
  "estimatedTime": "5 minutes"
}
```

---

## Webhooks

### Receiving GitHub Events

```http
POST /api/github/webhook
Content-Type: application/json
X-Hub-Signature-256: sha256=abc123...
X-GitHub-Event-Key: dependabot_alert

{
  "action": "created",
  "alert": { ... }
}
```

---

## Rate Limits

| Endpoint | Limit |
|-----------|-------|
| `/api/auth/*` | 5 requests/minute |
| `/api/copilot/*` | 30 requests/minute |
| `/api/github/*` | 60 requests/minute |
| `/api/blockchain/*` | 30 requests/minute |

---

## Error Responses

```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

```json
{
  "error": "Rate Limited",
  "message": "Too many requests",
  "retryAfter": 60
}
```

```json
{
  "error": "Validation Error",
  "message": "Missing required field: email"
}
```