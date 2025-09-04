// app/sign-in/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/context/AuthContext";
import { signInWithGoogle } from "@/firebase/login";

export default function SignInPage() {
  const [error, setError] = useState<string | null>(null);
  const { firebaseAuthUser, loading } = useAuthContext();
  const router = useRouter();

  // Redirect to home if already logged in
  useEffect(() => {
    if (!loading && firebaseAuthUser) {
      router.push("/home");
    }
  }, [firebaseAuthUser, loading, router]);

  const handleLogin = async () => {
    setError(null); // Clear previous errors
    const result = await signInWithGoogle();
    if (result.error) {
      setError(
        "Sign-in error: " +
          (typeof result.error === "object" &&
          result.error !== null &&
          "message" in result.error
            ? (result.error as { message?: string }).message
            : "unknown")
      );
    }
    // The redirection will be handled automatically by the useEffect above
    // when the firebaseAuthUser state changes.
  };

  // Do not render anything while loading the session to avoid showing
  // the login button to a user who is already logged in.
  if (loading || firebaseAuthUser) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="p-8 bg-white rounded-lg shadow-md max-w-sm w-full text-center">
        <h1 className="text-2xl font-bold mb-4">Welcome to Insight-Dash</h1>
        <p className="mb-6 text-gray-600">Sign in to continue</p>
        <button
          onClick={handleLogin}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg w-full"
        >
          Sign in with Google
        </button>
        {error && <p className="mt-4 text-red-500 text-sm">{error}</p>}
      </div>
    </div>
  );
}
