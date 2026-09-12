/**
 * Cloud Sync Service for LBM Mirror
 * Provides fail-safe multi-tier synchronization across devices:
 * 1. Local Backend REST API (/api/support/query and /api/admin/queries)
 * 2. Distributed Cloud Sync Bucket (for serverless/Vercel cross-device persistence)
 * 3. Client-Side Persistent Storage (localStorage fallback)
 */

export interface SupportTicket {
  id: string
  userId: string
  name: string
  contact: string
  category: string
  deviceInfo: string
  priority?: string
  message: string
  status: 'new' | 'in_progress' | 'resolved'
  timestamp: string
}

const LOCAL_STORAGE_KEY = 'lbm_local_user_queries'
const CLOUD_SYNC_URL = 'https://kvdb.io/Wk9z1mP3qR5y7T8vB4/lbm_support_tickets'

export const cloudSyncService = {
  /**
   * Submit a new support ticket from any device
   */
  async submitTicket(payload: {
    userId: string
    name: string
    contact: string
    category: string
    deviceInfo: string
    message: string
    priority?: string
  }): Promise<{ success: boolean; ticket: SupportTicket }> {
    const timestamp = new Date().toISOString()
    const ticketId = `TCK-${Date.now().toString().slice(-6)}`

    const newTicket: SupportTicket = {
      id: ticketId,
      userId: payload.userId,
      name: payload.name.trim() || 'Anonymous User',
      contact: payload.contact.trim() || 'Not Provided',
      category: payload.category,
      deviceInfo: payload.deviceInfo,
      priority: payload.priority || 'Normal',
      message: payload.message.trim(),
      status: 'new',
      timestamp,
    }

    // 1. Save to Client LocalStorage immediately
    try {
      const existing = this.getLocalTickets()
      existing.unshift(newTicket)
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existing.slice(0, 100)))
    } catch (e) {
      console.warn('[CloudSync] LocalStorage write error:', e)
    }

    // 2. Post to Local / Serverless Backend API
    try {
      const apiRes = await fetch('/api/support/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTicket),
      }).catch(() => null)

      if (apiRes && apiRes.ok) {
        const data = await apiRes.json().catch(() => null)
        if (data?.ticketId) {
          newTicket.id = data.ticketId
        }
      }
    } catch (e) {
      console.warn('[CloudSync] Backend API error, continuing to cloud sync:', e)
    }

    // 3. Sync to Global Cloud Bucket for cross-device visibility on Vercel
    try {
      // First fetch current cloud tickets
      const currentCloud = await this.fetchFromCloudBucket()
      const mergedCloud = [newTicket, ...currentCloud.filter((t) => t.id !== newTicket.id)].slice(0, 100)

      await fetch(CLOUD_SYNC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mergedCloud),
      }).catch(() => null)
    } catch (e) {
      console.warn('[CloudSync] Cloud bucket write error:', e)
    }

    return { success: true, ticket: newTicket }
  },

  /**
   * Fetch all support tickets, merging Server + Cloud Bucket + LocalStorage
   */
  async fetchAllTickets(): Promise<SupportTicket[]> {
    const map = new Map<string, SupportTicket>()

    // Tier 1: LocalStorage (instant cache)
    const local = this.getLocalTickets()
    for (const t of local) {
      if (t.id) map.set(t.id, t)
    }

    // Tier 2: Backend API
    try {
      const res = await fetch('/api/admin/queries').catch(() => null)
      if (res && res.ok) {
        const data = await res.json().catch(() => null)
        if (data?.success && Array.isArray(data.queries)) {
          for (const t of data.queries) {
            if (t.id) map.set(t.id, t)
          }
        }
      }
    } catch (e) {
      console.warn('[CloudSync] Backend queries fetch error:', e)
    }

    // Tier 3: Global Cloud Bucket (catches tickets sent from other devices on Vercel)
    try {
      const cloudTickets = await this.fetchFromCloudBucket()
      for (const t of cloudTickets) {
        if (t.id) {
          // If already in map, respect resolved/updated status
          const existing = map.get(t.id)
          if (!existing) {
            map.set(t.id, t)
          } else if (t.status === 'resolved' && existing.status !== 'resolved') {
            map.set(t.id, t)
          }
        }
      }
    } catch (e) {
      console.warn('[CloudSync] Cloud bucket fetch error:', e)
    }

    const allTickets = Array.from(map.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    // Update local cache with merged tickets
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allTickets.slice(0, 100)))
    } catch {}

    return allTickets
  },

  /**
   * Update status of a ticket (e.g. resolve)
   */
  async updateTicketStatus(ticketId: string, status: 'new' | 'in_progress' | 'resolved'): Promise<void> {
    // 1. LocalStorage
    const local = this.getLocalTickets()
    const target = local.find((t) => t.id === ticketId)
    if (target) {
      target.status = status
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(local))
    }

    // 2. Server API
    try {
      await fetch(`/api/admin/queries/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }).catch(() => null)
    } catch {}

    // 3. Cloud Bucket
    try {
      const cloudTickets = await this.fetchFromCloudBucket()
      const ct = cloudTickets.find((t) => t.id === ticketId)
      if (ct) {
        ct.status = status
        await fetch(CLOUD_SYNC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cloudTickets),
        }).catch(() => null)
      }
    } catch {}
  },

  /**
   * Delete a ticket
   */
  async deleteTicket(ticketId: string): Promise<void> {
    // 1. LocalStorage
    const local = this.getLocalTickets().filter((t) => t.id !== ticketId)
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(local))

    // 2. Server API
    try {
      await fetch(`/api/admin/queries/${ticketId}`, {
        method: 'DELETE',
      }).catch(() => null)
    } catch {}

    // 3. Cloud Bucket
    try {
      const cloudTickets = (await this.fetchFromCloudBucket()).filter((t) => t.id !== ticketId)
      await fetch(CLOUD_SYNC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cloudTickets),
      }).catch(() => null)
    } catch {}
  },

  /**
   * Helper: Read from LocalStorage safely
   */
  getLocalTickets(): SupportTicket[] {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (raw) return JSON.parse(raw)
    } catch {}
    return []
  },

  /**
   * Helper: Read from Global Cloud Bucket safely
   */
  async fetchFromCloudBucket(): Promise<SupportTicket[]> {
    try {
      const res = await fetch(CLOUD_SYNC_URL, { cache: 'no-store' }).catch(() => null)
      if (res && res.ok) {
        const text = await res.text().catch(() => '')
        if (text && text.trim().startsWith('[')) {
          return JSON.parse(text)
        }
      }
    } catch {}
    return []
  },
}
