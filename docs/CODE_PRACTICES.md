# Code Practices

## General
- Use TypeScript everywhere; avoid `any` and unsafe assertions.
- Prefer small, composable functions with clear inputs/outputs.
- Keep server-only logic in `src/data`, `src/services`, `src/lib` and `src/app/api`.
- Keep client UI logic in `src/components`, `src/hooks`, and `src/context`.
- Document public functions, types, and modules with TSDoc.

## Reviews
- Every ticket requires a pull request.
- PRs need 2 approvals, or 1 approval for small changes.

## API Routes
- Validate input bodies with Zod schemas in `src/lib/api/schemas.ts`.
- Use `parseJson` from `src/lib/api/validation.ts` for request parsing.
- Use `handleApiError` for consistent error responses.
- Keep route handlers thin and delegate to data/services.

## Data Access
- All Firestore/Storage access goes through `src/data`.
- Enforce permissions in data-layer functions (not only in routes).
- Keep metadata updates atomic and update timestamps consistently.

## Permissions
- Store user permissions as a map on file records.
- Check creator, explicit permission, and team membership when accessing files.
- Avoid writing legacy permission arrays.

## Testing
- Use Vitest for unit tests (`pnpm test`).
- Place tests under `src/**` with `*.test.ts` naming.
- Test data-layer logic and helpers first.

## Styling
- Co-locate CSS Modules with their components.
- Avoid inline styles unless needed for dynamic values.

## Environment Variables
- Document new variables in `.env.local.example`.
- Use `NEXT_PUBLIC_` prefix for client-exposed values only.
