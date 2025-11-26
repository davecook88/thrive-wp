import { describe, it, expect, beforeEach, vi, Mock } from "vitest";
import { ConfigService } from "@nestjs/config";
import { Repository } from "typeorm";
import { GoogleAuthService } from "../services/google-auth.service.js";
import { EncryptionService } from "../services/encryption.service.js";
import {
  TeacherGoogleCredential,
  GoogleTokenStatus,
} from "../entities/teacher-google-credential.entity.js";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("GoogleAuthService", () => {
  let service: GoogleAuthService;
  let configService: ConfigService;
  let encryptionService: EncryptionService;
  let credentialRepo: Repository<TeacherGoogleCredential>;

  const mockConfig = {
    GOOGLE_CLIENT_ID: "test-client-id.apps.googleusercontent.com",
    GOOGLE_CLIENT_SECRET: "test-client-secret",
    GOOGLE_CALENDAR_REDIRECT_URI:
      "http://localhost:3000/api/google/oauth/callback",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    configService = {
      get: vi.fn().mockImplementation((key: string) => {
        return mockConfig[key as keyof typeof mockConfig];
      }),
    } as unknown as ConfigService;

    encryptionService = {
      encrypt: vi.fn().mockImplementation((val: string) => `encrypted:${val}`),
      decrypt: vi
        .fn()
        .mockImplementation((val: string) => val.replace("encrypted:", "")),
    } as unknown as EncryptionService;

    credentialRepo = {
      findOne: vi.fn(),
      create: vi.fn(),
      save: vi.fn(),
      find: vi.fn(),
    } as unknown as Repository<TeacherGoogleCredential>;

    service = new GoogleAuthService(
      configService,
      encryptionService,
      credentialRepo,
    );
  });

  describe("generateAuthUrl", () => {
    it("should generate a valid Google OAuth URL", () => {
      const result = service.generateAuthUrl(123);

      expect(result.authUrl).toContain(
        "https://accounts.google.com/o/oauth2/v2/auth",
      );
      expect(result.authUrl).toContain(
        "client_id=test-client-id.apps.googleusercontent.com",
      );
      expect(result.authUrl).toContain("response_type=code");
      expect(result.authUrl).toContain("access_type=offline");
      expect(result.authUrl).toContain("prompt=consent");
      expect(result.state).toBeDefined();
    });

    it("should include teacher ID in state", () => {
      const result = service.generateAuthUrl(456);

      const stateDecoded = JSON.parse(
        Buffer.from(result.state, "base64").toString("utf8"),
      );

      expect(stateDecoded.teacherId).toBe(456);
      expect(stateDecoded.nonce).toBeDefined();
      expect(stateDecoded.timestamp).toBeDefined();
    });

    it("should throw when OAuth not configured", () => {
      const noClientConfig = {
        get: vi.fn().mockReturnValue(undefined),
      } as unknown as ConfigService;

      const unconfiguredService = new GoogleAuthService(
        noClientConfig,
        encryptionService,
        credentialRepo,
      );

      expect(() => unconfiguredService.generateAuthUrl(123)).toThrow(
        "Google OAuth not configured",
      );
    });
  });

  describe("parseState", () => {
    it("should parse valid state correctly", () => {
      const state = {
        teacherId: 123,
        nonce: "abc123",
        timestamp: Date.now(),
      };
      const stateString = Buffer.from(JSON.stringify(state)).toString("base64");

      const result = service.parseState(stateString);

      expect(result.teacherId).toBe(123);
      expect(result.nonce).toBe("abc123");
    });

    it("should throw for expired state", () => {
      const state = {
        teacherId: 123,
        nonce: "abc123",
        timestamp: Date.now() - 20 * 60 * 1000, // 20 minutes ago
      };
      const stateString = Buffer.from(JSON.stringify(state)).toString("base64");

      expect(() => service.parseState(stateString)).toThrow(
        "Invalid OAuth state",
      );
    });

    it("should throw for invalid state structure", () => {
      const state = { foo: "bar" };
      const stateString = Buffer.from(JSON.stringify(state)).toString("base64");

      expect(() => service.parseState(stateString)).toThrow(
        "Invalid OAuth state",
      );
    });
  });

  describe("exchangeCode", () => {
    it("should exchange code and store credentials", async () => {
      const state = {
        teacherId: 123,
        nonce: "test",
        timestamp: Date.now(),
      };
      const stateString = Buffer.from(JSON.stringify(state)).toString("base64");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "access-token",
          refresh_token: "refresh-token",
          expires_in: 3600,
          scope: "https://www.googleapis.com/auth/calendar.events",
          token_type: "Bearer",
        }),
      });

      (credentialRepo.findOne as Mock).mockResolvedValue(null);
      (credentialRepo.create as Mock).mockImplementation((data) => data);
      (credentialRepo.save as Mock).mockImplementation((data) =>
        Promise.resolve({ id: 1, ...data }),
      );

      const result = await service.exchangeCode("auth-code", stateString);

      expect(result.teacherId).toBe(123);
      expect(result.accessTokenEnc).toBe("encrypted:access-token");
      expect(result.refreshTokenEnc).toBe("encrypted:refresh-token");
      expect(result.tokenStatus).toBe(GoogleTokenStatus.VALID);
    });

    it("should throw on token exchange failure", async () => {
      const state = {
        teacherId: 123,
        nonce: "test",
        timestamp: Date.now(),
      };
      const stateString = Buffer.from(JSON.stringify(state)).toString("base64");

      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => "Invalid code",
      });

      await expect(
        service.exchangeCode("bad-code", stateString),
      ).rejects.toThrow("Failed to exchange authorization code");
    });
  });

  describe("getValidCredentials", () => {
    it("should return null when no credentials exist", async () => {
      (credentialRepo.findOne as Mock).mockResolvedValue(null);

      const result = await service.getValidCredentials(123);

      expect(result).toBeNull();
    });

    it("should return null when credentials are revoked", async () => {
      (credentialRepo.findOne as Mock).mockResolvedValue({
        teacherId: 123,
        tokenStatus: GoogleTokenStatus.REVOKED,
      });

      const result = await service.getValidCredentials(123);

      expect(result).toBeNull();
    });

    it("should return credentials when valid", async () => {
      const credential = {
        teacherId: 123,
        tokenStatus: GoogleTokenStatus.VALID,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      };
      (credentialRepo.findOne as Mock).mockResolvedValue(credential);

      const result = await service.getValidCredentials(123);

      expect(result).toBe(credential);
    });
  });

  describe("getConnectionStatus", () => {
    it("should return not connected when no credentials", async () => {
      (credentialRepo.findOne as Mock).mockResolvedValue(null);

      const result = await service.getConnectionStatus(123);

      expect(result.isConnected).toBe(false);
      expect(result.tokenStatus).toBeNull();
    });

    it("should return connected when credentials are valid", async () => {
      (credentialRepo.findOne as Mock).mockResolvedValue({
        teacherId: 123,
        tokenStatus: GoogleTokenStatus.VALID,
      });

      const result = await service.getConnectionStatus(123);

      expect(result.isConnected).toBe(true);
      expect(result.tokenStatus).toBe(GoogleTokenStatus.VALID);
    });
  });

  describe("revokeCredentials", () => {
    it("should mark credentials as revoked", async () => {
      const credential = {
        teacherId: 123,
        tokenStatus: GoogleTokenStatus.VALID,
      };
      (credentialRepo.findOne as Mock).mockResolvedValue(credential);
      (credentialRepo.save as Mock).mockImplementation((c) =>
        Promise.resolve(c),
      );

      await service.revokeCredentials(123);

      expect(credentialRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          tokenStatus: GoogleTokenStatus.REVOKED,
        }),
      );
    });
  });
});
