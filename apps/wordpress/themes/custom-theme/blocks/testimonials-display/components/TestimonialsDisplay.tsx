import React, { useEffect, useState } from "react";
import { thriveClient } from "../../../../../shared/thrive";
import type { TestimonialResponseDto } from "@thrive/shared";

interface TestimonialsDisplayProps {
  layout: "grid" | "carousel" | "list";
  columns: number;
  limit: number;
  teacherId?: number;
  courseProgramId?: number;
  minRating: number;
  featuredOnly: boolean;
  showRating: boolean;
  showDate: boolean;
}

const TestimonialsDisplay: React.FC<TestimonialsDisplayProps> = ({
  layout,
  columns,
  limit,
  teacherId,
  courseProgramId,
  minRating,
  featuredOnly,
  showRating,
  showDate,
}) => {
  const [testimonials, setTestimonials] = useState<TestimonialResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    fetchTestimonials();
  }, [teacherId, courseProgramId, minRating, featuredOnly, limit]);

  const fetchTestimonials = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await thriveClient.getTestimonials({
        teacherId,
        courseProgramId,
        minRating,
        featuredOnly,
        limit,
      });
      setTestimonials(data);
    } catch (err) {
      setError("Failed to load testimonials");
      console.error("Error fetching testimonials:", err);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span
          key={i}
          className={i <= rating ? "text-yellow-500" : "text-gray-300"}
          style={{ fontSize: "1.125rem" }}
        >
          ★
        </span>
      );
    }
    return <div style={{ display: "flex", gap: "0.25rem" }}>{stars}</div>;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const renderTestimonialCard = (testimonial: TestimonialResponseDto) => (
    <div key={testimonial.id} style={{
      backgroundColor: "white",
      borderRadius: "0.5rem",
      boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
      padding: "1.5rem",
      height: "100%",
      display: "flex",
      flexDirection: "column",
    }}>
      {showRating && (
        <div style={{ marginBottom: "0.75rem" }}>
          {renderStars(testimonial.rating)}
        </div>
      )}

      {testimonial.comment && (
        <p style={{
          color: "#374151",
          marginBottom: "1rem",
          flexGrow: 1,
          fontStyle: "italic",
        }}>
          "{testimonial.comment}"
        </p>
      )}

      <div style={{ marginTop: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
          <div style={{
            width: "2.5rem",
            height: "2.5rem",
            borderRadius: "9999px",
            backgroundColor: "#2563eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: 600,
          }}>
            {testimonial.studentName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p style={{ fontWeight: 600, color: "#111827", margin: 0 }}>
              {testimonial.studentName}
            </p>
            {testimonial.teacherName && (
              <p style={{ fontSize: "0.875rem", color: "#4b5563", margin: 0 }}>
                About {testimonial.teacherName}
              </p>
            )}
            {testimonial.courseProgramTitle && (
              <p style={{ fontSize: "0.875rem", color: "#4b5563", margin: 0 }}>
                {testimonial.courseProgramTitle}
              </p>
            )}
          </div>
        </div>

        {showDate && (
          <p style={{ fontSize: "0.75rem", color: "#6b7280", margin: 0 }}>
            {formatDate(testimonial.createdAt)}
          </p>
        )}
      </div>
    </div>
  );

  // Loading state
  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "3rem 0" }}>
        <div style={{
          animation: "spin 1s linear infinite",
          borderRadius: "9999px",
          height: "3rem",
          width: "3rem",
          borderWidth: "2px",
          borderColor: "#2563eb transparent",
        }} />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{
        backgroundColor: "#fef2f2",
        borderLeft: "4px solid #ef4444",
        padding: "1rem",
        borderRadius: "0.375rem",
      }}>
        <p style={{ fontSize: "0.875rem", color: "#991b1b" }}>{error}</p>
      </div>
    );
  }

  // Empty state
  if (testimonials.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 0", backgroundColor: "#f9fafb", borderRadius: "0.5rem" }}>
        <span style={{ fontSize: "3.75rem", display: "block", marginBottom: "1rem" }}>⭐</span>
        <h3 style={{ fontSize: "1.125rem", fontWeight: 500, color: "#111827", marginBottom: "0.5rem" }}>
          No testimonials yet
        </h3>
        <p style={{ color: "#6b7280" }}>Be the first to share your experience!</p>
      </div>
    );
  }

  // Grid layout
  if (layout === "grid") {
    return (
      <div style={{
        display: "grid",
        gap: "1.5rem",
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      }}>
        {testimonials.map(renderTestimonialCard)}
      </div>
    );
  }

  // Carousel layout
  if (layout === "carousel") {
    const totalSlides = testimonials.length;

    const nextSlide = () => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    };

    const prevSlide = () => {
      setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
    };

    return (
      <div style={{ position: "relative" }}>
        <div style={{ overflow: "hidden" }}>
          <div style={{
            display: "flex",
            transition: "transform 300ms ease-in-out",
            transform: `translateX(-${currentSlide * 100}%)`,
          }}>
            {testimonials.map((testimonial) => (
              <div key={testimonial.id} style={{ width: "100%", flexShrink: 0, padding: "0 1rem" }}>
                {renderTestimonialCard(testimonial)}
              </div>
            ))}
          </div>
        </div>

        {/* Navigation buttons */}
        <button
          onClick={prevSlide}
          style={{
            position: "absolute",
            left: 0,
            top: "50%",
            transform: "translateY(-50%)",
            backgroundColor: "white",
            borderRadius: "9999px",
            padding: "0.5rem",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
            border: "none",
            cursor: "pointer",
          }}
          aria-label="Previous testimonial"
        >
          <svg style={{ width: "1.5rem", height: "1.5rem" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          onClick={nextSlide}
          style={{
            position: "absolute",
            right: 0,
            top: "50%",
            transform: "translateY(-50%)",
            backgroundColor: "white",
            borderRadius: "9999px",
            padding: "0.5rem",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
            border: "none",
            cursor: "pointer",
          }}
          aria-label="Next testimonial"
        >
          <svg style={{ width: "1.5rem", height: "1.5rem" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Dots indicator */}
        <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "1.5rem" }}>
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              style={{
                width: index === currentSlide ? "2rem" : "0.5rem",
                height: "0.5rem",
                borderRadius: "9999px",
                backgroundColor: index === currentSlide ? "#2563eb" : "#d1d5db",
                border: "none",
                cursor: "pointer",
                transition: "all 0.3s",
              }}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    );
  }

  // List layout
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {testimonials.map(renderTestimonialCard)}
    </div>
  );
};

export default TestimonialsDisplay;
