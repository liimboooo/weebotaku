import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { log } from "@/lib/logger";

// ============ TRENDING ALGORITHM SERVICE ============

export interface TrendingMetrics {
  editId: string;
  title: string;
  creator: string;
  velocity: number; // engagement per hour
  totalEngagement: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  recencyScore: number;
  trendingScore: number;
  rank: number;
}

export class TrendingService {
  // Weighting factors for trending algorithm
  private static readonly WEIGHTS = {
    LIKE_VELOCITY: 10,
    COMMENT_VELOCITY: 15,
    VIEW_VELOCITY: 1,
    RECENCY_BOOST: 100,
    CREATOR_FOLLOWERS_BOOST: 5,
    ENGAGEMENT_RATE: 25,
  };

  /**
   * Calculate trending score for an edit
   * Formula: (likes/hour * 10) + (comments/hour * 15) + (views/hour * 1) + recency_boost
   */
  static async calculateTrendingScore(editId: string): Promise<number> {
    const edit = await prisma.edit.findUnique({
      where: { id: editId },
      select: {
        createdAt: true,
        likeCount: true,
        commentCount: true,
        viewCount: true,
        creator: {
          select: { followerCount: true },
        },
      },
    });

    if (!edit) return 0;

    const now = new Date();
    const ageInHours = (now.getTime() - new Date(edit.createdAt).getTime()) / (1000 * 60 * 60);

    // Prevent division by zero
    const hoursActive = Math.max(ageInHours, 0.5);

    // Calculate velocity metrics
    const likeVelocity = edit.likeCount / hoursActive;
    const commentVelocity = edit.commentCount / hoursActive;
    const viewVelocity = edit.viewCount / hoursActive;

    // Calculate engagement rate
    const engagementRate =
      edit.viewCount > 0
        ? ((edit.likeCount + edit.commentCount) / edit.viewCount) * 100
        : 0;

    // Recency boost: Videos less than 24 hours old get a boost
    const recencyBoost = ageInHours < 24 ? this.WEIGHTS.RECENCY_BOOST : 0;

    // Creator followers boost
    const creatorBoost = (edit.creator.followerCount / 100) * this.WEIGHTS.CREATOR_FOLLOWERS_BOOST;

    // Calculate final trending score
    const trendingScore =
      likeVelocity * this.WEIGHTS.LIKE_VELOCITY +
      commentVelocity * this.WEIGHTS.COMMENT_VELOCITY +
      viewVelocity * this.WEIGHTS.VIEW_VELOCITY +
      engagementRate * this.WEIGHTS.ENGAGEMENT_RATE +
      recencyBoost +
      creatorBoost;

    return trendingScore;
  }

  /**
   * Get trending edits with detailed metrics
   */
  static async getTrendingEdits(
    limit = 50,
    timeframeHours = 24
  ): Promise<TrendingMetrics[]> {
    // Check cache first
    const cacheKey = `trending:${timeframeHours}h:${limit}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const timeframeDate = new Date(Date.now() - timeframeHours * 60 * 60 * 1000);

    const edits = await prisma.edit.findMany({
      where: {
        isPublished: true,
        createdAt: { gte: timeframeDate },
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        viewCount: true,
        likeCount: true,
        commentCount: true,
        creator: {
          select: {
            name: true,
            followerCount: true,
          },
        },
      },
    });

    // Calculate trending scores
    const metricsWithScores = await Promise.all(
      edits.map(async (edit) => {
        const trendingScore = await this.calculateTrendingScore(edit.id);

        return {
          editId: edit.id,
          title: edit.title,
          creator: edit.creator.name || "Unknown",
          velocity: this.calculateVelocity(edit, timeframeHours),
          totalEngagement: edit.likeCount + edit.commentCount,
          viewCount: edit.viewCount,
          likeCount: edit.likeCount,
          commentCount: edit.commentCount,
          recencyScore: this.calculateRecencyScore(edit.createdAt),
          trendingScore,
          rank: 0, // Will be set after sorting
        };
      })
    );

    // Sort by trending score
    metricsWithScores.sort((a, b) => b.trendingScore - a.trendingScore);

    // Add ranks
    metricsWithScores.forEach((metric, index) => {
      metric.rank = index + 1;
    });

    const trending = metricsWithScores.slice(0, limit);

    // Cache for 15 minutes
    await redis.setex(cacheKey, 900, JSON.stringify(trending));

    return trending;
  }

  /**
   * Get trending edits by category
   */
  static async getTrendingByCategory(
    categorySlug: string,
    limit = 30,
    timeframeHours = 24
  ): Promise<TrendingMetrics[]> {
    const cacheKey = `trending:${categorySlug}:${timeframeHours}h`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const timeframeDate = new Date(Date.now() - timeframeHours * 60 * 60 * 1000);

    const category = await prisma.category.findUnique({
      where: { slug: categorySlug },
    });

    if (!category) {
      return [];
    }

    const edits = await prisma.edit.findMany({
      where: {
        isPublished: true,
        createdAt: { gte: timeframeDate },
        categories: {
          some: { id: category.id },
        },
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        viewCount: true,
        likeCount: true,
        commentCount: true,
        creator: {
          select: {
            name: true,
            followerCount: true,
          },
        },
      },
      take: limit * 2, // Get more to account for filtering
    });

    // Calculate scores
    const metricsWithScores = await Promise.all(
      edits.map(async (edit) => {
        const trendingScore = await this.calculateTrendingScore(edit.id);

        return {
          editId: edit.id,
          title: edit.title,
          creator: edit.creator.name || "Unknown",
          velocity: this.calculateVelocity(edit, timeframeHours),
          totalEngagement: edit.likeCount + edit.commentCount,
          viewCount: edit.viewCount,
          likeCount: edit.likeCount,
          commentCount: edit.commentCount,
          recencyScore: this.calculateRecencyScore(edit.createdAt),
          trendingScore,
          rank: 0,
        };
      })
    );

    metricsWithScores.sort((a, b) => b.trendingScore - a.trendingScore);
    metricsWithScores.forEach((metric, index) => {
      metric.rank = index + 1;
    });

    const trending = metricsWithScores.slice(0, limit);

    // Cache for 15 minutes
    await redis.setex(cacheKey, 900, JSON.stringify(trending));

    return trending;
  }

  /**
   * Get trending creators
   */
  static async getTrendingCreators(
    limit = 20,
    timeframeHours = 24
  ): Promise<any[]> {
    const cacheKey = `trending_creators:${timeframeHours}h`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const timeframeDate = new Date(Date.now() - timeframeHours * 60 * 60 * 1000);

    const creators = await prisma.user.findMany({
      where: {
        edits: {
          some: {
            createdAt: { gte: timeframeDate },
            isPublished: true,
          },
        },
      },
      select: {
        id: true,
        name: true,
        image: true,
        bountyRank: true,
        totalEditsCreated: true,
        followerCount: true,
        edits: {
          where: {
            createdAt: { gte: timeframeDate },
            isPublished: true,
          },
          select: {
            likeCount: true,
            commentCount: true,
            viewCount: true,
          },
        },
      },
    });

    // Calculate creator trending metrics
    const creatorsWithMetrics = creators.map((creator) => {
      const totalLikes = creator.edits.reduce((sum, e) => sum + e.likeCount, 0);
      const totalComments = creator.edits.reduce((sum, e) => sum + e.commentCount, 0);
      const totalViews = creator.edits.reduce((sum, e) => sum + e.viewCount, 0);

      return {
        id: creator.id,
        name: creator.name,
        image: creator.image,
        bountyRank: creator.bountyRank,
        editsCount: creator.edits.length,
        totalLikes,
        totalComments,
        totalViews,
        followerCount: creator.followerCount,
        engagementScore: totalLikes * 10 + totalComments * 15 + totalViews * 1,
      };
    });

    // Sort by engagement
    creatorsWithMetrics.sort((a, b) => b.engagementScore - a.engagementScore);

    const trending = creatorsWithMetrics.slice(0, limit);

    // Cache for 30 minutes
    await redis.setex(cacheKey, 1800, JSON.stringify(trending));

    return trending;
  }

  /**
   * Calculate velocity (engagement per hour)
   */
  private static calculateVelocity(
    edit: any,
    timeframeHours: number
  ): number {
    const engagement = edit.likeCount + edit.commentCount;
    return Math.round(engagement / Math.max(timeframeHours, 1));
  }

  /**
   * Calculate recency score (higher for newer videos)
   */
  private static calculateRecencyScore(createdAt: Date): number {
    const ageInHours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);

    if (ageInHours < 1) return 100;
    if (ageInHours < 6) return 80;
    if (ageInHours < 12) return 60;
    if (ageInHours < 24) return 40;
    if (ageInHours < 48) return 20;
    return 0;
  }

  /**
   * Update trending scores in bulk (call periodically via cron)
   */
  static async updateTrendingScores(): Promise<void> {
    try {
      log.info("📊 Updating trending scores...");

      const edits = await prisma.edit.findMany({
        where: { isPublished: true },
        select: { id: true },
      });

      for (const edit of edits) {
        const score = await this.calculateTrendingScore(edit.id);

        await prisma.edit.update({
          where: { id: edit.id },
          data: { trendingScore: score },
        });

        // Update Redis sorted set
        await redis.zadd("trending_edits", score, edit.id);
      }

      log.info(`✅ Updated trending scores for ${edits.length} edits`);
    } catch (error) {
      log.error("Failed to update trending scores", error);
    }
  }

  /**
   * Get edits with advanced multi-tag filtering
   */
  static async getFilteredTrending(
    tags: string[],
    categories: string[],
    sortBy: "trending" | "new" | "popular" = "trending",
    limit = 50
  ): Promise<any[]> {
    const cacheKey = `filtered_trending:${tags.join(",")}:${categories.join(",")}:${sortBy}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    let orderBy: any = { trendingScore: "desc" };
    if (sortBy === "new") {
      orderBy = { createdAt: "desc" };
    } else if (sortBy === "popular") {
      orderBy = { viewCount: "desc" };
    }

    const edits = await prisma.edit.findMany({
      where: {
        isPublished: true,
        ...(tags.length > 0 && { tags: { hasSome: tags } }),
        ...(categories.length > 0 && {
          categories: {
            some: {
              slug: { in: categories },
            },
          },
        }),
      },
      select: {
        id: true,
        title: true,
        description: true,
        viewCount: true,
        likeCount: true,
        commentCount: true,
        trendingScore: true,
        creator: {
          select: { name: true, image: true, bountyRank: true },
        },
      },
      orderBy,
      take: limit,
    });

    // Cache for 10 minutes
    await redis.setex(cacheKey, 600, JSON.stringify(edits));

    return edits;
  }
}

export default TrendingService;
