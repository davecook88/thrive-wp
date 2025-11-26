import React, { useState, useEffect } from 'react';
import { TestimonialResponseDto } from '@thrive/shared';
import { TestimonialCard } from './TestimonialCard';

interface TestimonialsGridProps {
  testimonials: TestimonialResponseDto[];
  showAvatar?: boolean;
  showRating?: boolean;
  showTags?: boolean;
}

export const TestimonialsGrid: React.FC<TestimonialsGridProps> = ({
  testimonials,
  showAvatar,
  showRating,
  showTags,
}) => {
  if (testimonials.length === 0) {
    return (
      <div className="testimonials-empty">
        <p>No testimonials to display yet.</p>
      </div>
    );
  }

  return (
    <div className="testimonials-grid">
      {testimonials.map((testimonial) => (
        <TestimonialCard
          key={testimonial.id}
          testimonial={testimonial}
          showAvatar={showAvatar}
          showRating={showRating}
          showTags={showTags}
        />
      ))}
    </div>
  );
};

interface TestimonialsCarouselProps {
  testimonials: TestimonialResponseDto[];
  showAvatar?: boolean;
  showRating?: boolean;
  showTags?: boolean;
}

export const TestimonialsCarousel: React.FC<TestimonialsCarouselProps> = ({
  testimonials,
  showAvatar,
  showRating,
  showTags,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying || testimonials.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000); // Auto-advance every 5 seconds

    return () => clearInterval(interval);
  }, [isAutoPlaying, testimonials.length]);

  if (testimonials.length === 0) {
    return (
      <div className="testimonials-empty">
        <p>No testimonials to display yet.</p>
      </div>
    );
  }

  const goToPrevious = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const goToNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const goToSlide = (index: number) => {
    setIsAutoPlaying(false);
    setCurrentIndex(index);
  };

  return (
    <div className="testimonials-carousel">
      <div className="carousel-container">
        <button
          className="carousel-button prev"
          onClick={goToPrevious}
          aria-label="Previous testimonial"
        >
          ‹
        </button>

        <div className="carousel-content">
          <TestimonialCard
            testimonial={testimonials[currentIndex]}
            showAvatar={showAvatar}
            showRating={showRating}
            showTags={showTags}
          />
        </div>

        <button
          className="carousel-button next"
          onClick={goToNext}
          aria-label="Next testimonial"
        >
          ›
        </button>
      </div>

      <div className="carousel-indicators">
        {testimonials.map((_, index) => (
          <button
            key={index}
            className={`indicator ${index === currentIndex ? 'active' : ''}`}
            onClick={() => goToSlide(index)}
            aria-label={`Go to testimonial ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

interface TestimonialsListProps {
  testimonials: TestimonialResponseDto[];
  showAvatar?: boolean;
  showRating?: boolean;
  showTags?: boolean;
}

export const TestimonialsList: React.FC<TestimonialsListProps> = ({
  testimonials,
  showAvatar,
  showRating,
  showTags,
}) => {
  if (testimonials.length === 0) {
    return (
      <div className="testimonials-empty">
        <p>No testimonials to display yet.</p>
      </div>
    );
  }

  return (
    <div className="testimonials-list">
      {testimonials.map((testimonial) => (
        <TestimonialCard
          key={testimonial.id}
          testimonial={testimonial}
          showAvatar={showAvatar}
          showRating={showRating}
          showTags={showTags}
        />
      ))}
    </div>
  );
};
