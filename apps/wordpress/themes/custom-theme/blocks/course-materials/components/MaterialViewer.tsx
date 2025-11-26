import React from "react";
import {
  CourseStepMaterialDto,
  StudentCourseStepMaterialProgressDto,
  ProgressStatus,
  StudentAnswerDto,
} from "@thrive/shared";
import { QuestionForm } from "./QuestionForm";

interface MaterialViewerProps {
  material: CourseStepMaterialDto;
  progress: StudentCourseStepMaterialProgressDto | undefined;
  answer?: StudentAnswerDto;
  onProgressUpdate: (status: ProgressStatus) => void;
  studentPackageId: number;
}

/**
 * Converts a YouTube URL to an embed iframe
 */
const convertYouTubeToEmbed = (url: string): string => {
  // Extract video ID from various YouTube URL formats
  let videoId = "";

  // Format: https://www.youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  if (watchMatch && watchMatch[1]) {
    videoId = watchMatch[1];
  }

  // Format: https://www.youtube.com/embed/VIDEO_ID
  const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch && embedMatch[1]) {
    videoId = embedMatch[1];
  }

  if (!videoId) {
    return url; // Return original if we can't extract video ID
  }

  return `<iframe width="100%" height="600" src="https://www.youtube.com/embed/${videoId}" title="YouTube video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
};

export const MaterialViewer: React.FC<MaterialViewerProps> = ({
  material,
  progress,
  answer,
  onProgressUpdate,
  studentPackageId,
}) => {
  const renderContent = () => {
    switch (material.type) {
      // ... (file, video_embed, rich_text cases remain unchanged)
      case "file":
        const isPdf =
          material.content && material.content.toLowerCase().endsWith(".pdf");
        return (
          <div className="material-file">
            {isPdf ? (
              <div className="pdf-preview-container">
                <object
                  data={material.content}
                  type="application/pdf"
                  width="100%"
                  height="600"
                  className="pdf-viewer"
                >
                  <p>
                    PDF cannot be displayed.{" "}
                    <a
                      href={material.content}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Click here to download instead
                    </a>
                  </p>
                </object>
              </div>
            ) : (
              <>
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
              </>
            )}
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
                dangerouslySetInnerHTML={{
                  __html: material.content.includes("<iframe")
                    ? material.content
                    : convertYouTubeToEmbed(material.content as string),
                }}
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
            answer={answer}
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
