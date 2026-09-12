import React from 'react'
import type { FileItem, FolderItem, AuditLogItem } from '../../types/viewerTypes'

interface ViewerDashboardProps {
  files: FileItem[]
  folders: FolderItem[]
  auditLogs: AuditLogItem[]
  onOpenFile: (file: FileItem) => void
  onNavigateTab: (tab: string) => void
  onUploadClick: () => void
  onCreateFolderClick: () => void
}

export const ViewerDashboard: React.FC<ViewerDashboardProps> = ({
  files,
  folders,
  auditLogs,
  onOpenFile,
  onNavigateTab,
  onUploadClick,
  onCreateFolderClick,
}) => {
  const activeFiles = files.filter((f) => !f.isDeleted)
  const totalSizeBytes = activeFiles.reduce((acc, curr) => acc + curr.sizeBytes, 0)
  const totalSizeMb = (totalSizeBytes / (1024 * 1024)).toFixed(1)
  const recentFiles = [...activeFiles]
    .sort((a, b) => new Date(b.modifiedDate).getTime() - new Date(a.modifiedDate).getTime())
    .slice(0, 5)

  const favoriteFiles = activeFiles.filter((f) => f.isFavorite)

  return (
    <div className="viewer-dashboard-scroll" style={{ overflowY: 'auto', padding: '24px', flex: 1 }}>
      {/* Top Banner / Hero */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '1.4rem' }}>📁</span>
            <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#f8fafc', fontWeight: 800 }}>
              Enterprise Viewer &amp; Document Management Suite
            </h2>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#34d399',
                padding: '3px 8px',
                borderRadius: '999px',
                border: '1px solid rgba(16, 185, 129, 0.35)',
              }}
            >
              PRO ACTIVE
            </span>
          </div>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.84rem' }}>
            Universal viewer with 60 FPS rendering, multi-layer annotations, version comparison, secure audit trail &amp; multi-format support.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="control-btn primary"
            onClick={onUploadClick}
            style={{ padding: '8px 16px', fontSize: '0.84rem' }}
          >
            ➕ Upload Document
          </button>
          <button
            type="button"
            className="control-btn"
            onClick={onCreateFolderClick}
            style={{ padding: '8px 14px', fontSize: '0.84rem' }}
          >
            📁 New Folder
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <div
          style={{
            background: '#0c1426',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '16px',
          }}
        >
          <div style={{ color: '#94a3b8', fontSize: '0.74rem', fontWeight: 600 }}>TOTAL DOCUMENTS</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#38bdf8', marginTop: '6px' }}>
            {activeFiles.length}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>PDFs, Office Docs, Data, Blueprints</div>
        </div>

        <div
          style={{
            background: '#0c1426',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '16px',
          }}
        >
          <div style={{ color: '#94a3b8', fontSize: '0.74rem', fontWeight: 600 }}>STORAGE UTILIZATION</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981', marginTop: '6px' }}>
            {totalSizeMb} MB
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>of 2.0 GB allocated cloud quota</div>
        </div>

        <div
          style={{
            background: '#0c1426',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '16px',
          }}
        >
          <div style={{ color: '#94a3b8', fontSize: '0.74rem', fontWeight: 600 }}>STRUCTURED FOLDERS</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b', marginTop: '6px' }}>
            {folders.length}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>Finance, Tech, Sales, Compliance</div>
        </div>

        <div
          style={{
            background: '#0c1426',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '16px',
          }}
        >
          <div style={{ color: '#94a3b8', fontSize: '0.74rem', fontWeight: 600 }}>AUDIT LOG EVENTS</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ec4899', marginTop: '6px' }}>
            {auditLogs.length}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>Non-repudiable user actions tracked</div>
        </div>

        <div
          style={{
            background: '#0c1426',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '16px',
          }}
        >
          <div style={{ color: '#94a3b8', fontSize: '0.74rem', fontWeight: 600 }}>STARRED FAVORITES</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#eab308', marginTop: '6px' }}>
            {favoriteFiles.length}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>Pinned &amp; bookmarked docs</div>
        </div>
      </div>

      {/* Two Column Grid: Recent Files & Audit Log */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '20px' }}>
        {/* Left: Recent Files */}
        <div
          style={{
            background: '#0b1224',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '0.94rem', color: '#f8fafc', fontWeight: 700 }}>
              🕒 Recently Modified Documents
            </h3>
            <button
              type="button"
              className="tool-action-btn"
              onClick={() => onNavigateTab('files')}
              style={{ color: '#38bdf8' }}
            >
              View All &gt;
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recentFiles.map((file) => (
              <div
                key={file.id}
                onClick={() => onOpenFile(file)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(56, 189, 248, 0.08)'
                  e.currentTarget.style.borderColor = '#38bdf8'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '1.3rem' }}>
                    {file.type === 'pdf'
                      ? '📕'
                      : file.type === 'docx'
                      ? '📘'
                      : file.type === 'xlsx' || file.type === 'csv'
                      ? '📊'
                      : file.type === 'png' || file.type === 'jpg'
                      ? '🖼️'
                      : '📄'}
                  </span>
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f8fafc' }}>{file.name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      {file.size} • Version {file.versionNumber} • {file.category}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontWeight: 700,
                      background:
                        file.status === 'Approved'
                          ? 'rgba(16, 185, 129, 0.2)'
                          : file.status === 'Confidential'
                          ? 'rgba(239, 68, 68, 0.2)'
                          : 'rgba(245, 158, 11, 0.2)',
                      color:
                        file.status === 'Approved'
                          ? '#34d399'
                          : file.status === 'Confidential'
                          ? '#f87171'
                          : '#fbbf24',
                    }}
                  >
                    {file.status}
                  </span>
                  <span style={{ color: '#64748b', fontSize: '0.8rem' }}>➔</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Real-Time Audit Log */}
        <div
          style={{
            background: '#0b1224',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '0.94rem', color: '#f8fafc', fontWeight: 700 }}>
              🛡️ Live Activity &amp; Audit Trail
            </h3>
            <button
              type="button"
              className="tool-action-btn"
              onClick={() => onNavigateTab('audit')}
              style={{ color: '#38bdf8' }}
            >
              Full Log &gt;
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {auditLogs.slice(0, 6).map((log) => (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  gap: '10px',
                  fontSize: '0.78rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                  paddingBottom: '8px',
                }}
              >
                <span style={{ color: '#38bdf8', fontWeight: 700, minWidth: '85px' }}>{log.action}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#f8fafc', fontWeight: 600 }}>{log.fileName}</div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                    By {log.userName} • {log.timestamp}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
