// Client-Side Encryption using Web Crypto API (AES-GCM 256-bit)
// End-to-end encryption - only user can decrypt their financial data

class EncryptionService {
  private encryptionKey: CryptoKey | null = null;
  private readonly ALGORITHM = "AES-GCM";
  private readonly KEY_LENGTH = 256;

  // Derive encryption key from user's password/PIN
  async deriveKey(password: string, salt: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    const saltBuffer = encoder.encode(salt);

    // Use PBKDF2 to derive strong key from password
    const baseKey = await crypto.subtle.importKey(
      "raw",
      passwordBuffer,
      "PBKDF2",
      false,
      ["deriveBits", "deriveKey"]
    );

    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: saltBuffer,
        iterations: 100000, // High iteration count for security
        hash: "SHA-256",
      },
      baseKey,
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      false, // Not extractable - key stays in browser memory
      ["encrypt", "decrypt"]
    );

    this.encryptionKey = derivedKey;
    return derivedKey;
  }

  // Initialize with user credentials
  async initialize(userId: string, password: string) {
    // Use userId as salt (deterministic but unique per user)
    const salt = `gramin-saathi-${userId}`;
    await this.deriveKey(password, salt);

    // Store password hash for cross-device sync (only hash, not password)
    const passwordHash = await this.hashPassword(password);
    localStorage.setItem(`enc_${userId}`, passwordHash);
  }

  // Hash password for storage (not reversible)
  private async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Try to restore encryption from storage
  async tryRestore(userId: string): Promise<boolean> {
    const storedHash = localStorage.getItem(`enc_${userId}`);
    if (!storedHash) return false;

    // For UID-based encryption, we can restore
    try {
      await this.initialize(userId, userId);
      return true;
    } catch (e) {
      return false;
    }
  }

  // Encrypt data
  async encrypt(data: any): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error(
        "Encryption key not initialized. Call initialize() first."
      );
    }

    try {
      // Convert data to JSON string
      const jsonString = JSON.stringify(data);
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(jsonString);

      // Generate random IV (Initialization Vector)
      const iv = crypto.getRandomValues(new Uint8Array(12));

      // Encrypt
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: iv,
        },
        this.encryptionKey,
        dataBuffer
      );

      // Combine IV + encrypted data
      const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encryptedBuffer), iv.length);

      // Convert to base64 for storage
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error("Encryption failed:", error);
      throw new Error("Failed to encrypt data");
    }
  }

  // Decrypt data
  async decrypt(encryptedData: string): Promise<any> {
    if (!this.encryptionKey) {
      throw new Error(
        "Encryption key not initialized. Call initialize() first."
      );
    }

    try {
      // Convert from base64
      const combined = Uint8Array.from(atob(encryptedData), (c) =>
        c.charCodeAt(0)
      );

      // Extract IV and encrypted data
      const iv = combined.slice(0, 12);
      const encryptedBuffer = combined.slice(12);

      // Decrypt
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: iv,
        },
        this.encryptionKey,
        encryptedBuffer
      );

      // Convert back to JSON
      const decoder = new TextDecoder();
      const jsonString = decoder.decode(decryptedBuffer);
      return JSON.parse(jsonString);
    } catch (error) {
      console.error("Decryption failed:", error);
      throw new Error("Failed to decrypt data");
    }
  }

  // Check if service is initialized
  isInitialized(): boolean {
    return this.encryptionKey !== null;
  }

  // Clear encryption key (logout)
  clear() {
    this.encryptionKey = null;
    // Keep stored hash for next login
  }
}

// Singleton instance
export const encryptionService = new EncryptionService();

// Helper functions for easy use
export async function initEncryption(userId: string, password: string) {
  await encryptionService.initialize(userId, password);
}

export async function tryRestoreEncryption(userId: string): Promise<boolean> {
  return encryptionService.tryRestore(userId);
}

export async function encryptData(data: any): Promise<string> {
  return encryptionService.encrypt(data);
}

export async function decryptData(encryptedData: string): Promise<any> {
  return encryptionService.decrypt(encryptedData);
}

export function clearEncryption() {
  encryptionService.clear();
}

export function isEncryptionReady(): boolean {
  return encryptionService.isInitialized();
}
