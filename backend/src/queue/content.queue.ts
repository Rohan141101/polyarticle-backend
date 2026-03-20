import { Queue } from "bullmq"
import { redisConnection } from "./redis"

export const contentQueue = new Queue("content-queue", {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
  },
})