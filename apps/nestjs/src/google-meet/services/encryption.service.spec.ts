import { describe, it, expect, beforeEach, vi } from "vitest";
import { ConfigService } from "@nestjs/config";
import { EncryptionService } from "../services/encryption.service.js";

describe("EncryptionService", () => {
  let service: EncryptionService;
  let configService: ConfigService;

  // Test encryption key (64 hex characters = 32 bytes)
  const testKey =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  beforeEach(() => {
    configService = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === "GOOGLE_ENCRYPTION_KEY") {
          return testKey;
        }
        return undefined;
      }),
    } as unknown as ConfigService;

    service = new EncryptionService(configService);
  });

  describe("encrypt and decrypt", () => {
    it("should encrypt and decrypt a string correctly", () => {
      const plaintext = "my-secret-access-token";

      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should produce different ciphertext for same plaintext (due to random IV)", () => {
      const plaintext = "same-text";

      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it("should handle empty strings", () => {
      const plaintext = "";

      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should handle special characters and unicode", () => {
      const plaintext = "token=abc&key=123!@#$%^&*()_+{}|:<>?日本語🎉";

      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should handle long strings", () => {
      const plaintext = "x".repeat(10000);

      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe("isConfigured", () => {
    it("should return true when key is configured", () => {
      expect(service.isConfigured()).toBe(true);
    });

    it("should return false when key is not configured", () => {
      const noKeyConfig = {
        get: vi.fn().mockReturnValue(undefined),
      } as unknown as ConfigService;

      const unconfiguredService = new EncryptionService(noKeyConfig);

      expect(unconfiguredService.isConfigured()).toBe(false);
    });
  });

  describe("generateKey", () => {
    it("should generate a 64-character hex string", () => {
      const key = EncryptionService.generateKey();

      expect(key).toHaveLength(64);
      expect(/^[0-9a-f]+$/.test(key)).toBe(true);
    });

    it("should generate unique keys", () => {
      const key1 = EncryptionService.generateKey();
      const key2 = EncryptionService.generateKey();

      expect(key1).not.toBe(key2);
    });
  });

  describe("error handling", () => {
    it("should throw error when encrypting without key configured", () => {
      const noKeyConfig = {
        get: vi.fn().mockReturnValue(undefined),
      } as unknown as ConfigService;

      const unconfiguredService = new EncryptionService(noKeyConfig);

      expect(() => unconfiguredService.encrypt("test")).toThrow(
        "Encryption key not configured",
      );
    });

    it("should throw error when decrypting without key configured", () => {
      const noKeyConfig = {
        get: vi.fn().mockReturnValue(undefined),
      } as unknown as ConfigService;

      const unconfiguredService = new EncryptionService(noKeyConfig);

      expect(() => unconfiguredService.decrypt("test")).toThrow(
        "Encryption key not configured",
      );
    });

    it("should throw error when decrypting invalid data", () => {
      expect(() => service.decrypt("not-valid-base64!!!")).toThrow();
    });
  });

  describe("key formats", () => {
    it("should work with non-hex key (gets hashed)", () => {
      const nonHexConfig = {
        get: vi.fn().mockImplementation((key: string) => {
          if (key === "GOOGLE_ENCRYPTION_KEY") {
            return "my-simple-password"; // Not a hex string
          }
          return undefined;
        }),
      } as unknown as ConfigService;

      const serviceWithNonHexKey = new EncryptionService(nonHexConfig);

      const plaintext = "secret-token";
      const encrypted = serviceWithNonHexKey.encrypt(plaintext);
      const decrypted = serviceWithNonHexKey.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });
});
