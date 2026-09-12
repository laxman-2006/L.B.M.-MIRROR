import React, { useState } from 'react'
import type { FileItem, FileVersion } from '../../types/viewerTypes'

interface FileCompareModalProps {
  primaryFile: FileItem
  allFiles: FileItem[]
  preselectedVersion?: FileVersion
  onClose: () => void
}

export const FileCompareModal: React.FC<FileCompareModalProps> = ({
  primaryFile,
  allFiles,
  preselectedVersion,
  onClose,
}) => {
  const [compareMode, setCompareMode] = useState<'version' | 'file'>(preselectedVersion ? 'version' : 'file')
  const [secondaryFileId, setSecondaryFileId] = useState<string>(() => {
    const other = allFiles.find((f) => f.id !== primaryFile.id)
    return other ? other.id : primaryFile.id
  })
  const [secondaryVersionId, setSecondaryVersionId] = useState<string>(() => {
    if (preselectedVersion) return preselectedVersion.id
    if (primaryFile.versions.length > 1) return primaryFile.versions[1].id
    return primaryFile.versions[0]?.id || ''
  })

  const secondaryFile = allFiles.find((f) => f.id === secondaryFileId) || primaryFile
  const selectedVersion = primaryFile.versions.find((v) => v.id === secondaryVersionId) || primaryFile.versions[0]

  // Compare text extraction
  const primaryText =
    primaryFile.documentPages && primaryFile.documentPages.length > 0
      ? primaryFile.documentPages.map((p) => `--- Page ${p.pageNumber}: ${p.title} ---\n${p.text}`).join('\n\n')
      : primaryFile.tabularData
      ? primaryFile.tabularData.headers.join(' | ') + '\n' + primaryFile.tabularData.rows.map((r) => r.join(' | ')).join('\n')
      : primaryFile.contentSnippet || 'Primary document text'

  const secondaryText =
    compareMode === 'version'
      ? selectedVersion
        ? `--- Version ${selectedVersion.versionNumber} Snapshot (Recorded on ${selectedVersion.createdDate}) ---\nRemarks: ${selectedVersion.remarks}\n\n` + primaryText.slice(0, 320) + '\n[Note: Early preliminary numbers without Q3 depreciation adjustments]'
        : 'Version content'
      : secondaryFile.documentPages && secondaryFile.documentPages.length > 0
      ? secondaryFile.documentPages.map((p) => `--- Page ${p.pageNumber}: ${p.title} ---\n${p.text}`).join('\n\n')
      : secondaryFile.tabularData
      ? secondaryFile.tabularData.headers.join(' | ') + '\n' + secondaryFile.tabularData.rows.map((r) => r.join(' | ')).join('\n')
      : secondaryFile.contentSnippet || 'Secondary document text'

  return (
    <div className="viewer-modal-backdrop" onClick={onClose}>
      <div className="viewer-modal-card compare-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>⚖️</span>
            <div>
              <h3 style={{ margin: 0 }}>Side-by-Side Document Comparison &amp; Diff</h3>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8' }}>
                Comparing active file with historical version or companion document
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="toolbar-button-group">
              <button
                type="button"
                className={`tool-action-btn ${compareMode === 'version' ? 'active' : ''}`}
                onClick={() => setCompareMode('version')}
              >
                ⏱️ Compare Versions
              </button>
              <button
                type="button"
                className={`tool-action-btn ${compareMode === 'file' ? 'active' : ''}`}
                onClick={() => setCompareMode('file')}
              >
                📄 Compare Two Files
              </button>
            </div>
            <button type="button" className="chat-close-btn" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        {/* Diff Indicators Legend (Section 17 Requirements) */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            padding: '8px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.74rem',
          }}
        >
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ color: '#94a3b8' }}>Diff Legend:</span>
            <span className="diff-tag-added">+ Added Content (Green)</span>
            <span className="diff-tag-removed">- Removed Content (Red)</span>
            <span className="diff-tag-modified">~ Modified / Updated (Amber)</span>
          </div>

          {compareMode === 'version' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#94a3b8' }}>Compare Against:</span>
              <select
                value={secondaryVersionId}
                onChange={(e) => setSecondaryVersionId(e.target.value)}
                style={{
                  background: '#152238',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#38bdf8',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                }}
              >
                {primaryFile.versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.versionNumber} ({v.createdDate})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#94a3b8' }}>Select Second File:</span>
              <select
                value={secondaryFileId}
                onChange={(e) => setSecondaryFileId(e.target.value)}
                style={{
                  background: '#152238',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#38bdf8',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                }}
              >
                {allFiles.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.type.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Side-by-Side Split Panes */}
        <div className="modal-body">
          <div className="compare-grid-split">
            {/* Left Pane (Primary / Current Document) */}
            <div className="compare-pane-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '6px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#f8fafc' }}>
                  {primaryFile.name} ({primaryFile.versionNumber})
                </span>
                <span className="diff-tag-added">ACTIVE VERSION</span>
              </div>
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  fontFamily: 'monospace',
                  fontSize: '0.76rem',
                  lineHeight: '1.5',
                  color: '#e2e8f0',
                  whiteSpace: 'pre-wrap',
                  padding: '8px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '6px',
                }}
              >
                {primaryText}
              </div>
            </div>

            {/* Right Pane (Comparison Document / Version) */}
            <div className="compare-pane-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '6px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#f8fafc' }}>
                  {compareMode === 'version'
                    ? `${primaryFile.name} (${selectedVersion?.versionNumber || 'v1.0'})`
                    : `${secondaryFile.name} (${secondaryFile.versionNumber})`}
                </span>
                <span className="diff-tag-modified">COMPARISON TARGET</span>
              </div>
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  fontFamily: 'monospace',
                  fontSize: '0.76rem',
                  lineHeight: '1.5',
                  color: '#94a3b8',
                  whiteSpace: 'pre-wrap',
                  padding: '8px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '6px',
                }}
              >
                {secondaryText}
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="control-btn primary" onClick={onClose} style={{ padding: '8px 24px' }}>
            Close Comparison View
          </button>
        </div>
      </div>
    </div>
  )
}
