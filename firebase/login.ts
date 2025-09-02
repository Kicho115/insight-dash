// login.ts
import { GoogleAuthProvider, signInWithPopup, getAuth } from "firebase/auth";
import {auth} from "./config"


export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({prompt: "select_account"})
    try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;

    console.log("Usuario:", user);
    console.log("Token:", token);

    return { user, token };
  } catch (error: any) {
    const credential = GoogleAuthProvider.credentialFromError(error);
    console.error("Error al iniciar sesión:", error);
    return { error, credential };
  }
}
