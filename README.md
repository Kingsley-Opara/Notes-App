# Notes - Secure Note-Taking Application

A modern, full-stack note-taking application featuring enterprise-grade authentication, real-time synchronization, and a distraction-free interface for capturing and organizing your thoughts.

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Architecture](#project-architecture)
- [Design Decisions & Trade-offs](#design-decisions--trade-offs)
- [Setup Instructions](#setup-instructions)
- [Development](#development)
- [Environment Variables](#environment-variables)

---

## Overview

**Notes** is a distraction-free note-taking platform designed to provide users with a secure, minimal interface for capturing and managing their thoughts. The application emphasizes simplicity, security, and seamless synchronization across devices.

### Key Features

- 🔐 **Private by Default** - End-to-end secure authentication via Cloudflare Access
- ☁️ **Always Synced** - Real-time data synchronization across devices using AWS DynamoDB
- ✨ **Distraction-Free** - Minimalist UI focused on the writing experience
- 🚀 **Fast & Responsive** - Server-side rendering with Next.js for optimal performance
- 🔒 **Enterprise Security** - JWT-based token verification with Cloudflare Access integration

---

## Tech Stack

### Frontend
- **Next.js 16.2.7** - Modern React framework with App Router (Server & Client Components)
- **TypeScript** - Type-safe development experience
- **Tailwind CSS 4** - Utility-first CSS framework for rapid UI development
- **React 19.2.4** - Component library
- **Lucide React** - Icon library

### Backend
- **Next.js API Routes** - Serverless backend for user synchronization
- **AWS DynamoDB** - NoSQL database for scalable user data storage
- **AWS SDK v3** - Official AWS SDK with TypeScript support

### Authentication & Security
- **Cloudflare Access** - Zero-trust authentication layer
- **JOSE** - JWT verification and token validation
- **Next.js Middleware** - Request-level authentication enforcement

### DevOps & Deployment
- **Cloudflare Tunnel** - Secure tunneling for local development and production deployment
- **TypeScript** - Full end-to-end type safety

---

## Project Architecture

### Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # Serverless API routes
│   │   └── auth/          # User authentication endpoints
│   ├── auth/              # Authentication pages
│   ├── home/              # Main application views
│   ├── notes/             # Notes management features
│   ├── lib/               # Utility functions and helpers
│   ├── layout.tsx         # Root layout with metadata
│   └── page.tsx           # Landing page
├── middleware.ts          # Request-level auth middleware
└── (other files)
```

### Request Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Client (React Component)                                    │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTP Request
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  Next.js Middleware (src/middleware.ts)                      │
│  • Validates CF_Authorization cookie                         │
│  • Verifies JWT signature against Cloudflare JWKS           │
│  • Redirects to /auth if unauthenticated                    │
└────────────────────────────┬────────────────────────────────┘
                             │ (User email in headers)
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  Next.js API Route / Page Handler                            │
│  • Receives authenticated request                            │
│  • Access user identity from headers                         │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  AWS DynamoDB                                                │
│  • Stores/retrieves user profile                             │
│  • Manages note data                                         │
│  • Persists user preferences                                 │
└─────────────────────────────────────────────────────────────┘
```

### Authentication Flow

1. **User Access** - Unauthenticated user visits the application
2. **Middleware Check** - Next.js middleware intercepts the request and validates the `CF_Authorization` cookie
3. **Login Redirect** - If no token exists, user is redirected to `/auth`
4. **Cloudflare Access Login** - User authenticates via Cloudflare Access
5. **Token Issuance** - Cloudflare Access issues JWT token in `CF_Authorization` cookie
6. **User Sync** - First-time users are synced to DynamoDB via `/api/auth/sync`
7. **Session Maintenance** - Subsequent requests use the JWT token for authentication

---

## Design Decisions & Trade-offs

### 1. **Cloudflare Access for Authentication**
**Decision:** Use Cloudflare Access instead of self-hosted auth (Auth0, Clerk, etc.)

**Rationale:**
- Zero-trust security model fits distraction-free application philosophy
- Built on industry standards (OpenID Connect, JWT)
- Simplifies implementation by delegating auth responsibility
- Provides device trust and conditional access policies

**Trade-off:**
- Dependency on external provider (vendor lock-in)
- Requires Cloudflare account and configuration
- Loss of flexibility for custom authentication flows

### 2. **AWS DynamoDB for User Data**
**Decision:** NoSQL database over traditional SQL (PostgreSQL/MySQL)

**Rationale:**
- Horizontal scalability without schema migrations
- Pay-per-request pricing model suits variable traffic patterns
- Native JSON support for flexible document structure
- Low operational overhead (fully managed service)

**Trade-off:**
- Higher cost at scale (vs. provisioned SQL databases)
- Limited querying flexibility (single partition key)
- Cold starts in serverless environments

### 3. **Next.js Middleware for Request-Level Auth**
**Decision:** Implement middleware instead of component-level protection

**Rationale:**
- Centralized authentication logic
- Prevents data leakage from API routes
- Better performance (failing fast at edge)
- Standardized across all routes

**Trade-off:**
- Middleware adds request latency
- Configuration complexity for public routes

### 4. **Server Components + Client Components Hybrid**
**Decision:** Mix Next.js Server Components with Client Components selectively

**Rationale:**
- Server Components reduce JavaScript bundle size
- Client Components only where interactivity required
- Optimized data fetching with minimal round-trips

**Trade-off:**
- Increased cognitive load (server vs. client boundaries)
- More complex debugging experience

### 5. **JWT Verification via JOSE Library**
**Decision:** Verify tokens in-process instead of delegating to external service

**Rationale:**
- Zero additional latency from third-party API calls
- Complete control over token validation logic
- Offline-capable (using cached JWKS)

**Trade-off:**
- Responsibility for JWKS cache management
- Manual token refresh logic required

---

## Setup Instructions

### Prerequisites

- **Node.js** 18+ (recommended: 20+)
- **npm** or **yarn** package manager
- **AWS Account** with DynamoDB access
- **Cloudflare Account** with Access enabled
- **Cloudflare Tunnel** (optional, for local dev with custom domain)

### 1. Clone & Install Dependencies

```bash
git clone <repository-url>
cd notes
npm install
```

### 2. Environment Configuration

Create a `.env.local` file in the project root with the following variables:

```env
# ── Cloudflare Access ──────────────────────────
CF_TEAM_DOMAIN=https://your-team.cloudflareaccess.com
CF_POLICY_AUD=your-policy-audience-uuid

# ── AWS Configuration ──────────────────────────
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
DYNAMODB_TABLE_NAME=notes-users

# ── Application ────────────────────────────────
NEXT_PUBLIC_APP_URL=https://notes.yourdomain.com
```

**How to obtain these values:**

- **CF_TEAM_DOMAIN**: Found in Cloudflare Access settings → Teams Domain
- **CF_POLICY_AUD**: Create an application in Access → Applications → Get the "Audience" value
- **AWS Credentials**: Generate from IAM console (create a programmatic access user)
- **DynamoDB Table**: Create a table with `email` as the partition key

### 3. AWS DynamoDB Setup

Create a DynamoDB table:

```bash
# Using AWS CLI
aws dynamodb create-table \
  --table-name notes-users \
  --attribute-definitions AttributeName=email,AttributeType=S \
  --key-schema AttributeName=email,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

**Table Schema:**
- **Partition Key**: `email` (String)
- **Billing Mode**: Pay-per-request (recommended for variable traffic)

### 4. Verify Environment Setup

```bash
# Check that environment variables are loaded correctly
npm run dev
# Visit http://localhost:3000 and verify middleware redirects to /auth
```

---

## Development

### Running the Development Server

```bash
# Standard development
npm run dev
# Open http://localhost:3000

# With Cloudflare Tunnel (for testing on custom domain)
npm run dev:tunnel
# Visit https://notes.yourdomain.com
```

### Development Workflow

1. **Frontend Changes** - Edit components in `src/app/`, hot-reload automatically
2. **API Development** - Modify files in `src/app/api/`, changes take effect immediately
3. **Middleware Updates** - Changes to `src/middleware.ts` require server restart
4. **Testing** - Test authentication flow by visiting `/auth` and signing in

### Key Scripts

```json
{
  "dev": "next dev",
  "tunnel": "cloudflared tunnel run my-nextjs-app",
  "dev:tunnel": "concurrently \"npm run dev\" \"npm run tunnel\""
}
```

### Code Style & Conventions

- **TypeScript**: All files are typed (`tsconfig.json` configured)
- **Styling**: Tailwind CSS utility classes (no custom CSS)
- **Components**: Server Components by default, Client Components when needed
- **Naming**: camelCase for variables/functions, PascalCase for components

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CF_TEAM_DOMAIN` | Yes | Cloudflare Access team domain URL |
| `CF_POLICY_AUD` | Yes | Cloudflare Access policy audience ID |
| `AWS_REGION` | Yes | AWS region for DynamoDB (e.g., `us-east-1`) |
| `AWS_ACCESS_KEY_ID` | Yes | AWS programmatic access key |
| `AWS_SECRET_ACCESS_KEY` | Yes | AWS secret key |
| `DYNAMODB_TABLE_NAME` | Yes | DynamoDB table name for user data |
| `NEXT_PUBLIC_APP_URL` | No | Application URL (for redirects) |

---

## Performance Considerations

### Optimizations Implemented

- **Edge Caching**: Cloudflare caches static assets at the edge
- **Server-Side Rendering**: HTML rendered on-demand for fresh data
- **JWT Validation**: Performed at middleware level, preventing unnecessary compute
- **DynamoDB On-Demand**: Scales automatically with traffic, no provisioning needed

### Monitoring & Debugging

- **Logs**: Check Next.js server logs for middleware/API errors
- **Cloudflare Analytics**: Monitor in Cloudflare dashboard
- **DynamoDB Metrics**: View in AWS CloudWatch

---

## Security Considerations

✅ **Implemented**
- JWT token verification via JOSE
- Middleware-level request authentication
- HTTP-only cookies for token storage
- DynamoDB encryption at rest (AWS managed)
- HTTPS/TLS via Cloudflare

⚠️ **Recommendations**
- Rotate AWS credentials regularly
- Implement rate limiting on API routes
- Add CORS headers if exposing APIs to external clients
- Enable CloudWatch alarms for suspicious activity

---

## Troubleshooting

### Middleware Not Running
- Ensure `src/middleware.ts` exists at the root of `src/` (not in `src/app/`)
- Check that matcher is configured in the middleware export

### Authentication Fails
- Verify `CF_TEAM_DOMAIN` and `CF_POLICY_AUD` are correct
- Check that `CF_Authorization` cookie is present in browser DevTools
- Ensure Cloudflare Access policy allows your user

### DynamoDB Connection Error
- Verify AWS credentials have DynamoDB read/write permissions
- Check that table name in `.env.local` matches DynamoDB table
- Confirm AWS region is correct

---

## Future Enhancements

- [ ] Real-time collaboration on notes
- [ ] End-to-end encryption for note content
- [ ] Mobile application (React Native)
- [ ] Offline-first sync with Service Workers
- [ ] Full-text search across notes
- [ ] Export notes to Markdown/PDF

---

## License

This project is proprietary and confidential.

---

**Built with modern web standards and security best practices.** 🚀
