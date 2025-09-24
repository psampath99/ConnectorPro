/**
 * Image processing service for handling image uploads and API integration
 * Automatically resizes images before sending to prevent API errors
 */

import { 
  processImageForAPI, 
  validateImageFile, 
  ProcessedImage,
  ImageDimensions 
} from '@/utils/imageUtils';

export interface ImageUploadOptions {
  maxSize?: number;
  quality?: number;
  allowedTypes?: string[];
  maxFileSize?: number;
}

export interface ImageProcessingResult {
  success: boolean;
  processedImage?: ProcessedImage;
  error?: string;
  warnings?: string[];
}

export class ImageService {
  private static instance: ImageService;
  private defaultOptions: Required<ImageUploadOptions> = {
    maxSize: 2000,
    quality: 0.9,
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
    maxFileSize: 50 * 1024 * 1024 // 50MB
  };

  private constructor() {}

  public static getInstance(): ImageService {
    if (!ImageService.instance) {
      ImageService.instance = new ImageService();
    }
    return ImageService.instance;
  }

  /**
   * Process a single image file for API usage
   */
  public async processImage(
    file: File, 
    options: ImageUploadOptions = {}
  ): Promise<ImageProcessingResult> {
    const opts = { ...this.defaultOptions, ...options };
    const warnings: string[] = [];

    try {
      // Validate the file
      const validation = validateImageFile(file);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Check file size
      if (file.size > opts.maxFileSize) {
        return {
          success: false,
          error: `File size (${this.formatFileSize(file.size)}) exceeds maximum allowed size (${this.formatFileSize(opts.maxFileSize)})`
        };
      }

      // Check file type
      if (!opts.allowedTypes.includes(file.type)) {
        return {
          success: false,
          error: `File type ${file.type} is not supported. Allowed types: ${opts.allowedTypes.join(', ')}`
        };
      }

      // Process the image
      const processedImage = await processImageForAPI(file, opts.maxSize, opts.quality);

      // Add warnings if image was resized
      if (processedImage.wasResized && processedImage.originalDimensions) {
        warnings.push(
          `Image was resized from ${processedImage.originalDimensions.width}×${processedImage.originalDimensions.height} to ${processedImage.dimensions.width}×${processedImage.dimensions.height} to meet API requirements`
        );
      }

      return {
        success: true,
        processedImage,
        warnings: warnings.length > 0 ? warnings : undefined
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred while processing image'
      };
    }
  }

  /**
   * Process multiple images
   */
  public async processImages(
    files: File[], 
    options: ImageUploadOptions = {}
  ): Promise<ImageProcessingResult[]> {
    const results: ImageProcessingResult[] = [];

    for (const file of files) {
      const result = await this.processImage(file, options);
      results.push(result);
    }

    return results;
  }

  /**
   * Convert processed image to base64 for API calls
   */
  public getBase64FromProcessedImage(processedImage: ProcessedImage): string {
    // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
    const base64Data = processedImage.dataUrl.split(',')[1];
    return base64Data;
  }

  /**
   * Get image data for API calls (includes metadata)
   */
  public getImageDataForAPI(processedImage: ProcessedImage) {
    return {
      base64: this.getBase64FromProcessedImage(processedImage),
      mimeType: processedImage.file.type,
      dimensions: processedImage.dimensions,
      size: processedImage.file.size,
      wasResized: processedImage.wasResized,
      originalDimensions: processedImage.originalDimensions
    };
  }

  /**
   * Prepare image for OpenAI Vision API
   */
  public prepareForOpenAI(processedImage: ProcessedImage) {
    return {
      type: "image_url" as const,
      image_url: {
        url: processedImage.dataUrl,
        detail: "high" as const
      }
    };
  }

  /**
   * Prepare image for Anthropic Claude API
   */
  public prepareForAnthropic(processedImage: ProcessedImage) {
    return {
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: processedImage.file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
        data: this.getBase64FromProcessedImage(processedImage)
      }
    };
  }

  /**
   * Prepare image for Google Gemini API
   */
  public prepareForGemini(processedImage: ProcessedImage) {
    return {
      inlineData: {
        mimeType: processedImage.file.type,
        data: this.getBase64FromProcessedImage(processedImage)
      }
    };
  }

  /**
   * Get processing summary for multiple images
   */
  public getProcessingSummary(results: ImageProcessingResult[]): {
    total: number;
    successful: number;
    failed: number;
    resized: number;
    totalSize: number;
    errors: string[];
    warnings: string[];
  } {
    const summary = {
      total: results.length,
      successful: 0,
      failed: 0,
      resized: 0,
      totalSize: 0,
      errors: [] as string[],
      warnings: [] as string[]
    };

    results.forEach((result, index) => {
      if (result.success && result.processedImage) {
        summary.successful++;
        summary.totalSize += result.processedImage.file.size;
        if (result.processedImage.wasResized) {
          summary.resized++;
        }
        if (result.warnings) {
          summary.warnings.push(...result.warnings);
        }
      } else {
        summary.failed++;
        if (result.error) {
          summary.errors.push(`Image ${index + 1}: ${result.error}`);
        }
      }
    });

    return summary;
  }

  /**
   * Check if images need processing before API call
   */
  public async checkImagesNeedProcessing(files: File[]): Promise<{
    needsProcessing: boolean;
    oversizedImages: { file: File; dimensions: ImageDimensions }[];
    totalOversized: number;
  }> {
    const oversizedImages: { file: File; dimensions: ImageDimensions }[] = [];

    for (const file of files) {
      try {
        const validation = validateImageFile(file);
        if (validation.isValid) {
          // We would need to check dimensions, but for now we'll assume processing is needed
          // In a real implementation, you might want to check dimensions first
          oversizedImages.push({ 
            file, 
            dimensions: { width: 0, height: 0 } // Placeholder
          });
        }
      } catch (error) {
        // Skip invalid files
      }
    }

    return {
      needsProcessing: oversizedImages.length > 0,
      oversizedImages,
      totalOversized: oversizedImages.length
    };
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Create a download link for processed image
   */
  public createDownloadLink(processedImage: ProcessedImage, filename?: string): string {
    const url = URL.createObjectURL(processedImage.file);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || processedImage.file.name;
    return url;
  }

  /**
   * Cleanup object URLs to prevent memory leaks
   */
  public cleanupObjectURL(url: string): void {
    URL.revokeObjectURL(url);
  }
}

// Export singleton instance
export const imageService = ImageService.getInstance();

// Export types for external use
export type { ProcessedImage };