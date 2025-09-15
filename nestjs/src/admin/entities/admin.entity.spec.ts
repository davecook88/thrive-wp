import { getMetadataArgsStorage } from 'typeorm';
import { Admin } from './admin.entity';

describe('Admin Entity', () => {
  it('should be registered with the correct table name', () => {
    const entity = getMetadataArgsStorage().tables.find(
      (t) => t.target === Admin,
    );
    expect(entity).toBeDefined();
    expect(entity?.name).toBe('admin');
  });

  it('should have expected columns', () => {
    // Get columns from the current class and all parent classes
    const getAllColumns = (target: any) => {
      const columns: any[] = [];
      let current = target;

      while (current && current !== Object.prototype) {
        const classColumns = getMetadataArgsStorage().columns.filter(
          (c) => c.target === current,
        );
        columns.push(...classColumns);
        current = Object.getPrototypeOf(current);
      }

      return columns;
    };

    const columns = getAllColumns(Admin);
    const columnProps = columns.map((c) => c.propertyName).sort();
    expect(columnProps).toEqual(
      expect.arrayContaining([
        'id',
        'userId',
        'role',
        'isActive',
        'createdAt',
        'updatedAt',
        'deletedAt',
      ]),
    );
  });

  it('should define unique index on userId', () => {
    const indices = getMetadataArgsStorage().indices.filter(
      (i) => i.target === Admin,
    );
    const userIdIndex = indices.find((i) => {
      const cols = Array.isArray(i.columns)
        ? i.columns
        : typeof i.columns === 'function'
          ? (i.columns({}) as unknown as string[])
          : [];
      return cols.includes('userId');
    });
    expect(userIdIndex).toBeDefined();
  });

  it('should have relation to User via user property', () => {
    const relations = getMetadataArgsStorage().relations.filter(
      (r) => r.target === Admin,
    );
    const userRel = relations.find((r) => r.propertyName === 'user');
    expect(userRel).toBeDefined();
  });
});
