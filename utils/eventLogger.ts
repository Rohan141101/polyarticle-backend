type EventType =
  | "impression"
  | "swipe_left"
  | "swipe_right"
  | "save"
  | "hide"
  | "share"
  | "open_detail"

interface FeedEvent {
  content_id: string
  event_type: EventType
  position?: number
  dwell_time_ms?: number | null
  metadata?: Record<string, any>
}

class EventLogger {
  private queue: FeedEvent[] = []
  private MAX_BATCH_SIZE = 5
  private API_URL = "https://polyarticle-backend.onrender.com/events"
  private sessionId: string
  private token: string | null = null

  constructor() {
    this.sessionId = this.generateSessionId()
  }



  private generateSessionId(): string {
    return (
      Date.now().toString(36) +
      Math.random().toString(36).substring(2, 10)
    )
  }


  setToken(token: string) {
    this.token = token
  }


  log(event: FeedEvent) {
    this.queue.push(event)

    if (this.queue.length >= this.MAX_BATCH_SIZE) {
      this.flush()
    }
  }


  async flush() {
    if (this.queue.length === 0) return

    if (!this.token) {
      console.warn("No session token found. Skipping event flush.")
      return
    }

    try {
      const payload = {
        session_id: this.sessionId,
        events: this.queue
      }

      const response = await fetch(this.API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        // console.warn("Event flush failed:", response.status)
        return
      }

      this.queue = []

    } catch (error) {
      console.error("Event flush error:", error)
    }
  }

  async forceFlush() {
    await this.flush()
  }
}

export const eventLogger = new EventLogger()