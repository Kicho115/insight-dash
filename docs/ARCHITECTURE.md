# Architecture

## Overview
Insight Dash is a Next.js 15 app with Firebase for auth, storage, and Firestore,
plus Genkit for AI-powered file analysis. It supports file uploads, team-based
sharing, and chat-based insights over uploaded files.

## Core Components
- `src/app` - App Router pages, layouts, and API routes.
- `src/services` - Integrations (Firebase, Genkit, AI helpers).
- `src/data` - Data access layer for Firestore and Storage.
- `src/lib` - Shared helpers and server-only utilities.
- `src/components` - Client UI building blocks.
- `src/context` / `src/hooks` - Client state and realtime hooks.

## Data Flow
1. Client uploads a file (metadata + signed URL).
2. API writes metadata in Firestore and uploads to Storage.
3. Processing route parses the file, runs Genkit summarization, and updates
   metadata.
4. Client queries Firestore for file lists and metadata.

## Key Services
- Firebase Auth: user sessions and identity.
- Firestore: file metadata, teams, invitations, users.
- Firebase Storage: file binaries.
- Genkit: file header extraction and AI summaries.

## API Routes
API routes live under `src/app/api/**/route.ts` and handle:
- File upload preparation, processing, visibility updates
- AI chat responses
- Teams, invitations, user profiles, session management

## Permissions Model
Files store user permissions as a map:
`permissions: { [userId]: "admin" | "edit" | "view" }`.
Team sharing uses `teamIds` and checks membership on access.

## Deployment Notes
The app is deployed on Vercel. API routes run as serverless functions, so any
shared state should be stored in external services (e.g., Firestore).
