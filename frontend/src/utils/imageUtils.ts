/**
 * Image processing utilities for handling image dimensions and resizing
 * before sending to APIs to prevent invalid_request_error from oversized base64 images
 */

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ProcessedImage {
  file: File;
  dataUrl: string;
  dimensions: ImageDimensions;
  wasResized: boolean;
  originalDimensions?: ImageDimensions;
}

/**
 * Get image dimensions from a file
 */
export const getImageDimensions = (file: File): Promise<ImageDimensions> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
};

/**
 * Check if image dimensions exceed the maximum allowed size
 */
export const shouldResizeImage = (dimensions: ImageDimensions, maxSize: number = 2000): boolean => {
  return dimensions.width > maxSize || dimensions.height > maxSize;
};

/**
 * Calculate new dimensions maintaining aspect ratio
 */
export const calculateNewDimensions = (
  originalDimensions: ImageDimensions, 
  maxSize: number = 2000
): ImageDimensions => {
  const { width, height } = originalDimensions;
  
  if (width <= maxSize && height <= maxSize) {
    return { width, height };
  }
  
  const aspectRatio = width / height;
  
  if (width > height) {
    // Landscape: width is the limiting factor
    return {
      width: maxSize,
      height: Math.round(maxSize / aspectRatio)
    };
  } else {
    // Portrait or square: height is the limiting factor
    return {
      width: Math.round(maxSize * aspectRatio),
      height: maxSize
    };
  }
};

/**
 * Resize image using canvas
 */
export const resizeImage = (
  file: File, 
  newDimensions: ImageDimensions, 
  quality: number = 0.9
): Promise<{ file: File; dataUrl: string }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }
    
    img.onload = () => {
      canvas.width = newDimensions.width;
      canvas.height = newDimensions.height;
      
      // Draw the resized image
      ctx.drawImage(img, 0, 0, newDimensions.width, newDimensions.height);
      
      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob from canvas'));
            return;
          }
          
          // Create new file with resized content
          const resizedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now()
          });
          
          // Get data URL for preview
          const dataUrl = canvas.toDataURL(file.type, quality);
          
          resolve({ file: resizedFile, dataUrl });
        },
        file.type,
        quality
      );
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image for resizing'));
    };
    
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Convert file to data URL
 */
export const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      resolve(reader.result as string);
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
};

/**
 * Process image: check dimensions and resize if necessary
 * This is the main function to use before sending images to APIs
 */
export const processImageForAPI = async (
  file: File, 
  maxSize: number = 2000,
  quality: number = 0.9
): Promise<ProcessedImage> => {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('File is not an image');
    }
    
    // Get original dimensions
    const originalDimensions = await getImageDimensions(file);
    
    // Check if resizing is needed
    if (!shouldResizeImage(originalDimensions, maxSize)) {
      // No resizing needed
      const dataUrl = await fileToDataUrl(file);
      return {
        file,
        dataUrl,
        dimensions: originalDimensions,
        wasResized: false
      };
    }
    
    // Calculate new dimensions
    const newDimensions = calculateNewDimensions(originalDimensions, maxSize);
    
    // Resize the image
    const { file: resizedFile, dataUrl } = await resizeImage(file, newDimensions, quality);
    
    return {
      file: resizedFile,
      dataUrl,
      dimensions: newDimensions,
      wasResized: true,
      originalDimensions
    };
    
  } catch (error) {
    throw new Error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Validate image file before processing
 */
export const validateImageFile = (file: File): { isValid: boolean; error?: string } => {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { isValid: false, error: 'File must be an image' };
  }
  
  // Check file size (50MB limit)
  const maxFileSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxFileSize) {
    return { isValid: false, error: 'File size must be less than 50MB' };
  }
  
  // Check supported formats
  const supportedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (!supportedFormats.includes(file.type)) {
    return { isValid: false, error: 'Supported formats: JPEG, PNG, WebP, GIF' };
  }
  
  return { isValid: true };
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Get image info for display
 */
export const getImageInfo = (processedImage: ProcessedImage): string => {
  const { dimensions, wasResized, originalDimensions, file } = processedImage;
  
  let info = `${dimensions.width}×${dimensions.height} • ${formatFileSize(file.size)}`;
  
  if (wasResized && originalDimensions) {
    info += ` (resized from ${originalDimensions.width}×${originalDimensions.height})`;
  }
  
  return info;
};