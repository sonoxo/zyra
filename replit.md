# Zyra — AI-Native Cybersecurity Platform

## Overview
Zyra is an AI-native cybersecurity SaaS platform designed to offer a unified, comprehensive security solution for enterprises. It integrates a wide array of cybersecurity functionalities, including vulnerability management, AI-powered penetration testing, cloud security, threat intelligence, compliance automation, DevSecOps monitoring, incident response, risk management, and security awareness training. The platform aims to provide a centralized hub for managing and improving an organization's security posture, leveraging AI for advanced analysis and automation. Its key capabilities include a proprietary AI security analyst (ZyraCopilot), exposure management, security data lake, and security graph visualization, positioning it as a leading solution for proactive and reactive cybersecurity.

## User Preferences
I prefer clear, actionable advice and expect the agent to understand the nuances of cybersecurity development. When making changes, prioritize security best practices and maintain the high standards of code quality, especially regarding data integrity and system hardening. I expect detailed explanations for complex architectural decisions or significant code changes. Do not introduce any random data generation or seed data in production paths. Ensure all database interactions maintain data integrity and referential consistency.

## System Architecture
Zyra is built with a modern web stack. The frontend utilizes **React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui**, and **Recharts** for a responsive and intuitive user interface. The backend is developed using **Express.js** with **TypeScript**, providing a robust API layer. **PostgreSQL** is used as the primary database, managed through **Drizzle ORM**. Authentication is handled via **JWT** with access and refresh tokens, supporting **RBAC** for various user roles (owner, admin, analyst, viewer).

Key architectural patterns and features include:
-   **Modular Backend**: The backend is organized into 24 feature modules, alongside core services for authentication, storage, and AI intelligence.
-   **ZyraCopilot Engine**: An AI security analyst engine within `server/intelligence.ts` that processes security queries, performs vision analysis using Hugging Face (Gemma 3 27B), and provides insights on posture scoring, threat correlation, and risk assessment.
-   **Exposure Management**: Utilizes an attack path graph and remediation engine to prioritize and address security risks.
-   **CAASM Engine**: Correlates security data for comprehensive asset visibility and risk scoring.
-   **SOAR Automation**: An engine for executing security playbooks and automating incident response.
-   **Security Graph**: Visualizes security relationships and dependencies with nodes and edges.
-   **Data Integrity**: Strict adherence to data integrity principles, with zero seed/mock data in production and deterministic simulations for security scans and pentesting.
-   **Server Hardening**: Implementation of security middleware like `helmet`, robust error handling, and environment variable validation.
-   **Input Validation**: Extensive use of Zod schemas for all API routes to ensure data integrity and reject unknown fields.
-   **UI/UX**: Consistent design language leveraging shadcn/ui and Tailwind CSS, with a comprehensive 7-group sidebar navigation covering all platform features.

## External Dependencies
-   **PostgreSQL**: Primary database for all application data.
-   **Resend API**: Used for sending transactional emails, including team invites and password reset links.
-   **Stripe Checkout**: Integrated for managing subscriptions and payment processing in test mode.
-   **Hugging Face**: Utilized for AI vision capabilities within ZyraCopilot, specifically with Gemma 3 27B model for analyzing security-related images.
-   **GitHub Connector**: Integrated via Replit connectors for repository access and DevSecOps functionalities.