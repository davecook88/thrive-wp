import React from 'react';
import { TestimonialResponseDto } from '@thrive/shared';

interface StarRatingProps {
  rating: number;
  showNumber?: boolean;
}

export const StarRating: React.FC<StarRatingProps> = ({ rating, showNumber = false }) => {
  return (
    <div className="testimonial-star-rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`star ${star <= rating ? 'filled' : 'empty'}`}
          aria-label={`${star} star`}
        >
          ★
        </span>
      ))}
      {showNumber && <span className="rating-number">({rating}/5)</span>}
    </div>
  );
};

interface TestimonialCardProps {
  testimonial: TestimonialResponseDto;
  showAvatar?: boolean;
  showRating?: boolean;
  showTags?: boolean;
}

export const TestimonialCard: React.FC<TestimonialCardProps> = ({
  testimonial,
  showAvatar = true,
  showRating = true,
  showTags = true,
}) => {
  const { studentName, studentAvatarUrl, rating, comment, tags, teacherName, courseProgramTitle } = testimonial;

  return (
    <div className="testimonial-card">
      <div className="testimonial-content">
        {showRating && (
          <div className="testimonial-rating">
            <StarRating rating={rating} />
          </div>
        )}
        
        {comment && (
          <blockquote className="testimonial-comment">
            "{comment}"
          </blockquote>
        )}

        {showTags && tags && tags.length > 0 && (
          <div className="testimonial-tags">
            {tags.map((tag, index) => (
              <span key={index} className="tag">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="testimonial-author">
        {showAvatar && studentAvatarUrl && (
          <img
            src={studentAvatarUrl}
            alt={studentName}
            className="author-avatar"
          />
        )}
        {!showAvatar && !studentAvatarUrl && (
          <div className="author-avatar-placeholder">
            {studentName.charAt(0).toUpperCase()}
          </div>
        )}
        
        <div className="author-info">
          <div className="author-name">{studentName}</div>
          {(teacherName || courseProgramTitle) && (
            <div className="author-context">
              {teacherName && <span>Teacher: {teacherName}</span>}
              {courseProgramTitle && <span>{courseProgramTitle}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
