# Deployment Guide

## Replit (Primary)

Zyra is deployed on Replit with automatic TLS, health checks, and PostgreSQL.

### Publishing
1. Click "Deploy" in the Replit workspace
2. Replit handles building, hosting, and TLS provisioning
3. The app is available at `your-app.replit.app` or a custom domain

### Custom Domain
1. Go to Replit deployment settings
2. Add your custom domain
3. Configure DNS: CNAME record pointing to your Replit deployment
4. TLS is provisioned automatically

## Self-Hosted

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Reverse proxy (Nginx, Caddy, or cloud LB)

### Build & Run

```bash
# Install dependencies
npm ci

# Build for production
npm run build

# Set environment variables
export DATABASE_URL="postgresql://user:pass@host:5432/zyra"
export SESSION_SECRET="your-secure-random-string"
export NODE_ENV="production"

# Start the server
npm start
```

### Docker

```dockerfile
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
ENV NODE_ENV=production
EXPOSE 5000
CMD ["npm", "start"]
```

### Docker Compose

```yaml
version: "3.8"
services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      DATABASE_URL: postgresql://zyra:zyra@db:5432/zyra
      SESSION_SECRET: ${SESSION_SECRET}
      NODE_ENV: production
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:15
    environment:
      POSTGRES_USER: zyra
      POSTGRES_PASSWORD: zyra
      POSTGRES_DB: zyra
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U zyra"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

### Reverse Proxy (Nginx)

```nginx
server {
    listen 443 ssl http2;
    server_name zyra.yourcompany.com;

    ssl_certificate     /etc/ssl/certs/zyra.crt;
    ssl_certificate_key /etc/ssl/private/zyra.key;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Health Checks

The application responds on:
- `GET /` — Returns the frontend (200)
- `GET /api/auth/me` — Returns 401 if not authenticated (confirms API is running)

For load balancer health checks, use a dedicated health endpoint or check for HTTP 200 on `/`.

## Database Migrations

```bash
# Push schema changes (development)
npm run db:push

# Force push (if needed)
npm run db:push --force
```

Schema changes are managed through Drizzle ORM. The schema in `shared/schema.ts` is the source of truth.
