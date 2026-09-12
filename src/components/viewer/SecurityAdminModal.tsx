import React, { useState } from 'react'
import type { UserRole, SystemFeatureToggles } from '../../types/viewerTypes'
import { defaultViewerStorage, DEFAULT_ROLE_PERMISSIONS } from '../../services/viewerStorageService'

interface SecurityAdminModalProps {
  isOpen: boolean
  onClose: () => void
  currentRole: UserRole
  onRoleChange: (role: UserRole) => void
  toggles: SystemFeatureToggles
  onTogglesChange: (toggles: SystemFeatureToggles) => void
}

export const SecurityAdminModal: React.FC<SecurityAdminModalProps> = ({
  isOpen,
  onClose,
  currentRole,
  onRoleChange,
  toggles,
  onTogglesChange,
}) => {
  const [activeTab, setActiveTab] = useState<'roles' | 'matrix' | 'toggles' | 'security'>('roles')
  const [watermarkType, setWatermarkType] = useState<string>('CONFIDENTIAL')
  const [preventCopy, setPreventCopy] = useState<boolean>(true)
  const [sessionTimeoutMins, setSessionTimeoutMins] = useState<number>(30)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  if (!isOpen) return null

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 2500)
  }

  const allRoles: UserRole[] = ['Super Admin', 'Admin', 'Manager', 'Staff', 'Viewer', 'Auditor']

  const handleToggleChange = (key: keyof SystemFeatureToggles) => {
    const updated = { ...toggles, [key]: !toggles[key] }
    onTogglesChange(updated)
    defaultViewerStorage.updateFeatureToggles(updated)
    showToast(`Updated ${key} setting`)
  }

  const roleDescriptions: Record<UserRole, string> = {
    'Super Admin': 'Full unrestricted access to all files, version rollbacks, audit streams, and system settings.',
    Admin: 'Comprehensive administrative control including file deletions, edits, downloads, sharing, and annotations.',
    Manager: 'Team management rights. Can view, edit, download, print, annotate, and share, but cannot delete permanently.',
    Staff: 'Standard enterprise employee. Can view, edit, annotate, print, and download assigned documents.',
    Viewer: 'Read-only restricted access. Document downloads, printing, edits, and sharing are locked.',
    Auditor: 'Compliance and regulatory inspection role. Read-only with download, print, and audit logs access.',
  }

  return (
    <div className="v-modal-overlay" onClick={onClose}>
      <div
        className="v-modal"
        style={{ maxWidth: 840, width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="v-modal-header">
          <div className="v-modal-title">
            <span style={{ fontSize: '1.25rem' }}>🛡️</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#f8fafc' }}>
                Security & Role Permissions Control
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Manage RBAC roles, feature switches, DLP protection, and enterprise governance
              </div>
            </div>
          </div>
          <button className="v-btn v-btn-secondary" style={{ padding: '4px 10px' }} onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Tab switcher */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            padding: '0 1.25rem',
            background: 'rgba(15, 23, 42, 0.4)',
            gap: '0.5rem',
          }}
        >
          <button
            className={`v-btn ${activeTab === 'roles' ? 'v-btn-primary' : 'v-btn-secondary'}`}
            style={{ borderRadius: '6px 6px 0 0', borderBottom: 'none', fontSize: '0.82rem' }}
            onClick={() => setActiveTab('roles')}
          >
            👤 Active Role ({currentRole})
          </button>
          <button
            className={`v-btn ${activeTab === 'matrix' ? 'v-btn-primary' : 'v-btn-secondary'}`}
            style={{ borderRadius: '6px 6px 0 0', borderBottom: 'none', fontSize: '0.82rem' }}
            onClick={() => setActiveTab('matrix')}
          >
            📊 RBAC Matrix
          </button>
          <button
            className={`v-btn ${activeTab === 'toggles' ? 'v-btn-primary' : 'v-btn-secondary'}`}
            style={{ borderRadius: '6px 6px 0 0', borderBottom: 'none', fontSize: '0.82rem' }}
            onClick={() => setActiveTab('toggles')}
          >
            ⚙️ Feature Switches
          </button>
          <button
            className={`v-btn ${activeTab === 'security' ? 'v-btn-primary' : 'v-btn-secondary'}`}
            style={{ borderRadius: '6px 6px 0 0', borderBottom: 'none', fontSize: '0.82rem' }}
            onClick={() => setActiveTab('security')}
          >
            🔒 DLP & Watermarks
          </button>
        </div>

        <div className="v-modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {toastMsg && (
            <div
              style={{
                marginBottom: '1rem',
                padding: '0.6rem 1rem',
                borderRadius: 8,
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid #10b981',
                color: '#34d399',
                fontSize: '0.85rem',
              }}
            >
              ✓ {toastMsg}
            </div>
          )}

          {/* TAB 1: ROLE SELECTOR */}
          {activeTab === 'roles' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                Select the simulated active user session role to test interface permissions across Viewer System:
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
                {allRoles.map((role) => {
                  const isSelected = currentRole === role
                  const perms = DEFAULT_ROLE_PERMISSIONS[role]
                  return (
                    <div
                      key={role}
                      onClick={() => {
                        onRoleChange(role)
                        defaultViewerStorage.setCurrentRole(role)
                        showToast(`Switched active session to ${role}`)
                      }}
                      style={{
                        padding: '1rem',
                        borderRadius: 10,
                        border: isSelected ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.08)',
                        background: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'rgba(15, 23, 42, 0.5)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, color: isSelected ? '#38bdf8' : '#f1f5f9' }}>
                          {role}
                        </span>
                        {isSelected && (
                          <span style={{ fontSize: '0.75rem', background: '#38bdf8', color: '#0f172a', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.4, marginBottom: 8 }}>
                        {roleDescriptions[role]}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {perms.canView && <span className="v-tag" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>View</span>}
                        {perms.canEdit && <span className="v-tag" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>Edit</span>}
                        {perms.canDownload && <span className="v-tag" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>Download</span>}
                        {perms.canPrint && <span className="v-tag" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>Print</span>}
                        {perms.canShare && <span className="v-tag" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>Share</span>}
                        {perms.canDelete && <span className="v-tag" style={{ fontSize: '0.68rem', padding: '2px 6px', color: '#f87171' }}>Delete</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TAB 2: RBAC MATRIX */}
          {activeTab === 'matrix' && (
            <div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1rem' }}>
                Role-Based Access Control (RBAC) Permission Matrix across all document privileges:
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="v-table" style={{ width: '100%', fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Role</th>
                      <th>View</th>
                      <th>Edit</th>
                      <th>Download</th>
                      <th>Print</th>
                      <th>Share</th>
                      <th>Delete</th>
                      <th>Annotate</th>
                      <th>Versions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allRoles.map((r) => {
                      const p = DEFAULT_ROLE_PERMISSIONS[r]
                      return (
                        <tr key={r} style={{ background: currentRole === r ? 'rgba(56, 189, 248, 0.08)' : undefined }}>
                          <td style={{ fontWeight: 600, color: currentRole === r ? '#38bdf8' : '#e2e8f0' }}>
                            {r} {currentRole === r && '★'}
                          </td>
                          <td style={{ textAlign: 'center' }}>{p.canView ? '🟢' : '🔴'}</td>
                          <td style={{ textAlign: 'center' }}>{p.canEdit ? '🟢' : '🔴'}</td>
                          <td style={{ textAlign: 'center' }}>{p.canDownload ? '🟢' : '🔴'}</td>
                          <td style={{ textAlign: 'center' }}>{p.canPrint ? '🟢' : '🔴'}</td>
                          <td style={{ textAlign: 'center' }}>{p.canShare ? '🟢' : '🔴'}</td>
                          <td style={{ textAlign: 'center' }}>{p.canDelete ? '🟢' : '🔴'}</td>
                          <td style={{ textAlign: 'center' }}>{p.canAnnotate ? '🟢' : '🔴'}</td>
                          <td style={{ textAlign: 'center' }}>{p.canManageVersions ? '🟢' : '🔴'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: FEATURE SWITCHBOARD */}
          {activeTab === 'toggles' && (
            <div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1rem' }}>
                Granular feature toggles to enable or disable functional modules across the entire Viewer System:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {[
                  { key: 'enableSearch', label: 'Advanced Search & Multi-Filters', desc: 'Allow deep content and metadata queries' },
                  { key: 'enableAnnotations', label: 'Annotation Suite', desc: 'Highlighting, stamps, drawing, signature pad' },
                  { key: 'enablePrinting', label: 'Print & Print Preview', desc: 'Direct print dialog and scaling engine' },
                  { key: 'enableDownloading', label: 'File Export & Download', desc: 'Permit local file saving and extraction' },
                  { key: 'enableSharing', label: 'Sharing & Link Generation', desc: 'Collaborative link creation with expiry' },
                  { key: 'enableVersionControl', label: 'Version Control & History', desc: 'Branching revisions, comparison & rollback' },
                  { key: 'enableAuditLogs', label: 'Audit Trail & Compliance', desc: 'Non-repudiable audit recording & export' },
                  { key: 'enableComparison', label: 'Side-by-Side Comparator', desc: 'Visual side-by-side diff between files' },
                  { key: 'enableFileManagement', label: 'File Management & Recycle Bin', desc: 'Rename, move, copy, restore deleted files' },
                  { key: 'enableSecurityProtection', label: 'Security & DLP Watermarking', desc: 'Dynamic watermarking and copy lock' },
                ].map((item) => {
                  const val = toggles[item.key as keyof SystemFeatureToggles]
                  return (
                    <div
                      key={item.key}
                      onClick={() => handleToggleChange(item.key as keyof SystemFeatureToggles)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.85rem 1rem',
                        borderRadius: 8,
                        background: val ? 'rgba(56, 189, 248, 0.08)' : 'rgba(15, 23, 42, 0.4)',
                        border: val ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(255,255,255,0.06)',
                        cursor: 'pointer',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: val ? '#f8fafc' : '#94a3b8' }}>
                          {item.label}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.desc}</div>
                      </div>
                      <div
                        style={{
                          width: 42,
                          height: 22,
                          borderRadius: 12,
                          background: val ? '#38bdf8' : '#334155',
                          position: 'relative',
                          transition: 'background 0.2s ease',
                          flexShrink: 0,
                          marginLeft: 12,
                        }}
                      >
                        <div
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            background: '#fff',
                            position: 'absolute',
                            top: 2,
                            left: val ? 22 : 2,
                            transition: 'left 0.2s ease',
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TAB 4: DLP & WATERMARKS */}
          {activeTab === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="v-label">Dynamic Watermark Overlay</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {['CONFIDENTIAL', 'INTERNAL ONLY', 'DRAFT', 'APPROVED', 'NONE'].map((wm) => (
                    <button
                      key={wm}
                      className={`v-btn ${watermarkType === wm ? 'v-btn-primary' : 'v-btn-secondary'}`}
                      style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                      onClick={() => {
                        setWatermarkType(wm)
                        showToast(`Set watermark to ${wm}`)
                      }}
                    >
                      {wm}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="v-label">Data Loss Prevention (DLP) Controls</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={preventCopy}
                      onChange={(e) => {
                        setPreventCopy(e.target.checked)
                        showToast(e.target.checked ? 'Text copy restriction enabled' : 'Copy restriction disabled')
                      }}
                    />
                    <span>Block Text Selection & Clipboard Copy on Protected Documents</span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="v-label">Inactivity Session Timeout</label>
                  <select
                    className="v-select"
                    value={sessionTimeoutMins}
                    onChange={(e) => {
                      setSessionTimeoutMins(Number(e.target.value))
                      showToast(`Inactivity timeout set to ${e.target.value} minutes`)
                    }}
                  >
                    <option value={15}>15 Minutes</option>
                    <option value={30}>30 Minutes (Recommended)</option>
                    <option value={60}>1 Hour</option>
                    <option value={120}>2 Hours</option>
                  </select>
                </div>

                <div>
                  <label className="v-label">Transport & Storage Encryption</label>
                  <div
                    style={{
                      padding: '0.6rem 0.8rem',
                      borderRadius: 6,
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: '#34d399',
                      fontSize: '0.82rem',
                    }}
                  >
                    🔒 DTLS-SRTP 256-bit AES Active
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="v-modal-footer">
          <button className="v-btn v-btn-primary" onClick={onClose}>
            Done & Apply
          </button>
        </div>
      </div>
    </div>
  )
}
