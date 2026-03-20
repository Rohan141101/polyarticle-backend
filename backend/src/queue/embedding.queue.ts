import { Queue } from "bullmq"
import { redisConnection } from "./redis"

export const embeddingQueue = new Queue("embedding-queue", {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false,
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 4000,
    },
  },
})