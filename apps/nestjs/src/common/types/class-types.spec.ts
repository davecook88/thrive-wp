import {
  ServiceType,
  ServiceKey,
  ServiceTypeSchema,
  ServiceKeySchema,
  serviceTypeToServiceKey,
} from './class-types.js';

describe('Service Types', () => {
  describe('ServiceTypeSchema', () => {
    it('should validate correct ServiceType values', () => {
      expect(ServiceTypeSchema.safeParse('PRIVATE').success).toBe(true);
      expect(ServiceTypeSchema.safeParse('GROUP').success).toBe(true);
      expect(ServiceTypeSchema.safeParse('COURSE').success).toBe(true);
      expect(ServiceTypeSchema.safeParse('INVALID').success).toBe(false);
    });
  });

  describe('ServiceKeySchema', () => {
    it('should validate correct ServiceKey values', () => {
      expect(ServiceKeySchema.safeParse('PRIVATE').success).toBe(true);
      expect(ServiceKeySchema.safeParse('GROUP_CLASS').success).toBe(true);
      expect(ServiceKeySchema.safeParse('COURSE_CLASS').success).toBe(true);
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
