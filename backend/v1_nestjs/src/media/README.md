# Media Module

## Role
This module acts as a **Service Provider** for file handling. It centralizes logic for file uploads, processing, and management, decoupled from business domains (like User or Memory).

## Strategy
1.  **Cloudinary Integration**: We use Cloudinary for media storage, optimization, and delivery.
2.  **Streaming Uploads**: Files are streamed directly from memory (Multer buffer) to Cloudinary using `upload_stream`. No local temporary files are stored.
3.  **Automatic Optimization**: Cloudinary handles resizing, format conversion, and CDN delivery automatically via transformation parameters or default settings.

## Dependencies
- **Cloudinary SDK**: `cloudinary` npm package.
- **Streamifier**: For converting buffers to streams.
- **CommonModule**: For shared utilities.

## Environment Variables
Required in `.env`:
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

## Exports
- **MediaService**:
  - `uploadFile(file: Express.Multer.File, folder: string): Promise<string>` - Returns the secure CDN URL.
  - `deleteFile(fileUrl: string): Promise<void>` - Deletes the file by extracting public ID from URL.
