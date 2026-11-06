import crypto from "crypto";

export interface AssetValidationInput {
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
}

export interface AssetValidationResult {
  valid: boolean;
  sanitizedFileName?: string;
  sanitizedMimeType?: string;
  reason?: string;
}

export class StorageService {
  public static readonly MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

  public static readonly ALLOWED_MIME_TYPES: Record<string, string[]> = {
    // Images
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "image/webp": [".webp"],
    // Documents
    "application/pdf": [".pdf"],
    "text/plain": [".txt"],
    "application/json": [".json"],
    // Audio logs
    "audio/mpeg": [".mp3"],
    "audio/wav": [".wav"],
    "audio/ogg": [".ogg"],
  };

  /**
   * Validates client-supplied asset metadata against strict platform security policies.
   */
  public static validateAssetMetadata(input: AssetValidationInput): AssetValidationResult {
    if (!input.fileName || typeof input.fileName !== "string") {
      return { valid: false, reason: "Filename must be a non-empty string" };
    }

    // Strip dangerous directory traversal characters
    const sanitizedFileName = input.fileName.replace(/[\\/?:*"><|]/g, "_").trim();
    if (!sanitizedFileName || sanitizedFileName === ".." || sanitizedFileName === ".") {
      return { valid: false, reason: "Invalid filename format" };
    }

    if (input.fileSizeBytes <= 0) {
      return { valid: false, reason: "File size must be greater than zero bytes" };
    }

    if (input.fileSizeBytes > this.MAX_FILE_SIZE_BYTES) {
      return {
        valid: false,
        reason: `File size exceeds the platform limit of ${this.MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`,
      };
    }

    const normalizedMime = input.mimeType.toLowerCase().trim();
    const allowedExtensions = this.ALLOWED_MIME_TYPES[normalizedMime];

    if (!allowedExtensions) {
      return {
        valid: false,
        reason: `MIME type '${normalizedMime}' is not permitted in classified evidence archives`,
      };
    }

    // Verify file extension matches expected MIME type
    const ext = sanitizedFileName.substring(sanitizedFileName.lastIndexOf(".")).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      return {
        valid: false,
        reason: `File extension '${ext}' does not match declared MIME type '${normalizedMime}'`,
      };
    }

    return {
      valid: true,
      sanitizedFileName,
      sanitizedMimeType: normalizedMime,
    };
  }

  /**
   * Generates a collision-resistant, tamper-proof storage key.
   */
  public static generateStorageKey(caseId: string, clueId: string, fileName: string): string {
    const randomUuid = crypto.randomUUID();
    const ext = fileName.substring(fileName.lastIndexOf(".")).toLowerCase() || ".bin";
    return `evidence/${caseId}/${clueId}/${randomUuid}${ext}`;
  }

  /**
   * Returns a secure, authenticated internal URL for evidence asset streaming.
   * Never exposes raw storage bucket paths or private credentials to the client.
   */
  public static getSecureAccessUrl(
    investigationId: string,
    clueId: string,
    assetId: string
  ): string {
    return `/api/investigations/${investigationId}/evidence/${clueId}/assets/${assetId}`;
  }
}
