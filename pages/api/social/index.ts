import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { handleError, APIError, createSuccessResponse } from "@/middleware/auth";
import * as controllers from "@/controllers/api";

// ============ LIKE ENDPOINTS ============

// POST /api/edits/[editId]/like - Like an edit
export async function likesPost(
  request: NextRequest,
  { params }: { params: { editId: string } }
) {
  try {
    return await controllers.likeEdit(request, { params });
  } catch (error) {
    return handleError(error);
  }
}

// ============ WATCHLIST ENDPOINTS ============

// POST /api/edits/[editId]/watchlist - Add to watchlist
export async function watchlistPost(
  request: NextRequest,
  { params }: { params: { editId: string } }
) {
  try {
    return await controllers.addToWatchlist(request, { params });
  } catch (error) {
    return handleError(error);
  }
}

// GET /api/watchlist - Get user's watchlist
export async function watchlistGet(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new APIError(401, "Unauthorized", "UNAUTHORIZED");
    }

    const { status = "all", page = "1", limit = "20" } = Object.fromEntries(
      request.nextUrl.searchParams
    );

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, parseInt(limit as string));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { userId: session.user.id };
    if (status !== "all") {
      where.status = status;
    }

    const [watchlist, total] = await Promise.all([
      prisma.watchlist.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          edit: {
            include: {
              creator: {
                select: { id: true, name: true, image: true },
              },
              categories: true,
            },
          },
        },
      }),
      prisma.watchlist.count({ where }),
    ]);

    return createSuccessResponse({
      watchlist,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

// ============ FOLLOW ENDPOINTS ============

// POST /api/users/[userId]/follow - Follow a user
export async function followPost(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new APIError(401, "Unauthorized", "UNAUTHORIZED");
    }

    if (session.user.id === params.userId) {
      throw new APIError(400, "Cannot follow yourself");
    }

    const existing = await prisma.follows.findUnique({
      where: {
        followerId_followingId: {
          followerId: session.user.id,
          followingId: params.userId,
        },
      },
    });

    if (existing) {
      // Unfollow
      await prisma.follows.delete({
        where: {
          followerId_followingId: {
            followerId: session.user.id,
            followingId: params.userId,
          },
        },
      });

      await prisma.user.update({
        where: { id: session.user.id },
        data: { followingCount: { decrement: 1 } },
      });

      await prisma.user.update({
        where: { id: params.userId },
        data: { followerCount: { decrement: 1 } },
      });

      return createSuccessResponse({ following: false }, "Unfollowed");
    } else {
      // Follow
      await prisma.follows.create({
        data: {
          followerId: session.user.id,
          followingId: params.userId,
        },
      });

      await prisma.user.update({
        where: { id: session.user.id },
        data: { followingCount: { increment: 1 } },
      });

      await prisma.user.update({
        where: { id: params.userId },
        data: { followerCount: { increment: 1 } },
      });

      return createSuccessResponse({ following: true }, "Followed successfully", 201);
    }
  } catch (error) {
    return handleError(error);
  }
}

// GET /api/users/[userId]/followers - Get user's followers
export async function followersGet(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { page = "1", limit = "20" } = Object.fromEntries(
      request.nextUrl.searchParams
    );

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, parseInt(limit as string));
    const skip = (pageNum - 1) * limitNum;

    const [followers, total] = await Promise.all([
      prisma.follows.findMany({
        where: { followingId: params.userId },
        skip,
        take: limitNum,
        select: {
          follower: {
            select: {
              id: true,
              name: true,
              image: true,
              bountyRank: true,
              totalEditsCreated: true,
            },
          },
        },
      }),
      prisma.follows.count({ where: { followingId: params.userId } }),
    ]);

    return createSuccessResponse({
      followers: followers.map((f) => f.follower),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

// GET /api/users/[userId]/following - Get user's following
export async function followingGet(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { page = "1", limit = "20" } = Object.fromEntries(
      request.nextUrl.searchParams
    );

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, parseInt(limit as string));
    const skip = (pageNum - 1) * limitNum;

    const [following, total] = await Promise.all([
      prisma.follows.findMany({
        where: { followerId: params.userId },
        skip,
        take: limitNum,
        select: {
          following: {
            select: {
              id: true,
              name: true,
              image: true,
              bountyRank: true,
              totalEditsCreated: true,
            },
          },
        },
      }),
      prisma.follows.count({ where: { followerId: params.userId } }),
    ]);

    return createSuccessResponse({
      following: following.map((f) => f.following),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

// ============ COMMENT ENDPOINTS ============

// POST /api/edits/[editId]/comments - Add comment
export async function commentsPost(
  request: NextRequest,
  { params }: { params: { editId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new APIError(401, "Unauthorized", "UNAUTHORIZED");
    }

    const body = await request.json();
    const { content, parentId } = body;

    if (!content || content.trim().length === 0) {
      throw new APIError(400, "Comment content is required");
    }

    if (content.length > 1000) {
      throw new APIError(400, "Comment must be less than 1000 characters");
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        editId: params.editId,
        userId: session.user.id,
        parentId: parentId || null,
      },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    });

    // Increment comment count
    await prisma.edit.update({
      where: { id: params.editId },
      data: { commentCount: { increment: 1 } },
    });

    return createSuccessResponse(comment, "Comment added successfully", 201);
  } catch (error) {
    return handleError(error);
  }
}

// GET /api/edits/[editId]/comments - Get comments
export async function commentsGet(
  request: NextRequest,
  { params }: { params: { editId: string } }
) {
  try {
    const { page = "1", limit = "10" } = Object.fromEntries(
      request.nextUrl.searchParams
    );

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, parseInt(limit as string));
    const skip = (pageNum - 1) * limitNum;

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: { editId: params.editId, parentId: null },
        skip,
        take: limitNum,
        include: {
          user: { select: { id: true, name: true, image: true } },
          replies: {
            include: {
              user: { select: { id: true, name: true, image: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.comment.count({
        where: { editId: params.editId, parentId: null },
      }),
    ]);

    return createSuccessResponse({
      comments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
