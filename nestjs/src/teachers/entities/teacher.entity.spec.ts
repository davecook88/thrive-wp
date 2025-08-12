import { getMetadataArgsStorage } from 'typeorm';
import { Teacher } from './teacher.entity';

describe('Teacher Entity', () => {
  it('should be registered with the correct table name', () => {
    const entity = getMetadataArgsStorage().tables.find(
      (t) => t.target === Teacher,
    );
    expect(entity).toBeDefined();
    expect(entity?.name).toBe('teachers');
  });

  it('should have expected columns', () => {
    const columns = getMetadataArgsStorage().columns.filter(
      (c) => c.target === Teacher,
    );
    const columnProps = columns.map((c) => c.propertyName).sort();
    expect(columnProps).toEqual(
      expect.arrayContaining([
        'id',
        'userId',
        'tier',
        'bio',
        'isActive',
        'createdAt',
        'updatedAt',
        'deletedAt',
      ]),
    );
  });

  it('should define unique index on userId', () => {
    const indices = getMetadataArgsStorage().indices.filter(
      (i) => i.target === Teacher,
    );
    const userIdIndex = indices.find((i) => {
      const cols = Array.isArray(i.columns)
        ? (i.columns as string[])
        : typeof i.columns === 'function'
          ? (i.columns({}) as unknown as string[])
          : [];
      return cols.includes('userId');
    });
    expect(userIdIndex).toBeDefined();
  });

  it('should have relation to User via user property', () => {
    const relations = getMetadataArgsStorage().relations.filter(
      (r) => r.target === Teacher,
    );
    const userRel = relations.find((r) => r.propertyName === 'user');
    expect(userRel).toBeDefined();
  });
});
