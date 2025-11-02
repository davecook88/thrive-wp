import React from "react";

interface Level {
  id: number;
  code: string;
  name: string;
}

interface CourseFiltersProps {
  levels: Level[];
  selectedLevelId: number | null;
  onLevelChange: (levelId: number | null) => void;
}

export default function CourseFilters({
  levels,
  selectedLevelId,
  onLevelChange,
}: CourseFiltersProps) {
  return (
    <div className="course-filters">
      <label htmlFor="level-filter" className="course-filters__label">
        Filter by Level:
      </label>
      <select
        id="level-filter"
        className="course-filters__select"
        value={selectedLevelId || ""}
        onChange={(e) =>
          onLevelChange(e.target.value ? parseInt(e.target.value, 10) : null)
        }
      >
        <option value="">All Levels</option>
        {levels.map((level) => (
          <option key={level.id} value={level.id}>
            {level.name}
          </option>
        ))}
      </select>
    </div>
  );
}
