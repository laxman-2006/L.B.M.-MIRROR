import type { SessionStatus } from '../types'

type StatusBadgeProps = {
  status: SessionStatus
}

const statusMap: Record<SessionStatus, { label: string; tone: string }> = {
  WAITING: { label: 'Waiting', tone: 'waiting' },
  REQUESTED: { label: 'Requesting', tone: 'requesting' },
  APPROVED: { label: 'Approved', tone: 'success' },
  CONNECTING: { label: 'Connecting', tone: 'connecting' },
  CONNECTED: { label: 'Connected', tone: 'success' },
  MIRRORING: { label: 'Mirroring', tone: 'success' },
  RECONNECTING: { label: 'Reconnecting', tone: 'warning' },
  DISCONNECTED: { label: 'Disconnected', tone: 'danger' },
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const info = statusMap[status]

  return <span className={`status-badge ${info.tone}`}>● {info.label}</span>
}
