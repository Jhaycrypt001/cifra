"use client";

// Biometric gate for revealing encrypted amounts. Uses WebAuthn to trigger the platform
// authenticator (Touch ID / Windows Hello / Android fingerprint) before a decrypt.
// It gates the UI behind a real device biometric prompt. If the device has no platform
// authenticator, it degrades gracefully (does not block).

const CRED_KEY = "cifra:biometric-cred-id";

function b64(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}
function unb64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

export async function biometricAvailable(): Promise<boolean> {
  try {
    if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/**
 * Prompts the device biometric. Returns true if verified (or if no biometric hardware exists,
 * so users without Touch ID / Windows Hello are never locked out). Returns false only when the
 * user actively cancels or fails the prompt.
 */
export async function biometricUnlock(): Promise<boolean> {
  if (!(await biometricAvailable())) return true; // no hardware: don't block

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const stored = typeof localStorage !== "undefined" ? localStorage.getItem(CRED_KEY) : null;

  try {
    if (!stored) {
      // First time on this device: register a platform credential (pops biometric).
      const cred = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "Cifra" },
          user: {
            id: crypto.getRandomValues(new Uint8Array(16)),
            name: "cifra",
            displayName: "Cifra",
          },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 }, // ES256
            { type: "public-key", alg: -257 }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
          },
          timeout: 60000,
        },
      })) as PublicKeyCredential | null;
      if (!cred) return false;
      localStorage.setItem(CRED_KEY, b64(cred.rawId));
      return true;
    }

    // Returning user: assert the stored credential (pops biometric).
    await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ type: "public-key", id: unb64(stored) as BufferSource }],
        userVerification: "required",
        timeout: 60000,
      },
    });
    return true;
  } catch {
    // If the stored credential is stale (e.g. cleared on the authenticator), reset so the next
    // attempt re-registers rather than failing forever.
    if (stored) localStorage.removeItem(CRED_KEY);
    return false;
  }
}
