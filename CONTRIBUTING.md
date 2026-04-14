# Contributing to Zyra

Thank you for your interest in contributing to Zyra!

## Development Setup

### Prerequisites

- Node.js 20+
- npm 9+
- Git

### Local Development

```bash
# Clone the repository
git clone https://github.com/sonoxo/zyra.git
cd zyra

# Install dependencies
npm install

# Set up environment
cp .env.local.example .env.local
# Edit .env.local with your values

# Run development servers
npm run dev
```

This starts:
- Frontend: http://localhost:3000
- API: http://localhost:3001

### Building

```bash
# Build all packages and apps
npm run build

# Build specific app
npm run build:web
npm run build:api
```

## Project Structure

```
zyra/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # Fastify backend
├── packages/
│   ├── agents/       # AI agents
│   ├── config/       # Shared config
│   ├── types/        # TypeScript types
│   ├── integrations/ # Nango integrations
│   ├── notifications/# Discord, Slack alerts
│   ├── security-scanner/
│   └── privacy-scanner/
├── docs/             # Documentation
└── scripts/          # Build scripts
```

## Coding Standards

- Use TypeScript for all new code
- Follow existing code style (ESLint + Prettier)
- Add types for all function parameters
- Write meaningful commit messages

## Submitting Changes

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make changes and test
4. Commit with clear messages
5. Push and open a PR

## Testing

```bash
# Run tests
npm test

# Run specific package tests
npm test --workspace=@zyra/agents
```

## Security

- Never commit secrets to Git
- Use environment variables for sensitive data
- Report vulnerabilities to security@zyra.host

## Getting Help

- Discord: https://discord.gg/zyra
- Email: support@zyra.host