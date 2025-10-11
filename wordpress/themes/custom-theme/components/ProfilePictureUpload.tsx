import { createElement, useState } from "@wordpress/element";
import { MediaUpload } from "./MediaUpload";
import { deleteFile, DEFAULT_CONSTRAINTS, UploadResult } from "../lib/upload-utils";

export interface ProfilePictureUploadProps {
  /** Current avatar URL (if any) */
  currentAvatarUrl?: string | null;
  /** Callback when avatar is updated */
  onAvatarUpdate: (url: string | null) => void;
  /** Callback when operation fails */
  onError?: (error: string) => void;
  /** Show name/label above avatar */
  userName?: string;
  /** Disabled state */
  disabled?: boolean;
}

/**
 * Profile Picture Upload Component
 *
 * Specialized component for uploading teacher profile pictures.
 * Features:
 * - Circular avatar preview
 * - Upload via MediaUpload component
 * - Remove existing avatar
 * - Integration with WordPress REST API
 */
export function ProfilePictureUpload({
  currentAvatarUrl,
  onAvatarUpdate,
  onError,
  userName,
  disabled = false,
}: ProfilePictureUploadProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    currentAvatarUrl || null
  );
  const [removing, setRemoving] = useState(false);
  const [showUploader, setShowUploader] = useState(false);

  const endpoint = "/wp-json/thrive/v1/teachers/me/profile-picture";

  /**
   * Handle successful upload
   */
  const handleUploadSuccess = (result: UploadResult) => {
    if (result.url) {
      setAvatarUrl(result.url);
      onAvatarUpdate(result.url);
      setShowUploader(false);
    }
  };

  /**
   * Handle upload error
   */
  const handleUploadError = (error: string) => {
    if (onError) {
      onError(error);
    }
  };

  /**
   * Handle remove avatar
   */
  const handleRemoveAvatar = async () => {
    if (!avatarUrl || disabled) return;

    setRemoving(true);

    try {
      const result = await deleteFile(endpoint);

      if (result.success) {
        setAvatarUrl(null);
        onAvatarUpdate(null);
      } else {
        if (onError) {
          onError(result.error || "Failed to remove avatar");
        }
      }
    } catch (err) {
      if (onError) {
        onError(
          err instanceof Error ? err.message : "Failed to remove avatar"
        );
      }
    } finally {
      setRemoving(false);
    }
  };

  /**
   * Toggle uploader visibility
   */
  const handleChangePhoto = () => {
    setShowUploader(!showUploader);
  };

  return createElement("div", { className: "profile-picture-upload" }, [
    // User name label (if provided)
    userName &&
      createElement(
        "div",
        { key: "user-name", className: "profile-picture-user-name" },
        userName
      ),

    // Avatar preview container
    createElement(
      "div",
      { key: "avatar-container", className: "profile-picture-container" },
      [
        // Avatar image or placeholder
        createElement(
          "div",
          {
            key: "avatar-wrapper",
            className: "profile-picture-avatar-wrapper",
          },
          avatarUrl
            ? createElement("img", {
                key: "avatar-img",
                src: avatarUrl,
                alt: userName || "Profile picture",
                className: "profile-picture-avatar",
              })
            : createElement(
                "div",
                {
                  key: "avatar-placeholder",
                  className: "profile-picture-placeholder",
                },
                createElement(
                  "svg",
                  {
                    key: "placeholder-icon",
                    xmlns: "http://www.w3.org/2000/svg",
                    viewBox: "0 0 24 24",
                    fill: "currentColor",
                    className: "profile-picture-placeholder-icon",
                  },
                  createElement("path", {
                    d: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
                  })
                )
              )
        ),

        // Action buttons
        createElement(
          "div",
          {
            key: "actions",
            className: "profile-picture-actions",
          },
          [
            // Change/Upload button
            createElement(
              "button",
              {
                key: "change-btn",
                type: "button",
                onClick: handleChangePhoto,
                disabled: disabled,
                className: "profile-picture-btn profile-picture-btn-primary",
              },
              avatarUrl ? "Change Photo" : "Upload Photo"
            ),

            // Remove button (only show if avatar exists)
            avatarUrl &&
              createElement(
                "button",
                {
                  key: "remove-btn",
                  type: "button",
                  onClick: handleRemoveAvatar,
                  disabled: disabled || removing,
                  className: "profile-picture-btn profile-picture-btn-danger",
                },
                removing ? "Removing..." : "Remove"
              ),
          ]
        ),
      ]
    ),

    // Upload component (shown when user clicks change/upload)
    showUploader &&
      createElement(
        "div",
        {
          key: "uploader",
          className: "profile-picture-uploader",
        },
        [
          createElement("h4", { key: "uploader-title" }, "Upload Profile Picture"),
          createElement(MediaUpload, {
            key: "media-upload",
            endpoint,
            constraints: DEFAULT_CONSTRAINTS.profilePicture,
            onUploadSuccess: handleUploadSuccess,
            onUploadError: handleUploadError,
            accept: "image/*",
            label: "Click to upload or drag and drop an image",
            showPreview: true,
            disabled,
          }),
          createElement(
            "button",
            {
              key: "cancel-btn",
              type: "button",
              onClick: () => setShowUploader(false),
              className: "profile-picture-btn profile-picture-btn-secondary",
            },
            "Cancel"
          ),
        ]
      ),
  ]);
}
