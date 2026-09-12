import React, { useState } from 'react'
import type { AuditLogItem } from '../../types/viewerTypes'

interface AuditLogDrawerProps {
  logs: AuditLogItem[]
  currentFileId?: string
  currentFileName?: string
  onClose: () => void
  showToast: (msg: string) => void
}

export const AuditLogDrawer: React.FC<AuditLogDrawerProps> = ({
  logs,
  currentFileId,
  currentFileName,
  onClose,
  showToast,
}) => {
  const [filterAction, setFilterAction] = useState<string>('all')
  const [filterOnlyCurrentFile, setFilterOnlyCurrentFile] = useState<boolean>(Boolean(currentFileId))

  const filteredLogs = logs.filter((log) => {
    if (filterOnlyCurrentFile && currentFileId && log.fileId !== currentFileId) return false
    if (filterAction !== 'all' && log.action !== filterAction) return false
    return true
  })

  const handleExportCsv = () => {
    const headers = ['Log ID', 'Timestamp', 'User', 'Action', 'File Name', 'IP Address', 'Device', 'Details']
    const rows = filteredLogs.map((l) => [
      l.id,
      l.timestamp,
      l.userName,
      l.action,
      l.fileName,
      l.ipAddress,
      l.deviceInfo,
      `"${(l.details || '').replace(/"/g, '""')}"`,
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit_log_export_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast('📊 Audit logs exported as CSV!')
  }

  return (
    <div className="doc-right-drawer" style={{ width: '380px', minWidth: '380px' }}>
      <div className="drawer-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🛡️</span>
          <h3>Activity Audit Trail</h3>
        </div>
        <button type="button" className="chat-close-btn" onClick={onClose} title="Close audit log">
          ✕
        </button>
      </div>

      <div className="drawer-content-scroll">
        {/* Controls: Filter & Export */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              style={{
                flex: 1,
                background: '#152238',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#f8fafc',
                padding: '6px 8px',
                borderRadius: '6px',
                fontSize: '0.76rem',
              }}
            >
              <option value="all">All Actions ({logs.length})</option>
              <option value="File Viewed">File Viewed</option>
              <option value="File Downloaded">File Downloaded</option>
              <option value="File Printed">File Printed</option>
              <option value="File Shared">File Shared</option>
              <option value="File Renamed">File Renamed</option>
              <option value="File Moved">File Moved</option>
              <option value="File Deleted">File Deleted</option>
              <option value="Annotation Added">Annotation Added</option>
              <option value="Version Created">Version Created</option>
            </select>

            <button
              type="button"
              className="control-btn"
              onClick={handleExportCsv}
              title="Export filtered log as CSV"
              style={{ fontSize: '0.74rem' }}
            >
              📊 Export CSV
            </button>
          </div>

          {currentFileId && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#94a3b8', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={filterOnlyCurrentFile}
                onChange={(e) => setFilterOnlyCurrentFile(e.target.checked)}
              />
              <span>Filter events for "{currentFileName || 'this document'}"</span>
            </label>
          )}
        </div>

        {/* Logs List (Section 11 Requirements) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredLogs.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.8rem', padding: '24px 0' }}>
              No audit records matching criteria.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color:
                        log.action.includes('Delete')
                          ? '#f87171'
                          : log.action.includes('Annotation') || log.action.includes('Version')
                          ? '#34d399'
                          : log.action.includes('Download') || log.action.includes('Printed')
                          ? '#fbbf24'
                          : '#38bdf8',
                    }}
                  >
                    ● {log.action}
                  </span>
                  <span style={{ fontSize: '0.66rem', color: '#64748b' }}>{log.timestamp}</span>
                </div>

                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc' }}>
                  {log.fileName}
                </div>

                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                  User: <strong>{log.userName}</strong> • IP: {log.ipAddress}
                </div>

                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                  Device: {log.deviceInfo}
                </div>

                {log.details && (
                  <div style={{ fontSize: '0.72rem', color: '#cbd5e1', marginTop: '2px', background: 'rgba(0,0,0,0.2)', padding: '4px 6px', borderRadius: '4px' }}>
                    {log.details}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
