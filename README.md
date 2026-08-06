

# Law Review Footnote Verifier

A full-stack web application designed to verify legal citations and footnotes for academic law reviews. By leveraging AI-driven web search, authoritative legal databases, and robust document parsing, the tool validates citation accuracy, detects hallucinations, and assesses the authority level of legal references.

## ✨ Features
- **AI-Powered Citation Verification**: Automatically checks citations against real-world legal sources and databases.
- **Hallucination Detection**: Identifies fabricated or mismatched citation fields (authors, years, page numbers, jurisdiction codes).
- **Authority & Confidence Scoring**: Classifies sources as Official, Authoritative, or General, providing a confidence percentage (0-100).
- **Multi-Jurisdiction Support**: Covers UK, US, Canada, Australia, HK, SG, NZ, EU, India, and more.
- **Secure Auth & Role Management**: Built-in OAuth flow with user/admin roles and secure session cookie handling.
- **Modern React UI**: Responsive dashboard with Shadcn UI, Tailwind CSS v4, Radix UI primitives, and smooth animations.
- **Type-Safe APIs**: End-to-end type safety using tRPC and Zod.
- **Document Processing**: Supports PDF and DOCX extraction using `pdf-parse`, `mammoth`, and `jszip`.

## 🛠️ Tech Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Shadcn UI, Radix UI, Wouter, React Query, Framer Motion, Lucide React
- **Backend**: Node.js, Express, tRPC, JOSE (JWT), Axios
- **Database**: MySQL via Drizzle ORM
- **Testing**: Vitest
- **Dev Tools**: pnpm, tsx, esbuild, Prettier, TypeScript

## 📦 Installation

```bash
# 1. Clone the repository
git clone https://github.com/zjing7843-prog/law-review-verifier.git
cd law-review-verifier

# 2. Install dependencies
pnpm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env and fill in the required variables (see below)
```

## 🔑 Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="mysql://user:password@localhost:3306/law_review_db"

# OAuth & Authentication
VITE_OAUTH_PORTAL_URL="https://your-oauth-portal.example.com"
VITE_APP_ID="your-app-id"
JWT_SECRET="your-secure-jwt-secret"

# Analytics (Optional)
VITE_ANALYTICS_ENDPOINT="https://umami.example.com"
VITE_ANALYTICS_WEBSITE_ID="your-website-id"

# AWS S3 (Optional, for document storage)
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_S3_BUCKET="your-bucket-name"
AWS_REGION="us-east-1"
```

## 🚀 Usage

### Development
Start the development server (watches backend, serves frontend):
```bash
pnpm dev
```

### Database Setup
Generate and apply database migrations:
```bash
pnpm db:push
```

### Build & Production
Build the frontend and bundle the backend:
```bash
pnpm build
```
Start the production server:
```bash
pnpm start
```

### Testing
Run the test suite:
```bash
pnpm test
```

### Code Quality
```bash
pnpm check   # Run TypeScript type checking
pnpm format  # Run Prettier to format code
```

## 📁 Project Structure
```
law-review-verifier/
├── client/          # React frontend (Vite, Shadcn UI)
├── server/          # Express + tRPC backend
├── shared/          # Shared types, constants, & errors
├── drizzle/         # Database schema & migrations (MySQL)
├── patches/         # pnpm patched dependencies
└── package.json     # Project dependencies & scripts
```

## 📄 License
This project is licensed under the MIT License.
