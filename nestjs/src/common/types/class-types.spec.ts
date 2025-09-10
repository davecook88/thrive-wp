import {
  ServiceType,
  ServiceKey,
  ServiceTypeSchema,
  ServiceKeySchema,
  serviceTypeToServiceKey,
} from './class-types.js';

describe('Service Types', () => {
  describe('ServiceType enum', () => {
    it('should have correct values', () => {
      expect(ServiceType.PRIVATE).toBe('PRIVATE');
    });
  });

  describe('ServiceKey enum', () => {
    it('should have correct values', () => {
      expect(ServiceKey.PRIVATE_CLASS).toBe('PRIVATE_CLASS');
    });
  });

  describe('ServiceTypeSchema', () => {
    it('should validate correct ServiceType values', () => {
      expect(ServiceTypeSchema.safeParse('PRIVATE').success).toBe(true);
      expect(ServiceTypeSchema.safeParse('GROUP').success).toBe(false);
      expect(ServiceTypeSchema.safeParse('INVALID').success).toBe(false);
    });
  });

  describe('ServiceKeySchema', () => {
    it('should validate correct ServiceKey values', () => {
      expect(ServiceKeySchema.safeParse('PRIVATE_CLASS').success).toBe(true);
      expect(ServiceKeySchema.safeParse('GROUP_CLASS').success).toBe(false);
      expect(ServiceKeySchema.safeParse('INVALID').success).toBe(false);
    });
  });

  describe('serviceTypeToServiceKey', () => {
    it('should convert PRIVATE to PRIVATE_CLASS', () => {
      expect(serviceTypeToServiceKey(ServiceType.PRIVATE)).toBe(
        ServiceKey.PRIVATE_CLASS,
      );
    });
  });
});
