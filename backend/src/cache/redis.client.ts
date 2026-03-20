import Redis from "ioredis"
import { redisConnection } from "../queue/redis"

export const redis = new Redis(redisConnection)

redis.on("connect", () => {
  console.log("🧊 Redis cache connected")
})

redis.on("error", (err) => {
  console.error("🚨 Redis error:", err)
})