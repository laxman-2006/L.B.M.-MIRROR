import React, { useState } from 'react'
import type { FileItem, PrintSettings } from '../../types/viewerTypes'

interface PrintModalProps {
  file: FileItem
  currentPage: number
  onClose: () => void
  onExecutePrint: (settings: PrintSettings) => void
}

export const PrintModal: React.FC<PrintModalProps> = ({
  file,
  currentPage,
  onClose,
  onExecutePrint,
}) => {
  const [settings, setSettings] = useState<PrintSettings>({
    pageRange: 'all',
    customPages: `1-${file.pageCount}`,
    copies: 1,
    pageSize: 'A4',
    orientation: 'portrait',
    margins: 'normal',
    scale: 100,
    fitToPage: true,
    includeHeaderFooter: true,
  })

  const handlePrint = () => {
    onExecutePrint(settings)
    // Trigger native browser print dialog with styled print view
    setTimeout(() => {
      window.print()
    }, 200)
    onClose()
  }

  const previewPageText =
    file.documentPages && file.documentPages.length > 0
      ? file.documentPages[Math.min(currentPage - 1, file.documentPages.length - 1)].text
      : file.contentSnippet || 'Document content ready for printing.'

  return (
    <div className="viewer-modal-backdrop" onClick={onClose}>
      <div className="viewer-modal-card" onClick={(e) => e.stopPropagation()} style={{ width: '840px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🖨️</span>
            <h3>Professional Print System — {file.name}</h3>
          </div>
          <button type="button" className="chat-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
          {/* Left Column: Print Settings (Section 8 Requirements) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Page Range */}
            <div>
              <label style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                Page Range
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className={`control-btn ${settings.pageRange === 'all' ? 'primary' : ''}`}
                  onClick={() => setSettings((s) => ({ ...s, pageRange: 'all' }))}
                  style={{ flex: 1 }}
                >
                  All ({file.pageCount})
                </button>
                <button
                  type="button"
                  className={`control-btn ${settings.pageRange === 'current' ? 'primary' : ''}`}
                  onClick={() => setSettings((s) => ({ ...s, pageRange: 'current' }))}
                  style={{ flex: 1 }}
                >
                  Current (P.{currentPage})
                </button>
                <button
                  type="button"
                  className={`control-btn ${settings.pageRange === 'custom' ? 'primary' : ''}`}
                  onClick={() => setSettings((s) => ({ ...s, pageRange: 'custom' }))}
                  style={{ flex: 1 }}
                >
                  Custom
                </button>
              </div>

              {settings.pageRange === 'custom' && (
                <input
                  type="text"
                  value={settings.customPages}
                  onChange={(e) => setSettings((s) => ({ ...s, customPages: e.target.value }))}
                  placeholder="e.g. 1-2, 4"
                  style={{
                    width: '100%',
                    background: '#152238',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#f8fafc',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    marginTop: '6px',
                    fontSize: '0.8rem',
                  }}
                />
              )}
            </div>

            {/* Copies & Orientation */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Copies
                </label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={settings.copies}
                  onChange={(e) => setSettings((s) => ({ ...s, copies: parseInt(e.target.value, 10) || 1 }))}
                  style={{
                    width: '100%',
                    background: '#152238',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#f8fafc',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Orientation
                </label>
                <select
                  value={settings.orientation}
                  onChange={(e) => setSettings((s) => ({ ...s, orientation: e.target.value as any }))}
                  style={{
                    width: '100%',
                    background: '#152238',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#f8fafc',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                  }}
                >
                  <option value="portrait">📄 Portrait</option>
                  <option value="landscape">📃 Landscape</option>
                </select>
              </div>
            </div>

            {/* Page Size & Margins */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Paper Size
                </label>
                <select
                  value={settings.pageSize}
                  onChange={(e) => setSettings((s) => ({ ...s, pageSize: e.target.value as any }))}
                  style={{
                    width: '100%',
                    background: '#152238',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#f8fafc',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                  }}
                >
                  <option value="A4">A4 (210 x 297 mm)</option>
                  <option value="Letter">US Letter (8.5 x 11 in)</option>
                  <option value="Legal">Legal (8.5 x 14 in)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  Margins
                </label>
                <select
                  value={settings.margins}
                  onChange={(e) => setSettings((s) => ({ ...s, margins: e.target.value as any }))}
                  style={{
                    width: '100%',
                    background: '#152238',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#f8fafc',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                  }}
                >
                  <option value="normal">Default Normal</option>
                  <option value="narrow">Narrow (Compact)</option>
                  <option value="wide">Wide (Spacious)</option>
                </select>
              </div>
            </div>

            {/* Scale & Options Checkboxes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#cbd5e1', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.fitToPage}
                  onChange={(e) => setSettings((s) => ({ ...s, fitToPage: e.target.checked }))}
                />
                <span>Fit content to printable page area</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#cbd5e1', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.includeHeaderFooter}
                  onChange={(e) => setSettings((s) => ({ ...s, includeHeaderFooter: e.target.checked }))}
                />
                <span>Include Document Title &amp; Page Numbers Header/Footer</span>
              </label>
            </div>
          </div>

          {/* Right Column: Live Print Preview Sheet */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, marginBottom: '8px', alignSelf: 'flex-start' }}>
              Live Print Preview
            </span>
            <div
              style={{
                width: settings.orientation === 'portrait' ? '240px' : '310px',
                height: settings.orientation === 'portrait' ? '320px' : '230px',
                background: '#ffffff',
                color: '#0f172a',
                borderRadius: '4px',
                boxShadow: '0 6px 20px rgba(0, 0, 0, 0.6)',
                padding: '16px',
                fontSize: '0.62rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: '1px solid #cbd5e1',
                overflow: 'hidden',
                transition: 'all 0.2s ease',
              }}
            >
              {settings.includeHeaderFooter && (
                <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>{file.name}</span>
                  <span>Page {currentPage} of {file.pageCount}</span>
                </div>
              )}

              <div style={{ flex: 1, padding: '8px 0', overflow: 'hidden', whiteSpace: 'pre-wrap', color: '#334155' }}>
                {previewPageText.slice(0, 240)}…
              </div>

              {settings.includeHeaderFooter && (
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '4px', display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                  <span>Printed via LBM Mirror</span>
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="control-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="control-btn primary" onClick={handlePrint} style={{ padding: '8px 20px' }}>
            🖨️ Send to Printer
          </button>
        </div>
      </div>
    </div>
  )
}
