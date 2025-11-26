import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from "crypto";

/**
 * Service for encrypting and decrypting sensitive data like OAuth tokens.
 * Uses AES-256-GCM for authenticated encryption.
 */
@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = "aes-256-gcm";
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits for GCM
  private readonly authTagLength = 16; // 128 bits

  private encryptionKey: Buffer | null = null;

  constructor(private readonly configService: ConfigService) {
    this.initializeKey();
  }

  private initializeKey(): void {
    const keyString = this.configService.get<string>("GOOGLE_ENCRYPTION_KEY");

    if (!keyString) {
      this.logger.warn(
        "GOOGLE_ENCRYPTION_KEY not set - encryption will fail until configured",
      );
      return;
    }

    // Key should be a hex string of 64 characters (32 bytes)
    if (keyString.length === 64) {
      this.encryptionKey = Buffer.from(keyString, "hex");
    } else {
      // If not hex, hash the key to get consistent length
      this.encryptionKey = createHash("sha256").update(keyString).digest();
    }
  }

  /**
   * Encrypt a string value using AES-256-GCM
   * Returns base64 encoded string: iv:authTag:ciphertext
   */
  encrypt(plaintext: string): string {
    if (!this.encryptionKey) {
      throw new Error("Encryption key not configured");
    }

    const iv = randomBytes(this.ivLength);
    const cipher = createCipheriv(this.algorithm, this.encryptionKey, iv, {
      authTagLength: this.authTagLength,
    });

    const encrypted = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    // Combine iv:authTag:ciphertext and encode as base64
    const combined = Buffer.concat([iv, authTag, encrypted]);
    return combined.toString("base64");
  }

  /**
   * Decrypt a base64 encoded encrypted string
   */
  decrypt(encryptedData: string): string {
    if (!this.encryptionKey) {
      throw new Error("Encryption key not configured");
    }

    const combined = Buffer.from(encryptedData, "base64");

    // Extract iv, authTag, and ciphertext
    const iv = combined.subarray(0, this.ivLength);
    const authTag = combined.subarray(
      this.ivLength,
      this.ivLength + this.authTagLength,
    );
    const ciphertext = combined.subarray(this.ivLength + this.authTagLength);

    const decipher = createDecipheriv(this.algorithm, this.encryptionKey, iv, {
      authTagLength: this.authTagLength,
    });

    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  }

  /**
   * Check if encryption is properly configured
   */
  isConfigured(): boolean {
    return this.encryptionKey !== null;
  }

  /**
   * Generate a new encryption key (for setup purposes)
   */
  static generateKey(): string {
    return randomBytes(32).toString("hex");
  }
}
