import React, { useState } from 'react'
import type { FileItem, ShareConfig } from '../../types/viewerTypes'

interface ShareModalProps {
  file: FileItem
  onClose: () => void
  onShareComplete: (config: ShareConfig) => void
  showToast: (msg: string) => void
}

export const ShareModal: React.FC<ShareModalProps> = ({
  file,
  onClose,
  onShareComplete,
  showToast,
}) => {
  const [shareType, setShareType] = useState<'link' | 'email' | 'internal' | 'department'>('link')
  const [target, setTarget] = useState<string>('')
  const canView = true
  const [canEdit, setCanEdit] = useState<boolean>(false)
  const [canDownload, setCanDownload] = useState<boolean>(true)
  const [canPrint, setCanPrint] = useState<boolean>(true)
  const [expiryDays, setExpiryDays] = useState<number>(7)
  const [requirePassword, setRequirePassword] = useState<boolean>(false)
  const [passcode, setPasscode] = useState<string>('8421')

  const shareableUrl = `https://l-b-m-mirror.vercel.app/viewer?doc=${file.id}&token=sec_${Math.random().toString(36).substring(2, 8)}`

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareableUrl)
      showToast('📋 Share link copied to clipboard with configured permissions!')
    } catch {
      showToast('⚠️ Could not copy link automatically.')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const expDate = new Date()
    expDate.setDate(expDate.getDate() + expiryDays)

    const config: ShareConfig = {
      shareType,
      target: shareType === 'link' ? shareableUrl : target || 'Enterprise Network',
      permissions: {
        canView,
        canEdit,
        canDownload,
        canPrint,
      },
      expiryDate: expDate.toISOString().split('T')[0],
      password: requirePassword ? passcode : undefined,
    }

    onShareComplete(config)
    showToast(`🚀 Document shared via ${shareType.toUpperCase()} successfully!`)
    onClose()
  }

  return (
    <div className="viewer-modal-backdrop" onClick={onClose}>
      <div className="viewer-modal-card" onClick={(e) => e.stopPropagation()} style={{ width: '600px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🔗</span>
            <h3>Share Document — {file.name}</h3>
          </div>
          <button type="button" className="chat-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Share Method Selector (Section 9 Requirements) */}
          <div>
            <label style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
              Sharing Channel
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              <button
                type="button"
                className={`control-btn ${shareType === 'link' ? 'primary' : ''}`}
                onClick={() => setShareType('link')}
                style={{ fontSize: '0.74rem', padding: '6px 8px' }}
              >
                🔗 Public Link
              </button>
              <button
                type="button"
                className={`control-btn ${shareType === 'email' ? 'primary' : ''}`}
                onClick={() => setShareType('email')}
                style={{ fontSize: '0.74rem', padding: '6px 8px' }}
              >
                ✉️ Email
              </button>
              <button
                type="button"
                className={`control-btn ${shareType === 'internal' ? 'primary' : ''}`}
                onClick={() => setShareType('internal')}
                style={{ fontSize: '0.74rem', padding: '6px 8px' }}
              >
                👤 User
              </button>
              <button
                type="button"
                className={`control-btn ${shareType === 'department' ? 'primary' : ''}`}
                onClick={() => setShareType('department')}
                style={{ fontSize: '0.74rem', padding: '6px 8px' }}
              >
                🏢 Dept
              </button>
            </div>
          </div>

          {/* Target Input */}
          {shareType === 'link' ? (
            <div>
              <label style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                Secure Shareable Link
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  readOnly
                  value={shareableUrl}
                  style={{
                    flex: 1,
                    background: '#152238',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#38bdf8',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                  }}
                />
                <button type="button" className="control-btn primary" onClick={handleCopyLink}>
                  📋 Copy
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                {shareType === 'email' ? 'Recipient Email Address' : shareType === 'internal' ? 'Select User Name' : 'Select Department'}
              </label>
              <input
                type="text"
                placeholder={shareType === 'email' ? 'colleague@enterprise.com' : shareType === 'internal' ? 'luckyjj' : 'Finance / Legal'}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                style={{
                  width: '100%',
                  background: '#152238',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#f8fafc',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                }}
              />
            </div>
          )}

          {/* Granular Permissions Controls (Section 9 & 18 Requirements) */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              padding: '12px 16px',
            }}
          >
            <span style={{ fontSize: '0.74rem', color: '#38bdf8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Granular Access Permissions
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#cbd5e1' }}>
                <input type="checkbox" checked={canView} disabled />
                <span>👁️ View Only (Mandatory)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#cbd5e1', cursor: 'pointer' }}>
                <input type="checkbox" checked={canEdit} onChange={(e) => setCanEdit(e.target.checked)} />
                <span>✏️ Allow Annotate &amp; Edit</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#cbd5e1', cursor: 'pointer' }}>
                <input type="checkbox" checked={canDownload} onChange={(e) => setCanDownload(e.target.checked)} />
                <span>📥 Allow File Download</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#cbd5e1', cursor: 'pointer' }}>
                <input type="checkbox" checked={canPrint} onChange={(e) => setCanPrint(e.target.checked)} />
                <span>🖨️ Allow Print</span>
              </label>
            </div>
          </div>

          {/* Expiration & Password Protection */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                Access Expiry
              </label>
              <select
                value={expiryDays}
                onChange={(e) => setExpiryDays(parseInt(e.target.value, 10))}
                style={{
                  width: '100%',
                  background: '#152238',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#f8fafc',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                }}
              >
                <option value={1}>Expires in 24 Hours</option>
                <option value={7}>Expires in 7 Days</option>
                <option value={30}>Expires in 30 Days</option>
                <option value={365}>Never Expires</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                Password Protection
              </label>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={requirePassword}
                  onChange={(e) => setRequirePassword(e.target.checked)}
                />
                {requirePassword ? (
                  <input
                    type="text"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    style={{
                      flex: 1,
                      background: '#152238',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#f8fafc',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '0.78rem',
                    }}
                  />
                ) : (
                  <span style={{ fontSize: '0.76rem', color: '#64748b' }}>No password required</span>
                )}
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ padding: '12px 0 0', margin: 0 }}>
            <button type="button" className="control-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="control-btn primary" style={{ padding: '8px 20px' }}>
              Confirm &amp; Share
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
