# WordPress File Upload System

This document describes the reusable file upload system built on WordPress's native media library functionality.

## Architecture Overview

The upload system consists of three layers:

1. **Backend (PHP)** - WordPress REST API endpoints and services
2. **Upload Utilities (TypeScript)** - Reusable validation and upload functions
3. **Frontend Components (React)** - Reusable UI components

### Design Principles

- **Leverage WordPress Media Library**: Use WordPress's built-in media handling instead of custom file storage
- **Reusability**: Generic components can be used across the application for different upload needs
- **Security First**: Multi-layer validation (client-side, server-side, MIME type checks)
- **Progressive Enhancement**: Works with drag-and-drop and traditional file inputs

---

## Backend Layer

### 1. Upload Service (`Thrive_Upload_Service`)

**Location**: `wordpress/plugins/thrive-admin/includes/services/class-upload-service.php`

**Purpose**: Reusable service for handling file uploads through WordPress media system.

#### Key Methods

```php
public function upload_file($file, array $constraints = [], $user_id = null)
```
Uploads a file with validation and creates WordPress attachment.

**Parameters**:
- `$file` - File array from `$_FILES`
- `$constraints` - Upload constraints (allowed types, size limits, dimensions)
- `$user_id` - User ID to associate with upload

**Returns**: Array with `attachment_id`, `url`, `file`, `type` or `WP_Error`

**Example**:
```php
$upload_service = new Thrive_Upload_Service();
$result = $upload_service->upload_file($_FILES['file'], [
    'allowed_types' => ['image/jpeg', 'image/png'],
    'max_size' => 5 * 1024 * 1024, // 5MB
    'min_width' => 100,
    'min_height' => 100,
], get_current_user_id());

if (is_wp_error($result)) {
    // Handle error
} else {
    $attachment_id = $result['attachment_id'];
    $url = $result['url'];
}
```

---

```php
public function validate_file($file, array $constraints)
```
Validates a file against constraints.

**Validation checks**:
- File size limits
- MIME type validation (using `finfo`)
- Image dimensions (min/max width/height)

**Returns**: `true` or `WP_Error`

---

```php
public function delete_file($attachment_id, $user_id = null)
```
Deletes an uploaded file and its WordPress attachment.

**Parameters**:
- `$attachment_id` - WordPress attachment ID
- `$user_id` - Optional user ID to verify ownership

**Returns**: `true` or `WP_Error`

---

### 2. Profile Picture Upload API

**Location**: `wordpress/plugins/thrive-admin/includes/api/class-profile-picture-upload.php`

**Purpose**: Specialized REST API endpoints for teacher profile pictures.

#### Endpoints

**Upload Profile Picture**
```
POST /wp-json/thrive/v1/teachers/me/profile-picture
```

**Request**: Multipart form data with `file` field

**Response**:
```json
{
  "success": true,
  "attachment_id": 123,
  "url": "http://example.com/wp-content/uploads/2025/10/profile.jpg",
  "message": "Profile picture uploaded successfully."
}
```

**Constraints**:
- File types: JPEG, PNG, WebP
- Max size: 5MB
- Min dimensions: 100x100px
- Max dimensions: 4000x4000px

**Authentication**: Requires teacher role

---

**Delete Profile Picture**
```
DELETE /wp-json/thrive/v1/teachers/me/profile-picture
```

**Response**:
```json
{
  "success": true,
  "message": "Profile picture deleted successfully."
}
```

**Authentication**: Requires teacher role

---

### Integration with NestJS

After WordPress handles the file upload, the API automatically updates the teacher profile in NestJS:

1. WordPress uploads file → creates attachment
2. WordPress calls `PATCH /api/teachers/me/profile` with new `avatarUrl`
3. NestJS updates teacher record
4. WordPress deletes old profile picture (if exists)

This ensures data consistency between WordPress (file storage) and NestJS (data authority).

---

## Frontend Layer

### 1. Upload Utilities

**Location**: `wordpress/themes/custom-theme/lib/upload-utils.ts`

**Purpose**: Reusable TypeScript utilities for file upload operations.

#### Key Functions

```typescript
validateFile(file: File, constraints: UploadConstraints): ValidationResult
```
Client-side file validation (size, type).

**Example**:
```typescript
import { validateFile, DEFAULT_CONSTRAINTS } from '../lib/upload-utils';

const validation = validateFile(file, DEFAULT_CONSTRAINTS.profilePicture);
if (!validation.valid) {
  alert(validation.error);
}
```

---

```typescript
validateImageDimensions(file: File, constraints: UploadConstraints): Promise<ValidationResult>
```
Asynchronous image dimension validation.

---

```typescript
uploadFile(file: File, endpoint: string, onProgress?: (progress: number) => void): Promise<UploadResult>
```
Upload file with progress tracking.

**Example**:
```typescript
import { uploadFile } from '../lib/upload-utils';

const result = await uploadFile(
  file,
  '/wp-json/thrive/v1/teachers/me/profile-picture',
  (progress) => {
    console.log(`Upload progress: ${progress}%`);
  }
);

if (result.success) {
  console.log('Uploaded:', result.url);
}
```

---

```typescript
deleteFile(endpoint: string): Promise<UploadResult>
```
Delete file from server.

---

#### Default Constraints

```typescript
export const DEFAULT_CONSTRAINTS = {
  image: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  },
  profilePicture: {
    maxSize: 5 * 1024 * 1024,
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
```

---

### 2. MediaUpload Component (Reusable)

**Location**: `wordpress/themes/custom-theme/components/MediaUpload.tsx`

**Purpose**: Generic file upload component with drag-and-drop.

#### Features

- Drag and drop file upload
- Click to browse files
- File validation (client-side)
- Upload progress indicator
- Image preview
- Error handling

#### Usage

```tsx
import { MediaUpload } from '../../components/MediaUpload';
import { DEFAULT_CONSTRAINTS } from '../lib/upload-utils';

<MediaUpload
  endpoint="/wp-json/thrive/v1/upload/document"
  constraints={DEFAULT_CONSTRAINTS.document}
  onUploadSuccess={(result) => {
    console.log('Uploaded:', result.url);
  }}
  onUploadError={(error) => {
    console.error('Upload failed:', error);
  }}
  accept="application/pdf"
  label="Click to upload or drag and drop a PDF"
  showPreview={false}
/>
```

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `endpoint` | `string` | Yes | Upload endpoint URL |
| `constraints` | `UploadConstraints` | No | Upload validation constraints |
| `onUploadSuccess` | `(result: UploadResult) => void` | Yes | Success callback |
| `onUploadError` | `(error: string) => void` | No | Error callback |
| `accept` | `string` | No | File input accept attribute |
| `label` | `string` | No | Label text for drop zone |
| `showPreview` | `boolean` | No | Show image preview |
| `className` | `string` | No | Custom class name |
| `disabled` | `boolean` | No | Disabled state |

---

### 3. ProfilePictureUpload Component

**Location**: `wordpress/themes/custom-theme/components/ProfilePictureUpload.tsx`

**Purpose**: Specialized component for uploading teacher profile pictures.

#### Features

- Circular avatar preview
- Upload new profile picture
- Remove existing profile picture
- Automatic integration with teacher profile API
- User name display

#### Usage

```tsx
import { ProfilePictureUpload } from '../../components/ProfilePictureUpload';

<ProfilePictureUpload
  currentAvatarUrl={teacher.avatarUrl}
  onAvatarUpdate={(url) => {
    setAvatarUrl(url);
  }}
  onError={(error) => {
    console.error(error);
  }}
  userName={`${teacher.firstName} ${teacher.lastName}`}
/>
```

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `currentAvatarUrl` | `string \| null` | No | Current avatar URL |
| `onAvatarUpdate` | `(url: string \| null) => void` | Yes | Callback when avatar changes |
| `onError` | `(error: string) => void` | No | Error callback |
| `userName` | `string` | No | User name to display |
| `disabled` | `boolean` | No | Disabled state |

---

## Styling

**Location**: `wordpress/themes/custom-theme/components/upload-components.css`

All upload components are styled with utility-first CSS classes. Key classes:

- `.media-upload-container` - Main container
- `.media-upload-dropzone` - Drop zone area
- `.media-upload-progress-bar` - Progress indicator
- `.profile-picture-avatar-wrapper` - Circular avatar container
- `.profile-picture-btn-*` - Button variants (primary, secondary, danger)

---

## Security Considerations

### Multi-Layer Validation

1. **Client-side** (TypeScript): Fast feedback, reduces server load
2. **Server-side** (PHP): Authoritative validation, cannot be bypassed
3. **MIME Type Check**: Uses `finfo` magic number detection (not just file extension)

### Permission Checks

- All upload endpoints require authentication
- Profile picture endpoints require `teacher` role
- File deletion includes ownership verification

### File Storage

- Files stored in WordPress uploads directory (`wp-content/uploads/`)
- WordPress handles file permissions and security
- Files are served through WordPress (not direct file access)

### Rate Limiting

Consider adding rate limiting to upload endpoints in production to prevent abuse.

---

## Extension Points

### Adding New Upload Types

To add a new upload type (e.g., student documents):

1. **Add constraints** in `upload-utils.ts`:
```typescript
export const DEFAULT_CONSTRAINTS = {
  // ... existing constraints
  studentDocument: {
    maxSize: 10 * 1024 * 1024,
    allowedTypes: ["application/pdf"],
  },
};
```

2. **Create API endpoint** (optional - can reuse generic endpoint):
```php
class Thrive_Student_Document_API {
  public function upload_document($request) {
    $upload_service = new Thrive_Upload_Service();
    $result = $upload_service->upload_file(
      $_FILES['file'],
      [
        'allowed_types' => ['application/pdf'],
        'max_size' => 10 * 1024 * 1024,
      ],
      get_current_user_id()
    );
    // ... handle result
  }
}
```

3. **Use MediaUpload component**:
```tsx
<MediaUpload
  endpoint="/wp-json/thrive/v1/students/me/documents"
  constraints={DEFAULT_CONSTRAINTS.studentDocument}
  onUploadSuccess={handleUploadSuccess}
  accept="application/pdf"
  showPreview={false}
/>
```

---

### Adding Cloud Storage (S3, CDN)

To migrate from local WordPress uploads to cloud storage:

1. Install WordPress S3 plugin (e.g., WP Offload Media)
2. No code changes required - WordPress handles the storage backend
3. URLs will automatically point to S3/CDN

---

## Testing

### Manual Testing Checklist

- [ ] Upload valid profile picture (JPEG, PNG, WebP)
- [ ] Upload image that's too small (< 100px)
- [ ] Upload image that's too large (> 4000px)
- [ ] Upload file that's too big (> 5MB)
- [ ] Upload invalid file type (e.g., .txt)
- [ ] Remove profile picture
- [ ] Upload new picture to replace existing
- [ ] Drag and drop upload
- [ ] Click to browse upload
- [ ] Test with disabled state
- [ ] Test error handling (network failure)
- [ ] Verify WordPress media library shows uploads
- [ ] Verify old pictures are deleted when replaced

### Integration Testing

- [ ] Verify teacher profile in NestJS updates correctly
- [ ] Verify old avatar URL is replaced in database
- [ ] Verify file cleanup (old files deleted)
- [ ] Verify permissions (non-teachers cannot upload)

---

## Troubleshooting

### Upload fails with "Invalid file type"

**Cause**: MIME type mismatch or file extension issue

**Solution**: Check that file MIME type is in `allowed_types` array. Use `finfo` to inspect actual MIME type.

---

### Upload succeeds but NestJS profile not updated

**Cause**: WordPress → NestJS API call failing

**Solution**: Check WordPress error logs. Verify `http://nestjs:3000` is reachable from WordPress container.

---

### Old profile pictures not being deleted

**Cause**: `attachment_url_to_postid()` returns 0 (URL not in WordPress)

**Solution**: This is expected for external URLs. Only WordPress-uploaded files will be deleted.

---

### File size limit errors

**Cause**: PHP or WordPress upload limits

**Solution**: Check and increase:
- `php.ini`: `upload_max_filesize` and `post_max_size`
- WordPress: `wp_max_upload_size` filter

---

## Future Enhancements

- [ ] Image cropping UI (before upload)
- [ ] Client-side image compression
- [ ] Multiple file uploads
- [ ] Progress persistence (resume interrupted uploads)
- [ ] Thumbnail generation options
- [ ] Integration with WordPress media gallery picker
- [ ] Webhook notifications on upload complete
- [ ] Upload analytics (track upload success/failure rates)

---

## Related Files

### Backend
- `wordpress/plugins/thrive-admin/includes/services/class-upload-service.php`
- `wordpress/plugins/thrive-admin/includes/api/class-profile-picture-upload.php`
- `wordpress/plugins/thrive-admin/thrive-admin.php`

### Frontend
- `wordpress/themes/custom-theme/lib/upload-utils.ts`
- `wordpress/themes/custom-theme/components/MediaUpload.tsx`
- `wordpress/themes/custom-theme/components/ProfilePictureUpload.tsx`
- `wordpress/themes/custom-theme/components/upload-components.css`

### Integration
- `wordpress/themes/custom-theme/blocks/teacher-profile-form/view.tsx`
- `nestjs/src/teachers/dto/update-teacher-profile.dto.ts`
- `nestjs/src/teachers/entities/teacher.entity.ts`

---

## Summary

This upload system provides a **reusable, secure, and scalable** foundation for file uploads in the Thrive platform. By leveraging WordPress's built-in media library, we avoid reinventing the wheel while maintaining flexibility for future enhancements.

Key benefits:
- ✅ No custom file storage infrastructure needed
- ✅ WordPress handles security, permissions, thumbnails
- ✅ Reusable components for future upload needs
- ✅ Easy migration to cloud storage via WordPress plugins
- ✅ Consistent with WordPress ecosystem
