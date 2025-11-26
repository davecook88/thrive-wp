import React, { useState, useEffect } from "react";
import { thriveClient } from "../../../../shared/thrive";
import {
  CourseStepMaterialDto,
  StudentCourseStepMaterialProgressDto,
  ProgressStatus,
  StudentAnswerDto,
} from "@thrive/shared";
import { MaterialViewer } from "./components/MaterialViewer";

interface StudentCourseMaterialsProps {
  courseStepId: number;
  studentPackageId: number;
}

const Icons = {
  Check: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Circle: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
    </svg>
  ),
  Clock: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  FileText: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  ),
  Video: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  ),
  Download: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  ChevronRight: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  Menu: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
  X: () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
};

export const StudentCourseMaterials: React.FC<StudentCourseMaterialsProps> = ({
  courseStepId,
  studentPackageId,
}) => {
  const [materials, setMaterials] = useState<CourseStepMaterialDto[]>([]);
  const [progress, setProgress] = useState<
    StudentCourseStepMaterialProgressDto[]
  >([]);
  const [answers, setAnswers] = useState<StudentAnswerDto[]>([]);
  const [activePackageId, setActivePackageId] = useState(studentPackageId);
  const [currentMaterialIndex, setCurrentMaterialIndex] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return parseInt(params.get("material") || "0", 10);
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Update URL when material index changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("material", currentMaterialIndex.toString());
    window.history.replaceState({}, "", `?${params.toString()}`);
  }, [currentMaterialIndex]);

  useEffect(() => {
    loadMaterials();
  }, [courseStepId]);

  const loadMaterials = async () => {
    try {
      setLoading(true);
      setError(null);

      let pkgId = studentPackageId;
      if (!pkgId) {
        const enrollment =
          await thriveClient.getEnrollmentForStep(courseStepId);
        if (enrollment) {
          pkgId = enrollment.studentPackageId;
          setActivePackageId(pkgId);
        }
      }

      const [materialsData, progressData, answersData] = await Promise.all([
        thriveClient.getCourseStepMaterials(courseStepId),
        thriveClient.getCourseStepProgress(courseStepId),
        thriveClient.getMyAnswers(),
      ]);

      setMaterials(materialsData);
      setProgress(progressData);
      setAnswers(answersData);
    } catch (err) {
      console.error("Failed to load materials:", err);
      setError("Failed to load course materials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleProgressUpdate = async (
    materialId: number,
    status: ProgressStatus,
  ) => {
    if (!activePackageId) {
      console.error("No active package ID found for progress update");
      return;
    }

    try {
      const updated = await thriveClient.updateMaterialProgress({
        courseStepMaterialId: materialId,
        studentPackageId: activePackageId,
        status,
      });

      if (updated) {
        setProgress((prev) => {
          const existing = prev.find(
            (p) => p.courseStepMaterialId === materialId,
          );
          if (existing) {
            return prev.map((p) =>
              p.courseStepMaterialId === materialId ? updated : p,
            );
          }
          return [...prev, updated];
        });

        // Auto-advance to next material if completed
        if (
          status === "completed" &&
          currentMaterialIndex < materials.length - 1
        ) {
          setCurrentMaterialIndex(currentMaterialIndex + 1);
        }
      }
    } catch (err) {
      console.error("Failed to update progress:", err);
      setError("Failed to update progress. Please try again.");
    }
  };

  const getMaterialProgress = (materialId: number) => {
    return progress.find((p) => p.courseStepMaterialId === materialId);
  };

  const getMaterialIcon = (type: string) => {
    switch (type) {
      case "video_embed":
        return <Icons.Video />;
      case "file":
        return <Icons.Download />;
      case "rich_text":
      default:
        return <Icons.FileText />;
    }
  };

  const getMaterialTypeLabel = (type: string) => {
    switch (type) {
      case "video_embed":
        return "Video";
      case "file":
        return "Download";
      case "rich_text":
        return "Read";
      default:
        return "Content";
    }
  };

  const handleMaterialSelect = (index: number) => {
    setCurrentMaterialIndex(index);
    setShowMobileMenu(false);
  };

  if (loading) {
    return (
      <div className="course-materials-loading">
        <div className="spinner"></div>
        <p>Loading course materials...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="course-materials-error">
        <p>{error}</p>
        <button onClick={loadMaterials} className="btn btn-primary">
          Retry
        </button>
      </div>
    );
  }

  if (materials.length === 0) {
    return (
      <div className="course-materials-empty">
        <div className="empty-state-icon">📚</div>
        <h3>No materials yet</h3>
        <p>This step doesn't have any materials assigned to it yet.</p>
      </div>
    );
  }

  const currentMaterial = materials[currentMaterialIndex];
  const currentProgress = getMaterialProgress(currentMaterial.id);

  // Find answer for the current material's question (if applicable)
  const currentAnswer =
    currentMaterial.type === "question" && currentMaterial.questions?.[0]
      ? answers.find((a) => a.questionId === currentMaterial.questions![0].id)
      : undefined;

  return (
    <div
      className={`student-course-materials ${showMobileMenu ? "mobile-menu-open" : ""}`}
    >
      <div className="mobile-header-controls">
        <button
          className="btn-mobile-menu"
          onClick={() => setShowMobileMenu(!showMobileMenu)}
        >
          {showMobileMenu ? <Icons.X /> : <Icons.Menu />}
          <span>{showMobileMenu ? "Close Menu" : "Course Menu"}</span>
        </button>
        <span className="mobile-progress">
          {currentMaterialIndex + 1} / {materials.length}
        </span>
      </div>

      <div className="materials-sidebar">
        <div className="sidebar-header">
          <h3>Course Materials</h3>
          <span className="material-count">{materials.length} items</span>
        </div>
        <ul className="materials-list">
          {materials.map((material, index) => {
            const materialProgress = getMaterialProgress(material.id);
            const isActive = index === currentMaterialIndex;
            const isCompleted = materialProgress?.status === "completed";
            const isInProgress = materialProgress?.status === "in_progress";

            return (
              <li
                key={material.id}
                className={`material-item ${isActive ? "active" : ""} ${isCompleted ? "completed" : ""} ${isInProgress ? "in-progress" : ""}`}
                onClick={() => handleMaterialSelect(index)}
              >
                <div className="material-status-icon">
                  {isCompleted ? (
                    <Icons.Check />
                  ) : isInProgress ? (
                    <Icons.Clock />
                  ) : (
                    <Icons.Circle />
                  )}
                </div>
                <div className="material-info">
                  <span className="material-title">{material.title}</span>
                  <div className="material-meta">
                    <span className="material-type">
                      {getMaterialIcon(material.type)}
                      {getMaterialTypeLabel(material.type)}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="materials-content-wrapper">
        <div className="materials-content">
          <div className="material-header">
            <div className="header-top">
              <span className="step-indicator">
                Step {currentMaterialIndex + 1} of {materials.length}
              </span>
              <div className="progress-bar-container">
                <div
                  className="progress-fill"
                  style={{
                    width: `${((currentMaterialIndex + 1) / materials.length) * 100}%`,
                  }}
                ></div>
              </div>
            </div>
            <h2>{currentMaterial.title}</h2>
            {currentMaterial.description && (
              <p className="material-description">
                {currentMaterial.description}
              </p>
            )}
          </div>

          <div className="material-body">
            <MaterialViewer
              material={currentMaterial}
              progress={currentProgress}
              answer={currentAnswer}
              onProgressUpdate={(status: ProgressStatus) =>
                handleProgressUpdate(currentMaterial.id, status)
              }
              studentPackageId={activePackageId}
            />
          </div>

          <div className="material-footer">
            <button
              onClick={() => setCurrentMaterialIndex(currentMaterialIndex - 1)}
              disabled={currentMaterialIndex === 0}
              className="btn-nav btn-previous"
            >
              <Icons.ChevronLeft /> Previous
            </button>

            {currentProgress?.status !== "completed" ? (
              <button
                onClick={() =>
                  handleProgressUpdate(currentMaterial.id, "completed")
                }
                className="btn-complete"
              >
                Mark as Complete <Icons.Check />
              </button>
            ) : (
              <div className="completed-badge">
                <Icons.Check /> Completed
              </div>
            )}

            <button
              onClick={() => setCurrentMaterialIndex(currentMaterialIndex + 1)}
              disabled={currentMaterialIndex === materials.length - 1}
              className="btn-nav btn-next"
            >
              Next <Icons.ChevronRight />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
