import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { RealtimeService } from "./realtime.service";

// ============ VIDEO TRANSCODING SERVICE ============

export interface TranscodingWebhookPayload {
  public_id: string;
  event: string; // 'upload_complete', 'processing_complete', 'error'
  secure_url: string;
  resource_type: string;
  duration?: number;
  width?: number;
  height?: number;
  eager?: Array<{
    transformation: string;
    secure_url: string;
  }>;
  error?: {
    message: string;
  };
}

export class TranscodingService {
  /**
   * Handle Cloudinary webhook for completed transcoding
   */
  static async handleTranscodingWebhook(
    payload: TranscodingWebhookPayload
  ): Promise<void> {
    const { public_id, event, error } = payload;

    // Find edit by video public ID
    const edit = await prisma.edit.findFirst({
      where: { videoPublicId: public_id },
      select: {
        id: true,
        creatorId: true,
        title: true,
        processingStatus: true,
      },
    });

    if (!edit) {
      console.error(`Edit not found for public_id: ${public_id}`);
      return;
    }

    if (event === "processing_complete" || event === "upload_complete") {
      await this.completeTranscoding(edit.id, payload);
    } else if (event === "error") {
      await this.failTranscoding(edit.id, error?.message || "Unknown error");
    }
  }

  /**
   * Process completed transcoding
   */
  private static async completeTranscoding(
    editId: string,
    payload: TranscodingWebhookPayload
  ): Promise<void> {
    // Extract transcoded versions from eager transformations
    const transcodedVersions: Record<string, string> = {};

    if (payload.eager) {
      for (const transformation of payload.eager) {
        const quality = this.extractQualityFromTransformation(
          transformation.transformation
        );
        if (quality) {
          transcodedVersions[quality] = transformation.secure_url;
        }
      }
    }

    // Generate HLS and DASH URLs
    const hlsUrl = this.generateStreamingUrl(payload.public_id, "hls");
    const dashUrl = this.generateStreamingUrl(payload.public_id, "dash");

    // Update edit in database
    await prisma.edit.update({
      where: { id: editId },
      data: {
        processingStatus: "completed",
        transcodedVersions,
        hlsManifestUrl: hlsUrl,
        dashManifestUrl: dashUrl,
        duration: payload.duration || 0,
        animatedGif: this.generateAnimatedGifUrl(payload.public_id),
      },
    });

    // Invalidate cache
    await redis.del(`edit:${editId}`);

    // Notify creator via real-time
    const edit = await prisma.edit.findUnique({
      where: { id: editId },
      select: { creatorId: true, title: true },
    });

    if (edit) {
      await RealtimeService.sendNotification({
        type: "featured",
        recipientId: edit.creatorId,
        data: {
          message: `Your edit "${edit.title}" has finished processing!`,
          editId,
        },
      });
    }

    console.log(`✅ Transcoding completed for edit: ${editId}`);
  }

  /**
   * Handle transcoding failure
   */
  private static async failTranscoding(
    editId: string,
    errorMessage: string
  ): Promise<void> {
    const edit = await prisma.edit.update({
      where: { id: editId },
      data: {
        processingStatus: "failed",
      },
      select: { creatorId: true, title: true },
    });

    // Notify creator
    await RealtimeService.sendNotification({
      type: "featured",
      recipientId: edit.creatorId,
      data: {
        message: `Transcoding failed for "${edit.title}": ${errorMessage}`,
        editId,
      },
    });

    console.error(`❌ Transcoding failed for edit ${editId}: ${errorMessage}`);
  }

  /**
   * Extract quality level from Cloudinary transformation
   */
  private static extractQualityFromTransformation(transformation: string): string | null {
    if (transformation.includes("h_720")) return "720p";
    if (transformation.includes("h_480")) return "480p";
    if (transformation.includes("h_1080")) return "1080p";
    if (transformation.includes("h_2160")) return "4K";
    return null;
  }

  /**
   * Generate HLS streaming URL
   */
  private static generateStreamingUrl(publicId: string, format: "hls" | "dash"): string {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const ext = format === "hls" ? "m3u8" : "mpd";
    return `https://res.cloudinary.com/${cloudName}/video/upload/fl_streaming_hls,c_limit,h_1080,w_1920/${publicId}.${ext}`;
  }

  /**
   * Generate animated GIF thumbnail
   */
  private static generateAnimatedGifUrl(publicId: string): string {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    return `https://res.cloudinary.com/${cloudName}/video/upload/fl_animated,c_scale,w_300,h_300/${publicId}.gif`;
  }

  /**
   * Trigger manual transcoding job
   */
  static async triggerTranscoding(editId: string): Promise<void> {
    const edit = await prisma.edit.findUnique({
      where: { id: editId },
      select: {
        videoPublicId: true,
        duration: true,
      },
    });

    if (!edit || !edit.videoPublicId) {
      throw new Error("Edit not found or missing video");
    }

    // Mark as processing
    await prisma.edit.update({
      where: { id: editId },
      data: { processingStatus: "processing" },
    });

    // In production, this would trigger a background job (e.g., Bull, RabbitMQ)
    // For now, we're relying on Cloudinary webhooks
    console.log(`Transcoding triggered for edit: ${editId}`);
  }

  /**
   * Get transcoding status
   */
  static async getTranscodingStatus(editId: string): Promise<{
    status: string;
    transcodedVersions?: Record<string, string>;
    hlsUrl?: string;
    dashUrl?: string;
    progress?: number;
  }> {
    const cached = await redis.get(`edit:${editId}:transcoding`);
    if (cached) {
      return JSON.parse(cached);
    }

    const edit = await prisma.edit.findUnique({
      where: { id: editId },
      select: {
        processingStatus: true,
        transcodedVersions: true,
        hlsManifestUrl: true,
        dashManifestUrl: true,
      },
    });

    const result = {
      status: edit?.processingStatus || "unknown",
      transcodedVersions: edit?.transcodedVersions as Record<string, string> | undefined,
      hlsUrl: edit?.hlsManifestUrl || undefined,
      dashUrl: edit?.dashManifestUrl || undefined,
      progress: this.estimateProgress(edit?.processingStatus),
    };

    // Cache for 1 minute
    await redis.setex(`edit:${editId}:transcoding`, 60, JSON.stringify(result));

    return result;
  }

  /**
   * Estimate transcoding progress
   */
  private static estimateProgress(status?: string): number {
    switch (status) {
      case "pending":
        return 0;
      case "processing":
        return 50;
      case "completed":
        return 100;
      case "failed":
        return 0;
      default:
        return 0;
    }
  }

  /**
   * Get streaming URL for playback
   */
  static getPlaybackUrl(
    videoPublicId: string,
    format: "hls" | "dash" | "mp4" | "webm" = "hls"
  ): string {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

    if (format === "hls") {
      return `https://res.cloudinary.com/${cloudName}/video/upload/fl_streaming_hls,c_limit,h_1080,w_1920/${videoPublicId}.m3u8`;
    } else if (format === "dash") {
      return `https://res.cloudinary.com/${cloudName}/video/upload/fl_streaming_dash,c_limit,h_1080,w_1920/${videoPublicId}.mpd`;
    } else if (format === "webm") {
      return `https://res.cloudinary.com/${cloudName}/video/upload/c_limit,h_1080,w_1920,f_webm/${videoPublicId}.webm`;
    } else {
      return `https://res.cloudinary.com/${cloudName}/video/upload/c_limit,h_1080,w_1920,f_mp4/${videoPublicId}.mp4`;
    }
  }

  /**
   * Get thumbnail from transcoded GIF
   */
  static getThumbnailUrl(videoPublicId: string, width = 400, height = 300): string {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    return `https://res.cloudinary.com/${cloudName}/image/upload/c_fill,w_${width},h_${height},fl_any_format/${videoPublicId}.jpg`;
  }
}

export default TranscodingService;
