import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadResponse {
  public_id: string;
  version: number;
  signature: string;
  width?: number;
  height?: number;
  format: string;
  resource_type: string;
  created_at: string;
  tags?: string[];
  bytes: number;
  type: string;
  etag: string;
  placeholder: boolean;
  url: string;
  secure_url: string;
  folder?: string;
  original_filename: string;
  duration?: number;
}

// ============ SIGNED URL GENERATION ============
export function generateUploadSignature(uploadPreset: string = "animewch_edits") {
  const timestamp = Math.round(new Date().getTime() / 1000);
  const params = {
    timestamp,
    upload_preset: uploadPreset,
  };

  const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET || "");

  return {
    timestamp,
    signature,
    uploadPreset,
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  };
}

// ============ VIDEO UPLOAD ============
export async function uploadVideoToCloudinary(
  fileBuffer: Buffer,
  fileName: string,
  isPublic = true
) {
  return new Promise<UploadResponse>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "video",
        folder: "animewch/edits",
        public_id: fileName.replace(/\.[^.]+$/, ""),
        quality: "auto",
        fetch_format: "auto",
        flags: "progressive",
        video_sampling: 5, // Sample every 5 seconds for thumbnails
        eager: [
          {
            width: 300,
            height: 300,
            crop: "fill",
            quality: "auto",
            fetch_format: "auto",
            resource_type: "video",
            delay: "2", // Get frame at 2 seconds
          },
        ],
        eager_async: true,
        notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/cloudinary`,
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result as UploadResponse);
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
}

// ============ THUMBNAIL EXTRACTION ============
export function getThumbnailUrl(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string;
    delay?: string;
  } = {}
) {
  const {
    width = 400,
    height = 300,
    crop = "fill",
    quality = "auto",
    delay = "2s",
  } = options;

  return cloudinary.url(publicId, {
    resource_type: "video",
    crop,
    width,
    height,
    quality,
    delay,
    fetch_format: "jpg",
  });
}

// ============ VIDEO TRANSFORMATIONS ============
export function getOptimizedVideoUrl(
  publicId: string,
  options: {
    quality?: string;
    bitRate?: string;
    format?: string;
    fetchFormat?: string;
  } = {}
) {
  const {
    quality = "auto",
    bitRate = "auto",
    format = "mp4",
    fetchFormat = "auto",
  } = options;

  return cloudinary.url(publicId, {
    resource_type: "video",
    type: "authenticated",
    quality,
    bit_rate: bitRate,
    format,
    fetch_format: fetchFormat,
    flags: "progressive",
  });
}

// ============ DELETE VIDEO ============
export async function deleteVideoFromCloudinary(publicId: string) {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "video",
    });
    return result;
  } catch (error) {
    console.error("Error deleting video from Cloudinary:", error);
    throw error;
  }
}

// ============ VIDEO SEARCH ============
export async function searchVideos(query: string) {
  try {
    const result = await cloudinary.api.resources(
      {
        type: "authenticated",
        resource_type: "video",
        prefix: "animewch/edits",
        max_results: 500,
      },
      { resource_type: "video" }
    );
    return result.resources;
  } catch (error) {
    console.error("Error searching videos:", error);
    throw error;
  }
}

// ============ GET VIDEO METADATA ============
export async function getVideoMetadata(publicId: string) {
  try {
    const result = await cloudinary.api.resource(publicId, {
      resource_type: "video",
    });
    return {
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      duration: result.duration,
      fileSize: result.bytes,
      url: result.secure_url,
      createdAt: result.created_at,
    };
  } catch (error) {
    console.error("Error fetching video metadata:", error);
    throw error;
  }
}

// ============ GENERATE STREAMING URL ============
export function getStreamingUrl(
  publicId: string,
  format: "hls" | "dash" | "mp4" = "hls"
) {
  const baseUrl = cloudinary.url(publicId, {
    resource_type: "video",
    type: "authenticated",
  });

  if (format === "hls") {
    return baseUrl.replace(/\.[^.]+$/, ".m3u8");
  } else if (format === "dash") {
    return baseUrl.replace(/\.[^.]+$/, ".mpd");
  }

  return baseUrl;
}

// ============ ANALYTICS ============
export async function getVideoUsage() {
  try {
    const result = await cloudinary.api.usage();
    return {
      transformations: result.transformations,
      storage: result.storage,
      bandwidth: result.bandwidth,
      credits: result.credits,
      mediaAssets: result.media_assets,
    };
  } catch (error) {
    console.error("Error fetching usage:", error);
    throw error;
  }
}

export default cloudinary;
