import React, { useState, useEffect } from 'react';
import {
  CourseProgramDetailDto,
  CourseStepMaterialDto,
  CreateCourseStepMaterialDto,
  MaterialType,
  QuestionType,
} from '@thrive/shared';
import { thriveClient } from '../../../shared/thrive';

const CourseMaterialsBuilder: React.FC = () => {
  const [courses, setCourses] = useState<CourseProgramDetailDto[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<number | null>(null);
  const [materials, setMaterials] = useState<CourseStepMaterialDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<CourseStepMaterialDto | null>(null);
  const [formData, setFormData] = useState<Partial<CreateCourseStepMaterialDto>>({
    type: 'rich_text',
    question: {
      questionType: 'multiple_choice',
      questionText: '',
      options: {},
    },
  });

  // Load courses
  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoading(true);
        const coursesData = await thriveClient.getCoursePrograms();
        setCourses(coursesData || []);
      } catch (err) {
        console.error('Failed to load courses:', err);
        setError('Failed to load courses');
      } finally {
        setLoading(false);
      }
    };

    loadCourses();
  }, []);

  // Load materials when step changes
  useEffect(() => {
    const loadMaterials = async () => {
      if (!selectedStepId) {
        setMaterials([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const materialsData = await thriveClient.getCourseStepMaterials(selectedStepId);
        setMaterials(materialsData || []);
      } catch (err) {
        console.error('Failed to load materials:', err);
        setError('Failed to load materials');
      } finally {
        setLoading(false);
      }
    };

    loadMaterials();
  }, [selectedStepId]);

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);
  const steps = selectedCourse?.steps || [];

  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStepId) {
      setError('Please select a step');
      return;
    }

    if (!formData.title || !formData.type) {
      setError('Please fill in required fields');
      return;
    }

    try {
      setLoading(true);
      const materialData: CreateCourseStepMaterialDto = {
        courseStepId: selectedStepId,
        title: formData.title,
        description: formData.description || undefined,
        type: formData.type as MaterialType,
        content: formData.content || undefined,
        order: editingMaterial ? editingMaterial.order : materials.length,
        question: formData.type === 'question' ? formData.question : undefined,
      };

      if (editingMaterial) {
        // Update existing material
        const updated = await thriveClient.updateCourseMaterial(editingMaterial.id, materialData);
        if (updated) {
          setMaterials(materials.map((m) => (m.id === updated.id ? updated : m)));
          setEditingMaterial(null);
        }
      } else {
        // Create new material
        const created = await thriveClient.createCourseMaterial(materialData);
        if (created) {
          setMaterials([...materials, created]);
        }
      }

      setFormData({
        type: 'rich_text',
        question: {
          questionType: 'multiple_choice',
          questionText: '',
          options: {},
        },
      });
      setShowMaterialForm(false);
      setError(null);
    } catch (err) {
      console.error('Failed to save material:', err);
      setError('Failed to save material');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMaterial = async (materialId: number) => {
    if (!confirm('Are you sure you want to delete this material?')) {
      return;
    }

    try {
      setLoading(true);
      await thriveClient.deleteCourseMaterial(materialId);
      setMaterials(materials.filter((m) => m.id !== materialId));
      setError(null);
    } catch (err) {
      console.error('Failed to delete material:', err);
      setError('Failed to delete material');
    } finally {
      setLoading(false);
    }
  };

  const handleEditMaterial = (material: CourseStepMaterialDto) => {
    setEditingMaterial(material);
    setFormData({
      title: material.title,
      description: material.description || undefined,
      type: material.type,
      content: material.content || undefined,
      order: material.order,
    });
    setShowMaterialForm(true);
  };

  const handleCancel = () => {
    setShowMaterialForm(false);
    setEditingMaterial(null);
    setFormData({
      type: 'rich_text',
      question: {
        questionType: 'multiple_choice',
        questionText: '',
        options: {},
      },
    });
  };

  return (
    <div className="course-materials-builder">
      <h1>Course Materials Builder</h1>

      {error && <div className="error-message">{error}</div>}

      <div className="builder-section">
        <h2>Select Course and Step</h2>
        <div className="form-group">
          <label htmlFor="course-select">Select Course</label>
          {courses.length === 0 && !loading ? (
            <div className="empty-courses-message">
              <p>No courses found. Please create a Course Program first.</p>
              <a href="/wp-admin/post-new.php?post_type=thrive_course" className="btn-primary">
                Create Course Program
              </a>
            </div>
          ) : (
            <select
              id="course-select"
              value={selectedCourseId || ''}
              onChange={(e) => {
                const courseId = e.target.value ? parseInt(e.target.value) : null;
                setSelectedCourseId(courseId);
                setSelectedStepId(null);
                setMaterials([]);
              }}
              disabled={loading}
            >
              <option value="">-- Select a Course --</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedCourseId && (
          <div className="form-group">
            <label htmlFor="step-select">Select Step</label>
            <select
              id="step-select"
              value={selectedStepId || ''}
              onChange={(e) => {
                const stepId = e.target.value ? parseInt(e.target.value) : null;
                setSelectedStepId(stepId);
              }}
              disabled={loading || steps.length === 0}
            >
              <option value="">-- Select a Step --</option>
              {steps.map((step) => (
                <option key={step.id} value={step.id}>
                  {step.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {selectedStepId && (
        <div className="materials-section">
          <div className="materials-header">
            <h2>Course Materials</h2>
            <button
              onClick={() => {
                handleCancel();
                setShowMaterialForm(true);
              }}
              disabled={loading}
              className="btn-primary"
            >
              + Add Material
            </button>
          </div>

          {showMaterialForm && (
            <MaterialForm
              formData={formData}
              setFormData={setFormData}
              onSave={handleSaveMaterial}
              onCancel={handleCancel}
              isEditing={!!editingMaterial}
              loading={loading}
            />
          )}

          {materials.length === 0 && !showMaterialForm && (
            <p className="empty-message">No materials yet. Add your first material.</p>
          )}

          {materials.length > 0 && (
            <div className="materials-list">
              <table>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((material, index) => (
                    <tr key={material.id}>
                      <td>{index + 1}</td>
                      <td>{material.title}</td>
                      <td>
                        <span className={`type-badge type-${material.type}`}>
                          {material.type}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleEditMaterial(material)}
                          disabled={loading}
                          className="btn-small"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteMaterial(material.id)}
                          disabled={loading}
                          className="btn-small btn-danger"
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
      )}
    </div>
  );
};

interface MaterialFormProps {
  formData: Partial<CreateCourseStepMaterialDto>;
  setFormData: (data: Partial<CreateCourseStepMaterialDto>) => void;
  onSave: (e: React.FormEvent) => Promise<void>;
  onCancel: () => void;
  isEditing: boolean;
  loading: boolean;
}

const MaterialForm: React.FC<MaterialFormProps> = ({
  formData,
  setFormData,
  onSave,
  onCancel,
  isEditing,
  loading,
}) => {
  const [options, setOptions] = useState<Array<{ key: string; text: string; correct: boolean }>>([]);

  // Initialize options from form data if available
  useEffect(() => {
    if (formData.question?.options) {
      const optionsList = Object.entries(formData.question.options).map(([key, value]) => {
        const text = typeof value === 'string' ? value : value.text || '';
        const correct = typeof value === 'object' && value.correct ? true : false;
        return { key, text, correct };
      });
      setOptions(optionsList);
    }
  }, []);

  const handleAddOption = () => {
    setOptions([
      ...options,
      { key: `option_${options.length}`, text: '', correct: false },
    ]);
  };

  const handleOptionChange = (index: number, field: string, value: any) => {
    const newOptions = [...options];
    if (field === 'text') {
      newOptions[index].text = value;
    } else if (field === 'correct') {
      newOptions[index].correct = value;
      // For multiple choice, only one can be correct
      if (formData.question?.questionType === 'multiple_choice' && value) {
        newOptions.forEach((opt, i) => {
          if (i !== index) opt.correct = false;
        });
      }
    }
    setOptions(newOptions);

    // Update form data with new options
    const optionsRecord: Record<string, any> = {};
    newOptions.forEach((opt) => {
      optionsRecord[opt.key] = {
        text: opt.text,
        correct: opt.correct,
      };
    });

    setFormData({
      ...formData,
      question: {
        ...formData.question!,
        options: optionsRecord,
      },
    });
  };

  const handleRemoveOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);

    const optionsRecord: Record<string, any> = {};
    newOptions.forEach((opt) => {
      optionsRecord[opt.key] = {
        text: opt.text,
        correct: opt.correct,
      };
    });

    setFormData({
      ...formData,
      question: {
        ...formData.question!,
        options: optionsRecord,
      },
    });
  };

  return (
    <form className="material-form" onSubmit={onSave}>
      <div className="form-group">
        <label htmlFor="title">Title *</label>
        <input
          id="title"
          type="text"
          value={formData.title || ''}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          disabled={loading}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          disabled={loading}
          rows={2}
        />
      </div>

      <div className="form-group">
        <label htmlFor="type">Type *</label>
        <select
          id="type"
          value={formData.type || 'rich_text'}
          onChange={(e) => setFormData({ ...formData, type: e.target.value as MaterialType })}
          disabled={loading}
          required
        >
          <option value="rich_text">Rich Text</option>
          <option value="video_embed">Video (Embed)</option>
          <option value="file">File</option>
          <option value="question">Question</option>
        </select>
      </div>

      {formData.type !== 'question' && (
        <div className="form-group">
          <label htmlFor="content">Content</label>
          <textarea
            id="content"
            value={formData.content || ''}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            disabled={loading}
            rows={5}
          />
        </div>
      )}

      {formData.type === 'question' && (
        <div className="question-section">
          <div className="form-group">
            <label htmlFor="question-type">Question Type *</label>
            <select
              id="question-type"
              value={formData.question?.questionType || 'multiple_choice'}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  question: {
                    ...formData.question!,
                    questionType: e.target.value as QuestionType,
                  },
                })
              }
              disabled={loading}
              required
            >
              <option value="multiple_choice">Multiple Choice</option>
              <option value="long_text">Long Text</option>
              <option value="file_upload">File Upload</option>
              <option value="video_upload">Video Upload</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="question-text">Question Text *</label>
            <textarea
              id="question-text"
              value={formData.question?.questionText || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  question: {
                    ...formData.question!,
                    questionText: e.target.value,
                  },
                })
              }
              disabled={loading}
              rows={3}
              required
            />
          </div>

          {(formData.question?.questionType === 'multiple_choice' ||
            formData.question?.questionType === 'file_upload' ||
            formData.question?.questionType === 'video_upload') && (
            <div className="options-section">
              <h4>Options</h4>
              {options.map((option, index) => (
                <div key={index} className="option-row">
                  <input
                    type="text"
                    placeholder="Option text"
                    value={option.text}
                    onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
                    disabled={loading}
                  />
                  {formData.question?.questionType === 'multiple_choice' && (
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="correct"
                        checked={option.correct}
                        onChange={(e) => handleOptionChange(index, 'correct', e.target.checked)}
                        disabled={loading}
                      />
                      Correct
                    </label>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(index)}
                    disabled={loading}
                    className="btn-small btn-danger"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddOption}
                disabled={loading}
                className="btn-small"
              >
                + Add Option
              </button>
            </div>
          )}
        </div>
      )}

      <div className="form-actions">
        <button type="submit" disabled={loading} className="btn-primary">
          {isEditing ? 'Update Material' : 'Save Material'}
        </button>
        <button type="button" onClick={onCancel} disabled={loading} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
};

export default CourseMaterialsBuilder;
