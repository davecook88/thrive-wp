import React, { useState, useEffect } from "react";
import { thriveClient } from "../../../../shared/thrive";
import {
  CourseStepMaterialDto,
  StudentCourseStepMaterialProgressDto,
  ProgressStatus,
} from "@thrive/shared";
import { MaterialViewer } from "./components/MaterialViewer";

interface StudentCourseMaterialsProps {
  courseStepId: number;
  studentPackageId: number;
}

export const StudentCourseMaterials: React.FC<StudentCourseMaterialsProps> = ({
  courseStepId,
  studentPackageId,
}) => {
  const [materials, setMaterials] = useState<CourseStepMaterialDto[]>([]);
  const [progress, setProgress] = useState<
    StudentCourseStepMaterialProgressDto[]
  >([]);
  const [activePackageId, setActivePackageId] = useState(studentPackageId);
  const [currentMaterialIndex, setCurrentMaterialIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      const [materialsData, progressData] = await Promise.all([
        thriveClient.getCourseStepMaterials(courseStepId),
        thriveClient.getCourseStepProgress(courseStepId),
      ]);

      setMaterials(materialsData);
      setProgress(progressData);
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
        <button onClick={loadMaterials}>Retry</button>
      </div>
    );
  }

  if (materials.length === 0) {
    return (
      <div className="course-materials-empty">
        <p>No materials available for this course step yet.</p>
      </div>
    );
  }

  const currentMaterial = materials[currentMaterialIndex];
  const currentProgress = getMaterialProgress(currentMaterial.id);

  return (
    <div className="student-course-materials">
      <div className="materials-sidebar">
        <h3>Course Materials</h3>
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
                onClick={() => setCurrentMaterialIndex(index)}
              >
                <div className="material-status-icon">
                  {isCompleted ? "✓" : isInProgress ? "◐" : "○"}
                </div>
                <div className="material-info">
                  <span className="material-order">{index + 1}.</span>
                  <span className="material-title">{material.title}</span>
                  <span className="material-type-badge">{material.type}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="materials-content">
        <div className="material-header">
          <h2>{currentMaterial.title}</h2>
          {currentMaterial.description && (
            <p className="material-description">
              {currentMaterial.description}
            </p>
          )}
        </div>

        <MaterialViewer
          material={currentMaterial}
          progress={currentProgress}
          onProgressUpdate={(status: ProgressStatus) =>
            handleProgressUpdate(currentMaterial.id, status)
          }
          studentPackageId={activePackageId}
        />

        <div className="material-navigation">
          <button
            onClick={() => setCurrentMaterialIndex(currentMaterialIndex - 1)}
            disabled={currentMaterialIndex === 0}
            className="btn-previous"
          >
            ← Previous
          </button>

          {currentProgress?.status !== "completed" && (
            <button
              onClick={() =>
                handleProgressUpdate(currentMaterial.id, "completed")
              }
              className="btn-complete"
            >
              Mark as Complete
            </button>
          )}

          <button
            onClick={() => setCurrentMaterialIndex(currentMaterialIndex + 1)}
            disabled={currentMaterialIndex === materials.length - 1}
            className="btn-next"
          >
            Next →
          </button>
        </div>

        <div className="progress-indicator">
          <span>
            {currentMaterialIndex + 1} of {materials.length}
          </span>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${((currentMaterialIndex + 1) / materials.length) * 100}%`,
              }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};
