import { storagePut } from "./storage";

/**
 * Upload file buffer to S3 and return the URL
 * This is called from the client with the file data
 */
export async function uploadFileToS3(
  userId: number,
  fileName: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<{ key: string; url: string }> {
  // Generate a unique file key with user ID and timestamp
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileKey = `documents/${userId}/${timestamp}-${sanitizedFileName}`;
  
  // Upload to S3
  const result = await storagePut(fileKey, fileBuffer, contentType);
  
  return result;
}
