import { storage } from "./storage";

const FINDING_TEMPLATES: Record<string, Array<{
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: string;
  remediation: string;
  impact: string;
  frameworks: string[];
  filePath?: string;
  cveId?: string;
}>> = {
  semgrep: [
    {
      title: "SQL Injection via String Concatenation",
      description: "User-controlled input is concatenated into a SQL query without proper sanitization, allowing potential SQL injection attacks.",
      severity: "critical",
      category: "Injection",
      remediation: "Use parameterized queries or prepared statements instead of string concatenation.",
      impact: "An attacker could read, modify, or delete database contents, potentially gaining full control of the database server.",
      frameworks: ["SOC2", "PCI-DSS", "HIPAA"],
      filePath: "src/api/users.ts",
      cveId: "CWE-89",
    },
    {
      title: "Hardcoded API Key in Source Code",
      description: "A secret API key is hardcoded directly in the source code, exposing it to anyone with repository access.",
      severity: "high",
      category: "Secrets",
      remediation: "Move secrets to environment variables or a secrets manager like AWS Secrets Manager or HashiCorp Vault.",
      impact: "Exposed API keys can be used to gain unauthorized access to third-party services.",
      frameworks: ["SOC2", "ISO27001", "GDPR"],
      filePath: "src/config/api.ts",
    },
    {
      title: "Cross-Site Scripting (XSS) in Template Rendering",
      description: "User input is rendered directly in HTML templates without proper escaping, enabling XSS attacks.",
      severity: "high",
      category: "XSS",
      remediation: "Use context-aware output encoding. Apply HTML entity encoding for HTML contexts.",
      impact: "Attackers can execute arbitrary JavaScript in users' browsers, stealing session tokens or performing actions on behalf of victims.",
      frameworks: ["SOC2", "PCI-DSS"],
      filePath: "src/views/profile.tsx",
      cveId: "CWE-79",
    },
    {
      title: "Insecure Random Number Generator",
      description: "Math.random() is used for generating security-sensitive values like tokens or session IDs.",
      severity: "medium",
      category: "Cryptography",
      remediation: "Use cryptographically secure random number generators (crypto.randomBytes or crypto.getRandomValues).",
      impact: "Predictable tokens could allow attackers to bypass authentication or session management.",
      frameworks: ["SOC2", "ISO27001"],
      filePath: "src/auth/tokens.ts",
    },
    {
      title: "Missing Input Validation on API Endpoint",
      description: "API endpoint accepts and processes user input without schema validation, potentially leading to unexpected behavior.",
      severity: "medium",
      category: "Input Validation",
      remediation: "Implement request body validation using a schema validation library like Zod or Joi.",
      impact: "Invalid input could cause application errors, data corruption, or security vulnerabilities.",
      frameworks: ["PCI-DSS", "HIPAA"],
      filePath: "src/api/orders.ts",
    },
    {
      title: "Unused Variable in Security-Critical Path",
      description: "A variable assigned the result of an authentication check is never used, suggesting the check result is being ignored.",
      severity: "low",
      category: "Code Quality",
      remediation: "Ensure authentication check results are properly evaluated before proceeding.",
      impact: "Security checks may be bypassed if their results are not properly evaluated.",
      frameworks: ["SOC2"],
      filePath: "src/middleware/auth.ts",
    },
  ],
  trivy: [
    {
      title: "Critical Vulnerability in OpenSSL",
      description: "OpenSSL version contains a critical buffer overflow vulnerability that can be exploited remotely.",
      severity: "critical",
      category: "Dependency",
      remediation: "Upgrade OpenSSL to the latest patched version (3.0.13 or later).",
      impact: "Remote code execution possible without authentication. Complete system compromise potential.",
      frameworks: ["SOC2", "PCI-DSS", "FedRAMP", "HIPAA"],
      cveId: "CVE-2024-0727",
    },
    {
      title: "High Severity npm Package Vulnerability",
      description: "The 'lodash' package has a known prototype pollution vulnerability that can lead to denial of service or arbitrary code execution.",
      severity: "high",
      category: "Dependency",
      remediation: "Update lodash to version 4.17.21 or later.",
      impact: "Prototype pollution can lead to denial of service or remote code execution.",
      frameworks: ["SOC2", "PCI-DSS"],
      cveId: "CVE-2021-23337",
    },
    {
      title: "Container Base Image Has Known Vulnerabilities",
      description: "The Docker base image node:16-alpine contains 12 known vulnerabilities including 3 high severity.",
      severity: "high",
      category: "Container",
      remediation: "Update to the latest stable base image (node:20-alpine) and rebuild containers.",
      impact: "Vulnerable base images expose the container runtime to known exploits.",
      frameworks: ["SOC2", "FedRAMP", "ISO27001"],
    },
    {
      title: "Outdated Python Package with Security Patch",
      description: "The 'requests' package version 2.25.0 has a known vulnerability related to cookie handling.",
      severity: "medium",
      category: "Dependency",
      remediation: "Upgrade the requests package to version 2.31.0 or later.",
      impact: "Improper cookie handling could lead to session fixation attacks.",
      frameworks: ["HIPAA", "SOC2"],
      cveId: "CVE-2023-32681",
    },
    {
      title: "License Compliance Issue",
      description: "Package 'some-lib' uses AGPL-3.0 license which may conflict with proprietary licensing requirements.",
      severity: "info",
      category: "License",
      remediation: "Review license compatibility and consider alternative packages with compatible licenses.",
      impact: "Potential legal compliance issues with open source license obligations.",
      frameworks: ["ISO27001", "GDPR"],
    },
  ],
  bandit: [
    {
      title: "Use of eval() Function",
      description: "The eval() function is used to execute dynamically generated code, which is a severe security risk if user input is involved.",
      severity: "critical",
      category: "Code Execution",
      remediation: "Replace eval() with safer alternatives. Use ast.literal_eval() for parsing data structures.",
      impact: "Arbitrary code execution if user-controlled data reaches eval().",
      frameworks: ["SOC2", "PCI-DSS", "ISO27001"],
      filePath: "scripts/process_data.py",
      cveId: "CWE-95",
    },
    {
      title: "Insecure SSL/TLS Configuration",
      description: "SSL certificate verification is disabled (verify=False), making the connection vulnerable to man-in-the-middle attacks.",
      severity: "high",
      category: "Network Security",
      remediation: "Enable SSL certificate verification and use proper certificate chain validation.",
      impact: "Connections can be intercepted and modified by attackers in a man-in-the-middle position.",
      frameworks: ["PCI-DSS", "HIPAA", "SOC2"],
      filePath: "src/integrations/external_api.py",
    },
    {
      title: "Weak Password Hashing Algorithm",
      description: "MD5 is used for password hashing. MD5 is cryptographically broken and unsuitable for password storage.",
      severity: "high",
      category: "Cryptography",
      remediation: "Use bcrypt, scrypt, or Argon2 for password hashing.",
      impact: "Passwords can be easily cracked using rainbow tables or brute force attacks.",
      frameworks: ["SOC2", "HIPAA", "PCI-DSS", "GDPR"],
      filePath: "src/auth/password.py",
      cveId: "CWE-328",
    },
    {
      title: "Temporary File with Insecure Permissions",
      description: "Temporary files are created with default permissions, making them readable by other users on the system.",
      severity: "medium",
      category: "File Security",
      remediation: "Use tempfile.mkstemp() or tempfile.NamedTemporaryFile() with restrictive permissions.",
      impact: "Sensitive data in temporary files could be read by other users.",
      frameworks: ["ISO27001", "FedRAMP"],
      filePath: "src/utils/export.py",
    },
    {
      title: "Assert Statement Used for Security Check",
      description: "Assert statements are used for security-related checks. Asserts can be disabled with Python optimization flags.",
      severity: "low",
      category: "Code Quality",
      remediation: "Replace assert statements with proper if/raise patterns for security checks.",
      impact: "Security checks may be silently disabled in optimized Python environments.",
      frameworks: ["SOC2"],
      filePath: "src/api/validators.py",
    },
  ],
  zap: [
    {
      title: "Missing Content Security Policy Header",
      description: "The application does not set a Content-Security-Policy header, making it vulnerable to XSS and data injection attacks.",
      severity: "high",
      category: "HTTP Security",
      remediation: "Implement a strict Content-Security-Policy header that restricts script sources and other resource types.",
      impact: "Without CSP, the browser has no protection against inline script injection and other XSS vectors.",
      frameworks: ["SOC2", "PCI-DSS", "ISO27001"],
    },
    {
      title: "Cookie Without Secure Flag",
      description: "Session cookies are set without the Secure flag, allowing them to be transmitted over unencrypted HTTP connections.",
      severity: "high",
      category: "Session Management",
      remediation: "Set the Secure flag on all cookies containing sensitive data or session identifiers.",
      impact: "Session cookies can be intercepted on insecure networks, leading to session hijacking.",
      frameworks: ["SOC2", "PCI-DSS", "HIPAA"],
    },
    {
      title: "Missing X-Frame-Options Header",
      description: "The application does not set X-Frame-Options or frame-ancestors CSP directive, making it vulnerable to clickjacking.",
      severity: "medium",
      category: "HTTP Security",
      remediation: "Set X-Frame-Options to DENY or SAMEORIGIN, or use CSP frame-ancestors directive.",
      impact: "Attackers can embed the application in a malicious page to trick users into clicking unintended elements.",
      frameworks: ["SOC2", "ISO27001"],
    },
    {
      title: "Server Information Disclosure",
      description: "The server response headers reveal detailed version information about the web server and framework.",
      severity: "low",
      category: "Information Disclosure",
      remediation: "Remove or obfuscate server version headers (Server, X-Powered-By).",
      impact: "Attackers can use version information to find known vulnerabilities specific to the server version.",
      frameworks: ["ISO27001", "PCI-DSS"],
    },
    {
      title: "Missing HSTS Header",
      description: "HTTP Strict Transport Security header is not configured, allowing potential protocol downgrade attacks.",
      severity: "medium",
      category: "Transport Security",
      remediation: "Add Strict-Transport-Security header with a minimum max-age of 31536000 seconds.",
      impact: "Users may be redirected to HTTP versions of the site, enabling man-in-the-middle attacks.",
      frameworks: ["PCI-DSS", "FedRAMP", "SOC2"],
    },
    {
      title: "Application Error Disclosure",
      description: "Detailed error messages and stack traces are exposed to end users in error responses.",
      severity: "low",
      category: "Information Disclosure",
      remediation: "Configure custom error pages and ensure stack traces are only logged server-side.",
      impact: "Error details can reveal internal application structure, database schema, or file paths.",
      frameworks: ["ISO27001", "SOC2"],
    },
  ],
};

export async function runScanSimulation(scanId: string, orgId: string, scanType: string) {
  try {
    await storage.updateScan(scanId, {
      status: "running",
      startedAt: new Date(),
      progress: 0,
    });

    const templates = FINDING_TEMPLATES[scanType] || FINDING_TEMPLATES.semgrep;
    const numFindings = 3 + Math.floor(Math.random() * (templates.length - 2));
    const selectedTemplates = [...templates].sort(() => Math.random() - 0.5).slice(0, numFindings);

    const totalSteps = 5;
    for (let step = 1; step <= totalSteps; step++) {
      await delay(800 + Math.random() * 1200);
      await storage.updateScan(scanId, {
        progress: Math.round((step / totalSteps) * 100),
      });
    }

    let criticalCount = 0, highCount = 0, mediumCount = 0, lowCount = 0, infoCount = 0;

    for (const template of selectedTemplates) {
      await storage.createScanFinding({
        scanId,
        organizationId: orgId,
        title: template.title,
        description: template.description,
        severity: template.severity,
        scanTool: scanType,
        category: template.category,
        cveId: template.cveId || null,
        filePath: template.filePath || null,
        lineNumber: template.filePath ? Math.floor(Math.random() * 200) + 1 : null,
        remediation: template.remediation,
        impact: template.impact,
        complianceFrameworks: template.frameworks,
        isResolved: false,
      });

      switch (template.severity) {
        case "critical": criticalCount++; break;
        case "high": highCount++; break;
        case "medium": mediumCount++; break;
        case "low": lowCount++; break;
        case "info": infoCount++; break;
      }
    }

    const totalFindings = selectedTemplates.length;
    const securityScore = Math.max(0, 100 - (criticalCount * 20) - (highCount * 10) - (mediumCount * 5) - (lowCount * 2));
    const duration = Math.floor(Math.random() * 180) + 30;

    await storage.updateScan(scanId, {
      status: "completed",
      progress: 100,
      completedAt: new Date(),
      duration,
      totalFindings,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      infoCount,
      securityScore: Math.min(100, securityScore),
    });
  } catch (err) {
    console.error("Scan simulation error:", err);
    await storage.updateScan(scanId, {
      status: "failed",
      completedAt: new Date(),
    });
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
