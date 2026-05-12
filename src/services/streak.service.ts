import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

// ============ STREAK SERVICE ============

export class StreakService {
  /**
   * Update daily login streak
   * - Increments if user logs in on consecutive days
   * - Resets to 1 if more than 24 hours since last login
   * - Streak can be frozen for premium users
   */
  static async updateDailyStreak(userId: string): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        dailyLoginStreak: true,
        lastLoginDate: true,
        lastLoginDay: true,
        currentStreak: true,
        longestStreak: true,
        streakFrozenUntil: true,
      },
    });

    if (!user) return 0;

    const now = new Date();
    const today = this.getDateString(now);
    const yesterday = this.getDateString(new Date(now.getTime() - 24 * 60 * 60 * 1000));

    // Check if already logged in today
    if (user.lastLoginDay === today) {
      return user.dailyLoginStreak;
    }

    let newStreak = user.dailyLoginStreak || 0;

    // Check if streak should be frozen
    const isStreakFrozen = user.streakFrozenUntil
      ? new Date(user.streakFrozenUntil) > now
      : false;

    if (isStreakFrozen) {
      // Extend freeze if needed, don't reset streak
      console.log(`Streak frozen for user ${userId}`);
    } else {
      // Check if login is consecutive day
      if (user.lastLoginDay === yesterday) {
        newStreak = (user.dailyLoginStreak || 0) + 1;
      } else if (user.lastLoginDay === today) {
        // Already logged in today
        newStreak = user.dailyLoginStreak || 1;
      } else {
        // More than 24 hours since last login - reset streak
        newStreak = 1;
      }
    }

    // Update longest streak if applicable
    const longestStreak = Math.max(user.longestStreak || 0, newStreak);

    // Update user
    await prisma.user.update({
      where: { id: userId },
      data: {
        dailyLoginStreak: newStreak,
        lastLoginDate: now,
        lastLoginDay: today,
        longestStreak,
        lastActivityDate: now,
      },
    });

    // Invalidate cache
    await redis.del(`user:${userId}:streak`);

    // Check for streak milestones
    await this.checkStreakMilestones(userId, newStreak);

    // Update bounty due to daily login bonus
    const { BountyService } = await import("./bounty.service");
    await BountyService.updateBounty(userId);

    return newStreak;
  }

  /**
   * Check for streak milestones and create notifications
   */
  private static async checkStreakMilestones(
    userId: string,
    streak: number
  ): Promise<void> {
    const milestones = [7, 14, 30, 60, 90, 100, 365];

    if (milestones.includes(streak)) {
      await prisma.notification.create({
        data: {
          userId,
          type: "milestone",
          title: `🔥 ${streak} Day Streak!`,
          message: `Amazing! You've logged in for ${streak} consecutive days. Keep it up!`,
          actionUrl: `/profile/${userId}`,
        },
      });

      // Log to activity
      await prisma.activityLog.create({
        data: {
          userId,
          action: "milestone",
          actionType: "streak",
          metadata: {
            streakDays: streak,
          },
        },
      });
    }
  }

  /**
   * Get user's current streak
   */
  static async getStreak(userId: string): Promise<{
    currentStreak: number;
    longestStreak: number;
    streakFrozen: boolean;
    frozenUntil?: Date;
  }> {
    // Check cache first
    const cached = await redis.get(`user:${userId}:streak`);
    if (cached) {
      return JSON.parse(cached);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        dailyLoginStreak: true,
        longestStreak: true,
        streakFrozenUntil: true,
      },
    });

    const now = new Date();
    const result = {
      currentStreak: user?.dailyLoginStreak || 0,
      longestStreak: user?.longestStreak || 0,
      streakFrozen: user?.streakFrozenUntil
        ? new Date(user.streakFrozenUntil) > now
        : false,
      frozenUntil: user?.streakFrozenUntil || undefined,
    };

    // Cache for 1 hour
    await redis.setex(`user:${userId}:streak`, 3600, JSON.stringify(result));

    return result;
  }

  /**
   * Apply streak freeze (for premium users)
   */
  static async applyStreakFreeze(userId: string, durationDays = 7): Promise<void> {
    const now = new Date();
    const frozenUntil = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: userId },
      data: {
        streakFrozenUntil: frozenUntil,
      },
    });

    await redis.del(`user:${userId}:streak`);

    // Log to activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: "streak_freeze_applied",
        actionType: "premium_feature",
        metadata: {
          frozenUntil: frozenUntil.toISOString(),
        },
      },
    });
  }

  /**
   * Check and reset streaks if expired
   * Should be called via cron job daily
   */
  static async processStreakResets(): Promise<void> {
    const now = new Date();
    yesterday.setHours(0, 0, 0, 0);

    // Find users who haven't logged in for more than 24 hours and have streaks
    const usersWithStreaks = await prisma.user.findMany({
      where: {
        dailyLoginStreak: { gt: 0 },
        lastLoginDate: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        // Exclude streak frozen users
        streakFrozenUntil: { lt: now },
      },
      select: { id: true, dailyLoginStreak: true, longestStreak: true },
    });

    for (const user of usersWithStreaks) {
      // Reset streak but keep longest streak
      await prisma.user.update({
        where: { id: user.id },
        data: {
          dailyLoginStreak: 0,
        },
      });

      await redis.del(`user:${user.id}:streak`);

      // Create notification
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: "alert",
          title: "Streak Lost 😢",
          message: `Your ${user.dailyLoginStreak} day streak has expired. Log in now to start a new one!`,
          actionUrl: "/",
        },
      });
    }
  }

  /**
   * Utility: Convert date to YYYY-MM-DD string
   */
  private static getDateString(date: Date): string {
    return date.toISOString().split("T")[0];
  }

  /**
   * Get leaderboard of users by streak
   */
  static async getStreakLeaderboard(limit = 50): Promise<any[]> {
    const cached = await redis.get("streak_leaderboard");
    if (cached) {
      return JSON.parse(cached);
    }

    const leaderboard = await prisma.user.findMany({
      where: {
        dailyLoginStreak: { gt: 0 },
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        image: true,
        dailyLoginStreak: true,
        longestStreak: true,
        bountyRank: true,
      },
      orderBy: {
        dailyLoginStreak: "desc",
      },
      take: limit,
    });

    // Cache for 1 hour
    await redis.setex("streak_leaderboard", 3600, JSON.stringify(leaderboard));

    return leaderboard;
  }
}

const yesterday = new Date();

export default StreakService;
