/**
 * Tests for image utility functions
 */

import { 
  calculateNewDimensions, 
  shouldResizeImage, 
  validateImageFile,
  formatFileSize,
  ImageDimensions 
} from '../imageUtils';

describe('Image Utils', () => {
  describe('calculateNewDimensions', () => {
    it('should not resize images within limits', () => {
      const dimensions: ImageDimensions = { width: 1000, height: 800 };
      const result = calculateNewDimensions(dimensions, 2000);
      expect(result).toEqual({ width: 1000, height: 800 });
    });

    it('should resize landscape images correctly', () => {
      const dimensions: ImageDimensions = { width: 3000, height: 2000 };
      const result = calculateNewDimensions(dimensions, 2000);
      expect(result).toEqual({ width: 2000, height: 1333 });
    });

    it('should resize portrait images correctly', () => {
      const dimensions: ImageDimensions = { width: 1500, height: 3000 };
      const result = calculateNewDimensions(dimensions, 2000);
      expect(result).toEqual({ width: 1000, height: 2000 });
    });

    it('should resize square images correctly', () => {
      const dimensions: ImageDimensions = { width: 3000, height: 3000 };
      const result = calculateNewDimensions(dimensions, 2000);
      expect(result).toEqual({ width: 2000, height: 2000 });
    });
  });

  describe('shouldResizeImage', () => {
    it('should return false for images within limits', () => {
      const dimensions: ImageDimensions = { width: 1000, height: 800 };
      expect(shouldResizeImage(dimensions, 2000)).toBe(false);
    });

    it('should return true for images exceeding width limit', () => {
      const dimensions: ImageDimensions = { width: 2500, height: 1000 };
      expect(shouldResizeImage(dimensions, 2000)).toBe(true);
    });

    it('should return true for images exceeding height limit', () => {
      const dimensions: ImageDimensions = { width: 1000, height: 2500 };
      expect(shouldResizeImage(dimensions, 2000)).toBe(true);
    });
  });

  describe('validateImageFile', () => {
    it('should validate JPEG files', () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const result = validateImageFile(file);
      expect(result.isValid).toBe(true);
    });

    it('should validate PNG files', () => {
      const file = new File([''], 'test.png', { type: 'image/png' });
      const result = validateImageFile(file);
      expect(result.isValid).toBe(true);
    });

    it('should reject non-image files', () => {
      const file = new File([''], 'test.txt', { type: 'text/plain' });
      const result = validateImageFile(file);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('File must be an image');
    });

    it('should reject unsupported image formats', () => {
      const file = new File([''], 'test.bmp', { type: 'image/bmp' });
      const result = validateImageFile(file);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Supported formats: JPEG, PNG, WebP, GIF');
    });

    it('should reject files that are too large', () => {
      // Create a large buffer to simulate a big file
      const largeBuffer = new ArrayBuffer(60 * 1024 * 1024); // 60MB
      const file = new File([largeBuffer], 'large.jpg', { type: 'image/jpeg' });
      const result = validateImageFile(file);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('File size must be less than 50MB');
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('should format decimal values correctly', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1024 * 1024 * 1.5)).toBe('1.5 MB');
    });
  });
});