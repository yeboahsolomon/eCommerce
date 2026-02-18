
import { createClient, RedisClientType } from 'redis';
import { config } from '../config/env.js';

class RedisService {
  private client: RedisClientType;
  private isConnected: boolean = false;

  constructor() {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    this.client = createClient({ url });

    this.client.on('error', (err) => {
      console.error('Redis Client Error', err);
    });

    this.client.on('connect', () => {
      console.log('Redis Client Connected');
      this.isConnected = true;
    });

    // Connect immediately
    this.connect();
  }

  private async connect() {
    if (!this.isConnected) {
        try {
            await this.client.connect();
        } catch (error) {
            console.error('Failed to connect to Redis:', error);
        }
    }
  }

  /**
   * Get value from cache
   * @param key Cache key
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) return null;
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis Get Error:', error);
      return null;
    }
  }

  /**
   * Set value in cache
   * @param key Cache key
   * @param value Value to store
   * @param ttl Time to live in seconds (default 3600 = 1 hour)
   */
  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    if (!this.isConnected) return;
    try {
      await this.client.set(key, JSON.stringify(value), { EX: ttl });
    } catch (error) {
      console.error('Redis Set Error:', error);
    }
  }

  /**
   * Delete value from cache
   * @param key Cache key
   */
  async del(key: string): Promise<void> {
    if (!this.isConnected) return;
    try {
      await this.client.del(key);
    } catch (error) {
      console.error('Redis Del Error:', error);
    }
  }

  /**
   * Clear all keys matching a pattern
   * @param pattern Pattern to match (e.g. 'products:*')
   */
  async clearPattern(pattern: string): Promise<void> {
    if (!this.isConnected) return;
    try {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
            await this.client.del(keys);
        }
    } catch (error) {
        console.error('Redis ClearPattern Error:', error);
    }
  }
}

export const redisService = new RedisService();
