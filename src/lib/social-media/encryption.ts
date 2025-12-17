import crypto from "crypto";

const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || "";
const ALGORITHM = "aes-256-gcm";

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
  console.warn(
    "WARNING: TOKEN_ENCRYPTION_KEY is not set or invalid. Tokens will not be encrypted properly."
  );
}

/**
 * Encrypts a token using AES-256-GCM
 */
export function encryptToken(token: string): string {
  if (!ENCRYPTION_KEY) {
    return token; // Fallback: return unencrypted in dev
  }

  try {
    const iv = crypto.randomBytes(16);
    const key = Buffer.from(ENCRYPTION_KEY, "hex");
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(token, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    // Combine iv, authTag, and encrypted data
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt token");
  }
}

/**
 * Decrypts a token using AES-256-GCM
 */
export function decryptToken(encryptedToken: string): string {
  if (!ENCRYPTION_KEY) {
    return encryptedToken; // Fallback: return as-is in dev
  }

  try {
    const parts = encryptedToken.split(":");
    if (parts.length !== 3) {
      throw new Error("Invalid encrypted token format");
    }

    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const key = Buffer.from(ENCRYPTION_KEY, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Failed to decrypt token");
  }
}

/**
 * Generates a random encryption key (run once to generate your key)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString("hex");
}
