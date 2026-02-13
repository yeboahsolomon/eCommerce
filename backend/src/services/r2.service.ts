
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config/env.js'; // Assuming config is exported from here

export class R2Service {
  private s3Client: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor() {
    this.bucketName = process.env.R2_BUCKET_NAME || '';
    this.publicUrl = process.env.R2_PUBLIC_URL || '';

    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!accountId || !accessKeyId || !secretAccessKey || !this.bucketName) {
      console.warn('R2 credentials missing. Image uploads will fail.');
    }

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
      },
      forcePathStyle: false, // R2 supports virtual-hosted style but path style often safer for custom endpoints? Actually R2 suggests path style is fine or virtual. We use endpoint so path style might be needed or not.
      // Actually standard S3 SDK with R2 endpoint works fine.
    });
  }

  /**
   * Generate a pre-signed URL for client-side upload
   * @param key The unique key for the file (e.g., products/123/image.jpg)
   * @param contentType MIME type of the file
   * @param expiresInSeconds Expiration time in seconds (default 3600)
   */
  async generateUploadUrl(key: string, contentType: string, expiresInSeconds = 3600): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
      // ACL: 'public-read', // R2 doesn't support ACLs like S3, usually bucket policy or public access
    });

    return getSignedUrl(this.s3Client, command, { expiresIn: expiresInSeconds });
  }

  /**
   * Delete a file from R2
   * @param key The key of the file to delete
   */
  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  /**
   * Get the public URL for a file
   * @param key The storage key
   */
  getPublicUrl(key: string): string {
    if (this.publicUrl) {
        // Ensure no double slashes if publicUrl has trailing slash
        const baseUrl = this.publicUrl.replace(/\/$/, '');
        const cleanKey = key.replace(/^\//, '');
        return `${baseUrl}/${cleanKey}`;
    }
    // Fallback? or return null?
    return '';
  }
}

export const r2Service = new R2Service();
