import React, { useCallback, useMemo } from 'react';
import { FiUpload, FiCamera } from 'react-icons/fi';
import { IMAGE_BASE_URL, getImageUrl } from '@/config/api';

/**
 * Image upload section component
 * @param {Object} props - Component props
 * @param {string} props.imagePreview - Preview image URL
 * @param {Object} props.user - User data
 * @param {Function} props.onImageChange - Image change handler
 * @param {boolean} props.disabled - Disabled state
 */
const ImageUploadSection = ({ imagePreview, user, onImageChange, disabled }) => {
  const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/847/847969.png';
  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

  const profileImageUrl = useMemo(() => {
    if (imagePreview) return imagePreview;
    if (!user?.profile_image) return DEFAULT_AVATAR;

    return getImageUrl(user.profile_image);
  }, [imagePreview, user, DEFAULT_AVATAR]);

  const handleImageChange = useCallback((e) => {
    onImageChange(e);
  }, [onImageChange]);

  const handleImageError = useCallback((e) => {
    e.target.src = DEFAULT_AVATAR;
  }, [DEFAULT_AVATAR]);

  return (
    <div className="mb-4 d-flex align-items-center gap-4 your-brand">
      <label htmlFor="profileImage" className="wd-100 ht-100 position-relative overflow-hidden border border-gray-2 rounded-circle flex-shrink-0">
        <img
          src={profileImageUrl}
          className="upload-pic img-fluid rounded-circle h-100 w-100"
          style={{ objectFit: 'cover' }}
          alt="Profile preview"
          onError={handleImageError}
        />
        <div className="position-absolute start-50 top-50 end-0 bottom-0 translate-middle h-100 w-100 hstack align-items-center justify-content-center c-pointer upload-button">
          <i aria-hidden="true" className="camera-icon"><FiCamera /></i>
        </div>
        <input
          type="file"
          id="profileImage"
          accept="image/*"
          onChange={handleImageChange}
          className="file-upload"
          disabled={disabled}
          hidden
        />
      </label>
      <div className="d-flex flex-column gap-1">
        <label htmlFor="profileImage" className="btn btn-sm btn-light-brand" style={{ width: 'fit-content' }}>
          <FiUpload className="me-2" />
          {imagePreview || user?.profile_image ? 'Change Photo' : 'Upload Photo'}
        </label>
        <span className="fs-11 text-gray-500">
          JPG, PNG or GIF, max {Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB
        </span>
      </div>
    </div>
  );
};

export default ImageUploadSection;
