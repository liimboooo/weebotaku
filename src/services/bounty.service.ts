import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

// ============ BOUNTY CALCULATION SERVICE ============

export class BountyService {
  /**
   * Bounty Formula:
   * (Total Likes * 10) + (Total Comments * 5) + (Daily Logins * 50) + (Uploads * 500)
   */
  static async calculateBounty(userId: string): Promise<BigInt> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        totalLikes: true,
        totalComments: true,
        dailyLoginStreak: true,
        totalUploads: true,
      },
    });

    if (!user) return BigInt(0);

    const bounty = BigInt(user.totalLikes * 10) +
      BigInt(user.totalComments * 5) +
      BigInt(user.dailyLoginStreak * 50) +
      BigInt(user.totalUploads * 500);

    return bounty;
  }

  /**
   * Determine bounty rank based on total bounty
   */
  static determineBountyRank(totalBounty: BigInt): string {
    const bounty = Number(totalBounty);

    if (bounty >= 1500000000) return "INFINITE"; // 1.5B
    if (bounty >= 100000000) return "Diamond"; // 100M
    if (bounty >= 10000000) return "Platinum"; // 10M
    if (bounty >= 1000000) return "Gold"; // 1M
    if (bounty >= 100000) return "Silver"; // 100K
    return "Bronze";
  }

  /**
   * Update user's bounty and rank based on current metrics
   */
  static async updateBounty(userId: string): Promise<void> {
    const bounty = await this.calculateBounty(userId);
    const newRank = this.determineBountyRank(bounty);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { bountyRank: true },
    });

    // Check if rank changed
    const rankChanged = user?.bountyRank !== newRank;

    // Update user
    await prisma.user.update({
      where: { id: userId },
      data: {
        totalBounty: bounty,
        bountyRank: newRank,
      },
    });

    // Invalidate cache
    await redis.del(`user:${userId}:bounty`);

    // Create milestone notification if rank changed
    if (rankChanged && newRank !== "Bronze") {
      const achievementMessage = this.getAchievementMessage(newRank);

      await prisma.notification.create({
        data: {
          userId,
          type: "milestone",
          title: "New Rank Achieved! 🎉",
          message: `Congratulations! You've reached the ${newRank} rank! ${achievementMessage}`,
          actionUrl: `/profile/${userId}`,
        },
      });

      // Log to activity
      await prisma.activityLog.create({
        data: {
          userId,
          action: "milestone",
          actionType: "rank_change",
          metadata: {
            oldRank: user?.bountyRank,
            newRank,
            bounty: bounty.toString(),
          },
        },
      });

      // Add to global feed
      await this.addToGlobalFeed(userId, "milestone", {
        rankAchieved: newRank,
      });
    }
  }

  /**
   * Handle like action and update bounty
   */
  static async onLikeAdded(userId: string): Promise<void> {
    // Increment total likes
    await prisma.user.update({
      where: { id: userId },
      data: { totalLikes: { increment: 1 } },
    });

    // Recalculate bounty
    await this.updateBounty(userId);

    // Update trending score
    await this.updateTrendingScore(userId);
  }

  /**
   * Handle comment action and update bounty
   */
  static async onCommentAdded(userId: string): Promise<void> {
    // Increment total comments
    await prisma.user.update({
      where: { id: userId },
      data: { totalComments: { increment: 1 } },
    });

    // Recalculate bounty
    await this.updateBounty(userId);

    // Update trending score
    await this.updateTrendingScore(userId);
  }

  /**
   * Handle upload action and update bounty
   */
  static async onUploadAdded(userId: string): Promise<void> {
    // Increment total uploads
    await prisma.user.update({
      where: { id: userId },
      data: { totalUploads: { increment: 1 } },
    });

    // Recalculate bounty
    await this.updateBounty(userId);

    // Update activity for trending
    await this.updateRecentActivity(userId);
  }

  /**
   * Get achievement message based on rank
   */
  private static getAchievementMessage(rank: string): string {
    const messages: Record<string, string> = {
      Silver: "Keep uploading amazing content!",
      Gold: "You're a star creator!",
      Platinum: "Your content is legendary!",
      Diamond: "You're unstoppable!",
      INFINITE: "You've achieved INFINITE status! 🌟",
    };
    return messages[rank] || "";
  }

  /**
   * Update trending score for a user's edit
   */
  static async updateTrendingScore(userId: string): Promise<void> {
    const edits = await prisma.edit.findMany({
      where: { creatorId: userId },
      select: { id: true },
    });

    for (const edit of edits) {
      const trendingScore = await this.calculateTrendingScore(edit.id);

      await prisma.edit.update({
        where: { id: edit.id },
        data: { trendingScore },
      });
    }
  }

  /**
   * Calculate trending score based on velocity (engagement per hour)
   * Score = (likes/hour * 10) + (comments/hour * 5) + (views/hour * 1)
   */
  static async calculateTrendingScore(editId: string): Promise<number> {
    const edit = await prisma.edit.findUnique({
      where: { id: editId },
      select: {
        createdAt: true,
        lastHourViews: true,
        lastHourLikes: true,
        lastHourComments: true,
        likeCount: true,
        commentCount: true,
        viewCount: true,
      },
    });

    if (!edit) return 0;

    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Get activity in last hour
    const [likes, comments, views] = await Promise.all([
      prisma.like.count({
        where: {
          editId,
          createdAt: { gte: hourAgo },
        },
      }),
      prisma.comment.count({
        where: {
          editId,
          createdAt: { gte: hourAgo },
        },
      }),
      prisma.view.count({
        where: {
          editId,
          createdAt: { gte: hourAgo },
        },
      }),
    ]);

    // Update last hour metrics
    await prisma.edit.update({
      where: { id: editId },
      data: {
        lastHourLikes: likes,
        lastHourComments: comments,
        lastHourViews: views,
        lastScoredAt: now,
      },
    });

    // Calculate velocity score
    const likeVelocity = likes * 10;
    const commentVelocity = comments * 5;
    const viewVelocity = views * 1;

    const trendingScore = likeVelocity + commentVelocity + viewVelocity;

    // Boost score if edit is recent (within 24 hours)
    const hoursOld = (now.getTime() - edit.createdAt.getTime()) / (1000 * 60 * 60);
    const recencyBoost = hoursOld < 24 ? 100 : 0;

    return trendingScore + recencyBoost;
  }

  /**
   * Update recent activity for trending feed
   */
  static async updateRecentActivity(userId: string): Promise<void> {
    const hour = new Date();
    hour.setHours(hour.getHours() - 1);

    const [likes, comments] = await Promise.all([
      prisma.like.count({
        where: {
          user: { id: userId },
          createdAt: { gte: hour },
        },
      }),
      prisma.comment.count({
        where: {
          user: { id: userId },
          createdAt: { gte: hour },
        },
      }),
    ]);

    await prisma.user.update({
      where: { id: userId },
      data: {
        recentActivity: likes + comments,
      },
    });
  }

  /**
   * Add to global activity feed
   */
  private static async addToGlobalFeed(
    userId: string,
    action: string,
    metadata: any
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    await prisma.globalActivityFeed.create({
      data: {
        userId,
        action,
        creatorName: user?.name || "Unknown",
        metadata,
      },
    });
  }
}

export default BountyService;
