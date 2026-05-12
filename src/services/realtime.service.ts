import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";

// ============ REAL-TIME NOTIFICATION SERVICE ============

export interface NotificationEvent {
  type:
    | "like"
    | "comment"
    | "follow"
    | "milestone"
    | "featured"
    | "global_activity";
  recipientId?: string; // For targeted notifications
  data: Record<string, any>;
  timestamp?: Date;
}

export class RealtimeService {
  // Channels for different event types
  private static readonly CHANNELS = {
    USER_NOTIFICATIONS: (userId: string) => `notifications:${userId}`,
    GLOBAL_ACTIVITY: "activity:global",
    TRENDING: "trending:updates",
    BOUNTY: (userId: string) => `bounty:${userId}`,
    LIVESTREAM: (userId: string) => `stream:${userId}`,
  };

  /**
   * Send real-time notification via Redis pub/sub
   */
  static async sendNotification(event: NotificationEvent): Promise<void> {
    const timestamp = event.timestamp || new Date();

    // For personal notifications, send to user channel
    if (event.recipientId) {
      const channel = this.CHANNELS.USER_NOTIFICATIONS(event.recipientId);
      await redis.publishEvent(channel, {
        ...event,
        timestamp,
      });

      // Also save to database for persistence
      const notificationData = this.getNotificationData(event);
      await prisma.notification.create({
        data: {
          userId: event.recipientId,
          ...notificationData,
        },
      });
    }

    // For global events, broadcast to all
    if (
      event.type === "global_activity" ||
      event.type === "featured"
    ) {
      await redis.publishEvent(this.CHANNELS.GLOBAL_ACTIVITY, {
        ...event,
        timestamp,
      });
    }
  }

  /**
   * Broadcast like notification
   */
  static async notifyLike(
    creatorId: string,
    liker: { id: string; name: string; image?: string },
    edit: { id: string; title: string }
  ): Promise<void> {
    await this.sendNotification({
      type: "like",
      recipientId: creatorId,
      data: {
        liker,
        edit,
        message: `${liker.name} liked your edit: "${edit.title}"`,
      },
    });
  }

  /**
   * Broadcast comment notification
   */
  static async notifyComment(
    creatorId: string,
    commenter: { id: string; name: string; image?: string },
    edit: { id: string; title: string },
    comment: { id: string; content: string }
  ): Promise<void> {
    await this.sendNotification({
      type: "comment",
      recipientId: creatorId,
      data: {
        commenter,
        edit,
        comment,
        message: `${commenter.name} commented on your edit: "${edit.title}"`,
      },
    });
  }

  /**
   * Broadcast follow notification
   */
  static async notifyFollow(
    followingId: string,
    follower: { id: string; name: string; image?: string }
  ): Promise<void> {
    await this.sendNotification({
      type: "follow",
      recipientId: followingId,
      data: {
        follower,
        message: `${follower.name} started following you!`,
      },
    });
  }

  /**
   * Broadcast rank achievement
   */
  static async notifyMilestone(
    userId: string,
    type: "rank" | "streak" | "achievement",
    data: Record<string, any>
  ): Promise<void> {
    const messageMap: Record<string, string> = {
      rank: `🎉 You've achieved ${data.newRank} rank!`,
      streak: `🔥 ${data.streakDays} day streak maintained!`,
      achievement: `⭐ You've unlocked: ${data.achievementName}!`,
    };

    await this.sendNotification({
      type: "milestone",
      recipientId: userId,
      data: {
        ...data,
        message: messageMap[type],
      },
    });
  }

  /**
   * Broadcast new upload from followed creator
   */
  static async notifyNewUpload(
    editId: string,
    creator: { id: string; name: string; image?: string },
    edit: { title: string; duration: number }
  ): Promise<void> {
    // Get all followers
    const followers = await prisma.follows.findMany({
      where: { followingId: creator.id },
      select: { followerId: true },
    });

    // Send to each follower
    for (const follow of followers) {
      await this.sendNotification({
        type: "global_activity",
        recipientId: follow.followerId,
        data: {
          action: "new_upload",
          creator,
          edit,
          editId,
          message: `${creator.name} uploaded a new edit: "${edit.title}"`,
        },
      });
    }

    // Also broadcast to global feed
    await redis.publishEvent(this.CHANNELS.GLOBAL_ACTIVITY, {
      type: "global_activity",
      data: {
        action: "new_upload",
        creator,
        edit,
        editId,
      },
    });
  }

  /**
   * Get user's unread notifications
   */
  static async getUnreadNotifications(
    userId: string,
    limit = 20
  ): Promise<any[]> {
    const cached = await redis.get(`unread_notifications:${userId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        isRead: false,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    // Cache for 5 minutes
    await redis.setex(
      `unread_notifications:${userId}`,
      300,
      JSON.stringify(notifications)
    );

    return notifications;
  }

  /**
   * Mark notifications as read
   */
  static async markAsRead(
    userId: string,
    notificationIds: string[]
  ): Promise<void> {
    await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    // Invalidate cache
    await redis.del(`unread_notifications:${userId}`);
  }

  /**
   * Get global activity feed
   */
  static async getGlobalActivityFeed(
    limit = 50,
    offset = 0
  ): Promise<any[]> {
    const cacheKey = `global_activity_feed:${Math.floor(offset / limit)}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const feed = await prisma.globalActivityFeed.findMany({
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    });

    // Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(feed));

    return feed;
  }

  /**
   * Broadcast edit to trending channel
   */
  static async updateTrending(editId: string, score: number): Promise<void> {
    await redis.updateTrendingScore(editId, score);

    // Notify via channel
    await redis.publishEvent(this.CHANNELS.TRENDING, {
      type: "trending_update",
      editId,
      score,
      timestamp: new Date(),
    });
  }

  /**
   * Helper: Extract notification data from event
   */
  private static getNotificationData(event: NotificationEvent) {
    const baseData = {
      type: event.type,
      message: event.data.message || "",
      relatedEditId: event.data.editId || event.data.edit?.id,
      relatedUserId: event.data.userId || event.data.liker?.id || event.data.commenter?.id || event.data.follower?.id,
      actionUrl: this.generateActionUrl(event),
    };

    return baseData;
  }

  /**
   * Helper: Generate action URL for notification
   */
  private static generateActionUrl(event: NotificationEvent): string {
    switch (event.type) {
      case "like":
      case "comment":
        return `/edit/${event.data.edit?.id}`;
      case "follow":
        return `/profile/${event.data.follower?.id}`;
      case "milestone":
        return `/profile/${event.recipientId}`;
      default:
        return "/";
    }
  }

  /**
   * Subscribe to user notifications (for WebSocket/Server-Sent Events)
   */
  static async subscribeToNotifications(
    userId: string,
    callback: (event: NotificationEvent) => void
  ): Promise<any> {
    const channel = this.CHANNELS.USER_NOTIFICATIONS(userId);
    return redis.subscribeToChannel(channel, callback);
  }

  /**
   * Subscribe to global activity feed
   */
  static async subscribeToGlobalFeed(
    callback: (event: NotificationEvent) => void
  ): Promise<any> {
    return redis.subscribeToChannel(this.CHANNELS.GLOBAL_ACTIVITY, callback);
  }
}

export default RealtimeService;
