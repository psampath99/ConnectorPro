/**
 * Manual test functions for image utilities
 * Run these in the browser console to test functionality
 */

import { 
  calculateNewDimensions, 
  shouldResizeImage, 
  validateImageFile,
  formatFileSize,
  processImageForAPI,
  ImageDimensions 
} from './imageUtils';

export const testImageUtils = {
  // Test dimension calculations
  testCalculateNewDimensions() {
    console.log('Testing calculateNewDimensions...');
    
    // Test case 1: Image within limits
    const small = calculateNewDimensions({ width: 1000, height: 800 }, 2000);
    console.log('Small image (1000x800):', small); // Should be unchanged
    
    // Test case 2: Landscape image
    const landscape = calculateNewDimensions({ width: 3000, height: 2000 }, 2000);
    console.log('Landscape image (3000x2000):', landscape); // Should be 2000x1333
    
    // Test case 3: Portrait image
    const portrait = calculateNewDimensions({ width: 1500, height: 3000 }, 2000);
    console.log('Portrait image (1500x3000):', portrait); // Should be 1000x2000
    
    // Test case 4: Square image
    const square = calculateNewDimensions({ width: 3000, height: 3000 }, 2000);
    console.log('Square image (3000x3000):', square); // Should be 2000x2000
  },

  // Test resize detection
  testShouldResizeImage() {
    console.log('Testing shouldResizeImage...');
    
    console.log('Small image needs resize:', shouldResizeImage({ width: 1000, height: 800 }, 2000)); // false
    console.log('Wide image needs resize:', shouldResizeImage({ width: 2500, height: 1000 }, 2000)); // true
    console.log('Tall image needs resize:', shouldResizeImage({ width: 1000, height: 2500 }, 2000)); // true
  },

  // Test file validation
  testValidateImageFile() {
    console.log('Testing validateImageFile...');
    
    // Create test files
    const jpegFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
    const pngFile = new File([''], 'test.png', { type: 'image/png' });
    const textFile = new File([''], 'test.txt', { type: 'text/plain' });
    
    console.log('JPEG file validation:', validateImageFile(jpegFile));
    console.log('PNG file validation:', validateImageFile(pngFile));
    console.log('Text file validation:', validateImageFile(textFile));
  },

  // Test file size formatting
  testFormatFileSize() {
    console.log('Testing formatFileSize...');
    
    console.log('0 bytes:', formatFileSize(0));
    console.log('1024 bytes:', formatFileSize(1024));
    console.log('1 MB:', formatFileSize(1024 * 1024));
    console.log('1.5 MB:', formatFileSize(1024 * 1024 * 1.5));
    console.log('1 GB:', formatFileSize(1024 * 1024 * 1024));
  },

  // Test with actual image file (requires user to provide file)
  async testProcessImageForAPI(file: File) {
    console.log('Testing processImageForAPI with actual file...');
    
    try {
      const result = await processImageForAPI(file);
      console.log('Processing result:', {
        originalDimensions: result.originalDimensions,
        newDimensions: result.dimensions,
        wasResized: result.wasResized,
        fileSize: formatFileSize(result.file.size)
      });
      
      // Create preview
      const img = new Image();
      img.src = result.dataUrl;
      img.style.maxWidth = '300px';
      img.style.border = '1px solid #ccc';
      document.body.appendChild(img);
      
      return result;
    } catch (error) {
      console.error('Error processing image:', error);
    }
  },

  // Run all tests
  runAllTests() {
    console.log('=== Running Image Utils Tests ===');
    this.testCalculateNewDimensions();
    this.testShouldResizeImage();
    this.testValidateImageFile();
    this.testFormatFileSize();
    console.log('=== Tests Complete ===');
    console.log('To test with actual images, use: testImageUtils.testProcessImageForAPI(yourFile)');
  }
};

// Make available globally for console testing
(window as any).testImageUtils = testImageUtils;

console.log('Image utils test functions loaded. Run testImageUtils.runAllTests() to test.');