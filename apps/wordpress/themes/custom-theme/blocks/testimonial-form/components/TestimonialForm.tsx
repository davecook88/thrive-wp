import React, { useEffect, useState } from "react";
import { thriveClient } from "../../../../../shared/thrive";
import type {
  TestimonialEligibilityDto,
  TestimonialResponseDto,
  CreateTestimonialDto,
} from "@thrive/shared";

interface TestimonialFormProps {
  showMyTestimonials: boolean;
  allowGeneralTestimonials: boolean;
  thankYouMessage: string;
}

type TestimonialType = "teacher" | "course" | "general";

const TestimonialForm: React.FC<TestimonialFormProps> = ({
  showMyTestimonials,
  allowGeneralTestimonials,
  thankYouMessage,
}) => {
  const [eligibility, setEligibility] = useState<TestimonialEligibilityDto | null>(null);
  const [myTestimonials, setMyTestimonials] = useState<TestimonialResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [testimonialType, setTestimonialType] = useState<TestimonialType>("teacher");
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [eligibilityData, testimonialsData] = await Promise.all([
        thriveClient.checkTestimonialEligibility(),
        showMyTestimonials ? thriveClient.getMyTestimonials() : Promise.resolve([]),
      ]);

      setEligibility(eligibilityData);
      setMyTestimonials(testimonialsData);

      // Set default selections
      if (eligibilityData.eligibleTeachers.length > 0) {
        setSelectedTeacherId(eligibilityData.eligibleTeachers[0].teacherId);
      } else if (eligibilityData.eligibleCourses.length > 0) {
        setTestimonialType("course");
        setSelectedCourseId(eligibilityData.eligibleCourses[0].courseProgramId);
      } else if (allowGeneralTestimonials && eligibilityData.canSubmitGeneral) {
        setTestimonialType("general");
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load form. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const dto: CreateTestimonialDto = {
        rating,
        comment: comment.trim() || undefined,
        teacherId: testimonialType === "teacher" ? selectedTeacherId ?? undefined : undefined,
        courseProgramId: testimonialType === "course" ? selectedCourseId ?? undefined : undefined,
      };

      await thriveClient.submitTestimonial(dto);

      setSuccess(true);
      setComment("");
      setRating(5);

      // Refresh data
      await fetchData();

      // Scroll to success message
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      console.error("Error submitting testimonial:", err);
      setError(err.message || "Failed to submit testimonial. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (currentRating: number, interactive: boolean = false) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <button
          key={i}
          type="button"
          onClick={() => interactive && setRating(i)}
          disabled={!interactive}
          style={{
            fontSize: "2rem",
            color: i <= currentRating ? "#fbbf24" : "#d1d5db",
            backgroundColor: "transparent",
            border: "none",
            cursor: interactive ? "pointer" : "default",
            padding: "0 4px",
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) => {
            if (interactive) {
              e.currentTarget.style.color = "#fbbf24";
            }
          }}
          onMouseLeave={(e) => {
            if (interactive && i > currentRating) {
              e.currentTarget.style.color = "#d1d5db";
            }
          }}
        >
          ★
        </button>
      );
    }
    return <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>{stars}</div>;
  };

  const canSubmit = () => {
    if (testimonialType === "teacher" && !selectedTeacherId) return false;
    if (testimonialType === "course" && !selectedCourseId) return false;
    if (testimonialType === "general" && (!allowGeneralTestimonials || !eligibility?.canSubmitGeneral)) return false;
    return true;
  };

  // Loading state
  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "3rem 0" }}>
        <div
          style={{
            animation: "spin 1s linear infinite",
            borderRadius: "9999px",
            height: "3rem",
            width: "3rem",
            borderWidth: "2px",
            borderColor: "#2563eb transparent",
          }}
        />
      </div>
    );
  }

  // No eligibility
  if (
    !eligibility ||
    (eligibility.eligibleTeachers.length === 0 &&
      eligibility.eligibleCourses.length === 0 &&
      (!allowGeneralTestimonials || !eligibility.canSubmitGeneral))
  ) {
    return (
      <div
        style={{
          backgroundColor: "#fef3c7",
          borderLeft: "4px solid #f59e0b",
          padding: "1rem",
          borderRadius: "0.375rem",
        }}
      >
        <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.5rem" }}>
          Not Eligible Yet
        </h3>
        <p style={{ fontSize: "0.875rem", color: "#92400e" }}>
          You need to attend sessions before you can submit testimonials. Please book and complete a session first!
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "48rem", margin: "0 auto" }}>
      {/* Success Message */}
      {success && (
        <div
          style={{
            backgroundColor: "#d1fae5",
            borderLeft: "4px solid #10b981",
            padding: "1rem",
            borderRadius: "0.375rem",
            marginBottom: "1.5rem",
          }}
        >
          <p style={{ fontSize: "0.875rem", color: "#065f46", fontWeight: 600 }}>
            {thankYouMessage}
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div
          style={{
            backgroundColor: "#fef2f2",
            borderLeft: "4px solid #ef4444",
            padding: "1rem",
            borderRadius: "0.375rem",
            marginBottom: "1.5rem",
          }}
        >
          <p style={{ fontSize: "0.875rem", color: "#991b1b" }}>{error}</p>
        </div>
      )}

      {/* Form */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "0.5rem",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
          padding: "1.5rem",
          marginBottom: "2rem",
        }}
      >
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>
          Submit a Testimonial
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Testimonial Type Selection */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem" }}>
              What would you like to review? <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              {eligibility.eligibleTeachers.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTestimonialType("teacher")}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "0.375rem",
                    border: testimonialType === "teacher" ? "2px solid #2563eb" : "2px solid #d1d5db",
                    backgroundColor: testimonialType === "teacher" ? "#eff6ff" : "white",
                    color: testimonialType === "teacher" ? "#2563eb" : "#4b5563",
                    fontWeight: testimonialType === "teacher" ? 600 : 400,
                    cursor: "pointer",
                  }}
                >
                  A Teacher
                </button>
              )}
              {eligibility.eligibleCourses.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTestimonialType("course")}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "0.375rem",
                    border: testimonialType === "course" ? "2px solid #2563eb" : "2px solid #d1d5db",
                    backgroundColor: testimonialType === "course" ? "#eff6ff" : "white",
                    color: testimonialType === "course" ? "#2563eb" : "#4b5563",
                    fontWeight: testimonialType === "course" ? 600 : 400,
                    cursor: "pointer",
                  }}
                >
                  A Course
                </button>
              )}
              {allowGeneralTestimonials && eligibility.canSubmitGeneral && (
                <button
                  type="button"
                  onClick={() => setTestimonialType("general")}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "0.375rem",
                    border: testimonialType === "general" ? "2px solid #2563eb" : "2px solid #d1d5db",
                    backgroundColor: testimonialType === "general" ? "#eff6ff" : "white",
                    color: testimonialType === "general" ? "#2563eb" : "#4b5563",
                    fontWeight: testimonialType === "general" ? 600 : 400,
                    cursor: "pointer",
                  }}
                >
                  General (School)
                </button>
              )}
            </div>
          </div>

          {/* Teacher Selection */}
          {testimonialType === "teacher" && eligibility.eligibleTeachers.length > 0 && (
            <div style={{ marginBottom: "1.5rem" }}>
              <label
                htmlFor="teacher-select"
                style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem" }}
              >
                Select Teacher <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                id="teacher-select"
                value={selectedTeacherId ?? ""}
                onChange={(e) => setSelectedTeacherId(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  fontSize: "1rem",
                }}
                required
              >
                {eligibility.eligibleTeachers.map((teacher) => (
                  <option key={teacher.teacherId} value={teacher.teacherId}>
                    {teacher.teacherName} ({teacher.sessionCount}{" "}
                    {teacher.sessionCount === 1 ? "session" : "sessions"})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Course Selection */}
          {testimonialType === "course" && eligibility.eligibleCourses.length > 0 && (
            <div style={{ marginBottom: "1.5rem" }}>
              <label
                htmlFor="course-select"
                style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem" }}
              >
                Select Course <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                id="course-select"
                value={selectedCourseId ?? ""}
                onChange={(e) => setSelectedCourseId(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  fontSize: "1rem",
                }}
                required
              >
                {eligibility.eligibleCourses.map((course) => (
                  <option key={course.courseProgramId} value={course.courseProgramId}>
                    {course.courseProgramTitle}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Rating */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem" }}>
              Rating <span style={{ color: "#ef4444" }}>*</span>
            </label>
            {renderStars(rating, true)}
            <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.5rem", textAlign: "center" }}>
              Click a star to rate (1-5 stars)
            </p>
          </div>

          {/* Comment */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label
              htmlFor="comment"
              style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem" }}
            >
              Your Review (Optional)
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={2000}
              rows={5}
              placeholder="Share your experience..."
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.375rem",
                fontSize: "1rem",
                resize: "vertical",
              }}
            />
            <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.5rem" }}>
              {comment.length}/2000 characters
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || !canSubmit()}
            style={{
              width: "100%",
              padding: "0.75rem 1.5rem",
              backgroundColor: submitting || !canSubmit() ? "#9ca3af" : "#2563eb",
              color: "white",
              fontWeight: 600,
              borderRadius: "0.375rem",
              border: "none",
              cursor: submitting || !canSubmit() ? "not-allowed" : "pointer",
              fontSize: "1rem",
            }}
          >
            {submitting ? "Submitting..." : "Submit Testimonial"}
          </button>
        </form>
      </div>

      {/* My Testimonials */}
      {showMyTestimonials && myTestimonials.length > 0 && (
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "0.5rem",
            boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
            padding: "1.5rem",
          }}
        >
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>
            My Testimonials
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {myTestimonials.map((testimonial) => (
              <div
                key={testimonial.id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.5rem",
                  padding: "1rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "0.75rem" }}>
                  <div>
                    {renderStars(testimonial.rating, false)}
                    <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.25rem" }}>
                      {testimonial.teacherName && `Teacher: ${testimonial.teacherName}`}
                      {testimonial.courseProgramTitle && `Course: ${testimonial.courseProgramTitle}`}
                      {!testimonial.teacherName && !testimonial.courseProgramTitle && "General Testimonial"}
                    </p>
                  </div>
                  <span
                    style={{
                      padding: "0.25rem 0.75rem",
                      borderRadius: "9999px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      backgroundColor:
                        testimonial.status === "approved"
                          ? "#d1fae5"
                          : testimonial.status === "rejected"
                          ? "#fee2e2"
                          : "#fef3c7",
                      color:
                        testimonial.status === "approved"
                          ? "#065f46"
                          : testimonial.status === "rejected"
                          ? "#991b1b"
                          : "#92400e",
                    }}
                  >
                    {testimonial.status.charAt(0).toUpperCase() + testimonial.status.slice(1)}
                  </span>
                </div>

                {testimonial.comment && (
                  <p style={{ color: "#374151", marginBottom: "0.75rem", fontStyle: "italic" }}>
                    "{testimonial.comment}"
                  </p>
                )}

                {testimonial.adminFeedback && (
                  <div
                    style={{
                      backgroundColor: "#f9fafb",
                      borderLeft: "3px solid #6b7280",
                      padding: "0.75rem",
                      borderRadius: "0.25rem",
                      marginTop: "0.75rem",
                    }}
                  >
                    <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#4b5563", marginBottom: "0.25rem" }}>
                      Admin Feedback:
                    </p>
                    <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                      {testimonial.adminFeedback}
                    </p>
                  </div>
                )}

                <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.5rem" }}>
                  Submitted {new Date(testimonial.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TestimonialForm;
