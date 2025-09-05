// Next.js imports
import { cookies } from "next/headers";

// Firebase Admin imports
import { authAdmin } from "@/services/firebase/admin";

export interface ServerAuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

/**
 * Retrieves the authenticated user from server-side session cookie.
 *
 * This function verifies the session cookie using Firebase Admin SDK and extracts
 * user information from the decoded token. It's designed to be used in server
 * components, API routes, middleware, or any server-side context where user
 * authentication needs to be verified.
 *
 * The function handles session cookie verification and handles
 * authentication errors by returning null instead of throwing exceptions.
 *
 * @returns Promise that resolves to:
 *   - `ServerAuthUser` object if user is authenticated and session is valid
 *   - `null` if no session cookie exists or verification fails
 *
 * @throws Does not throw exceptions - errors are logged and null is returned
 *
 * @example
 * ```typescript
 * // In a server component
 * export default async function ProtectedPage() {
 *   const user = await getServerAuth();
 *
 *   if (!user) {
 *     redirect('/sign-in');
 *   }
 *
 *   return <div>Welcome, {user.displayName || user.email}!</div>;
 * }
 *
 * // In an API route
 * export async function GET() {
 *   const user = await getServerAuth();
 *
 *   if (!user) {
 *     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 *   }
 *
 *   return NextResponse.json({ user });
 * }
 * ```
 */
export async function getServerAuth(): Promise<ServerAuthUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session")?.value;

    if (!sessionCookie) {
      return null;
    }

    const decodedToken = await authAdmin.verifySessionCookie(
      sessionCookie,
      true
    );

    return {
      uid: decodedToken.uid,
      email: decodedToken.email || null,
      displayName: decodedToken.name || null,
    };
  } catch (error) {
    console.error("Error verifying session:", error);
    return null;
  }
}

/**
 * Enforces authentication requirement for server-side operations.
 *
 * This function is a wrapper around `getServerAuth` that throws an error
 * if the user is not authenticated. It's designed for use in protected
 * server components, API routes, or any server-side context where
 * authentication is mandatory.
 *
 * Unlike `getServerAuth`, this function will throw an exception if no
 * valid session is found, making it suitable for components that should
 * only render for authenticated users.
 *
 * @returns Promise that resolves to a `ServerAuthUser` object for authenticated users
 *
 * @throws Error with message "Authentication required" if:
 *   - No session cookie exists
 *   - Session cookie is invalid or expired
 *   - Session verification fails for any reason
 *
 * @example
 * ```typescript
 * // In a server component that requires authentication
 * export default async function DashboardPage() {
 *   try {
 *     const user = await requireServerAuth();
 *     return <Dashboard user={user} />;
 *   } catch (error) {
 *     redirect('/sign-in');
 *   }
 * }
 *
 * // In an API route that requires authentication
 * export async function POST(request: Request) {
 *   try {
 *     const user = await requireServerAuth();
 *     // Process authenticated request
 *     return NextResponse.json({ success: true });
 *   } catch (error) {
 *     return NextResponse.json(
 *       { error: 'Authentication required' },
 *       { status: 401 }
 *     );
 *   }
 * }
 * ```
 */
export async function requireServerAuth(): Promise<ServerAuthUser> {
  const user = await getServerAuth();

  if (!user) {
    throw new Error("Authentication required");
  }

  return user;
}
