import { getMetadataArgsStorage } from 'typeorm';
import {
  TeacherAvailability,
  TeacherAvailabilityKind,
} from './teacher-availability.entity';

describe('TeacherAvailability Entity', () => {
  it('should be registered with the correct table name', () => {
    const entity = getMetadataArgsStorage().tables.find(
      (t) => t.target === TeacherAvailability,
    );
    expect(entity).toBeDefined();
    expect(entity?.name).toBe('teacher_availability');
  });

  it('should expose enum values', () => {
    expect(Object.values(TeacherAvailabilityKind).sort()).toEqual([
      'BLACKOUT',
      'ONE_OFF',
      'RECURRING',
    ]);
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

    const columns = getAllColumns(TeacherAvailability);
    const columnProps = columns.map((c) => c.propertyName).sort();
    expect(columnProps).toEqual(
      expect.arrayContaining([
        'id',
        'teacherId',
        'kind',
        'weekday',
        'startTimeMinutes',
        'endTimeMinutes',
        'startAt',
        'endAt',
        'isActive',
        'createdAt',
        'updatedAt',
        'deletedAt',
      ]),
    );
  });

  it('should define indices including teacherId & kind', () => {
    const indices = getMetadataArgsStorage().indices.filter(
      (i) => i.target === TeacherAvailability,
    );
    const composite = indices.find(
      (i) =>
        Array.isArray(i.columns) &&
        (i.columns as string[]).includes('teacherId') &&
        (i.columns as string[]).includes('kind'),
    );
    expect(composite).toBeDefined();
  });
});
