import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import {
  withAuth,
  withRateLimit,
  handleError,
  createErrorResponse,
  createSuccessResponse,
  APIError,
  validateRequest,
} from "@/middleware/auth";

// ============ USER CONTROLLERS ============

export async function getUserProfile(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        id: true,
        name: true,
        image: true,
        bio: true,
        email: false, // Don't expose email publicly
        bountyRank: true,
        totalEpisodesWatched: true,
        currentStreak: true,
        isOnline: true,
        totalEditsCreated: true,
        totalViews: true,
        totalLikes: true,
        followerCount: true,
        followingCount: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new APIError(404, "User not found", "USER_NOT_FOUND");
    }

    return createSuccessResponse(user);
  } catch (error) {
    return handleError(error);
  }
}

export async function updateUserProfile(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new APIError(401, "Unauthorized", "UNAUTHORIZED");
    }

    const body = await request.json();
    const { name, bio, image } = body;

    // Validate input
    const errors = validateRequest(
      { name, bio, image },
      {
        name: { type: "string", required: false },
        bio: { type: "string", required: false },
        image: { type: "string", required: false },
      }
    );

    if (errors.length > 0) {
      return createErrorResponse(400, "Validation error", { errors });
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(name && { name }),
        ...(bio && { bio: bio.slice(0, 500) }), // Max 500 chars
        ...(image && { image }),
      },
      select: {
        id: true,
        name: true,
        image: true,
        bio: true,
        bountyRank: true,
        totalEpisodesWatched: true,
      },
    });

    return createSuccessResponse(updatedUser, "Profile updated successfully");
  } catch (error) {
    return handleError(error);
  }
}

export async function getCurrentUser(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      throw new APIError(401, "Unauthorized", "UNAUTHORIZED");
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        image: true,
        email: true,
        bio: true,
        bountyRank: true,
        totalEpisodesWatched: true,
        currentStreak: true,
        isOnline: true,
        totalEditsCreated: true,
        totalViews: true,
        totalLikes: true,
        followerCount: true,
        followingCount: true,
        isPrivate: true,
        allowComments: true,
        theme: true,
      },
    });

    return createSuccessResponse(user);
  } catch (error) {
    return handleError(error);
  }
}

export async function getTopCreators(request: NextRequest) {
  try {
    const { limit = "10" } = Object.fromEntries(request.nextUrl.searchParams);

    const creators = await prisma.user.findMany({
      where: { totalEditsCreated: { gt: 0 } },
      orderBy: [
        { totalViews: "desc" },
        { totalEditsCreated: "desc" },
      ],
      take: parseInt(limit as string),
      select: {
        id: true,
        name: true,
        image: true,
        bountyRank: true,
        totalEditsCreated: true,
        totalViews: true,
        followerCount: true,
      },
    });

    return createSuccessResponse(creators);
  } catch (error) {
    return handleError(error);
  }
}

// ============ EDIT CONTROLLERS ============

export async function createEdit(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new APIError(401, "Unauthorized", "UNAUTHORIZED");
    }

    const body = await request.json();
    const { title, description, videoUrl, videoPublicId, duration, tags, categoryIds } = body;

    // Validate input
    const errors = validateRequest(
      { title, videoUrl, duration },
      {
        title: { type: "string", required: true },
        videoUrl: { type: "string", required: true },
        duration: { type: "number", required: true },
      }
    );

    if (errors.length > 0) {
      return createErrorResponse(400, "Validation error", { errors });
    }

    if (title.length > 255) {
      throw new APIError(400, "Title must be less than 255 characters");
    }

    const edit = await prisma.edit.create({
      data: {
        title,
        description: description?.slice(0, 5000),
        videoUrl,
        videoPublicId,
        duration,
        thumbnailUrl: `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/authenticated/w_400,h_300,c_fill/${videoPublicId}.jpg`,
        tags: tags || [],
        creatorId: session.user.id,
        categories: categoryIds ? {
          connect: categoryIds.map((id: string) => ({ id })),
        } : undefined,
      },
      include: {
        creator: {
          select: { id: true, name: true, image: true },
        },
        categories: true,
      },
    });

    // Update user stats
    await prisma.user.update({
      where: { id: session.user.id },
      data: { totalEditsCreated: { increment: 1 } },
    });

    return createSuccessResponse(edit, "Edit created successfully", 201);
  } catch (error) {
    return handleError(error);
  }
}

export async function getEditById(request: NextRequest, { params }: { params: { editId: string } }) {
  try {
    const edit = await prisma.edit.findUnique({
      where: { id: params.editId },
      include: {
        creator: {
          select: { id: true, name: true, image: true, bountyRank: true },
        },
        categories: true,
        likes: { select: { userId: true } },
        comments: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            user: { select: { id: true, name: true, image: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        _count: {
          select: { likes: true, comments: true, views: true },
        },
      },
    });

    if (!edit) {
      throw new APIError(404, "Edit not found", "EDIT_NOT_FOUND");
    }

    // Increment view count
    await prisma.view.create({
      data: {
        editId: params.editId,
        viewerIp: request.headers.get("x-forwarded-for") || "unknown",
        viewerUserAgent: request.headers.get("user-agent") || "unknown",
      },
    });

    // Update view count if batch is ready
    const viewCount = await prisma.view.count({
      where: { editId: params.editId },
    });

    if (viewCount % 10 === 0) {
      await prisma.edit.update({
        where: { id: params.editId },
        data: { viewCount },
      });
    }

    return createSuccessResponse(edit);
  } catch (error) {
    return handleError(error);
  }
}

export async function getEditsForFeed(request: NextRequest) {
  try {
    const {
      page = "1",
      limit = "20",
      sortBy = "latest",
      categoryId,
      tags,
    } = Object.fromEntries(request.nextUrl.searchParams);

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, parseInt(limit as string));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      isPublished: true,
      deletedAt: null,
    };

    if (categoryId) {
      where.categories = { some: { id: categoryId } };
    }

    if (tags) {
      const tagArray = (tags as string).split(",");
      where.tags = { hasSome: tagArray };
    }

    const sortOptions: any = {
      latest: { createdAt: "desc" },
      trending: { likeCount: "desc" },
      mostwatched: { viewCount: "desc" },
      featured: { isFeatured: "desc", createdAt: "desc" },
    };

    const orderBy = sortOptions[sortBy as string] || sortOptions.latest;

    const [edits, total] = await Promise.all([
      prisma.edit.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: {
          creator: {
            select: { id: true, name: true, image: true, bountyRank: true },
          },
          categories: true,
          _count: {
            select: { likes: true, comments: true, views: true },
          },
        },
      }),
      prisma.edit.count({ where }),
    ]);

    return createSuccessResponse({
      edits,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
        hasMore: pageNum * limitNum < total,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteEdit(request: NextRequest, { params }: { params: { editId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new APIError(401, "Unauthorized", "UNAUTHORIZED");
    }

    const edit = await prisma.edit.findUnique({
      where: { id: params.editId },
      select: { creatorId: true, videoPublicId: true },
    });

    if (!edit) {
      throw new APIError(404, "Edit not found", "EDIT_NOT_FOUND");
    }

    if (edit.creatorId !== session.user.id) {
      throw new APIError(403, "Forbidden", "FORBIDDEN");
    }

    // Delete from Cloudinary
    if (edit.videoPublicId) {
      const { deleteVideoFromCloudinary } = await import("@/lib/cloudinary");
      await deleteVideoFromCloudinary(edit.videoPublicId);
    }

    // Delete from database
    await prisma.edit.delete({
      where: { id: params.editId },
    });

    return createSuccessResponse({}, "Edit deleted successfully");
  } catch (error) {
    return handleError(error);
  }
}

// ============ SEARCH CONTROLLERS ============

export async function searchEdits(request: NextRequest) {
  try {
    const { query = "", page = "1", limit = "20" } = Object.fromEntries(
      request.nextUrl.searchParams
    );

    if (!query || query.length < 2) {
      throw new APIError(400, "Search query must be at least 2 characters");
    }

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, parseInt(limit as string));
    const skip = (pageNum - 1) * limitNum;

    const results = await prisma.edit.findMany({
      where: {
        isPublished: true,
        OR: [
          { title: { search: query } },
          { description: { search: query } },
          { tags: { hasSome: [query] } },
        ],
      },
      orderBy: {
        _relevance: {
          fields: ["title", "description"],
          search: query,
          sort: "desc",
        },
      },
      skip,
      take: limitNum,
      include: {
        creator: {
          select: { id: true, name: true, image: true },
        },
        categories: true,
        _count: {
          select: { likes: true, comments: true, views: true },
        },
      },
    });

    const total = await prisma.edit.count({
      where: {
        isPublished: true,
        OR: [
          { title: { search: query } },
          { description: { search: query } },
          { tags: { hasSome: [query] } },
        ],
      },
    });

    return createSuccessResponse({
      results,
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

export async function discoverByCategory(
  request: NextRequest,
  { params }: { params: { categorySlug: string } }
) {
  try {
    const { page = "1", limit = "20", sortBy = "latest" } = Object.fromEntries(
      request.nextUrl.searchParams
    );

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, parseInt(limit as string));
    const skip = (pageNum - 1) * limitNum;

    const category = await prisma.category.findUnique({
      where: { slug: params.categorySlug },
    });

    if (!category) {
      throw new APIError(404, "Category not found", "CATEGORY_NOT_FOUND");
    }

    const sortOptions: any = {
      latest: { createdAt: "desc" },
      trending: { likeCount: "desc" },
      mostwatched: { viewCount: "desc" },
    };

    const orderBy = sortOptions[sortBy as string] || sortOptions.latest;

    const [edits, total] = await Promise.all([
      prisma.edit.findMany({
        where: {
          isPublished: true,
          categories: { some: { id: category.id } },
        },
        orderBy,
        skip,
        take: limitNum,
        include: {
          creator: {
            select: { id: true, name: true, image: true },
          },
          categories: true,
          _count: {
            select: { likes: true, comments: true, views: true },
          },
        },
      }),
      prisma.edit.count({
        where: {
          isPublished: true,
          categories: { some: { id: category.id } },
        },
      }),
    ]);

    return createSuccessResponse({
      category,
      edits,
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

// ============ INTERACTION CONTROLLERS ============

export async function likeEdit(request: NextRequest, { params }: { params: { editId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new APIError(401, "Unauthorized", "UNAUTHORIZED");
    }

    // Check if already liked
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_editId: {
          userId: session.user.id,
          editId: params.editId,
        },
      },
    });

    if (existingLike) {
      // Unlike
      await prisma.like.delete({
        where: {
          userId_editId: {
            userId: session.user.id,
            editId: params.editId,
          },
        },
      });

      await prisma.edit.update({
        where: { id: params.editId },
        data: { likeCount: { decrement: 1 } },
      });

      await prisma.user.update({
        where: { id: session.user.id },
        data: { totalLikes: { decrement: 1 } },
      });

      return createSuccessResponse({ liked: false }, "Like removed");
    } else {
      // Like
      await prisma.like.create({
        data: {
          userId: session.user.id,
          editId: params.editId,
        },
      });

      await prisma.edit.update({
        where: { id: params.editId },
        data: { likeCount: { increment: 1 } },
      });

      await prisma.user.update({
        where: { id: session.user.id },
        data: { totalLikes: { increment: 1 } },
      });

      return createSuccessResponse({ liked: true }, "Like added");
    }
  } catch (error) {
    return handleError(error);
  }
}

export async function addToWatchlist(request: NextRequest, { params }: { params: { editId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new APIError(401, "Unauthorized", "UNAUTHORIZED");
    }

    const body = await request.json();
    const { status = "watching" } = body;

    const validStatuses = ["watching", "completed", "planned", "dropped"];
    if (!validStatuses.includes(status)) {
      throw new APIError(400, "Invalid status");
    }

    // Check if already in watchlist
    const existing = await prisma.watchlist.findUnique({
      where: {
        userId_editId: {
          userId: session.user.id,
          editId: params.editId,
        },
      },
    });

    if (existing) {
      const updated = await prisma.watchlist.update({
        where: {
          userId_editId: {
            userId: session.user.id,
            editId: params.editId,
          },
        },
        data: { status },
      });

      return createSuccessResponse(updated, "Watchlist item updated");
    } else {
      const watchlistItem = await prisma.watchlist.create({
        data: {
          userId: session.user.id,
          editId: params.editId,
          status,
        },
      });

      // Update user's episode count
      await prisma.user.update({
        where: { id: session.user.id },
        data: { totalEpisodesWatched: { increment: 1 } },
      });

      return createSuccessResponse(watchlistItem, "Added to watchlist", 201);
    }
  } catch (error) {
    return handleError(error);
  }
}

export default {
  getUserProfile,
  updateUserProfile,
  getCurrentUser,
  getTopCreators,
  createEdit,
  getEditById,
  getEditsForFeed,
  deleteEdit,
  searchEdits,
  discoverByCategory,
  likeEdit,
  addToWatchlist,
};
