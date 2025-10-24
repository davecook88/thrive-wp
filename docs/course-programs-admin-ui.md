# Course Programs: Minimal Admin UI Implementation Plan

## Overview
This document details the minimal admin interface for managing course programs, including creating programs, defining steps, attaching group classes to steps, configuring bundled components, and publishing to Stripe.

**Scope:** Basic CRUD operations without drag-drop ordering or advanced reporting dashboards.

---

## Architecture

### Component Structure
```
wordpress/themes/custom-theme/
├── src/
│   ├── admin/
│   │   ├── pages/
│   │   │   ├── CoursePrograms.tsx          # ❌ TO CREATE - Main listing page
│   │   │   ├── CourseProgramForm.tsx       # ❌ TO CREATE - Create/Edit form
│   │   │   ├── CourseStepManager.tsx       # ❌ TO CREATE - Step management
│   │   │   └── PublishCourse.tsx           # ❌ TO CREATE - Stripe publishing
│   │   └── components/
│   │       ├── StepOrderInput.tsx          # ❌ TO CREATE - Simple number input
│   │       ├── GroupClassSelector.tsx      # ❌ TO CREATE - Search/select classes
│   │       ├── BundleComponentForm.tsx     # ❌ TO CREATE - Add bonus credits
│   │       └── CourseStepCard.tsx          # ❌ TO CREATE - Step display
└── admin-templates/
    └── course-programs.php                  # ❌ TO CREATE - Admin page entry
```

---

## Phase 1: Admin Page Registration (WordPress)

### Location: `wordpress/themes/custom-theme/admin-templates/course-programs.php`

**Register admin menu:**

```php
<?php
/**
 * Course Programs Admin Page
 */

add_action('admin_menu', 'thrive_register_course_programs_admin_menu');

function thrive_register_course_programs_admin_menu() {
    add_menu_page(
        'Course Programs',           // Page title
        'Course Programs',           // Menu title
        'manage_options',            // Capability
        'thrive-course-programs',    // Menu slug
        'thrive_render_course_programs_admin_page', // Callback
        'dashicons-welcome-learn-more', // Icon
        30                           // Position
    );
}

function thrive_render_course_programs_admin_page() {
    ?>
    <div class="wrap">
        <div id="course-programs-admin-root"></div>
    </div>

    <script>
        // Pass API base URL to React
        window.THRIVE_API_URL = '<?php echo esc_js(defined('NESTJS_API_URL') ? NESTJS_API_URL : 'http://localhost:3000'); ?>';
    </script>
    <?php

    // Enqueue React app
    wp_enqueue_script(
        'thrive-course-programs-admin',
        get_template_directory_uri() . '/dist/admin/course-programs.js',
        [],
        filemtime(get_template_directory() . '/dist/admin/course-programs.js'),
        true
    );

    wp_enqueue_style(
        'thrive-course-programs-admin-styles',
        get_template_directory_uri() . '/dist/admin/course-programs.css',
        [],
        filemtime(get_template_directory() . '/dist/admin/course-programs.css')
    );
}
```

**Add to theme's functions.php:**
```php
require_once get_template_directory() . '/admin-templates/course-programs.php';
```

---

## Phase 2: Main Listing Page (React)

### Location: `wordpress/themes/custom-theme/src/admin/pages/CoursePrograms.tsx`

```typescript
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface CourseProgram {
  id: number;
  code: string;
  title: string;
  description: string | null;
  isActive: boolean;
  stripeProductId: string | null;
  stripePriceId: string | null;
  steps: { id: number }[];
  createdAt: string;
}

function CourseProgramsListPage() {
  const [programs, setPrograms] = useState<CourseProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPrograms();
  }, []);

  async function fetchPrograms() {
    try {
      const response = await fetch('/api/admin/course-programs', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch course programs');
      }

      const data = await response.json();
      setPrograms(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this course program?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/course-programs/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete course program');
      }

      // Refresh list
      await fetchPrograms();
      alert('Course program deleted successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  if (loading) {
    return <div className="p-4">Loading course programs...</div>;
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-100 text-red-700 p-4 rounded">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Course Programs</h1>
        <Link
          to="/admin/course-programs/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Create New Course
        </Link>
      </div>

      {programs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded">
          <p className="text-gray-600 mb-4">No course programs yet.</p>
          <Link
            to="/admin/course-programs/new"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700"
          >
            Create Your First Course
          </Link>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Steps
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Published
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {programs.map((program) => (
                <tr key={program.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-mono text-sm">{program.code}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{program.title}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {program.steps?.length || 0} steps
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        program.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {program.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {program.stripePriceId ? (
                      <span className="text-green-600">✓ Published</span>
                    ) : (
                      <span className="text-gray-400">Not published</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      to={`/admin/course-programs/${program.id}/edit`}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Edit
                    </Link>
                    <Link
                      to={`/admin/course-programs/${program.id}/steps`}
                      className="text-purple-600 hover:text-purple-900 mr-4"
                    >
                      Manage Steps
                    </Link>
                    {!program.stripePriceId && (
                      <Link
                        to={`/admin/course-programs/${program.id}/publish`}
                        className="text-green-600 hover:text-green-900 mr-4"
                      >
                        Publish
                      </Link>
                    )}
                    <button
                      onClick={() => handleDelete(program.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default CourseProgramsListPage;
```

---

## Phase 3: Course Program Form (Create/Edit)

### Location: `wordpress/themes/custom-theme/src/admin/pages/CourseProgramForm.tsx`

```typescript
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface CourseProgramFormData {
  code: string;
  title: string;
  description: string;
  timezone: string;
  isActive: boolean;
}

function CourseProgramFormPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [formData, setFormData] = useState<CourseProgramFormData>({
    code: '',
    title: '',
    description: '',
    timezone: 'America/New_York',
    isActive: true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditMode) {
      fetchCourseProgram();
    }
  }, [id]);

  async function fetchCourseProgram() {
    try {
      const response = await fetch(`/api/admin/course-programs/${id}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch course program');
      }

      const data = await response.json();
      setFormData({
        code: data.code,
        title: data.title,
        description: data.description || '',
        timezone: data.timezone,
        isActive: data.isActive,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = isEditMode
        ? `/api/admin/course-programs/${id}`
        : '/api/admin/course-programs';

      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to save course program');
      }

      const savedProgram = await response.json();
      alert(
        isEditMode
          ? 'Course program updated successfully'
          : 'Course program created successfully'
      );

      // Navigate to step manager for new courses, or back to list for edits
      if (isEditMode) {
        navigate('/admin/course-programs');
      } else {
        navigate(`/admin/course-programs/${savedProgram.id}/steps`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          {isEditMode ? 'Edit Course Program' : 'Create New Course Program'}
        </h1>
        <p className="text-gray-600 mt-2">
          Define the basic information for your course program
        </p>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded mb-4">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
        <div className="space-y-6">
          {/* Code */}
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
              Course Code *
            </label>
            <input
              type="text"
              id="code"
              name="code"
              value={formData.code}
              onChange={handleChange}
              placeholder="e.g., SFZ, ADV-TECH"
              required
              pattern="[A-Z0-9-]+"
              title="Only uppercase letters, numbers, and hyphens"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Unique identifier (uppercase letters, numbers, hyphens only)
            </p>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Course Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Spanish from Zero - Complete Program"
              required
              maxLength={255}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Marketing description for the course..."
              rows={6}
              maxLength={5000}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.description.length}/5000 characters
            </p>
          </div>

          {/* Timezone */}
          <div>
            <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-2">
              Default Timezone
            </label>
            <select
              id="timezone"
              name="timezone"
              value={formData.timezone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="America/New_York">Eastern Time (America/New_York)</option>
              <option value="America/Chicago">Central Time (America/Chicago)</option>
              <option value="America/Denver">Mountain Time (America/Denver)</option>
              <option value="America/Los_Angeles">Pacific Time (America/Los_Angeles)</option>
              <option value="UTC">UTC</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Used for scheduling recommendations
            </p>
          </div>

          {/* Is Active */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="mr-2"
              />
              <span className="text-sm font-medium text-gray-700">
                Active (available for purchase)
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              Inactive courses won't appear in the course catalog
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
          <button
            type="button"
            onClick={() => navigate('/admin/course-programs')}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Saving...' : isEditMode ? 'Update Course' : 'Create Course'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CourseProgramFormPage;
```

---

## Phase 4: Step Manager

### Location: `wordpress/themes/custom-theme/src/admin/pages/CourseStepManager.tsx`

```typescript
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import GroupClassSelector from '../components/GroupClassSelector';

interface CourseStep {
  id: number;
  stepOrder: number;
  label: string;
  title: string;
  description: string | null;
  isRequired: boolean;
  stepOptions: StepOption[];
}

interface StepOption {
  id: number;
  groupClassId: number;
  isActive: boolean;
  groupClass: {
    id: number;
    name: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  };
}

function CourseStepManagerPage() {
  const { id } = useParams<{ id: string }>();
  const [courseProgram, setCourseProgram] = useState<any>(null);
  const [steps, setSteps] = useState<CourseStep[]>([]);
  const [showAddStep, setShowAddStep] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourseAndSteps();
  }, [id]);

  async function fetchCourseAndSteps() {
    try {
      const response = await fetch(`/api/admin/course-programs/${id}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch course program');
      }

      const data = await response.json();
      setCourseProgram(data);
      setSteps(data.steps || []);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to load course');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateStep(stepData: Partial<CourseStep>) {
    try {
      const response = await fetch(`/api/admin/course-programs/${id}/steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(stepData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to create step');
      }

      await fetchCourseAndSteps();
      setShowAddStep(false);
      alert('Step created successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create step');
    }
  }

  async function handleDeleteStep(stepId: number) {
    if (!confirm('Are you sure you want to delete this step?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/course-programs/steps/${stepId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete step');
      }

      await fetchCourseAndSteps();
      alert('Step deleted successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete step');
    }
  }

  async function handleAttachClass(stepId: number, groupClassId: number) {
    try {
      const response = await fetch(`/api/admin/course-programs/steps/${stepId}/options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ courseStepId: stepId, groupClassId, isActive: true }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to attach class');
      }

      await fetchCourseAndSteps();
      alert('Class attached successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to attach class');
    }
  }

  async function handleDetachOption(optionId: number) {
    if (!confirm('Are you sure you want to detach this class?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/course-programs/steps/options/${optionId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to detach option');
      }

      await fetchCourseAndSteps();
      alert('Class detached successfully');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to detach');
    }
  }

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!courseProgram) {
    return <div className="p-6">Course not found</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <Link to="/admin/course-programs" className="text-blue-600 hover:underline mb-2 block">
          ← Back to Course Programs
        </Link>
        <h1 className="text-3xl font-bold">{courseProgram.title}</h1>
        <p className="text-gray-600">Manage course steps and class options</p>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Course Steps</h2>
          <button
            onClick={() => setShowAddStep(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + Add Step
          </button>
        </div>

        {steps.length === 0 ? (
          <p className="text-gray-600">No steps yet. Add your first step to get started.</p>
        ) : (
          <div className="space-y-4">
            {steps.map((step) => (
              <CourseStepCard
                key={step.id}
                step={step}
                onDelete={handleDeleteStep}
                onAttachClass={handleAttachClass}
                onDetachOption={handleDetachOption}
              />
            ))}
          </div>
        )}
      </div>

      {showAddStep && (
        <AddStepModal
          courseProgramId={parseInt(id!)}
          existingSteps={steps}
          onSubmit={handleCreateStep}
          onClose={() => setShowAddStep(false)}
        />
      )}

      <div className="flex justify-end gap-3">
        <Link
          to={`/admin/course-programs/${id}/bundle`}
          className="bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700"
        >
          Configure Bundle Components →
        </Link>
      </div>
    </div>
  );
}

// Step Card Component
function CourseStepCard({
  step,
  onDelete,
  onAttachClass,
  onDetachOption,
}: {
  step: CourseStep;
  onDelete: (id: number) => void;
  onAttachClass: (stepId: number, classId: number) => void;
  onDetachOption: (optionId: number) => void;
}) {
  const [showClassSelector, setShowClassSelector] = useState(false);

  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-bold">
            Step {step.stepOrder}: {step.label} - {step.title}
          </h3>
          {step.description && <p className="text-sm text-gray-600 mt-1">{step.description}</p>}
        </div>
        <button
          onClick={() => onDelete(step.id)}
          className="text-red-600 hover:text-red-800 text-sm"
        >
          Delete
        </button>
      </div>

      <div className="mt-4">
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-semibold text-sm">Class Options:</h4>
          <button
            onClick={() => setShowClassSelector(true)}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            + Attach Class
          </button>
        </div>

        {step.stepOptions.length === 0 ? (
          <p className="text-sm text-gray-500">No classes attached yet</p>
        ) : (
          <ul className="space-y-2">
            {step.stepOptions.map((option) => (
              <li key={option.id} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                <span>
                  {option.groupClass.name} - {option.groupClass.startTime}
                </span>
                <button
                  onClick={() => onDetachOption(option.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showClassSelector && (
        <GroupClassSelector
          onSelect={(classId) => {
            onAttachClass(step.id, classId);
            setShowClassSelector(false);
          }}
          onClose={() => setShowClassSelector(false)}
        />
      )}
    </div>
  );
}

// Add Step Modal
function AddStepModal({
  courseProgramId,
  existingSteps,
  onSubmit,
  onClose,
}: {
  courseProgramId: number;
  existingSteps: CourseStep[];
  onSubmit: (data: Partial<CourseStep>) => void;
  onClose: () => void;
}) {
  const nextOrder = existingSteps.length > 0
    ? Math.max(...existingSteps.map((s) => s.stepOrder)) + 1
    : 1;

  const [formData, setFormData] = useState({
    stepOrder: nextOrder,
    label: ``,
    title: '',
    description: '',
    isRequired: true,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ ...formData, courseProgramId });
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <h2 className="text-2xl font-bold mb-4">Add Course Step</h2>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Step Order *</label>
              <input
                type="number"
                min="1"
                value={formData.stepOrder}
                onChange={(e) =>
                  setFormData({ ...formData, stepOrder: parseInt(e.target.value) })
                }
                required
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Label *</label>
              <input
                type="text"
                placeholder="e.g., SFZ-1"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                required
                maxLength={100}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Title *</label>
              <input
                type="text"
                placeholder="e.g., Introduction to Spanish"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                maxLength={255}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                placeholder="Optional description of what's covered in this step"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                maxLength={5000}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isRequired}
                  onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm">Required step</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Add Step
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CourseStepManagerPage;
```

---

## Phase 5: Group Class Selector Component

### Location: `wordpress/themes/custom-theme/src/admin/components/GroupClassSelector.tsx`

```typescript
import { useEffect, useState } from 'react';

interface GroupClass {
  id: number;
  name: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  timezone: string;
}

function GroupClassSelector({
  onSelect,
  onClose,
}: {
  onSelect: (classId: number) => void;
  onClose: () => void;
}) {
  const [classes, setClasses] = useState<GroupClass[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGroupClasses();
  }, []);

  async function fetchGroupClasses() {
    try {
      const response = await fetch('/api/admin/group-classes', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setClasses(data);
      }
    } catch (err) {
      console.error('Failed to fetch group classes:', err);
    } finally {
      setLoading(false);
    }
  }

  const filteredClasses = classes.filter((cls) =>
    cls.name.toLowerCase().includes(search.toLowerCase())
  );

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <h2 className="text-2xl font-bold mb-4">Select Group Class</h2>

        <input
          type="text"
          placeholder="Search classes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 border rounded mb-4"
        />

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p>Loading classes...</p>
          ) : filteredClasses.length === 0 ? (
            <p className="text-gray-600">No classes found</p>
          ) : (
            <div className="space-y-2">
              {filteredClasses.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => onSelect(cls.id)}
                  className="w-full text-left p-3 border rounded hover:bg-blue-50 transition"
                >
                  <div className="font-semibold">{cls.name}</div>
                  <div className="text-sm text-gray-600">
                    {dayNames[cls.dayOfWeek]} {cls.startTime} - {cls.endTime} ({cls.timezone})
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end mt-4 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default GroupClassSelector;
```

---

## Phase 6: Publish to Stripe

### Location: `wordpress/themes/custom-theme/src/admin/pages/PublishCourse.tsx`

```typescript
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

function PublishCoursePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [courseProgram, setCourseProgram] = useState<any>(null);
  const [priceInDollars, setPriceInDollars] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    fetchCourse();
  }, [id]);

  async function fetchCourse() {
    try {
      const response = await fetch(`/api/admin/course-programs/${id}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setCourseProgram(data);
        validateCourse(data);
      }
    } catch (err) {
      alert('Failed to load course');
    }
  }

  function validateCourse(course: any) {
    const errors: string[] = [];

    if (!course.steps || course.steps.length === 0) {
      errors.push('Course must have at least one step');
    }

    const stepsWithOptions = course.steps?.filter(
      (step: any) => step.stepOptions && step.stepOptions.length > 0
    );

    if (!stepsWithOptions || stepsWithOptions.length === 0) {
      errors.push('At least one step must have class options attached');
    }

    setValidationErrors(errors);
  }

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();

    if (validationErrors.length > 0) {
      alert('Please fix validation errors before publishing');
      return;
    }

    const priceInCents = Math.round(parseFloat(priceInDollars) * 100);

    if (isNaN(priceInCents) || priceInCents <= 0) {
      alert('Please enter a valid price');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/admin/course-programs/${id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ courseProgramId: parseInt(id!), priceInCents, currency: 'usd' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to publish course');
      }

      alert('Course published to Stripe successfully!');
      navigate('/admin/course-programs');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to publish');
    } finally {
      setLoading(false);
    }
  }

  if (!courseProgram) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link to="/admin/course-programs" className="text-blue-600 hover:underline mb-2 block">
          ← Back to Course Programs
        </Link>
        <h1 className="text-3xl font-bold">Publish Course to Stripe</h1>
        <p className="text-gray-600 mt-2">{courseProgram.title}</p>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-100 text-red-700 p-4 rounded mb-6">
          <h3 className="font-bold mb-2">Cannot publish yet:</h3>
          <ul className="list-disc list-inside">
            {validationErrors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Course Summary */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Course Summary</h2>
        <dl className="space-y-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Code</dt>
            <dd className="text-lg">{courseProgram.code}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Steps</dt>
            <dd className="text-lg">{courseProgram.steps?.length || 0}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Bundle Components</dt>
            <dd className="text-lg">{courseProgram.bundleComponents?.length || 0}</dd>
          </div>
        </dl>
      </div>

      {/* Pricing Form */}
      <form onSubmit={handlePublish} className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Set Price</h2>

        <div className="mb-6">
          <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
            Course Price (USD) *
          </label>
          <div className="flex items-center">
            <span className="text-2xl mr-2">$</span>
            <input
              type="number"
              id="price"
              step="0.01"
              min="0.01"
              value={priceInDollars}
              onChange={(e) => setPriceInDollars(e.target.value)}
              placeholder="499.00"
              required
              className="flex-1 px-3 py-2 border border-gray-300 rounded text-lg"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            This will create a Stripe product and price for this course
          </p>
        </div>

        {courseProgram.stripePriceId && (
          <div className="bg-yellow-100 text-yellow-800 p-4 rounded mb-4">
            <p className="font-semibold">Note:</p>
            <p className="text-sm">
              This course is already published. Submitting will create a new price and archive the old one.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/course-programs')}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || validationErrors.length > 0}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading ? 'Publishing...' : 'Publish to Stripe'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default PublishCoursePage;
```

---

## Implementation Checklist

### Admin Page Setup
- [ ] Register WordPress admin menu
- [ ] Create admin page template
- [ ] Enqueue React app and styles
- [ ] Test admin menu access

### Course Program List
- [ ] Implement list page with table
- [ ] Add create/edit/delete actions
- [ ] Add published status indicators
- [ ] Test list pagination (if needed)

### Course Program Form
- [ ] Implement create form
- [ ] Implement edit form
- [ ] Add validation
- [ ] Test form submission

### Step Manager
- [ ] Implement step listing
- [ ] Add create step modal
- [ ] Add delete step functionality
- [ ] Implement step card component
- [ ] Test step ordering

### Group Class Selector
- [ ] Implement class search/filter
- [ ] Add class selection
- [ ] Test attach/detach functionality

### Publish Flow
- [ ] Implement publish page
- [ ] Add validation checks
- [ ] Add price input form
- [ ] Test Stripe integration
- [ ] Test price updates

### Bundle Components (Optional for MVP)
- [ ] Create bundle component form
- [ ] Add private/group credit inputs
- [ ] Test bundle creation

---

## Next Steps

After admin UI implementation:
1. Test complete admin flow end-to-end
2. Add user documentation/tooltips
3. Implement booking integration for course sessions
4. Add analytics tracking for admin actions
