# Course List Block - WordPress Gutenberg Block

## Overview

The Course List Block replaces the static `courses-grid.php` pattern with a dynamic, filterable, and highly customizable Gutenberg block that fetches real course data from the NestJS API.

---

## Purpose

- Display list of available courses with filtering and sorting
- Highly customizable layout via block settings
- Support multiple layouts and grid configurations
- Enable level-based filtering for students

---

## Block Registration

**File Location:** `/apps/wordpress/themes/custom-theme/blocks/course-list/`

**Block Name:** `custom-theme/course-list`

**File Structure:**

```
blocks/course-list/
├── block.json
├── index.php
├── CourseList.tsx (React component)
├── CourseCard.tsx (Reusable card component)
├── CourseFilters.tsx (Filter controls)
├── style.scss
└── editor.scss
```

---

## Block Configuration (block.json)

```json
{
  "$schema": "https://schemas.wp.org/trunk/block.json",
  "apiVersion": 3,
  "name": "custom-theme/course-list",
  "title": "Course List",
  "category": "thrive",
  "description": "Display a list of available courses with filtering and sorting options",
  "keywords": ["courses", "list", "grid", "filter"],
  "version": "1.0.0",
  "textdomain": "custom-theme",
  "supports": {
    "html": false,
    "align": ["wide", "full"],
    "spacing": {
      "margin": true,
      "padding": true
    }
  },
  "attributes": {
    "columns": {
      "type": "number",
      "default": 3
    },
    "showLevelBadges": {
      "type": "boolean",
      "default": true
    },
    "showPrice": {
      "type": "boolean",
      "default": true
    },
    "showEnrollmentCount": {
      "type": "boolean",
      "default": false
    },
    "showCohortInfo": {
      "type": "boolean",
      "default": true
    },
    "showDescription": {
      "type": "boolean",
      "default": true
    },
    "cardLayout": {
      "type": "string",
      "enum": ["image-top", "image-side"],
      "default": "image-top"
    },
    "sortBy": {
      "type": "string",
      "enum": ["startDate", "title", "price"],
      "default": "startDate"
    },
    "sortOrder": {
      "type": "string",
      "enum": ["asc", "desc"],
      "default": "asc"
    },
    "showFilters": {
      "type": "boolean",
      "default": true
    },
    "defaultLevelId": {
      "type": "number",
      "default": null
    },
    "pageSize": {
      "type": "number",
      "default": 12
    },
    "showPagination": {
      "type": "boolean",
      "default": true
    },
    "imagePlaceholder": {
      "type": "string",
      "default": ""
    }
  }
}
```

---

## Block Inspector Controls (Editor Sidebar)

**Panel: Display Settings**

- **Columns:** Number control (1-4)
- **Card Layout:** Radio buttons (Image Top / Image Side)
- **Show Description:** Toggle
- **Show Level Badges:** Toggle
- **Show Price:** Toggle
- **Show Enrollment Count:** Toggle
- **Show Cohort Info:** Toggle (next cohort start date)

**Panel: Filtering & Sorting**

- **Show Filter Controls:** Toggle (displays level dropdown on frontend)
- **Default Level Filter:** Select dropdown (populated from API)
- **Sort By:** Select (Start Date, Title, Price)
- **Sort Order:** Radio (Ascending, Descending)

**Panel: Pagination**

- **Items Per Page:** Number control (6, 9, 12, 18, 24)
- **Show Pagination:** Toggle

**Panel: Appearance**

- **Image Placeholder URL:** Text input (fallback if course has no hero image)

---

## Frontend Component (CourseList.tsx)

### Component Structure

```tsx
import React, { useEffect, useState } from "react";
import CourseCard from "./CourseCard";
import CourseFilters from "./CourseFilters";

interface CourseListProps {
  columns: number;
  showLevelBadges: boolean;
  showPrice: boolean;
  showEnrollmentCount: boolean;
  showCohortInfo: boolean;
  showDescription: boolean;
  cardLayout: "image-top" | "image-side";
  sortBy: "startDate" | "title" | "price";
  sortOrder: "asc" | "desc";
  showFilters: boolean;
  defaultLevelId: number | null;
  pageSize: number;
  showPagination: boolean;
  imagePlaceholder: string;
}

interface CourseProgramListItem {
  id: number;
  code: string;
  title: string;
  description: string | null;
  heroImageUrl: string | null;
  timezone: string;
  isActive: boolean;
  stepCount: number;
  priceInCents: number | null;
  stripePriceId: string | null;
  levels: { id: number; code: string; name: string }[];
  availableCohorts: number;
  nextCohortStartDate: string | null;
}

interface Level {
  id: number;
  code: string;
  name: string;
}

export default function CourseList(props: CourseListProps) {
  const [courses, setCourses] = useState<CourseProgramListItem[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [selectedLevelId, setSelectedLevelId] = useState<number | null>(
    props.defaultLevelId
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCourses, setTotalCourses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch levels for filter dropdown
  useEffect(() => {
    const fetchLevels = async () => {
      try {
        const response = await fetch("/api/levels");
        if (!response.ok) throw new Error("Failed to fetch levels");
        const data = await response.json();
        setLevels(data);
      } catch (err) {
        console.error("Error fetching levels:", err);
      }
    };
    if (props.showFilters) {
      fetchLevels();
    }
  }, [props.showFilters]);

  // Fetch courses
  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          pageSize: props.pageSize.toString(),
          sortBy: props.sortBy,
          sortOrder: props.sortOrder,
        });

        if (selectedLevelId) {
          params.append("levelId", selectedLevelId.toString());
        }

        const response = await fetch(
          `/api/course-programs/browse?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch courses");
        }

        const data = await response.json();
        setCourses(data.items);
        setTotalCourses(data.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [
    currentPage,
    selectedLevelId,
    props.pageSize,
    props.sortBy,
    props.sortOrder,
  ]);

  const handleLevelChange = (levelId: number | null) => {
    setSelectedLevelId(levelId);
    setCurrentPage(1); // Reset to first page
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of block
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const totalPages = Math.ceil(totalCourses / props.pageSize);

  if (loading && courses.length === 0) {
    return (
      <div className="course-list loading">
        <p>Loading courses...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="course-list error">
        <p>Error loading courses: {error}</p>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="course-list empty">
        <p>No courses available at this time.</p>
      </div>
    );
  }

  return (
    <div className="course-list">
      {props.showFilters && (
        <CourseFilters
          levels={levels}
          selectedLevelId={selectedLevelId}
          onLevelChange={handleLevelChange}
        />
      )}

      <div
        className={`course-grid course-grid--columns-${props.columns} course-grid--${props.cardLayout}`}
      >
        {courses.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            showLevelBadges={props.showLevelBadges}
            showPrice={props.showPrice}
            showEnrollmentCount={props.showEnrollmentCount}
            showCohortInfo={props.showCohortInfo}
            showDescription={props.showDescription}
            cardLayout={props.cardLayout}
            imagePlaceholder={props.imagePlaceholder}
          />
        ))}
      </div>

      {props.showPagination && totalPages > 1 && (
        <div className="course-list-pagination">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="pagination-button"
          >
            Previous
          </button>

          <span className="pagination-info">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="pagination-button"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## Course Card Component (CourseCard.tsx)

```tsx
import React from "react";

interface CourseCardProps {
  course: {
    id: number;
    code: string;
    title: string;
    description: string | null;
    heroImageUrl: string | null;
    stepCount: number;
    priceInCents: number | null;
    levels: { id: number; code: string; name: string }[];
    availableCohorts: number;
    nextCohortStartDate: string | null;
  };
  showLevelBadges: boolean;
  showPrice: boolean;
  showEnrollmentCount: boolean;
  showCohortInfo: boolean;
  showDescription: boolean;
  cardLayout: "image-top" | "image-side";
  imagePlaceholder: string;
}

export default function CourseCard({
  course,
  showLevelBadges,
  showPrice,
  showCohortInfo,
  showDescription,
  cardLayout,
  imagePlaceholder,
}: CourseCardProps) {
  const formatPrice = (cents: number | null) => {
    if (cents === null) return "Price TBA";
    const dollars = cents / 100;
    return `$${dollars.toFixed(0)}`;
  };

  const formatDate = (isoDate: string | null) => {
    if (!isoDate) return null;
    const date = new Date(isoDate);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  const imageUrl =
    course.heroImageUrl || imagePlaceholder || "/wp-content/themes/custom-theme/assets/images/course-placeholder.jpg";

  return (
    <a
      href={`/courses/${course.code}`}
      className={`course-card course-card--${cardLayout}`}
    >
      <div className="course-card__image">
        <img src={imageUrl} alt={course.title} loading="lazy" />
        {showLevelBadges && course.levels.length > 0 && (
          <div className="course-card__badges">
            {course.levels.map((level) => (
              <span key={level.id} className={`level-badge level-badge--${level.code.toLowerCase()}`}>
                {level.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="course-card__content">
        <h3 className="course-card__title">{course.title}</h3>

        {showDescription && course.description && (
          <p className="course-card__description">{course.description}</p>
        )}

        <div className="course-card__meta">
          <span className="course-card__steps">
            {course.stepCount} {course.stepCount === 1 ? "session" : "sessions"}
          </span>

          {showCohortInfo && course.nextCohortStartDate && (
            <span className="course-card__next-cohort">
              Starts {formatDate(course.nextCohortStartDate)}
            </span>
          )}

          {showCohortInfo && course.availableCohorts > 0 && (
            <span className="course-card__cohort-count">
              {course.availableCohorts}{" "}
              {course.availableCohorts === 1 ? "cohort" : "cohorts"} available
            </span>
          )}
        </div>

        {showPrice && (
          <div className="course-card__price">{formatPrice(course.priceInCents)}</div>
        )}

        <div className="course-card__cta">
          <span className="button">View Course</span>
        </div>
      </div>
    </a>
  );
}
```

---

## Course Filters Component (CourseFilters.tsx)

```tsx
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
          onLevelChange(e.target.value ? parseInt(e.target.value) : null)
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
```

---

## Styling (style.scss)

```scss
.course-list {
  margin: 2rem 0;

  &.loading,
  &.error,
  &.empty {
    text-align: center;
    padding: 3rem 1rem;
  }
}

.course-filters {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;

  &__label {
    font-weight: 600;
  }

  &__select {
    padding: 0.5rem 1rem;
    border: 1px solid var(--wp--preset--color--gray-300);
    border-radius: 0.375rem;
    font-size: 1rem;
    min-width: 200px;
  }
}

.course-grid {
  display: grid;
  gap: 2rem;

  &--columns-1 {
    grid-template-columns: 1fr;
  }

  &--columns-2 {
    grid-template-columns: repeat(2, 1fr);
  }

  &--columns-3 {
    grid-template-columns: repeat(3, 1fr);
  }

  &--columns-4 {
    grid-template-columns: repeat(4, 1fr);
  }

  @media (max-width: 1024px) {
    &--columns-3,
    &--columns-4 {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr !important;
  }
}

.course-card {
  display: block;
  border: 1px solid var(--wp--preset--color--gray-200);
  border-radius: 0.75rem;
  overflow: hidden;
  transition: all 0.2s ease;
  text-decoration: none;
  color: inherit;

  &:hover {
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    transform: translateY(-4px);
  }

  &--image-side {
    display: grid;
    grid-template-columns: 300px 1fr;

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  &__image {
    position: relative;
    overflow: hidden;
    aspect-ratio: 16 / 9;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__badges {
    position: absolute;
    top: 1rem;
    left: 1rem;
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  &__content {
    padding: 1.5rem;
  }

  &__title {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0 0 0.75rem;
  }

  &__description {
    color: var(--wp--preset--color--gray-600);
    margin: 0 0 1rem;
    line-height: 1.6;
  }

  &__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 1rem;
    font-size: 0.875rem;
    color: var(--wp--preset--color--gray-600);
  }

  &__price {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--wp--preset--color--primary);
    margin-bottom: 1rem;
  }

  &__cta {
    .button {
      display: inline-block;
      width: 100%;
      text-align: center;
    }
  }
}

.level-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: var(--wp--preset--color--gray-100);
  color: var(--wp--preset--color--gray-800);
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;

  &--beginner {
    background: var(--wp--preset--color--green-100);
    color: var(--wp--preset--color--green-800);
  }

  &--intermediate {
    background: var(--wp--preset--color--blue-100);
    color: var(--wp--preset--color--blue-800);
  }

  &--advanced {
    background: var(--wp--preset--color--purple-100);
    color: var(--wp--preset--color--purple-800);
  }
}

.course-list-pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1.5rem;
  margin-top: 3rem;

  .pagination-button {
    padding: 0.5rem 1.5rem;
    background: var(--wp--preset--color--primary);
    color: white;
    border: none;
    border-radius: 0.375rem;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;

    &:hover:not(:disabled) {
      background: var(--wp--preset--color--primary-dark);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .pagination-info {
    font-weight: 600;
  }
}
```

---

## Block Registration (index.php)

```php
<?php
/**
 * Course List Block
 */

if (!defined('ABSPATH')) {
    exit;
}

function custom_theme_register_course_list_block()
{
    $dir = __DIR__;

    register_block_type($dir, [
        'render_callback' => 'custom_theme_render_course_list_block',
    ]);
}

add_action('init', 'custom_theme_register_course_list_block');

function custom_theme_render_course_list_block($attributes)
{
    // Server-side render: mount point for React component
    $block_id = 'course-list-' . wp_unique_id();

    // Pass attributes as data attributes for React hydration
    $data_attrs = [];
    foreach ($attributes as $key => $value) {
        $data_attrs[] = sprintf(
            'data-%s="%s"',
            esc_attr(strtolower(preg_replace('/([a-z])([A-Z])/', '$1-$2', $key))),
            esc_attr(is_bool($value) ? ($value ? 'true' : 'false') : $value)
        );
    }

    return sprintf(
        '<div id="%s" class="wp-block-custom-theme-course-list" %s></div>',
        esc_attr($block_id),
        implode(' ', $data_attrs)
    );
}
```

---

## Implementation Checklist

### Backend (Already covered in 02-api-endpoints.md)
- [ ] `GET /course-programs/browse` endpoint implemented
- [ ] `GET /levels` endpoint implemented (if not exists)

### Block Development
- [ ] Create block directory structure
- [ ] Write `block.json` with all attributes
- [ ] Implement `CourseList.tsx` main component
- [ ] Implement `CourseCard.tsx` component
- [ ] Implement `CourseFilters.tsx` component
- [ ] Write SCSS styles
- [ ] Register block in `index.php`
- [ ] Add block to "thrive" category

### Build System
- [ ] Add block to webpack/build config
- [ ] Ensure React dependencies are enqueued
- [ ] Build and test in editor
- [ ] Build and test on frontend

### Testing
- [ ] Block appears in inserter
- [ ] All inspector controls work correctly
- [ ] Filtering updates course list
- [ ] Pagination works
- [ ] Responsive on mobile/tablet
- [ ] Level badges display correctly
- [ ] Price formatting correct
- [ ] Links to `/courses/{code}` work

### Content Update
- [ ] Replace static `courses-grid.php` pattern usage
- [ ] Update homepage to use new block
- [ ] Create "Browse Courses" page with block

---

## Usage Example

**In Block Editor:**

1. Add new block
2. Search "Course List"
3. Insert block
4. Configure in sidebar:
   - Set columns to 3
   - Enable level badges
   - Show price
   - Enable filters
5. Save page

**Result:** Dynamic course grid that updates when courses are added/modified in admin.

---

## Future Enhancements (Out of Scope)

- Search input (keyword search)
- Multiple filter types (price range, duration, language)
- Grid/List view toggle
- Course comparison feature
- "Featured" courses option
- Custom ordering (drag-and-drop in editor)

---

## Next Steps

After implementing this block:
1. Test with real course data
2. Implement Course CPT and detail blocks (see [04-course-cpt-blocks.md](./04-course-cpt-blocks.md))
3. Ensure styling matches design system
