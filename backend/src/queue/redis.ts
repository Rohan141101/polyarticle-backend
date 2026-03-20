import { RedisOptions } from "ioredis"

export const redisConnection: RedisOptions = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT
    ? parseInt(process.env.REDIS_PORT)
    : 6379,

  // Production-safe defaults
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
}