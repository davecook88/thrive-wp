import { createElement, useState, useRef } from "@wordpress/element";
import {
  validateFile,
  validateImageDimensions,
  resizeImage,
  uploadFile,
  isImage,
  createImagePreview,
  formatFileSize,
  UploadConstraints,
  UploadResult,
} from "../lib/upload-utils";

export interface MediaUploadProps {
  /** Upload endpoint URL */
  endpoint: string;
  /** Upload constraints */
  constraints?: UploadConstraints;
  /** Callback when upload succeeds */
  onUploadSuccess: (result: UploadResult) => void;
  /** Callback when upload fails */
  onUploadError?: (error: string) => void;
  /** Accept attribute for file input (e.g., "image/*") */
  accept?: string;
  /** Label text for the upload area */
  label?: string;
  /** Show preview for images */
  showPreview?: boolean;
  /** Custom class name */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

/**
 * Generic reusable file upload component.
 *
 * Features:
 * - Drag and drop support
 * - File validation
 * - Upload progress
 * - Image preview
 * - Error handling
 */
export function MediaUpload({
  endpoint,
  constraints = {},
  onUploadSuccess,
  onUploadError,
  accept = "*",
  label = "Click to upload or drag and drop",
  showPreview = true,
  className = "",
  disabled = false,
}: MediaUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Handle file selection (from input or drop)
   */
  const handleFileSelect = async (file: File) => {
    setError(null);
    setSelectedFile(file);

    // Basic validation - skip size check for images (we'll resize them)
    const skipSizeCheck = isImage(file);
    const validation = validateFile(file, constraints, skipSizeCheck);
    if (!validation.valid) {
      setError(validation.error || "File validation failed");
      setSelectedFile(null);
      return;
    }

    let processedFile = file;

    // Image dimension and size validation (if applicable)
    if (isImage(file) && constraints) {
      // Always try to resize images to ensure they meet constraints
      try {
        processedFile = await resizeImage(file, constraints);
        console.log('Resized image from', file.size, 'to', processedFile.size, 'bytes');
      } catch (err) {
        console.error('Failed to resize image:', err);
        setError(err instanceof Error ? err.message : "Failed to resize image");
        setSelectedFile(null);
        return;
      }
      
      // Validate the processed image dimensions
      const dimensionValidation = await validateImageDimensions(
        processedFile,
        constraints,
      );
      if (!dimensionValidation.valid) {
        setError(dimensionValidation.error || "Image validation failed");
        setSelectedFile(null);
        return;
      }

      // Final size check after resize
      if (constraints.maxSize && processedFile.size > constraints.maxSize) {
        const maxMB = (constraints.maxSize / (1024 * 1024)).toFixed(1);
        setError(`File size still exceeds ${maxMB} MB after compression. Please use a smaller image.`);
        setSelectedFile(null);
        return;
      }
    }

    // Show preview for images
    if (showPreview && isImage(processedFile)) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      const preview = createImagePreview(processedFile);
      setPreviewUrl(preview);
    }

    // Validate the file before upload
    if (!processedFile || processedFile.size === 0) {
      console.error('Invalid file after processing:', processedFile);
      setError('Failed to process image. Please try a different file.');
      setSelectedFile(null);
      return;
    }

    console.log('Uploading file:', {
      name: processedFile.name,
      size: processedFile.size,
      type: processedFile.type,
    });

    // Auto-upload the file
    await handleUpload(processedFile);
  };

  /**
   * Upload the file
   */
  const handleUpload = async (file: File) => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const result = await uploadFile(file, endpoint, (progress) => {
        setProgress(progress);
      });

      if (result.success) {
        onUploadSuccess(result);
      } else {
        const errorMessage = result.error || "Upload failed";
        setError(errorMessage);
        if (onUploadError) {
          onUploadError(errorMessage);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Upload failed";
      setError(errorMessage);
      if (onUploadError) {
        onUploadError(errorMessage);
      }
    } finally {
      setUploading(false);
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    }
  };

  /**
   * Handle file input change
   */
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  /**
   * Handle drag events
   */
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  /**
   * Handle click to open file dialog
   */
  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Build class names
  const containerClasses = [
    "media-upload-container",
    className,
    isDragging ? "dragging" : "",
    disabled ? "disabled" : "",
    uploading ? "uploading" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return createElement("div", { className: containerClasses }, [
    // Hidden file input
    createElement("input", {
      key: "file-input",
      ref: fileInputRef,
      type: "file",
      accept,
      onChange: handleFileInputChange,
      style: { display: "none" },
      disabled,
    }),

    // Drop zone
    createElement(
      "div",
      {
        key: "drop-zone",
        className: "media-upload-dropzone",
        onClick: handleClick,
        onDragEnter: handleDragEnter,
        onDragLeave: handleDragLeave,
        onDragOver: handleDragOver,
        onDrop: handleDrop,
      },
      [
        // Preview (if available)
        showPreview &&
          previewUrl &&
          createElement("img", {
            key: "preview",
            src: previewUrl,
            alt: "Preview",
            className: "media-upload-preview",
          }),

        // Label
        !uploading &&
          createElement(
            "div",
            {
              key: "label",
              className: "media-upload-label",
            },
            [
              createElement(
                "span",
                { key: "label-text", className: "media-upload-label-text" },
                label,
              ),
              selectedFile &&
                createElement(
                  "span",
                  {
                    key: "file-info",
                    className: "media-upload-file-info",
                  },
                  `${selectedFile.name} (${formatFileSize(selectedFile.size)})`,
                ),
            ],
          ),

        // Progress bar
        uploading &&
          createElement(
            "div",
            {
              key: "progress-container",
              className: "media-upload-progress-container",
            },
            [
              createElement(
                "div",
                {
                  key: "progress-label",
                  className: "media-upload-progress-label",
                },
                `Uploading... ${progress}%`,
              ),
              createElement(
                "div",
                {
                  key: "progress-bar-bg",
                  className: "media-upload-progress-bar-bg",
                },
                createElement("div", {
                  key: "progress-bar",
                  className: "media-upload-progress-bar",
                  style: { width: `${progress}%` },
                }),
              ),
            ],
          ),
      ],
    ),

    // Error message
    error &&
      createElement(
        "div",
        {
          key: "error",
          className: "media-upload-error",
        },
        error,
      ),
  ]);
}
