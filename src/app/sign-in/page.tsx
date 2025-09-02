// page.tsx
"use client";

import { signInWithGoogle } from "@/firebase/login";

export default function LoginPage() {
  const handleLogin = async () => {
    const { user, error } = await signInWithGoogle();
    if (user) {
      alert(`Bienvenido ${user.displayName}`);
    } else {
      alert("Error en el login: " + (error?.message || "desconocido"));
    }
  };

  return (
    <div>
      <h1>Login con Firebase + Google</h1>
      <button onClick={handleLogin}>Iniciar sesión con Google</button>
    </div>
  );
}
