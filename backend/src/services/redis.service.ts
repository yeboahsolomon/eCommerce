
import { createClient, RedisClientType } from 'redis';
import { config } from '../config/env.js';

class RedisService {
  private client: RedisClientType | null = null;
  private isConnected: boolean = false;

  constructor() {
    // Defer connection to an async init method
    this.init();
  }

  private async init() {
    try {
      const client = createClient({
        url: config.redisUrl,
        socket: {
          connectTimeout: 3000,   // Fail fast: 3 seconds
          reconnectStrategy: false // Do NOT retry automatically
        }
      });

      // Suppress noisy error events — we handle errors via try/catch
      client.on('error', () => {});

      await client.connect();

      this.client = client as any;
      this.isConnected = true;
      console.log('✅ Redis connected');
    } catch {
      console.warn('⚠️  Redis unavailable — running without cache. This is fine for development.');
      this.client = null;
      this.isConnected = false;
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected || !this.client) return null;
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
   */
  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    if (!this.isConnected || !this.client) return;
    try {
      await this.client.set(key, JSON.stringify(value), { EX: ttl });
    } catch (error) {
      console.error('Redis Set Error:', error);
    }
  }

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<void> {
    if (!this.isConnected || !this.client) return;
    try {
      await this.client.del(key);
    } catch (error) {
      console.error('Redis Del Error:', error);
    }
  }

  /**
   * Clear all keys matching a pattern
   */
  async clearPattern(pattern: string): Promise<void> {
    if (!this.isConnected || !this.client) return;
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
