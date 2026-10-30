import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { auth } from "./config";

export const MIN_PASSWORD_LENGTH = 8;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(normalizeEmail(email));
}

/** Maps Firebase Auth error codes to user-safe messages. Never exposes raw SDK messages. */
export function getAuthErrorMessage(error: unknown, context: "login" | "register" | "reset" = "login"): string {
  const code = (error as { code?: string } | null)?.code ?? "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-login-credentials":
      return "Incorrect email or password.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/user-disabled":
      return "This account has been disabled. Contact support for help.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a few minutes and try again.";
    case "auth/network-request-failed":
      return "No internet connection. Check your network and try again.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try signing in instead.";
    case "auth/weak-password":
      return `Password is too weak. Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    case "auth/operation-not-allowed":
      return "Email sign-in is currently unavailable. Please try again later.";
    case "auth/requires-recent-login":
      return "Please sign in again to continue.";
    default:
      return context === "register"
        ? "We couldn't create your account. Please try again."
        : context === "reset"
        ? "We couldn't send the reset email. Please try again."
        : "We couldn't sign you in. Please try again.";
  }
}

/** Error codes meaning the stored session can never work again and the user must sign in. */
const SESSION_INVALID_CODES = new Set([
  "auth/user-token-expired",
  "auth/user-disabled",
  "auth/user-not-found",
  "auth/invalid-user-token",
]);

export async function signIn(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, normalizeEmail(email), password);
  return credential.user;
}

/** Creates the account and sends a verification email. The verification email is best-effort. */
export async function register(email: string, password: string): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, normalizeEmail(email), password);
  try {
    await sendEmailVerification(credential.user);
  } catch (error) {
    console.warn("Verification email failed (non-fatal):", (error as { code?: string })?.code);
  }
  return credential.user;
}

export async function resendVerificationEmail(): Promise<void> {
  if (!auth.currentUser) throw Object.assign(new Error("not-signed-in"), { code: "auth/requires-recent-login" });
  await sendEmailVerification(auth.currentUser);
}

/**
 * Sends a password reset email. Callers should show the same neutral message on success and on
 * "user not found" so the screen never reveals whether an account exists.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, normalizeEmail(email));
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === "auth/user-not-found") return;
    throw error;
  }
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

/**
 * Re-validates the persisted session with the server (disabled/deleted account, revoked or expired
 * refresh token, password changed on another device). Token refresh itself is automatic in the SDK.
 * Network failures are ignored so offline users stay signed in. Returns false if the session was ended.
 */
export async function revalidateSession(): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return true;
  try {
    await user.reload();
    await user.getIdToken(true);
    return true;
  } catch (error) {
    const code = (error as { code?: string })?.code ?? "";
    if (SESSION_INVALID_CODES.has(code)) {
      await signOut(auth).catch(() => undefined);
      return false;
    }
    return true;
  }
}
