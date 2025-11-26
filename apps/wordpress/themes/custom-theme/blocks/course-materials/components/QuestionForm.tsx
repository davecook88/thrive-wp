import React, { useState, useEffect } from "react";
import { thriveClient } from "../../../../../shared/thrive";
import { MaterialQuestionDto, StudentAnswerDto } from "@thrive/shared";

interface QuestionFormProps {
  question: MaterialQuestionDto;
  answer?: StudentAnswerDto;
  onSubmit: () => void;
}

export const QuestionForm: React.FC<QuestionFormProps> = ({
  question,
  answer: initialAnswer,
  onSubmit,
}) => {
  const [answer, setAnswer] = useState(initialAnswer?.answerContent || "");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(!!initialAnswer);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Update state when initialAnswer changes (e.g. when navigating between questions)
  useEffect(() => {
    if (initialAnswer) {
      setAnswer(initialAnswer.answerContent);
      setSubmitted(true);
      setIsEditing(initialAnswer.status === "needs_revision");
    } else {
      setAnswer("");
      setSubmitted(false);
      setIsEditing(true);
    }
  }, [initialAnswer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!answer.trim()) {
      setError("Please provide an answer.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const result = await thriveClient.submitAnswer({
        questionId: question.id,
        answerContent: answer,
      });

      if (result) {
        setSubmitted(true);
        setIsEditing(false);
        onSubmit();
      } else {
        setError("Failed to submit answer. Please try again.");
      }
    } catch (err) {
      console.error("Failed to submit answer:", err);
      setError("Failed to submit answer. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const canEdit = !submitted || isEditing;

  const renderStatus = () => {
    if (!initialAnswer) return null;

    switch (initialAnswer.status) {
      case "approved":
        return (
          <div className="answer-status status-approved">
            <div className="status-icon">✓</div>
            <div className="status-content">
              <h4>Approved</h4>
              {initialAnswer.feedback && <p>{initialAnswer.feedback}</p>}
            </div>
          </div>
        );
      case "needs_revision":
        return (
          <div className="answer-status status-revision">
            <div className="status-icon">⚠️</div>
            <div className="status-content">
              <h4>Needs Revision</h4>
              {initialAnswer.feedback && <p>{initialAnswer.feedback}</p>}
              {!isEditing && (
                <button
                  className="btn-resubmit"
                  onClick={() => setIsEditing(true)}
                >
                  Edit Answer
                </button>
              )}
            </div>
          </div>
        );
      case "pending_assessment":
        return (
          <div className="answer-status status-pending">
            <div className="status-icon">⏳</div>
            <div className="status-content">
              <h4>Pending Review</h4>
              <p>Your answer has been submitted and is waiting for teacher review.</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const renderQuestionInput = () => {
    switch (question.questionType) {
      case "multiple_choice":
        if (!question.options) {
          return <p>No options available for this question.</p>;
        }
        return (
          <div className="question-options">
            {Object.entries(question.options).map(([key, value]) => {
              const optionText =
                typeof value === "object" && value !== null
                  ? value.text
                  : (value as string);
              return (
                <label
                  key={key}
                  className={`option-label ${!canEdit ? "disabled" : ""}`}
                >
                  <input
                    type="radio"
                    name="answer"
                    value={key}
                    checked={answer === key}
                    onChange={(e) => setAnswer(e.target.value)}
                    disabled={!canEdit}
                  />
                  <span className="option-text">{optionText}</span>
                </label>
              );
            })}
          </div>
        );

      case "long_text":
        return (
          <textarea
            className="question-textarea"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer here..."
            rows={8}
            disabled={!canEdit}
          />
        );

      case "file_upload":
        return (
          <div className="question-file-upload">
            {canEdit ? (
              <>
                <input
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // TODO: Implement file upload to WordPress media library
                      setAnswer(`file:${file.name}`);
                    }
                  }}
                />
                <p className="upload-hint">
                  Upload your file (PDF, image, or document)
                </p>
              </>
            ) : (
              <div className="submitted-file">
                <span className="file-icon">📄</span>
                <span>{answer.replace("file:", "")}</span>
              </div>
            )}
          </div>
        );

      case "video_upload":
        return (
          <div className="question-video-upload">
            {canEdit ? (
              <>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // TODO: Implement video upload to WordPress media library
                      setAnswer(`video:${file.name}`);
                    }
                  }}
                />
                <p className="upload-hint">Upload your video response</p>
              </>
            ) : (
              <div className="submitted-file">
                <span className="file-icon">🎥</span>
                <span>{answer.replace("video:", "")}</span>
              </div>
            )}
          </div>
        );

      default:
        return <p>Unknown question type</p>;
    }
  };

  return (
    <div className="question-form">
      <div className="question-header">
        <h3>Question</h3>
        <span className="question-type-badge">{question.questionType}</span>
      </div>

      <div className="question-text">{question.questionText}</div>

      {renderStatus()}

      <form onSubmit={handleSubmit}>
        {renderQuestionInput()}

        {error && <div className="error-message">{error}</div>}

        {canEdit && (
          <button
            type="submit"
            disabled={submitting || !answer}
            className="btn-submit-answer"
          >
            {submitting ? "Submitting..." : isEditing && initialAnswer ? "Update Answer" : "Submit Answer"}
          </button>
        )}
      </form>
    </div>
  );
};
