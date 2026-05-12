import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// ============ STATS SERVICE ============

export class StatsService {
  static async updateUserStats(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        watchlist: {
          select: { editId: true, status: true },
        },
        likes: { select: { editId: true } },
        edits: {
          select: {
            viewCount: true,
            likeCount: true,
            _count: { select: { comments: true } },
          },
        },
        followers: { select: { id: true } },
        following: { select: { id: true } },
      },
    });

    if (!user) return;

    // Calculate stats
    const totalEditsWatched = user.watchlist.length;
    const totalLikes = user.likes.length;
    const totalViews = user.edits.reduce((sum, edit) => sum + edit.viewCount, 0);
    const followerCount = user.followers.length;
    const followingCount = user.following.length;

    // Update bounty rank
    const bountyRank = this.calculateBountyRank(totalViews, user.edits.length, followerCount);

    await prisma.user.update({
      where: { id: userId },
      data: {
        totalEditsWatched,
        totalViews,
        totalLikes,
        followerCount,
        followingCount,
        bountyRank,
      },
    });

    // Check for milestone notifications
    await this.checkMilestones(userId);
  }

  static calculateBountyRank(
    views: number,
    editsCreated: number,
    followers: number
  ): string {
    const score = views * 0.4 + editsCreated * 30 + followers * 5;

    if (score >= 10000) return "Diamond";
    if (score >= 5000) return "Platinum";
    if (score >= 1000) return "Gold";
    if (score >= 100) return "Silver";
    return "Bronze";
  }

  static async updateStreakCount(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        currentStreak: true,
        longestStreak: true,
        lastActivityDate: true,
        edits: {
          where: {
            createdAt: { gte: yesterday },
          },
          select: { id: true },
        },
      },
    });

    if (!user) return;

    let currentStreak = user.currentStreak;

    // Check if user was active today
    const isActiveToday = user.edits.length > 0;

    if (isActiveToday) {
      if (!user.lastActivityDate) {
        currentStreak = 1;
      } else {
        const lastActivity = new Date(user.lastActivityDate);
        lastActivity.setHours(0, 0, 0, 0);

        const daysDiff = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff === 1) {
          currentStreak = user.currentStreak + 1;
        } else if (daysDiff === 0) {
          // Already counted today
          currentStreak = user.currentStreak;
        } else {
          currentStreak = 1;
        }
      }

      const longestStreak = Math.max(user.longestStreak, currentStreak);

      await prisma.user.update({
        where: { id: userId },
        data: {
          currentStreak,
          longestStreak,
          lastActivityDate: new Date(),
        },
      });
    }
  }

  static async checkMilestones(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        totalEditsCreated: true,
        totalViews: true,
        followerCount: true,
        currentStreak: true,
        _count: { select: { edits: true } },
      },
    });

    if (!user) return;

    const milestones = [];

    if (user._count.edits === 10) milestones.push("10_EDITS");
    if (user._count.edits === 100) milestones.push("100_EDITS");
    if (user.totalViews >= 1000) milestones.push("1K_VIEWS");
    if (user.totalViews >= 10000) milestones.push("10K_VIEWS");
    if (user.followerCount >= 100) milestones.push("100_FOLLOWERS");
    if (user.followerCount >= 1000) milestones.push("1K_FOLLOWERS");
    if (user.currentStreak >= 7) milestones.push("7_DAY_STREAK");
    if (user.currentStreak >= 30) milestones.push("30_DAY_STREAK");

    // Trigger notifications for milestones
    for (const milestone of milestones) {
      // Implementation would send notifications
      console.log(`Milestone achieved: ${milestone}`);
    }
  }
}

// ============ RECOMMENDATION SERVICE ============

export class RecommendationService {
  static async getPersonalizedRecommendations(userId: string, limit = 20) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        watchlist: { select: { edit: { select: { categories: true } } } },
        likes: { select: { edit: { select: { tags: true } } } },
      },
    });

    if (!user) return [];

    // Extract user's preferred categories and tags
    const preferredCategories = new Set<string>();
    const preferredTags = new Set<string>();

    user.watchlist.forEach((w) => {
      w.edit.categories.forEach((c) => {
        preferredCategories.add(c.id);
      });
    });

    user.likes.forEach((l) => {
      l.edit.tags.forEach((t) => {
        preferredTags.add(t);
      });
    });

    // Get recommended edits
    const recommendations = await prisma.edit.findMany({
      where: {
        isPublished: true,
        OR: [
          {
            categories: {
              some: { id: { in: Array.from(preferredCategories) } },
            },
          },
          { tags: { hasSome: Array.from(preferredTags) } },
        ],
      },
      orderBy: {
        likeCount: "desc",
      },
      take: limit,
      include: {
        creator: {
          select: { id: true, name: true, image: true },
        },
        categories: true,
      },
    });

    return recommendations;
  }

  static async getTrendingEdits(timeframe = "week", limit = 20) {
    const startDate = new Date();
    const day = startDate.getDay();
    const diff = startDate.getDate() - day + (startDate.getDay() === 0 ? -6 : 1);

    if (timeframe === "week") {
      startDate.setDate(diff);
    } else if (timeframe === "month") {
      startDate.setDate(1);
    } else if (timeframe === "day") {
      startDate.setHours(0, 0, 0, 0);
    }

    const trending = await prisma.edit.findMany({
      where: {
        isPublished: true,
        createdAt: { gte: startDate },
      },
      orderBy: [
        { likeCount: "desc" },
        { viewCount: "desc" },
      ],
      take: limit,
      include: {
        creator: {
          select: { id: true, name: true, image: true },
        },
        categories: true,
        _count: {
          select: { likes: true, views: true, comments: true },
        },
      },
    });

    return trending;
  }

  static async getRelatedEdits(editId: string, limit = 10) {
    const edit = await prisma.edit.findUnique({
      where: { id: editId },
      select: { categories: true, tags: true },
    });

    if (!edit) return [];

    const relatedEdits = await prisma.edit.findMany({
      where: {
        id: { not: editId },
        isPublished: true,
        OR: [
          {
            categories: {
              some: { id: { in: edit.categories.map((c) => c.id) } },
            },
          },
          { tags: { hasSome: edit.tags } },
        ],
      },
      take: limit,
      include: {
        creator: {
          select: { id: true, name: true, image: true },
        },
        categories: true,
      },
    });

    return relatedEdits;
  }
}

// ============ ANALYTICS SERVICE ============

export class AnalyticsService {
  static async recordView(editId: string, viewerIp?: string, duration?: number) {
    await prisma.view.create({
      data: {
        editId,
        viewerIp: viewerIp || "unknown",
        duration,
      },
    });

    // Batch update view count every 10 views
    const viewCount = await prisma.view.count({
      where: { editId },
    });

    if (viewCount % 10 === 0) {
      await prisma.edit.update({
        where: { id: editId },
        data: { viewCount },
      });
    }
  }

  static async getEditAnalytics(editId: string) {
    const [views, likes, comments, edit] = await Promise.all([
      prisma.view.count({ where: { editId } }),
      prisma.like.count({ where: { editId } }),
      prisma.comment.count({ where: { editId } }),
      prisma.edit.findUnique({
        where: { id: editId },
        select: {
          title: true,
          viewCount: true,
          likeCount: true,
          commentCount: true,
          shareCount: true,
          createdAt: true,
          _count: { select: { views: true } },
        },
      }),
    ]);

    return {
      editId,
      title: edit?.title,
      views,
      likes,
      comments,
      likeRatio: views > 0 ? (likes / views) * 100 : 0,
      engagementRate:
        views > 0
          ? ((likes + comments + (edit?.shareCount || 0)) / views) * 100
          : 0,
      createdAt: edit?.createdAt,
    };
  }

  static async getUserAnalytics(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        totalViews: true,
        totalLikes: true,
        followerCount: true,
        followingCount: true,
        edits: {
          select: {
            id: true,
            viewCount: true,
            likeCount: true,
          },
        },
      },
    });

    if (!user) return null;

    const totalEngagement = user.edits.reduce(
      (sum, edit) => sum + edit.viewCount + edit.likeCount,
      0
    );

    return {
      userId,
      totalEditsCreated: user.edits.length,
      totalViews: user.totalViews,
      totalLikes: user.totalLikes,
      totalEngagement,
      followerCount: user.followerCount,
      followingCount: user.followingCount,
      avgViewsPerEdit:
        user.edits.length > 0
          ? user.totalViews / user.edits.length
          : 0,
    };
  }
}

// ============ SEARCH SERVICE ============

export class SearchService {
  static async fullTextSearch(
    query: string,
    type: "edits" | "users" | "all" = "all",
    limit = 20
  ) {
    const searchQuery = query.toLowerCase().trim();

    if (!searchQuery || searchQuery.length < 2) {
      return [];
    }

    const results: any = {};

    if (type === "edits" || type === "all") {
      results.edits = await prisma.edit.findMany({
        where: {
          isPublished: true,
          OR: [
            {
              title: {
                search: searchQuery,
              },
            },
            {
              description: {
                search: searchQuery,
              },
            },
            { tags: { hasSome: [searchQuery] } },
          ],
        },
        take: limit,
        include: {
          creator: {
            select: { id: true, name: true, image: true },
          },
          categories: true,
        },
      });
    }

    if (type === "users" || type === "all") {
      results.users = await prisma.user.findMany({
        where: {
          OR: [
            {
              name: {
                search: searchQuery,
              },
            },
            {
              bio: {
                search: searchQuery,
              },
            },
          ],
          isPrivate: false,
        },
        take: limit,
        select: {
          id: true,
          name: true,
          image: true,
          bio: true,
          bountyRank: true,
          totalEditsCreated: true,
          followerCount: true,
        },
      });
    }

    return results;
  }

  static async searchByTag(tag: string, limit = 20, page = 1) {
    const skip = (page - 1) * limit;

    const [results, total] = await Promise.all([
      prisma.edit.findMany({
        where: {
          isPublished: true,
          tags: { hasSome: [tag] },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          creator: {
            select: { id: true, name: true, image: true },
          },
          categories: true,
        },
      }),
      prisma.edit.count({
        where: {
          isPublished: true,
          tags: { hasSome: [tag] },
        },
      }),
    ]);

    return {
      tag,
      results,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  static async autocomplete(query: string, limit = 10) {
    const searchQuery = query.toLowerCase().trim();

    const [editTitles, tags, creators] = await Promise.all([
      prisma.edit.findMany({
        where: {
          isPublished: true,
          title: {
            search: searchQuery,
          },
        },
        select: { title: true },
        distinct: ["title"],
        take: limit / 3,
      }),
      prisma.edit.findMany({
        where: {
          isPublished: true,
          tags: { hasSome: [searchQuery] },
        },
        select: { tags: true },
        distinct: ["tags"],
        take: limit / 3,
      }),
      prisma.user.findMany({
        where: {
          name: {
            search: searchQuery,
          },
          isPrivate: false,
        },
        select: { name: true },
        distinct: ["name"],
        take: limit / 3,
      }),
    ]);

    return {
      editTitles: editTitles.map((e) => e.title),
      tags: tags.flatMap((e) => e.tags).slice(0, limit / 3),
      creators: creators.map((u) => u.name),
    };
  }
}

export default {
  StatsService,
  RecommendationService,
  AnalyticsService,
  SearchService,
};
