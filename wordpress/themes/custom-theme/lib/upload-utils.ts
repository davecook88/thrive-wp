/**
 * Upload Utilities
 *
 * Reusable utility functions for file uploads.
 */

/**
 * File upload constraints interface
 */
export interface UploadConstraints {
  maxSize?: number;
  allowedTypes?: string[];
  maxWidth?: number;
  maxHeight?: number;
  minWidth?: number;
  minHeight?: number;
}

/**
 * Upload result interface
 */
export interface UploadResult {
  success: boolean;
  attachment_id?: number;
  url?: string;
  message?: string;
  error?: string;
}

/**
 * File validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Default constraints for different file types
 */
export const DEFAULT_CONSTRAINTS = {
  image: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  },
  profilePicture: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
    minWidth: 100,
    minHeight: 100,
    maxWidth: 4000,
    maxHeight: 4000,
  },
  document: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ["application/pdf", "application/msword"],
  },
};

/**
 * Validate a file against constraints.
 *
 * @param file - The file to validate
 * @param constraints - Validation constraints
 * @returns Validation result
 */
export function validateFile(
  file: File,
  constraints: UploadConstraints = {}
): ValidationResult {
  // Check file size
  if (constraints.maxSize && file.size > constraints.maxSize) {
    const maxMB = (constraints.maxSize / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${maxMB} MB.`,
    };
  }

  // Check file type
  if (
    constraints.allowedTypes &&
    !constraints.allowedTypes.includes(file.type)
  ) {
    return {
      valid: false,
      error: `File type "${file.type}" is not allowed. Allowed types: ${constraints.allowedTypes.join(", ")}`,
    };
  }

  // For images, validate dimensions (async validation happens after load)
  if (
    file.type.startsWith("image/") &&
    (constraints.minWidth ||
      constraints.minHeight ||
      constraints.maxWidth ||
      constraints.maxHeight)
  ) {
    // This will be checked in validateImageDimensions
    return { valid: true };
  }

  return { valid: true };
}

/**
 * Validate image dimensions.
 *
 * @param file - The image file to validate
 * @param constraints - Dimension constraints
 * @returns Promise with validation result
 */
export function validateImageDimensions(
  file: File,
  constraints: UploadConstraints
): Promise<ValidationResult> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const { width, height } = img;

      // Check minimum dimensions
      if (constraints.minWidth && width < constraints.minWidth) {
        resolve({
          valid: false,
          error: `Image width must be at least ${constraints.minWidth}px.`,
        });
        return;
      }

      if (constraints.minHeight && height < constraints.minHeight) {
        resolve({
          valid: false,
          error: `Image height must be at least ${constraints.minHeight}px.`,
        });
        return;
      }

      // Check maximum dimensions
      if (constraints.maxWidth && width > constraints.maxWidth) {
        resolve({
          valid: false,
          error: `Image width must not exceed ${constraints.maxWidth}px.`,
        });
        return;
      }

      if (constraints.maxHeight && height > constraints.maxHeight) {
        resolve({
          valid: false,
          error: `Image height must not exceed ${constraints.maxHeight}px.`,
        });
        return;
      }

      resolve({ valid: true });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        valid: false,
        error: "Failed to load image for dimension validation.",
      });
    };

    img.src = url;
  });
}

/**
 * Upload a file to the server.
 *
 * @param file - The file to upload
 * @param endpoint - The upload endpoint URL
 * @param onProgress - Optional progress callback (0-100)
 * @returns Promise with upload result
 */
export function uploadFile(
  file: File,
  endpoint: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();

    // Track upload progress
    if (onProgress) {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          onProgress(progress);
        }
      });
    }

    // Handle completion
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (error) {
          reject({
            success: false,
            error: "Failed to parse server response.",
          });
        }
      } else {
        try {
          const errorResponse = JSON.parse(xhr.responseText);
          resolve({
            success: false,
            error: errorResponse.message || "Upload failed.",
          });
        } catch {
          resolve({
            success: false,
            error: `Upload failed with status ${xhr.status}.`,
          });
        }
      }
    });

    // Handle errors
    xhr.addEventListener("error", () => {
      reject({
        success: false,
        error: "Network error occurred during upload.",
      });
    });

    xhr.addEventListener("abort", () => {
      reject({
        success: false,
        error: "Upload was cancelled.",
      });
    });

    xhr.open("POST", endpoint);
    xhr.send(formData);
  });
}

/**
 * Delete a file from the server.
 *
 * @param endpoint - The delete endpoint URL
 * @returns Promise with result
 */
export async function deleteFile(endpoint: string): Promise<UploadResult> {
  try {
    const response = await fetch(endpoint, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || "Failed to delete file.",
      };
    }

    return data;
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete file.",
    };
  }
}

/**
 * Format file size for display.
 *
 * @param bytes - File size in bytes
 * @returns Formatted file size string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Get file extension from filename.
 *
 * @param filename - The filename
 * @returns File extension (without dot)
 */
export function getFileExtension(filename: string): string {
  return filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2);
}

/**
 * Check if a file is an image.
 *
 * @param file - The file to check
 * @returns True if file is an image
 */
export function isImage(file: File): boolean {
  return file.type.startsWith("image/");
}

/**
 * Create a preview URL for an image file.
 *
 * @param file - The image file
 * @returns Object URL for preview (remember to revoke when done)
 */
export function createImagePreview(file: File): string {
  return URL.createObjectURL(file);
}
