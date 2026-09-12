import React from 'react'
import type { FileItem, FolderItem } from '../../types/viewerTypes'

interface FileInfoDrawerProps {
  file: FileItem
  folder?: FolderItem
  onClose: () => void
  onToggleFavorite: (id: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
}

export const FileInfoDrawer: React.FC<FileInfoDrawerProps> = ({
  file,
  folder,
  onClose,
  onToggleFavorite,
  onDuplicate,
  onDelete,
}) => {
  return (
    <div className="doc-right-drawer">
      <div className="drawer-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>ℹ️</span>
          <h3>Document Metadata</h3>
        </div>
        <button type="button" className="chat-close-btn" onClick={onClose} title="Close info drawer">
          ✕
        </button>
      </div>

      <div className="drawer-content-scroll">
        {/* File Name & Icon Header */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            padding: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span style={{ fontSize: '2rem' }}>
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
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '0.88rem',
                fontWeight: 800,
                color: '#f8fafc',
                wordBreak: 'break-word',
              }}
            >
              {file.name}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 600 }}>
              Version {file.versionNumber} • {file.size}
            </div>
          </div>
        </div>

        {/* Status Badge & Actions */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="control-btn"
            style={{ flex: 1 }}
            onClick={() => onToggleFavorite(file.id)}
          >
            {file.isFavorite ? '⭐ Favorited' : '☆ Add to Fav'}
          </button>
          <button
            type="button"
            className="control-btn"
            style={{ flex: 1 }}
            onClick={() => onDuplicate(file.id)}
          >
            📑 Duplicate
          </button>
        </div>

        {/* Metadata Details (Section 2 Requirements) */}
        <div className="meta-info-row">
          <span className="label">File ID</span>
          <span className="val" style={{ fontFamily: 'monospace', color: '#38bdf8' }}>
            {file.id}
          </span>
        </div>

        <div className="meta-info-row">
          <span className="label">Format &amp; MIME Type</span>
          <span className="val">{file.type.toUpperCase()} Document</span>
        </div>

        <div className="meta-info-row">
          <span className="label">File Size</span>
          <span className="val">{file.size} ({file.sizeBytes.toLocaleString()} bytes)</span>
        </div>

        <div className="meta-info-row">
          <span className="label">Page Count</span>
          <span className="val">{file.pageCount} Pages</span>
        </div>

        <div className="meta-info-row">
          <span className="label">Folder / Location</span>
          <span className="val">{folder ? `📁 ${folder.name}` : 'Root Workspace'}</span>
        </div>

        <div className="meta-info-row">
          <span className="label">Status</span>
          <span className="val">
            <span
              style={{
                display: 'inline-block',
                fontSize: '0.74rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '4px',
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
          </span>
        </div>

        <div className="meta-info-row">
          <span className="label">Category</span>
          <span className="val">{file.category}</span>
        </div>

        <div className="meta-info-row">
          <span className="label">Created Date &amp; Author</span>
          <span className="val">{file.createdDate} by {file.createdBy}</span>
        </div>

        <div className="meta-info-row">
          <span className="label">Last Modified</span>
          <span className="val">{file.modifiedDate} by {file.modifiedBy}</span>
        </div>

        <div className="meta-info-row">
          <span className="label">Tags</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
            {file.tags.map((tag) => (
              <span key={tag} className="file-tag-pill">
                #{tag}
              </span>
            ))}
          </div>
        </div>

        <div className="meta-info-row">
          <span className="label">Description</span>
          <span className="val" style={{ fontSize: '0.78rem', fontWeight: 400, color: '#cbd5e1' }}>
            {file.description || 'No description provided.'}
          </span>
        </div>

        <div className="meta-info-row">
          <span className="label">Remarks / Changelog</span>
          <span className="val" style={{ fontSize: '0.78rem', fontWeight: 400, color: '#94a3b8' }}>
            {file.remarks || 'None.'}
          </span>
        </div>

        {/* Danger Zone */}
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <button
            type="button"
            className="control-btn"
            style={{ width: '100%', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#f87171' }}
            onClick={() => {
              if (window.confirm(`Move "${file.name}" to Recycle Bin?`)) {
                onDelete(file.id)
                onClose()
              }
            }}
          >
            🗑️ Move to Recycle Bin
          </button>
        </div>
      </div>
    </div>
  )
}
