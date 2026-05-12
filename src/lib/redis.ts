import { createClient } from "redis";

let redis: ReturnType<typeof createClient> | null = null;

export async function getRedisClient() {
  if (!redis) {
    redis = createClient({
      socket: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
      },
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || "0"),
    });

    redis.on("error", (err) => console.error("Redis Error:", err));
    redis.on("connect", () => console.log("✅ Redis connected"));

    if (!redis.isOpen) {
      await redis.connect();
    }
  }

  return redis;
}

// ============ REDIS CACHE UTILITIES ============

export const redis = {
  /**
   * Get value from cache
   */
  async get(key: string): Promise<string | null> {
    const client = await getRedisClient();
    return client.get(key);
  },

  /**
   * Set value with optional expiration (seconds)
   */
  async set(key: string, value: string, exSeconds?: number): Promise<void> {
    const client = await getRedisClient();
    if (exSeconds) {
      await client.setEx(key, exSeconds, value);
    } else {
      await client.set(key, value);
    }
  },

  /**
   * Set with expiration
   */
  async setex(key: string, seconds: number, value: string): Promise<void> {
    const client = await getRedisClient();
    await client.setEx(key, seconds, value);
  },

  /**
   * Delete key
   */
  async del(key: string | string[]): Promise<number> {
    const client = await getRedisClient();
    return client.del(Array.isArray(key) ? key : [key]);
  },

  /**
   * Increment counter
   */
  async incr(key: string): Promise<number> {
    const client = await getRedisClient();
    return client.incr(key);
  },

  /**
   * Increment by value
   */
  async incrby(key: string, value: number): Promise<number> {
    const client = await getRedisClient();
    return client.incrBy(key, value);
  },

  /**
   * Decrement counter
   */
  async decr(key: string): Promise<number> {
    const client = await getRedisClient();
    return client.decr(key);
  },

  /**
   * Push to list
   */
  async lpush(key: string, value: string | string[]): Promise<number> {
    const client = await getRedisClient();
    return client.lPush(key, Array.isArray(value) ? value : [value]);
  },

  /**
   * Get list range
   */
  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const client = await getRedisClient();
    return client.lRange(key, start, stop);
  },

  /**
   * Get list length
   */
  async llen(key: string): Promise<number> {
    const client = await getRedisClient();
    return client.lLen(key);
  },

  /**
   * Add to set
   */
  async sadd(key: string, value: string | string[]): Promise<number> {
    const client = await getRedisClient();
    return client.sAdd(key, Array.isArray(value) ? value : [value]);
  },

  /**
   * Get set members
   */
  async smembers(key: string): Promise<string[]> {
    const client = await getRedisClient();
    return client.sMembers(key);
  },

  /**
   * Add to sorted set
   */
  async zadd(key: string, score: number, member: string): Promise<number> {
    const client = await getRedisClient();
    return client.zAdd(key, { score, value: member });
  },

  /**
   * Get sorted set range by score (descending)
   */
  async zrevrangebyscore(
    key: string,
    max: number,
    min: number,
    limit?: number
  ): Promise<string[]> {
    const client = await getRedisClient();
    const options = limit ? { LIMIT: { offset: 0, count: limit } } : undefined;
    return client.zRevRangeByScore(key, max, min, options);
  },

  /**
   * Cache popular edits for homepage
   */
  async cachePopularEdits(edits: any[], durationSeconds = 3600): Promise<void> {
    const client = await getRedisClient();
    await client.setEx("popular_edits", durationSeconds, JSON.stringify(edits));
  },

  /**
   * Get cached popular edits
   */
  async getPopularEdits(): Promise<any[] | null> {
    const cached = await this.get("popular_edits");
    return cached ? JSON.parse(cached) : null;
  },

  /**
   * Cache user profile
   */
  async cacheUserProfile(userId: string, data: any, durationSeconds = 1800): Promise<void> {
    await this.setex(`user:${userId}:profile`, durationSeconds, JSON.stringify(data));
  },

  /**
   * Get cached user profile
   */
  async getCachedUserProfile(userId: string): Promise<any | null> {
    const cached = await this.get(`user:${userId}:profile`);
    return cached ? JSON.parse(cached) : null;
  },

  /**
   * Invalidate user profile cache
   */
  async invalidateUserProfile(userId: string): Promise<void> {
    await this.del(`user:${userId}:profile`);
  },

  /**
   * Track trending edits using sorted sets
   */
  async updateTrendingScore(editId: string, score: number): Promise<void> {
    const client = await getRedisClient();
    const key = "trending_edits";
    await client.zAdd(key, { score, value: editId });
    // Keep only top 1000 edits
    await client.zRemRangeByRank(key, 0, -1001);
    // Expire trending cache after 24 hours
    await client.expire(key, 86400);
  },

  /**
   * Get trending edits
   */
  async getTrendingEdits(limit = 50): Promise<string[]> {
    const client = await getRedisClient();
    return client.zRevRange("trending_edits", 0, limit - 1);
  },

  /**
   * Publish real-time event (for WebSocket/Pusher integration)
   */
  async publishEvent(channel: string, message: any): Promise<number> {
    const client = await getRedisClient();
    return client.publish(channel, JSON.stringify(message));
  },

  /**
   * Subscribe to channel (for real-time notifications)
   */
  async subscribeToChannel(
    channel: string,
    callback: (message: any) => void
  ): Promise<any> {
    const subscriber = createClient({
      socket: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
      },
      password: process.env.REDIS_PASSWORD || undefined,
    });

    subscriber.on("error", (err) => console.error("Redis Subscriber Error:", err));

    await subscriber.connect();
    await subscriber.subscribe(channel, (message) => {
      try {
        callback(JSON.parse(message));
      } catch (error) {
        callback(message);
      }
    });

    return subscriber;
  },
};

export default redis;
