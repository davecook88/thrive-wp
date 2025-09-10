import {
  ServiceType,
  ServiceKey,
  ServiceTypeSchema,
  ServiceKeySchema,
} from './class-types.js';

describe('Service Types', () => {
  describe('ServiceType enum', () => {
    it('should have correct values', () => {
      expect(ServiceType.PRIVATE).toBe('PRIVATE');
      expect(ServiceType.GROUP).toBe('GROUP');
      expect(ServiceType.COURSE).toBe('COURSE');
    });
  });

  describe('ServiceKey enum', () => {
    it('should have correct values', () => {
      expect(ServiceKey.PRIVATE_CLASS).toBe('PRIVATE_CLASS');
      expect(ServiceKey.GROUP_CLASS).toBe('GROUP_CLASS');
      expect(ServiceKey.COURSE_CLASS).toBe('COURSE_CLASS');
    });
  });

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
      expect(ServiceKeySchema.safeParse('PRIVATE_CLASS').success).toBe(true);
      expect(ServiceKeySchema.safeParse('GROUP_CLASS').success).toBe(true);
      expect(ServiceKeySchema.safeParse('COURSE_CLASS').success).toBe(true);
      expect(ServiceKeySchema.safeParse('INVALID').success).toBe(false);
    });
  });
});
