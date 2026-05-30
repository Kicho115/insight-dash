# InsightDash

InsightDash is a web platform that allows users to upload data files (CSV/XLSX) and interact with them through an AI-powered chat. The system automatically generates summaries, KPIs, and custom dashboards from the data, enabling anyone to extract insights without technical expertise in data analysis.

## Live Demo

[https://insight-dash-olive.vercel.app](https://insight-dash-olive.vercel.app)

Any user can create a free account at the sign-in page. No special credentials are required.

## Technologies

- **Next.js 15** — App Router, server and client components
- **React 19 + TypeScript**
- **Firebase** — Authentication, Firestore, Cloud Storage
- **Google Genkit + Gemini 2.5 Flash** — AI summarization, chat, and dashboard generation
- **Chart.js** — Data visualization (bar, line, pie, area charts)
- **Algolia** — Full-text file search
- **E2B Code Interpreter** — Server-side code execution for dashboard generation
- **Vercel** — Deployment

## Documentation

- Architecture: `docs/ARCHITECTURE.md`
- Code practices: `docs/CODE_PRACTICES.md`
- File format support: `docs/FILE_FORMAT_SUPPORT.md`

## Project Structure

```
src/
├── app/          # App Router pages, layouts, and API routes
├── components/   # Client UI components
├── context/      # React context providers (Auth, UI, Teams)
├── hooks/        # Custom hooks (realtime updates, auth, chat)
├── services/     # Firebase, Genkit, and AI integrations
├── data/         # Firestore and Storage data access layer
└── lib/          # Shared utilities and server-only helpers
```

## Getting Started

Install dependencies:

```bash
# Install pnpm if needed
# npm install -g pnpm

pnpm i
```

Copy the example env file and fill in your credentials:

```bash
cp .env.local.example .env.local
```

Run the development server:

```bash
pnpm dev
```

Or run with Genkit developer tools:

```bash
pnpm run genkit:ui
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

Create a `.env.local` file with the following variables (see `.env.local.example`):

```bash
# E2B (server-side only)
E2B_API_KEY=your_e2b_api_key_here

# Firebase Client Config (public)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Algolia
NEXT_PUBLIC_ALGOLIA_APPLICATION_ID=your_application_id
NEXT_PUBLIC_ALGOLIA_SEARCH_ONLY_API_KEY=your_search_only_api_key

# Firebase Admin Config (server-side only)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key_here\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your_client_id
FIREBASE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project.iam.gserviceaccount.com
```

## Commands

- `pnpm dev` — start the Next.js dev server
- `pnpm build` — build the production app
- `pnpm start` — run the production server
- `pnpm lint` — run ESLint
- `pnpm genkit` — start Genkit with Next dev server
- `pnpm test` — run Vitest in CI mode
- `pnpm test:watch` — run Vitest in watch mode
