import React from "react";
import {
  CourseStepMaterialDto,
  StudentCourseStepMaterialProgressDto,
  ProgressStatus,
} from "@thrive/shared";
import { QuestionForm } from "./QuestionForm";

interface MaterialViewerProps {
  material: CourseStepMaterialDto;
  progress: StudentCourseStepMaterialProgressDto | undefined;
  onProgressUpdate: (status: ProgressStatus) => void;
  studentPackageId: number;
}

export const MaterialViewer: React.FC<MaterialViewerProps> = ({
  material,
  progress,
  onProgressUpdate,
  studentPackageId,
}) => {
  const renderContent = () => {
    switch (material.type) {
      case "file":
        return (
          <div className="material-file">
            <div className="file-preview">
              <svg
                className="file-icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              <p>File Material</p>
            </div>
            {material.content && (
              <a
                href={material.content}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-download"
                onClick={() => {
                  if (!progress || progress.status === "not_started") {
                    onProgressUpdate("in_progress");
                  }
                }}
              >
                Download / View File
              </a>
            )}
          </div>
        );

      case "video_embed":
        return (
          <div className="material-video">
            {material.content && (
              <div
                className="video-container"
                dangerouslySetInnerHTML={{ __html: material.content }}
                onPlay={() => {
                  if (!progress || progress.status === "not_started") {
                    onProgressUpdate("in_progress");
                  }
                }}
              />
            )}
          </div>
        );

      case "rich_text":
        return (
          <div className="material-rich-text">
            {material.content && (
              <div
                className="rich-text-content"
                dangerouslySetInnerHTML={{ __html: material.content }}
              />
            )}
          </div>
        );

      case "question":
        if (!material.questions || material.questions.length === 0) {
          return (
            <div className="material-error">
              <p>Question data is missing.</p>
            </div>
          );
        }
        return (
          <QuestionForm
            question={material.questions[0]}
            onSubmit={() => onProgressUpdate("completed")}
          />
        );

      default:
        return (
          <div className="material-error">
            <p>Unknown material type: {material.type}</p>
          </div>
        );
    }
  };

  return (
    <div className="material-viewer">
      <div className="material-content-wrapper">{renderContent()}</div>
    </div>
  );
};
