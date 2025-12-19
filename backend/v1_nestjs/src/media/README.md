# Media Module

## Role
This module acts as a **Service Provider** for file handling. It centralizes logical for file uploads, processing, and management, decoupled from business domains (like User or Memory).

## Strategy
1.  **Direct Upload to S3**: We generate Presigned URLs for clients to upload large files directly to AWS S3 (or MinIO), bypassing our backend server for bandwidth efficiency.
2.  **Sharp.js Pipeline**: For image optimization (resize, format conversion), we use Sharp.js. This may run in an AWS Lambda function (triggered by S3 events) or a background worker, depending on deployment scale. For the MVP, it might be a direct service call or a queue consumer.

## Dependencies
- **CommonModule**: For shared utilities.
- **AWS SDK / S3 Client**: For interacting with object storage.
- **Sharp**: For image processing.

## Exports
- **MediaService**: Provides methods like `getPresignedUrl(key: string)`, `processImage(key: string)`.
