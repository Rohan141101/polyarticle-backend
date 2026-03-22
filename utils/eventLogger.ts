type EventType =
  | 'impression'
  | 'swipe_left'
  | 'swipe_right'
  | 'save'
  | 'hide'
  | 'share'
  | 'open_detail'

interface FeedEvent {
  content_id: string
  event_type: EventType
  position?: number
  dwell_time_ms?: number | null
  metadata?: Record<string, unknown>
}

class EventLogger {
  private queue: FeedEvent[] = []
  private MAX_BATCH_SIZE = 5
  private API_URL = 'https://polyarticle-backend.onrender.com/events'
  private sessionId: string
  private token: string | null = null

  constructor() {
    this.sessionId = this.generateSessionId()
  }

  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
  }

  // Accepts null so logout can clear the token
  setToken(token: string | null) {
    this.token = token
    if (!token) {
      // Clear queue on logout — don't send events for logged out user
      this.queue = []
      this.sessionId = this.generateSessionId()
    }
  }

  log(event: FeedEvent) {
    this.queue.push(event)
    if (this.queue.length >= this.MAX_BATCH_SIZE) {
      this.flush()
    }
  }

  async flush() {
    if (this.queue.length === 0) return
    if (!this.token) return

    // Snapshot and clear queue immediately — prevent duplicate sends
    const batch = [...this.queue]
    this.queue = []

    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 8000)

      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          session_id: this.sessionId,
          events: batch,
        }),
        signal: controller.signal,
      })

      clearTimeout(timer)

      if (!response.ok) {
        // Re-queue failed events
        this.queue = [...batch, ...this.queue]
      }
    } catch {
      // Re-queue on network error
      this.queue = [...batch, ...this.queue]
    }
  }

  async forceFlush() {
    await this.flush()
  }
}

export const eventLogger = new EventLogger()