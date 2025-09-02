// login.ts
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "./config";
import { saveNewUserToFirestore } from "./db/user";

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;

    await saveNewUserToFirestore(user);

    return { user, token };
  } catch (error: any) {
    const credential = GoogleAuthProvider.credentialFromError(error);
    console.error("Error signing in:", error);
    return { error, credential };
  }
}
