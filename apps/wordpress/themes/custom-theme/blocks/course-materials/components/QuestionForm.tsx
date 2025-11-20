import React, { useState } from "react";
import { thriveClient } from "../../../../../shared/thrive";
import { MaterialQuestionDto } from "@thrive/shared";

interface QuestionFormProps {
  question: MaterialQuestionDto;
  onSubmit: () => void;
}

export const QuestionForm: React.FC<QuestionFormProps> = ({
  question,
  onSubmit,
}) => {
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (submitted) {
    return (
      <div className="question-submitted">
        <div className="success-icon">✓</div>
        <h3>Answer Submitted!</h3>
        <p>Your answer has been submitted for review.</p>
      </div>
    );
  }

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
                <label key={key} className="option-label">
                  <input
                    type="radio"
                    name="answer"
                    value={key}
                    checked={answer === key}
                    onChange={(e) => setAnswer(e.target.value)}
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
          />
        );

      case "file_upload":
        return (
          <div className="question-file-upload">
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
          </div>
        );

      case "video_upload":
        return (
          <div className="question-video-upload">
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

      <form onSubmit={handleSubmit}>
        {renderQuestionInput()}

        {error && <div className="error-message">{error}</div>}

        <button
          type="submit"
          disabled={submitting || !answer}
          className="btn-submit-answer"
        >
          {submitting ? "Submitting..." : "Submit Answer"}
        </button>
      </form>
    </div>
  );
};
