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
    props.defaultLevelId,
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
          `/api/course-programs/browse?${params.toString()}`,
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
            type="button"
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
            type="button"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
