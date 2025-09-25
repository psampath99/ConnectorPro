# Image Processing System Documentation

## Overview

This image processing system automatically checks image dimensions and resizes images before sending them to APIs to prevent `invalid_request_error` from oversized base64 images. The system ensures that images never exceed 2000px on either dimension while maintaining aspect ratio.

## Key Features

- ✅ **Automatic dimension checking** - Validates image size before processing
- ✅ **Smart resizing** - Maintains aspect ratio while resizing to fit API limits
- ✅ **Multiple format support** - JPEG, PNG, WebP, GIF
- ✅ **File validation** - Checks file type and size limits
- ✅ **Error handling** - Comprehensive error reporting and validation
- ✅ **API-ready output** - Formats for OpenAI, Anthropic, Google Gemini APIs
- ✅ **Memory management** - Proper cleanup of object URLs

## Architecture

### Core Components

1. **Image Utils** (`/src/utils/imageUtils.ts`)
   - Low-level image processing functions
   - Dimension calculations and validation
   - Canvas-based resizing operations

2. **Image Service** (`/src/services/imageService.ts`)
   - High-level service layer
   - Batch processing capabilities
   - API-specific formatting

3. **Chat Interface Integration** (`/src/components/assistant/ChatInterface.tsx`)
   - UI components for image upload
   - Real-time processing feedback
   - Error display and management

## Usage Examples

### Basic Image Processing

```typescript
import { imageService } from '@/services/imageService';

// Process a single image
const result = await imageService.processImage(file);

if (result.success && result.processedImage) {
  console.log('Original:', result.processedImage.originalDimensions);
  console.log('New:', result.processedImage.dimensions);
  console.log('Was resized:', result.processedImage.wasResized);
}
```

### Batch Processing

```typescript
// Process multiple images
const results = await imageService.processImages(files);
const summary = imageService.getProcessingSummary(results);

console.log(`Processed: ${summary.successful}/${summary.total}`);
console.log(`Resized: ${summary.resized} images`);
```

### API Integration

```typescript
// For OpenAI Vision API
const openAIFormat = imageService.prepareForOpenAI(processedImage);

// For Anthropic Claude API
const anthropicFormat = imageService.prepareForAnthropic(processedImage);

// For Google Gemini API
const geminiFormat = imageService.prepareForGemini(processedImage);
```

## Configuration

### Default Settings

```typescript
const defaultOptions = {
  maxSize: 2000,        // Maximum dimension in pixels
  quality: 0.9,         // JPEG quality (0.1 - 1.0)
  allowedTypes: [       // Supported file types
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/gif'
  ],
  maxFileSize: 50 * 1024 * 1024  // 50MB limit
};
```

### Custom Configuration

```typescript
const customOptions = {
  maxSize: 1500,        // Smaller max size
  quality: 0.8,         // Lower quality for smaller files
  maxFileSize: 10 * 1024 * 1024  // 10MB limit
};

const result = await imageService.processImage(file, customOptions);
```

## API Formats

### OpenAI Vision API Format

```typescript
{
  type: "image_url",
  image_url: {
    url: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
    detail: "high"
  }
}
```

### Anthropic Claude API Format

```typescript
{
  type: "image",
  source: {
    type: "base64",
    media_type: "image/jpeg",
    data: "/9j/4AAQSkZJRgABAQAAAQ..."
  }
}
```

### Google Gemini API Format

```typescript
{
  inlineData: {
    mimeType: "image/jpeg",
    data: "/9j/4AAQSkZJRgABAQAAAQ..."
  }
}
```

## Error Handling

### Common Errors

1. **Invalid file type**
   ```
   File type image/bmp is not supported. Allowed types: image/jpeg, image/png, image/webp, image/gif
   ```

2. **File too large**
   ```
   File size (75.2 MB) exceeds maximum allowed size (50 MB)
   ```

3. **Processing failure**
   ```
   Failed to process image: Failed to load image for resizing
   ```

### Error Recovery

```typescript
const result = await imageService.processImage(file);

if (!result.success) {
  console.error('Processing failed:', result.error);
  // Handle error - show user message, try alternative processing, etc.
}

if (result.warnings) {
  console.warn('Processing warnings:', result.warnings);
  // Handle warnings - inform user about resizing, etc.
}
```

## Performance Considerations

### Memory Management

- Object URLs are automatically cleaned up after processing
- Canvas elements are properly disposed of
- Large images are processed asynchronously to avoid blocking the UI

### Processing Time

- Small images (< 1MB): ~50-100ms
- Medium images (1-5MB): ~200-500ms  
- Large images (5-50MB): ~500-2000ms

### Optimization Tips

1. **Batch Processing**: Process multiple images together for better performance
2. **Quality Settings**: Lower quality settings reduce processing time and file size
3. **Size Limits**: Set appropriate maxSize based on your API requirements

## Testing

### Manual Testing

```typescript
// Load test utilities in browser console
import { testImageUtils } from '@/utils/testImageUtils';

// Run all tests
testImageUtils.runAllTests();

// Test with actual file
const fileInput = document.querySelector('input[type="file"]');
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  await testImageUtils.testProcessImageForAPI(file);
});
```

### Integration Testing

The system is integrated into the Chat Interface where you can:

1. Upload images using the image icon button
2. See real-time processing feedback
3. View resized image previews
4. Handle processing errors gracefully

## Troubleshooting

### Common Issues

1. **Images not resizing**
   - Check if image dimensions actually exceed maxSize
   - Verify file is a valid image format
   - Check browser console for errors

2. **Processing takes too long**
   - Large files may take several seconds
   - Consider reducing maxFileSize limit
   - Check if multiple large images are being processed simultaneously

3. **Memory issues**
   - Ensure object URLs are being cleaned up
   - Avoid processing too many large images at once
   - Monitor browser memory usage in dev tools

### Debug Mode

Enable debug logging:

```typescript
// Add to imageService for detailed logging
console.log('Processing image:', {
  originalSize: file.size,
  originalDimensions: await getImageDimensions(file),
  targetMaxSize: options.maxSize
});
```

## Future Enhancements

### Planned Features

- [ ] **Progressive JPEG support** - Better compression for large images
- [ ] **WebP conversion** - Automatic conversion to WebP for better compression
- [ ] **Image optimization** - Smart quality adjustment based on content
- [ ] **Thumbnail generation** - Create thumbnails for preview
- [ ] **EXIF data handling** - Preserve or strip metadata as needed
- [ ] **Background processing** - Use Web Workers for heavy processing

### API Extensions

- [ ] **Custom resize algorithms** - Lanczos, bicubic interpolation
- [ ] **Smart cropping** - Content-aware cropping options
- [ ] **Format conversion** - Convert between image formats
- [ ] **Batch optimization** - Optimize multiple images with different settings

## Security Considerations

### File Validation

- All uploaded files are validated for type and size
- Only approved image formats are processed
- File size limits prevent memory exhaustion attacks

### Data Handling

- Images are processed client-side only
- No image data is sent to servers during processing
- Base64 data is only generated when explicitly requested

### Memory Safety

- Canvas elements are properly disposed of
- Object URLs are revoked after use
- Large file processing includes timeout protection

## Browser Compatibility

### Supported Browsers

- ✅ Chrome 88+
- ✅ Firefox 85+
- ✅ Safari 14+
- ✅ Edge 88+

### Required APIs

- Canvas API (for resizing)
- File API (for file handling)
- URL.createObjectURL (for preview generation)
- FileReader API (for base64 conversion)

## License

This image processing system is part of the ConnectorPro application and follows the same licensing terms.