import React, { useState } from 'react'
import type { FileItem, FileVersion } from '../../types/viewerTypes'

interface VersionHistoryDrawerProps {
  file: FileItem
  onClose: () => void
  onAddVersion: (versionNumber: string, remarks: string) => void
  onRestoreVersion: (version: FileVersion) => void
  onCompareWithVersion: (version: FileVersion) => void
  showToast: (msg: string) => void
}

export const VersionHistoryDrawer: React.FC<VersionHistoryDrawerProps> = ({
  file,
  onClose,
  onAddVersion,
  onRestoreVersion,
  onCompareWithVersion,
  showToast,
}) => {
  const [showAddForm, setShowAddForm] = useState<boolean>(false)
  const [nextVerNumber, setNextVerNumber] = useState<string>(() => {
    const parts = file.versionNumber.replace('v', '').split('.')
    const minor = parseInt(parts[1] || '0', 10) + 1
    return `v${parts[0] || '1'}.${minor}`
  })
  const [remarks, setRemarks] = useState<string>('')

  const handleCreateVersion = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nextVerNumber.trim()) return
    onAddVersion(nextVerNumber.trim(), remarks.trim() || 'Manual revision save')
    showToast(`✅ Created version ${nextVerNumber.trim()}!`)
    setShowAddForm(false)
    setRemarks('')
  }

  return (
    <div className="doc-right-drawer">
      <div className="drawer-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>⏱️</span>
          <h3>Version Control &amp; Revisions</h3>
        </div>
        <button type="button" className="chat-close-btn" onClick={onClose} title="Close versions">
          ✕
        </button>
      </div>

      <div className="drawer-content-scroll">
        {/* Create Version Action */}
        {!showAddForm ? (
          <button
            type="button"
            className="control-btn primary"
            onClick={() => setShowAddForm(true)}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            ➕ Commit New Revision
          </button>
        ) : (
          <form
            onSubmit={handleCreateVersion}
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '8px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#38bdf8' }}>Commit New Revision</div>
            <div>
              <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Version Tag</label>
              <input
                type="text"
                value={nextVerNumber}
                onChange={(e) => setNextVerNumber(e.target.value)}
                style={{
                  width: '100%',
                  background: '#152238',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#f8fafc',
                  padding: '5px 8px',
                  borderRadius: '4px',
                  fontSize: '0.78rem',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Changelog / Remarks</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="What changed in this revision?"
                rows={2}
                style={{
                  width: '100%',
                  background: '#152238',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#f8fafc',
                  padding: '5px 8px',
                  borderRadius: '4px',
                  fontSize: '0.78rem',
                  resize: 'none',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button
                type="button"
                className="control-btn"
                onClick={() => setShowAddForm(false)}
                style={{ fontSize: '0.74rem', padding: '4px 8px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="control-btn primary"
                style={{ fontSize: '0.74rem', padding: '4px 10px' }}
              >
                Commit
              </button>
            </div>
          </form>
        )}

        {/* Current Working Version Badge */}
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '8px',
            padding: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#34d399' }}>
              Current Active: {file.versionNumber}
            </span>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Live Workspace</span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '0.74rem', color: '#cbd5e1' }}>
            Last modified on {file.modifiedDate} by {file.modifiedBy}
          </p>
        </div>

        {/* Historical Versions List (Section 10 Requirements) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>
            Version History ({file.versions.length} Revisions)
          </span>

          {file.versions.map((ver, idx) => {
            const isCurrent = ver.versionNumber === file.versionNumber
            return (
              <div
                key={ver.id}
                style={{
                  background: isCurrent ? 'rgba(56, 189, 248, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${isCurrent ? '#38bdf8' : 'rgba(255, 255, 255, 0.06)'}`,
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#f8fafc' }}>
                      {ver.versionNumber}
                    </span>
                    {idx === 0 && (
                      <span style={{ fontSize: '0.66rem', background: '#2563eb', color: '#ffffff', padding: '1px 5px', borderRadius: '3px' }}>
                        LATEST
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{ver.fileSize}</span>
                </div>

                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Created on {ver.createdDate} by {ver.createdBy}
                </div>

                <div style={{ fontSize: '0.78rem', color: '#cbd5e1', fontStyle: 'italic' }}>
                  "{ver.remarks || 'No remarks recorded'}"
                </div>

                {/* Actions: Compare & Rollback */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                  <button
                    type="button"
                    className="control-btn"
                    style={{ flex: 1, fontSize: '0.72rem', padding: '4px 6px' }}
                    onClick={() => onCompareWithVersion(ver)}
                  >
                    ⚖️ Compare
                  </button>
                  {!isCurrent && (
                    <button
                      type="button"
                      className="control-btn"
                      style={{ flex: 1, fontSize: '0.72rem', padding: '4px 6px', color: '#34d399' }}
                      onClick={() => onRestoreVersion(ver)}
                    >
                      🔄 Rollback
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
