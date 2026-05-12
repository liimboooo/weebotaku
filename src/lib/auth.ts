import { type NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import DiscordProvider from "next-auth/providers/discord";
import { prisma } from "./prisma";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      bountyRank: string;
      totalEpisodesWatched: number;
      currentStreak: number;
      isOnline: boolean;
      totalEditsCreated: number;
      followerCount: number;
      followingCount: number;
    } & DefaultSession["user"];
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID || "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
    newUser: "/onboarding",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Check if user is banned
      const bannedUser = await prisma.bannedUser.findUnique({
        where: { userId: user.id },
      });

      if (bannedUser && (!bannedUser.bannedUntil || bannedUser.bannedUntil > new Date())) {
        return false;
      }

      // Update user's online status
      if (user.id) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            isOnline: true,
            lastActivityDate: new Date(),
          },
        });
      }

      return true;
    },

    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;

        // Fetch user data from database
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            bountyRank: true,
            totalEpisodesWatched: true,
            currentStreak: true,
            isOnline: true,
            totalEditsCreated: true,
            followerCount: true,
            followingCount: true,
          },
        });

        if (dbUser) {
          token.bountyRank = dbUser.bountyRank;
          token.totalEpisodesWatched = dbUser.totalEpisodesWatched;
          token.currentStreak = dbUser.currentStreak;
          token.isOnline = dbUser.isOnline;
          token.totalEditsCreated = dbUser.totalEditsCreated;
          token.followerCount = dbUser.followerCount;
          token.followingCount = dbUser.followingCount;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.bountyRank = token.bountyRank as string;
        session.user.totalEpisodesWatched = token.totalEpisodesWatched as number;
        session.user.currentStreak = token.currentStreak as number;
        session.user.isOnline = token.isOnline as boolean;
        session.user.totalEditsCreated = token.totalEditsCreated as number;
        session.user.followerCount = token.followerCount as number;
        session.user.followingCount = token.followingCount as number;
      }

      return session;
    },

    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },

  events: {
    async signOut({ token }) {
      if (token.sub) {
        await prisma.user.update({
          where: { id: token.sub },
          data: { isOnline: false },
        });
      }
    },

    async updateUser({ user }) {
      // Handle user updates
      await prisma.user.update({
        where: { id: user.id },
        data: {
          name: user.name,
          image: user.image,
          email: user.email,
        },
      });
    },
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },

  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  debug: process.env.NODE_ENV === "development",
};
