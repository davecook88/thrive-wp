import React, { useState, useEffect } from 'react';
import { CreateTestimonialDto, TestimonialEligibilityDto } from '@thrive/shared';
import { thriveClient } from '../../../../../shared/thrive';

interface TestimonialSubmissionFormProps {
  title: string;
  description: string;
  showGeneralOption: boolean;
}

type ReviewType = 'general' | 'teacher' | 'course';

export const TestimonialSubmissionForm: React.FC<TestimonialSubmissionFormProps> = ({
  title,
  description,
  showGeneralOption,
}) => {
  const [eligibility, setEligibility] = useState<TestimonialEligibilityDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [reviewType, setReviewType] = useState<ReviewType>('general');
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    const fetchEligibility = async () => {
      try {
        setLoading(true);
        const data = await thriveClient.checkTestimonialEligibility();
        setEligibility(data);
      } catch (err) {
        console.error('Error fetching eligibility:', err);
        setError('Failed to load form. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchEligibility();
  }, []);

  const handleAddTag = () => {
    if (tagInput.trim() && tags.length < 10 && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const data: CreateTestimonialDto = {
        rating,
        comment: comment.trim() || null,
        tags: tags.length > 0 ? tags : null,
        teacherId: reviewType === 'teacher' ? selectedTeacherId : null,
        courseProgramId: reviewType === 'course' ? selectedCourseId : null,
      };

      await thriveClient.submitTestimonial(data);
      setSuccess(true);
      
      // Reset form
      setRating(5);
      setComment('');
      setTags([]);
      setReviewType('general');
      setSelectedTeacherId(null);
      setSelectedCourseId(null);
    } catch (err: any) {
      console.error('Error submitting testimonial:', err);
      setError(err.message || 'Failed to submit testimonial. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="testimonial-form-loading">
        <div className="spinner" />
        <p>Loading form...</p>
      </div>
    );
  }

  if (!eligibility) {
    return (
      <div className="testimonial-form-error">
        <p>Unable to load testimonial form. Please try again later.</p>
      </div>
    );
  }

  const eligibleTeachers = eligibility.eligibleTeachers.filter((t) => t.canSubmit);
  const eligibleCourses = eligibility.eligibleCourses.filter((c) => c.canSubmit);

  const hasEligibleOptions = 
    (showGeneralOption && eligibility.canSubmitGeneral) ||
    eligibleTeachers.length > 0 ||
    eligibleCourses.length > 0;

  if (!hasEligibleOptions) {
    return (
      <div className="testimonial-form-ineligible">
        <h3>Not Eligible Yet</h3>
        <p>
          You need to attend at least one session or enroll in a course before you can submit a testimonial.
        </p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="testimonial-form-success">
        <div className="success-icon">✓</div>
        <h3>Thank You!</h3>
        <p>Your testimonial has been submitted and is pending review.</p>
        <button
          className="btn-secondary"
          onClick={() => setSuccess(false)}
        >
          Submit Another
        </button>
      </div>
    );
  }

  return (
    <div className="testimonial-submission-form">
      <div className="form-header">
        <h2>{title}</h2>
        {description && <p className="form-description">{description}</p>}
      </div>

      <form onSubmit={handleSubmit}>
        {/* Review Type Selection */}
        <div className="form-group">
          <label>What would you like to review?</label>
          <div className="review-type-options">
            {showGeneralOption && eligibility.canSubmitGeneral && (
              <label className="radio-option">
                <input
                  type="radio"
                  name="reviewType"
                  value="general"
                  checked={reviewType === 'general'}
                  onChange={() => setReviewType('general')}
                />
                <span>General Experience</span>
              </label>
            )}

            {eligibleTeachers.length > 0 && (
              <label className="radio-option">
                <input
                  type="radio"
                  name="reviewType"
                  value="teacher"
                  checked={reviewType === 'teacher'}
                  onChange={() => {
                    setReviewType('teacher');
                    if (eligibleTeachers.length === 1) {
                      setSelectedTeacherId(eligibleTeachers[0].teacherId);
                    }
                  }}
                />
                <span>A Teacher</span>
              </label>
            )}

            {eligibleCourses.length > 0 && (
              <label className="radio-option">
                <input
                  type="radio"
                  name="reviewType"
                  value="course"
                  checked={reviewType === 'course'}
                  onChange={() => {
                    setReviewType('course');
                    if (eligibleCourses.length === 1) {
                      setSelectedCourseId(eligibleCourses[0].courseProgramId);
                    }
                  }}
                />
                <span>A Course</span>
              </label>
            )}
          </div>
        </div>

        {/* Teacher Selection */}
        {reviewType === 'teacher' && eligibleTeachers.length > 0 && (
          <div className="form-group">
            <label htmlFor="teacher-select">Select Teacher</label>
            <select
              id="teacher-select"
              value={selectedTeacherId || ''}
              onChange={(e) => setSelectedTeacherId(Number(e.target.value))}
              required
            >
              <option value="">-- Select a teacher --</option>
              {eligibleTeachers.map((teacher) => (
                <option key={teacher.teacherId} value={teacher.teacherId}>
                  {teacher.teacherName}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Course Selection */}
        {reviewType === 'course' && eligibleCourses.length > 0 && (
          <div className="form-group">
            <label htmlFor="course-select">Select Course</label>
            <select
              id="course-select"
              value={selectedCourseId || ''}
              onChange={(e) => setSelectedCourseId(Number(e.target.value))}
              required
            >
              <option value="">-- Select a course --</option>
              {eligibleCourses.map((course) => (
                <option key={course.courseProgramId} value={course.courseProgramId}>
                  {course.courseProgramTitle}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Star Rating */}
        <div className="form-group">
          <label>Rating</label>
          <div className="star-rating-input">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className={`star ${star <= rating ? 'filled' : 'empty'}`}
                onClick={() => setRating(star)}
                aria-label={`${star} stars`}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div className="form-group">
          <label htmlFor="comment">Your Review (Optional)</label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={2000}
            rows={5}
            placeholder="Share your experience..."
          />
          <div className="character-count">
            {comment.length} / 2000 characters
          </div>
        </div>

        {/* Tags */}
        <div className="form-group">
          <label htmlFor="tag-input">Tags (Optional)</label>
          <div className="tag-input-container">
            <input
              id="tag-input"
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              maxLength={50}
              placeholder="Add a tag and press Enter"
              disabled={tags.length >= 10}
            />
            <button
              type="button"
              onClick={handleAddTag}
              disabled={!tagInput.trim() || tags.length >= 10}
              className="btn-add-tag"
            >
              Add
            </button>
          </div>
          {tags.length > 0 && (
            <div className="tags-list">
              {tags.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="remove-tag"
                    aria-label={`Remove ${tag}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="tag-count">
            {tags.length} / 10 tags
          </div>
        </div>

        {error && (
          <div className="form-error">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="btn-primary btn-submit"
          disabled={submitting}
        >
          {submitting ? 'Submitting...' : 'Submit Testimonial'}
        </button>
      </form>
    </div>
  );
};
