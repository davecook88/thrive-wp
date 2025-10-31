# Course Custom Post Type & Dynamic Blocks

## Overview

This document details the WordPress custom post type (CPT) for courses and the four specialized Gutenberg blocks that pull live data from NestJS to create flexible, designer-friendly course detail pages.

---

## Architecture Decision

**Key Principle:** NestJS is the single source of truth for all course data.

**WordPress Role:** Presentation layer only. The CPT provides:
- URL structure (`/courses/{code}`)
- Designer-friendly page builder interface
- Dynamic blocks that fetch real-time data from NestJS
- SEO optimization and WordPress editor features

**No Data Duplication:** Course code links WP post to NestJS CourseProgram entity.

---

## Custom Post Type Registration

### Register `thrive_course` CPT

**File Location:** `/apps/wordpress/plugins/thrive-admin/includes/post-types/course.php`

```php
<?php
/**
 * Register Course Custom Post Type
 */

if (!defined('ABSPATH')) {
    exit;
}

function thrive_register_course_post_type()
{
    $labels = [
        'name' => 'Courses',
        'singular_name' => 'Course',
        'menu_name' => 'Courses',
        'add_new' => 'Add New Course',
        'add_new_item' => 'Add New Course',
        'edit_item' => 'Edit Course',
        'new_item' => 'New Course',
        'view_item' => 'View Course',
        'search_items' => 'Search Courses',
        'not_found' => 'No courses found',
        'not_found_in_trash' => 'No courses found in trash',
    ];

    $args = [
        'labels' => $labels,
        'public' => true,
        'publicly_queryable' => true,
        'show_ui' => true,
        'show_in_menu' => true,
        'show_in_rest' => true, // Enable Gutenberg
        'menu_icon' => 'dashicons-welcome-learn-more',
        'menu_position' => 5,
        'capability_type' => 'post',
        'hierarchical' => false,
        'supports' => ['title', 'editor', 'thumbnail'],
        'has_archive' => false, // We use /courses/{code} not /courses/
        'rewrite' => false, // Custom rewrite rules below
        'query_var' => 'course',
        'can_export' => true,
        'delete_with_user' => false,
    ];

    register_post_type('thrive_course', $args);
}

add_action('init', 'thrive_register_course_post_type');

/**
 * Add custom rewrite rule for /courses/{code}
 */
function thrive_course_rewrite_rules()
{
    add_rewrite_rule(
        '^courses/([^/]+)/?$',
        'index.php?post_type=thrive_course&course_code=$matches[1]',
        'top'
    );
}

add_action('init', 'thrive_course_rewrite_rules');

/**
 * Register course_code query var
 */
function thrive_course_query_vars($vars)
{
    $vars[] = 'course_code';
    return $vars;
}

add_filter('query_vars', 'thrive_course_query_vars');

/**
 * Custom template loading for course pages
 */
function thrive_course_template($template)
{
    if (get_query_var('course_code')) {
        $new_template = locate_template(['single-thrive_course.php']);
        if ($new_template) {
            return $new_template;
        }
    }
    return $template;
}

add_filter('template_include', 'thrive_course_template');
```

### Meta Box for Course Code

**File Location:** `/apps/wordpress/plugins/thrive-admin/includes/post-types/course-meta.php`

```php
<?php
/**
 * Course Meta Fields
 */

if (!defined('ABSPATH')) {
    exit;
}

function thrive_course_meta_boxes()
{
    add_meta_box(
        'thrive_course_code',
        'Course Code',
        'thrive_course_code_callback',
        'thrive_course',
        'side',
        'high'
    );
}

add_action('add_meta_boxes', 'thrive_course_meta_boxes');

function thrive_course_code_callback($post)
{
    wp_nonce_field('thrive_course_code_nonce', 'thrive_course_code_nonce');
    $course_code = get_post_meta($post->ID, '_thrive_course_code', true);
    ?>
    <p>
        <label for="thrive_course_code">Course Code (e.g., SFZ, ADV-TECH):</label><br>
        <input
            type="text"
            id="thrive_course_code"
            name="thrive_course_code"
            value="<?php echo esc_attr($course_code); ?>"
            class="widefat"
            required
            pattern="[A-Z0-9\-]+"
            style="text-transform: uppercase;"
        >
    </p>
    <p class="description">Must match a course code from the NestJS API.</p>
    <?php
}

function thrive_save_course_code($post_id)
{
    // Security checks
    if (!isset($_POST['thrive_course_code_nonce']) ||
        !wp_verify_nonce($_POST['thrive_course_code_nonce'], 'thrive_course_code_nonce')) {
        return;
    }

    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
        return;
    }

    if (!current_user_can('edit_post', $post_id)) {
        return;
    }

    // Save course code
    if (isset($_POST['thrive_course_code'])) {
        $course_code = strtoupper(sanitize_text_field($_POST['thrive_course_code']));
        update_post_meta($post_id, '_thrive_course_code', $course_code);
    }
}

add_action('save_post_thrive_course', 'thrive_save_course_code');
```

---

## Single Course Template

**File Location:** `/apps/wordpress/themes/custom-theme/single-thrive_course.php`

```php
<?php
/**
 * Template for single course pages
 */

get_header();

// Get course code from query var or meta
$course_code = get_query_var('course_code');
if (empty($course_code) && have_posts()) {
    the_post();
    $course_code = get_post_meta(get_the_ID(), '_thrive_course_code', true);
}

// Validate course exists in NestJS
if (!empty($course_code)) {
    $api_response = wp_remote_get("http://nestjs:3000/course-programs/{$course_code}");

    if (is_wp_error($api_response) || wp_remote_retrieve_response_code($api_response) !== 200) {
        // Course not found in API
        get_template_part('template-parts/content', 'none');
        get_footer();
        exit;
    }
}

?>

<main id="main" class="site-main course-detail">
    <?php
    while (have_posts()) :
        the_post();
        ?>
        <article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
            <div class="entry-content">
                <?php the_content(); ?>
            </div>
        </article>
        <?php
    endwhile;
    ?>
</main>

<?php
get_footer();
```

---

## Dynamic Course Blocks

### Block 1: Course Header Block

**Block Name:** `custom-theme/course-header`

**Purpose:** Display course title, description, level badges, and price from NestJS API.

**File Structure:**
```
blocks/course-header/
├── block.json
├── index.php
├── CourseHeader.tsx
└── style.scss
```

#### block.json

```json
{
  "$schema": "https://schemas.wp.org/trunk/block.json",
  "apiVersion": 3,
  "name": "custom-theme/course-header",
  "title": "Course Header",
  "category": "thrive",
  "description": "Display course title, description, levels, and price",
  "parent": ["custom-theme/course-layout"],
  "keywords": ["course", "header", "title"],
  "attributes": {
    "showDescription": {
      "type": "boolean",
      "default": true
    },
    "showLevelBadges": {
      "type": "boolean",
      "default": true
    },
    "showPrice": {
      "type": "boolean",
      "default": true
    },
    "showStepCount": {
      "type": "boolean",
      "default": true
    }
  }
}
```

#### CourseHeader.tsx

```tsx
import React, { useEffect, useState } from "react";

interface CourseHeaderProps {
  showDescription: boolean;
  showLevelBadges: boolean;
  showPrice: boolean;
  showStepCount: boolean;
  courseCode: string; // Passed from parent context
}

interface CourseDetail {
  id: number;
  code: string;
  title: string;
  description: string | null;
  priceInCents: number | null;
  levels: { id: number; code: string; name: string }[];
  steps: any[];
}

export default function CourseHeader({
  showDescription,
  showLevelBadges,
  showPrice,
  showStepCount,
  courseCode,
}: CourseHeaderProps) {
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const response = await fetch(`/api/course-programs/${courseCode}`);
        if (!response.ok) throw new Error("Course not found");
        const data = await response.json();
        setCourse(data);
      } catch (err) {
        console.error("Error fetching course:", err);
      } finally {
        setLoading(false);
      }
    };

    if (courseCode) {
      fetchCourse();
    }
  }, [courseCode]);

  if (loading) {
    return <div className="course-header loading">Loading course details...</div>;
  }

  if (!course) {
    return <div className="course-header error">Course not found.</div>;
  }

  const formatPrice = (cents: number | null) => {
    if (cents === null) return "Price TBA";
    return `$${(cents / 100).toFixed(0)}`;
  };

  return (
    <div className="course-header">
      {showLevelBadges && course.levels.length > 0 && (
        <div className="course-header__badges">
          {course.levels.map((level) => (
            <span key={level.id} className={`level-badge level-badge--${level.code.toLowerCase()}`}>
              {level.name}
            </span>
          ))}
        </div>
      )}

      <h1 className="course-header__title">{course.title}</h1>

      {showDescription && course.description && (
        <p className="course-header__description">{course.description}</p>
      )}

      <div className="course-header__meta">
        {showStepCount && (
          <span className="course-header__steps">
            {course.steps.length} {course.steps.length === 1 ? "session" : "sessions"}
          </span>
        )}

        {showPrice && (
          <span className="course-header__price">{formatPrice(course.priceInCents)}</span>
        )}
      </div>
    </div>
  );
}
```

---

### Block 2: Course Cohorts Block

**Block Name:** `custom-theme/course-cohorts`

**Purpose:** Display available cohorts with enrollment CTAs.

#### CourseCohorts.tsx

```tsx
import React, { useEffect, useState } from "react";

interface CourseCohortsProps {
  courseCode: string;
  showDescription: boolean;
  showEnrollmentCount: boolean;
  ctaText: string;
}

interface Cohort {
  id: number;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  maxEnrollment: number;
  currentEnrollment: number;
  availableSpots: number;
  isEnrollmentOpen: boolean;
  isFull: boolean;
}

export default function CourseCohorts({
  courseCode,
  showDescription,
  showEnrollmentCount,
  ctaText,
}: CourseCohortsProps) {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCohorts = async () => {
      try {
        const response = await fetch(`/api/course-programs/${courseCode}/cohorts`);
        if (!response.ok) throw new Error("Failed to fetch cohorts");
        const data = await response.json();
        setCohorts(data);
      } catch (err) {
        console.error("Error fetching cohorts:", err);
      } finally {
        setLoading(false);
      }
    };

    if (courseCode) {
      fetchCohorts();
    }
  }, [courseCode]);

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  const handleEnroll = async (cohortId: number) => {
    try {
      const response = await fetch(
        `/api/course-programs/${courseCode}/cohorts/${cohortId}/enroll`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        alert(error.message || "Enrollment failed");
        return;
      }

      const { url } = await response.json();
      window.location.href = url; // Redirect to Stripe checkout
    } catch (err) {
      console.error("Enrollment error:", err);
      alert("Failed to start enrollment process");
    }
  };

  if (loading) {
    return <div className="course-cohorts loading">Loading cohorts...</div>;
  }

  if (cohorts.length === 0) {
    return (
      <div className="course-cohorts empty">
        <p>No cohorts currently available. Check back soon!</p>
      </div>
    );
  }

  return (
    <div className="course-cohorts">
      <h2 className="course-cohorts__heading">Available Cohorts</h2>
      <div className="course-cohorts__grid">
        {cohorts.map((cohort) => (
          <div key={cohort.id} className="cohort-card">
            <h3 className="cohort-card__name">{cohort.name}</h3>

            {showDescription && cohort.description && (
              <p className="cohort-card__description">{cohort.description}</p>
            )}

            <div className="cohort-card__dates">
              <strong>Dates:</strong> {formatDate(cohort.startDate)} -{" "}
              {formatDate(cohort.endDate)}
            </div>

            {showEnrollmentCount && (
              <div className="cohort-card__enrollment">
                <strong>{cohort.availableSpots}</strong> spots available
                <span className="cohort-card__enrollment-total">
                  ({cohort.currentEnrollment}/{cohort.maxEnrollment} enrolled)
                </span>
              </div>
            )}

            <button
              onClick={() => handleEnroll(cohort.id)}
              disabled={!cohort.isEnrollmentOpen}
              className="cohort-card__cta button"
            >
              {cohort.isFull ? "Cohort Full" : ctaText}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### block.json Attributes

```json
{
  "attributes": {
    "showDescription": {
      "type": "boolean",
      "default": true
    },
    "showEnrollmentCount": {
      "type": "boolean",
      "default": true
    },
    "ctaText": {
      "type": "string",
      "default": "Enroll in This Cohort"
    }
  }
}
```

---

### Block 3: Course Sessions Calendar Block

**Block Name:** `custom-theme/course-sessions-calendar`

**Purpose:** Embed thrive-calendar showing course sessions.

#### CourseSessionsCalendar.tsx

```tsx
import React, { useEffect, useState, useRef } from "react";

interface CourseSessionsCalendarProps {
  courseCode: string;
  showFutureOnly: boolean;
  defaultView: "week" | "month";
  height: number;
}

export default function CourseSessionsCalendar({
  courseCode,
  showFutureOnly,
  defaultView,
  height,
}: CourseSessionsCalendarProps) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const calendarRef = useRef<any>(null);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const params = new URLSearchParams({
          futureOnly: showFutureOnly.toString(),
        });

        const response = await fetch(
          `/api/course-programs/${courseCode}/sessions?${params.toString()}`
        );

        if (!response.ok) throw new Error("Failed to fetch sessions");
        const data = await response.json();
        setSessions(data);
      } catch (err) {
        console.error("Error fetching sessions:", err);
      } finally {
        setLoading(false);
      }
    };

    if (courseCode) {
      fetchSessions();
    }
  }, [courseCode, showFutureOnly]);

  useEffect(() => {
    if (calendarRef.current && !loading) {
      calendarRef.current.events = sessions;
    }
  }, [sessions, loading]);

  if (loading) {
    return <div className="course-calendar loading">Loading calendar...</div>;
  }

  return (
    <div className="course-calendar">
      <h2 className="course-calendar__heading">Course Schedule</h2>
      <thrive-calendar
        ref={calendarRef}
        view={defaultView}
        view-height={height}
        show-classes
        show-bookings={false}
      />
    </div>
  );
}
```

#### block.json Attributes

```json
{
  "attributes": {
    "showFutureOnly": {
      "type": "boolean",
      "default": true
    },
    "defaultView": {
      "type": "string",
      "enum": ["week", "month"],
      "default": "week"
    },
    "height": {
      "type": "number",
      "default": 600
    }
  }
}
```

---

### Block 4: Course Details Block

**Block Name:** `custom-theme/course-details`

**Purpose:** Static rich content area for designer to add custom content (FAQs, testimonials, images, etc.).

This is a standard inner blocks container, no custom logic needed.

#### block.json

```json
{
  "$schema": "https://schemas.wp.org/trunk/block.json",
  "apiVersion": 3,
  "name": "custom-theme/course-details",
  "title": "Course Details",
  "category": "thrive",
  "description": "Static content area for additional course information",
  "supports": {
    "html": false,
    "align": ["wide", "full"]
  },
  "providesContext": {
    "custom-theme/courseCode": "courseCode"
  }
}
```

#### index.php

```php
<?php
/**
 * Course Details Block - Simple InnerBlocks container
 */

function custom_theme_render_course_details_block($attributes, $content)
{
    return sprintf(
        '<div class="wp-block-custom-theme-course-details">%s</div>',
        $content
    );
}

register_block_type(__DIR__, [
    'render_callback' => 'custom_theme_render_course_details_block',
]);
```

---

## Context Passing: Course Code

All course blocks need access to the course code. Use Block Context API:

### Parent Context Provider

Create a wrapper block or use post meta to provide context:

**In single-thrive_course.php:**

```php
<?php
$course_code = get_post_meta(get_the_ID(), '_thrive_course_code', true);
?>
<div data-course-code="<?php echo esc_attr($course_code); ?>">
    <?php the_content(); ?>
</div>
```

**In each block's React component:**

```tsx
// Get course code from nearest parent with data-course-code attribute
const getCourseCode = (): string => {
  const element = document.querySelector('[data-course-code]');
  return element?.getAttribute('data-course-code') || '';
};
```

---

## Block Patterns for Designer

Create block pattern for quick course page setup:

**File:** `/apps/wordpress/themes/custom-theme/patterns/course-detail-template.php`

```php
<?php
/**
 * Title: Course Detail Template
 * Slug: custom-theme/course-detail-template
 * Categories: featured
 * Block Types: custom-theme/course-header
 */
?>
<!-- wp:custom-theme/course-header /-->
<!-- wp:custom-theme/course-cohorts /-->
<!-- wp:custom-theme/course-sessions-calendar /-->
<!-- wp:custom-theme/course-details -->
    <!-- wp:heading -->
    <h2>What You'll Learn</h2>
    <!-- /wp:heading -->

    <!-- wp:paragraph -->
    <p>Add learning outcomes here...</p>
    <!-- /wp:paragraph -->
<!-- /wp:custom-theme/course-details -->
```

---

## Implementation Checklist

### CPT Setup
- [ ] Register `thrive_course` post type
- [ ] Add course code meta box
- [ ] Implement custom rewrite rules
- [ ] Create `single-thrive_course.php` template
- [ ] Test URL routing (`/courses/SFZ`)

### Block Development
- [ ] Create Course Header Block
- [ ] Create Course Cohorts Block
- [ ] Create Course Sessions Calendar Block
- [ ] Create Course Details Block
- [ ] Implement context passing for course code
- [ ] Style all blocks consistently

### Designer Experience
- [ ] Create block patterns for quick setup
- [ ] Test block controls in editor
- [ ] Document usage in WordPress admin
- [ ] Create sample course page

### Testing
- [ ] API data loads correctly in blocks
- [ ] Enrollment CTA redirects to Stripe
- [ ] Calendar displays course sessions
- [ ] Mobile responsive
- [ ] Block controls work in editor
- [ ] SEO metadata correct

---

## Usage Workflow

1. **Admin creates course in NestJS admin** (code: "SFZ")
2. **Admin creates WordPress post:**
   - Add new Course post
   - Enter course code "SFZ" in meta box
   - Add Course Header block
   - Add Course Cohorts block
   - Add Course Sessions Calendar block
   - Add custom content in Course Details block
3. **Publish post**
4. **Students visit `/courses/SFZ`**
5. **Blocks fetch live data from NestJS API**

---

## Next Steps

After implementing these blocks:
1. Implement enrollment flow (see [05-enrollment-flow.md](./05-enrollment-flow.md))
2. Test complete course detail page experience
3. Ensure enrollment CTAs work correctly
