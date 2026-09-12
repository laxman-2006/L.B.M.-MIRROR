import React, { useState, useRef, useEffect, useMemo } from 'react'
import type {
  FileItem,
  Annotation,
  ViewerPermissions,
  SystemFeatureToggles,
} from '../../types/viewerTypes'
import { defaultViewerStorage } from '../../services/viewerStorageService'

interface DocumentViewerProps {
  file: FileItem
  onClose: () => void
  onOpenInfo: (file: FileItem) => void
  onOpenShare: (file: FileItem) => void
  onOpenPrint: (file: FileItem) => void
  onOpenVersions: (file: FileItem) => void
  onOpenCompare: (file: FileItem) => void
  permissions: ViewerPermissions
  toggles: SystemFeatureToggles
  onUpdateFile: (updatedFile: FileItem) => void
}

type AnnotationTool =
  | 'none'
  | 'highlight'
  | 'underline'
  | 'strikethrough'
  | 'pen'
  | 'rect'
  | 'circle'
  | 'stamp'
  | 'signature'
  | 'textbox'

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  file,
  onClose,
  onOpenInfo,
  onOpenShare,
  onOpenPrint,
  onOpenVersions,
  onOpenCompare,
  permissions,
  toggles,
  onUpdateFile,
}) => {
  // Navigation & zoom state
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [zoomLevel, setZoomLevel] = useState<number>(100) // percentage
  const [rotation, setRotation] = useState<number>(0) // 0, 90, 180, 270
  const [viewMode, setViewMode] = useState<'single' | 'continuous'>('single')
  const [isThumbnailsOpen, setIsThumbnailsOpen] = useState<boolean>(true)
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false)

  // Document internal search state
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false)

  // Annotations state
  const [activeTool, setActiveTool] = useState<AnnotationTool>('none')
  const [annotations, setAnnotations] = useState<Annotation[]>(file.annotations || [])
  const [stampSelection, setStampSelection] = useState<
    'APPROVED' | 'CONFIDENTIAL' | 'REVIEWED' | 'REJECTED' | 'URGENT'
  >('APPROVED')
  const [annotationColor] = useState<string>('#fef08a')

  // Toast feedback
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  const viewerContainerRef = useRef<HTMLDivElement>(null)
  const totalPages = Math.max(1, file.pageCount || (file.documentPages ? file.documentPages.length : 1))

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 2400)
  }

  // Sync annotations if file updates
  useEffect(() => {
    setAnnotations(file.annotations || [])
    defaultViewerStorage.logAction(file.id, file.name, 'File Viewed', `Viewed with ${file.type.toUpperCase()} viewer engine`)
  }, [file.id])

  // Page Navigation Handlers
  const goToPage = (page: number) => {
    const valid = Math.min(Math.max(1, page), totalPages)
    setCurrentPage(valid)
  }

  // Zoom Handlers
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 20, 300))
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 20, 40))
  const handleResetZoom = () => {
    setZoomLevel(100)
    setRotation(0)
  }
  const handleFitWidth = () => setZoomLevel(120)
  const handleFitHeight = () => setZoomLevel(85)
  const handleFitScreen = () => setZoomLevel(100)

  // Rotation
  const handleRotateLeft = () => setRotation((prev) => (prev - 90 + 360) % 360)
  const handleRotateRight = () => setRotation((prev) => (prev + 90) % 360)

  // Full Screen
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      viewerContainerRef.current?.requestFullscreen?.().catch(() => {})
      setIsFullScreen(true)
    } else {
      document.exitFullscreen?.().catch(() => {})
      setIsFullScreen(false)
    }
  }

  // Handle Canvas Click for Stamp / Annotation Placement
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>, pageNum: number) => {
    if (!toggles.enableAnnotations || !permissions.canAnnotate || activeTool === 'none') return

    const rect = e.currentTarget.getBoundingClientRect()
    const xPct = Math.round(((e.clientX - rect.left) / rect.width) * 100)
    const yPct = Math.round(((e.clientY - rect.top) / rect.height) * 100)

    let newAnnotation: Annotation | null = null

    if (activeTool === 'stamp') {
      newAnnotation = {
        id: `ant-${Date.now()}`,
        fileId: file.id,
        pageNumber: pageNum,
        type: 'stamp',
        x: Math.max(0, xPct - 15),
        y: Math.max(0, yPct - 8),
        width: 130,
        height: 46,
        stampType: stampSelection,
        author: 'Current User',
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      }
    } else if (activeTool === 'signature') {
      newAnnotation = {
        id: `ant-${Date.now()}`,
        fileId: file.id,
        pageNumber: pageNum,
        type: 'signature',
        x: Math.max(0, xPct - 15),
        y: Math.max(0, yPct - 10),
        width: 140,
        height: 56,
        text: 'Laxman Choudhary (CEO)',
        author: 'Current User',
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      }
    } else if (activeTool === 'textbox') {
      const text = window.prompt('Enter comment or note:')
      if (text && text.trim()) {
        newAnnotation = {
          id: `ant-${Date.now()}`,
          fileId: file.id,
          pageNumber: pageNum,
          type: 'textbox',
          x: xPct,
          y: yPct,
          width: 180,
          text: text.trim(),
          color: annotationColor,
          author: 'Current User',
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        }
      }
    } else if (activeTool === 'highlight') {
      newAnnotation = {
        id: `ant-${Date.now()}`,
        fileId: file.id,
        pageNumber: pageNum,
        type: 'highlight',
        x: Math.max(0, xPct - 10),
        y: Math.max(0, yPct - 2),
        width: 120,
        height: 18,
        color: annotationColor || '#fef08a',
        author: 'Current User',
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      }
    } else if (activeTool === 'rect' || activeTool === 'circle') {
      newAnnotation = {
        id: `ant-${Date.now()}`,
        fileId: file.id,
        pageNumber: pageNum,
        type: activeTool,
        x: Math.max(0, xPct - 10),
        y: Math.max(0, yPct - 10),
        width: 120,
        height: 80,
        color: annotationColor || '#38bdf8',
        author: 'Current User',
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      }
    }

    if (newAnnotation) {
      const updated = [...annotations, newAnnotation]
      setAnnotations(updated)
      defaultViewerStorage.saveAnnotations(file.id, updated)
      onUpdateFile({ ...file, annotations: updated })
      showToast(`Added ${newAnnotation.type} annotation on page ${pageNum}`)
      setActiveTool('none')
    }
  }

  // Delete Annotation
  const handleDeleteAnnotation = (e: React.MouseEvent, antId: string) => {
    e.stopPropagation()
    const updated = annotations.filter((a) => a.id !== antId)
    setAnnotations(updated)
    defaultViewerStorage.saveAnnotations(file.id, updated)
    onUpdateFile({ ...file, annotations: updated })
    showToast('Removed annotation')
  }

  // Clear All Annotations
  const handleClearAllAnnotations = () => {
    if (annotations.length === 0) return
    if (window.confirm('Clear all annotations on this document?')) {
      setAnnotations([])
      defaultViewerStorage.saveAnnotations(file.id, [])
      onUpdateFile({ ...file, annotations: [] })
      showToast('Cleared all annotations')
    }
  }

  // Export / Download
  const handleDownloadOriginal = () => {
    if (!permissions.canDownload) {
      showToast('Permission denied: cannot download document')
      return
    }
    defaultViewerStorage.logAction(file.id, file.name, 'File Downloaded', `Exported original copy`)
    showToast(`Downloading original "${file.name}"...`)
  }

  const handleExportPDF = () => {
    if (!permissions.canDownload) {
      showToast('Permission denied: cannot export document')
      return
    }
    defaultViewerStorage.logAction(file.id, file.name, 'File Downloaded', `Exported as PDF`)
    showToast(`Exported "${file.name.replace(/\.[^.]+$/, '')}.pdf"`)
  }

  const handleCopySnippet = () => {
    const textToCopy = file.contentSnippet || file.description || file.name
    navigator.clipboard?.writeText(textToCopy)
    showToast('Copied document summary to clipboard')
  }

  // Search matches calculation
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    const matches: Array<{ page: number; snippet: string }> = []

    if (file.documentPages) {
      file.documentPages.forEach((p) => {
        if (p.text.toLowerCase().includes(q) || p.title.toLowerCase().includes(q)) {
          matches.push({ page: p.pageNumber, snippet: p.title })
        }
      })
    } else if (file.contentSnippet && file.contentSnippet.toLowerCase().includes(q)) {
      matches.push({ page: 1, snippet: file.name })
    }
    return matches
  }, [searchQuery, file])

  // Render a specific document page
  const renderPageCanvas = (pageNum: number) => {
    const pageData = file.documentPages?.find((p) => p.pageNumber === pageNum)
    const pageAnnotations = annotations.filter((a) => a.pageNumber === pageNum)

    // Render Tabular Data if XLSX/CSV
    const isSpreadsheet = file.type === 'xlsx' || file.type === 'csv'
    const isImage = file.type === 'png' || file.type === 'jpg'

    return (
      <div
        key={pageNum}
        className="v-page-canvas"
        style={{
          width: 740 * (zoomLevel / 100),
          minHeight: 960 * (zoomLevel / 100),
          transform: `rotate(${rotation}deg)`,
          transformOrigin: 'center center',
          transition: 'transform 0.2s ease, width 0.15s ease',
          position: 'relative',
          background: '#ffffff',
          color: '#0f172a',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.6)',
          borderRadius: 4,
          padding: 40 * (zoomLevel / 100),
          boxSizing: 'border-box',
          cursor: activeTool !== 'none' ? 'crosshair' : 'default',
        }}
        onClick={(e) => handleCanvasClick(e, pageNum)}
      >
        {/* Page Header Header info watermark */}
        <div
          style={{
            borderBottom: '2px solid #e2e8f0',
            paddingBottom: 12,
            marginBottom: 24,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: `${0.75 * (zoomLevel / 100)}rem`,
            color: '#64748b',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
            <span>LBM MIRROR SECURE VIEWER</span>
            <span style={{ color: '#0284c7' }}>• {file.status.toUpperCase()}</span>
          </div>
          <div>
            Page {pageNum} of {totalPages}
          </div>
        </div>

        {/* Dynamic Watermark if Confidential */}
        {file.status === 'Confidential' && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%) rotate(-35deg)',
              fontSize: `${4.5 * (zoomLevel / 100)}rem`,
              fontWeight: 900,
              color: 'rgba(239, 68, 68, 0.08)',
              pointerEvents: 'none',
              letterSpacing: '0.2em',
              userSelect: 'none',
              zIndex: 1,
            }}
          >
            CONFIDENTIAL
          </div>
        )}

        {/* Content Body */}
        {isSpreadsheet && file.tabularData ? (
          <div>
            <h3 style={{ fontSize: `${1.1 * (zoomLevel / 100)}rem`, marginBottom: 16, color: '#0f172a' }}>
              📊 {file.name} (Data Sheet)
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: `${0.8 * (zoomLevel / 100)}rem`,
                }}
              >
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                    {file.tabularData.headers.map((h, i) => (
                      <th
                        key={i}
                        style={{
                          padding: '8px 12px',
                          textAlign: 'left',
                          fontWeight: 700,
                          color: '#1e293b',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {file.tabularData.rows.map((row, ri) => (
                    <tr key={ri} style={{ background: ri % 2 === 0 ? '#fff' : '#f8fafc' }}>
                      {row.map((cell, ci) => (
                        <td
                          key={ci}
                          style={{
                            padding: '8px 12px',
                            border: '1px solid #e2e8f0',
                            color: ci === 0 ? '#0f172a' : '#334155',
                            fontWeight: ci === 0 ? 600 : 400,
                          }}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : isImage ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <img
              src={file.thumbnailUrl || 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&auto=format&fit=crop&q=80'}
              alt={file.name}
              style={{ maxWidth: '100%', height: 'auto', borderRadius: 6, border: '1px solid #e2e8f0' }}
            />
            <div style={{ marginTop: 14, fontSize: `${0.82 * (zoomLevel / 100)}rem`, color: '#64748b' }}>
              {file.description}
            </div>
          </div>
        ) : (
          <div>
            <h2
              style={{
                fontSize: `${1.35 * (zoomLevel / 100)}rem`,
                fontWeight: 700,
                color: '#0f172a',
                marginBottom: 16,
                borderBottom: '1px solid #f1f5f9',
                paddingBottom: 8,
              }}
            >
              {pageData ? pageData.title : file.name}
            </h2>

            <div
              style={{
                fontSize: `${0.9 * (zoomLevel / 100)}rem`,
                lineHeight: 1.7,
                color: '#334155',
                whiteSpace: 'pre-wrap',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              {pageData?.text || file.contentSnippet || file.description || 'No text content available for this page.'}
            </div>
          </div>
        )}

        {/* OVERLAY ANNOTATIONS */}
        {pageAnnotations.map((ant) => {
          if (ant.type === 'stamp') {
            const stampColors: Record<string, { border: string; color: string; bg: string }> = {
              APPROVED: { border: '#10b981', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
              CONFIDENTIAL: { border: '#ef4444', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
              REVIEWED: { border: '#38bdf8', color: '#0284c7', bg: 'rgba(56, 189, 248, 0.1)' },
              REJECTED: { border: '#e11d48', color: '#e11d48', bg: 'rgba(225, 29, 72, 0.1)' },
              URGENT: { border: '#f59e0b', color: '#d97706', bg: 'rgba(245, 158, 11, 0.1)' },
            }
            const style = stampColors[ant.stampType || 'APPROVED'] || stampColors.APPROVED
            return (
              <div
                key={ant.id}
                style={{
                  position: 'absolute',
                  left: `${ant.x}%`,
                  top: `${ant.y}%`,
                  padding: '6px 14px',
                  border: `3px solid ${style.border}`,
                  color: style.color,
                  background: style.bg,
                  borderRadius: 6,
                  fontWeight: 900,
                  fontSize: `${1.05 * (zoomLevel / 100)}rem`,
                  letterSpacing: '0.15em',
                  transform: 'rotate(-8deg)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  userSelect: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  zIndex: 10,
                }}
              >
                <span>{ant.stampType}</span>
                {permissions.canAnnotate && (
                  <button
                    onClick={(e) => handleDeleteAnnotation(e, ant.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: style.color,
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      marginLeft: 4,
                    }}
                    title="Delete stamp"
                  >
                    ✕
                  </button>
                )}
              </div>
            )
          }

          if (ant.type === 'signature') {
            return (
              <div
                key={ant.id}
                style={{
                  position: 'absolute',
                  left: `${ant.x}%`,
                  top: `${ant.y}%`,
                  padding: '6px 12px',
                  borderBottom: '2px solid #0284c7',
                  background: 'rgba(56, 189, 248, 0.08)',
                  borderRadius: 4,
                  zIndex: 10,
                }}
              >
                <div style={{ fontFamily: 'cursive', fontSize: `${1.1 * (zoomLevel / 100)}rem`, color: '#0369a1', fontWeight: 700 }}>
                  {ant.text || 'Laxman Choudhary'}
                </div>
                <div style={{ fontSize: `${0.65 * (zoomLevel / 100)}rem`, color: '#64748b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Verified: {ant.createdAt}</span>
                  {permissions.canAnnotate && (
                    <button
                      onClick={(e) => handleDeleteAnnotation(e, ant.id)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.7rem' }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            )
          }

          if (ant.type === 'textbox') {
            return (
              <div
                key={ant.id}
                style={{
                  position: 'absolute',
                  left: `${ant.x}%`,
                  top: `${ant.y}%`,
                  padding: '8px 12px',
                  background: '#fef08a',
                  border: '1px solid #facc15',
                  borderRadius: 6,
                  color: '#713f12',
                  fontSize: `${0.8 * (zoomLevel / 100)}rem`,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  maxWidth: 240,
                  zIndex: 10,
                }}
              >
                <div style={{ fontWeight: 600, fontSize: `${0.7 * (zoomLevel / 100)}rem`, color: '#854d0e', marginBottom: 2 }}>
                  💬 {ant.author} • {ant.createdAt}
                </div>
                <div>{ant.text}</div>
                {permissions.canAnnotate && (
                  <button
                    onClick={(e) => handleDeleteAnnotation(e, ant.id)}
                    style={{ position: 'absolute', top: 2, right: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#854d0e' }}
                  >
                    ✕
                  </button>
                )}
              </div>
            )
          }

          if (ant.type === 'highlight') {
            return (
              <div
                key={ant.id}
                style={{
                  position: 'absolute',
                  left: `${ant.x}%`,
                  top: `${ant.y}%`,
                  width: `${ant.width || 80}px`,
                  height: `${ant.height || 18}px`,
                  background: 'rgba(253, 224, 71, 0.45)',
                  borderRadius: 2,
                  pointerEvents: 'none',
                  zIndex: 5,
                }}
              />
            )
          }

          if (ant.type === 'rect' || ant.type === 'circle') {
            return (
              <div
                key={ant.id}
                style={{
                  position: 'absolute',
                  left: `${ant.x}%`,
                  top: `${ant.y}%`,
                  width: `${ant.width || 100}px`,
                  height: `${ant.height || 60}px`,
                  border: `2px solid ${ant.color || '#38bdf8'}`,
                  borderRadius: ant.type === 'circle' ? '50%' : 4,
                  zIndex: 5,
                }}
              >
                {permissions.canAnnotate && (
                  <button
                    onClick={(e) => handleDeleteAnnotation(e, ant.id)}
                    style={{ position: 'absolute', top: -10, right: -10, background: '#ef4444', color: '#fff', borderRadius: '50%', width: 18, height: 18, border: 'none', cursor: 'pointer', fontSize: '0.65rem' }}
                  >
                    ✕
                  </button>
                )}
              </div>
            )
          }

          return null
        })}
      </div>
    )
  }

  return (
    <div
      ref={viewerContainerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#0b0f19',
        color: '#f8fafc',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Toast */}
      {toastMsg && (
        <div
          style={{
            position: 'absolute',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid #38bdf8',
            color: '#f8fafc',
            padding: '8px 18px',
            borderRadius: 8,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            zIndex: 9999,
            fontSize: '0.85rem',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {toastMsg}
        </div>
      )}

      {/* TOP HEADER / VIEWER TOOLBAR */}
      <div
        style={{
          padding: '0.65rem 1.25rem',
          background: 'rgba(15, 23, 42, 0.95)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexShrink: 0,
        }}
      >
        {/* Left: Back button & Document Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 220 }}>
          <button
            className="v-btn v-btn-secondary"
            style={{ padding: '5px 10px', fontSize: '0.82rem' }}
            onClick={onClose}
            title="Close Viewer"
          >
            ← Back
          </button>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="v-badge" style={{ textTransform: 'uppercase' }}>
                {file.type}
              </span>
              <span style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {file.name}
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              {file.versionNumber} • {file.size} • {totalPages} {totalPages === 1 ? 'Page' : 'Pages'}
            </div>
          </div>
        </div>

        {/* Center: Zoom, Rotation, Page Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Page nav */}
          <button
            className="v-btn v-btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.78rem' }}
            disabled={currentPage <= 1}
            onClick={() => goToPage(1)}
            title="First Page"
          >
            ⏮
          </button>
          <button
            className="v-btn v-btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.78rem' }}
            disabled={currentPage <= 1}
            onClick={() => goToPage(currentPage - 1)}
            title="Previous Page"
          >
            ◀
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.82rem' }}>
            <input
              type="number"
              className="v-input"
              style={{ width: 44, padding: '3px 4px', textAlign: 'center', fontSize: '0.8rem' }}
              value={currentPage}
              min={1}
              max={totalPages}
              onChange={(e) => goToPage(Number(e.target.value))}
            />
            <span style={{ color: '#94a3b8' }}>/ {totalPages}</span>
          </div>

          <button
            className="v-btn v-btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.78rem' }}
            disabled={currentPage >= totalPages}
            onClick={() => goToPage(currentPage + 1)}
            title="Next Page"
          >
            ▶
          </button>
          <button
            className="v-btn v-btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.78rem' }}
            disabled={currentPage >= totalPages}
            onClick={() => goToPage(totalPages)}
            title="Last Page"
          >
            ⏭
          </button>

          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

          {/* Zoom controls */}
          <button
            className="v-btn v-btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.8rem' }}
            onClick={handleZoomOut}
            title="Zoom Out"
          >
            🔍−
          </button>
          <select
            className="v-select"
            style={{ width: 78, padding: '4px 6px', fontSize: '0.78rem' }}
            value={zoomLevel}
            onChange={(e) => setZoomLevel(Number(e.target.value))}
          >
            <option value={50}>50%</option>
            <option value={75}>75%</option>
            <option value={85}>85%</option>
            <option value={100}>100%</option>
            <option value={125}>125%</option>
            <option value={150}>150%</option>
            <option value={200}>200%</option>
          </select>
          <button
            className="v-btn v-btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.8rem' }}
            onClick={handleZoomIn}
            title="Zoom In"
          >
            🔍+
          </button>

          {/* Fit options */}
          <button
            className="v-btn v-btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            onClick={handleFitScreen}
            title="Fit Screen (100%)"
          >
            ⊡ Fit
          </button>
          <button
            className="v-btn v-btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            onClick={handleFitWidth}
            title="Fit Width"
          >
            ↔ Width
          </button>
          <button
            className="v-btn v-btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            onClick={handleFitHeight}
            title="Fit Height"
          >
            ↕ Height
          </button>

          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

          {/* Rotation */}
          <button
            className="v-btn v-btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.78rem' }}
            onClick={handleRotateLeft}
            title="Rotate Left 90°"
          >
            ↺
          </button>
          <button
            className="v-btn v-btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.78rem' }}
            onClick={handleRotateRight}
            title="Rotate Right 90°"
          >
            ↻
          </button>

          <button
            className="v-btn v-btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            onClick={handleResetZoom}
            title="Reset View"
          >
            Reset
          </button>
        </div>

        {/* Right: Actions, Search, Annotations toggle, Fullscreen */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            className={`v-btn ${isSearchOpen ? 'v-btn-primary' : 'v-btn-secondary'}`}
            style={{ padding: '5px 10px', fontSize: '0.78rem' }}
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            title="Search in Document"
          >
            🔍 Find
          </button>

          <button
            className="v-btn v-btn-secondary"
            style={{ padding: '5px 10px', fontSize: '0.78rem' }}
            onClick={() => onOpenPrint(file)}
            title="Print Document"
          >
            🖨️ Print
          </button>

          <button
            className="v-btn v-btn-secondary"
            style={{ padding: '5px 10px', fontSize: '0.78rem' }}
            onClick={() => onOpenShare(file)}
            title="Share Document"
          >
            🔗 Share
          </button>

          <button
            className="v-btn v-btn-secondary"
            style={{ padding: '5px 10px', fontSize: '0.78rem' }}
            onClick={() => onOpenVersions(file)}
            title="Version History"
          >
            🔄 Revisions
          </button>

          <button
            className="v-btn v-btn-secondary"
            style={{ padding: '5px 10px', fontSize: '0.78rem' }}
            onClick={() => onOpenCompare(file)}
            title="Compare with another file"
          >
            ⚖️ Compare
          </button>

          <button
            className="v-btn v-btn-secondary"
            style={{ padding: '5px 10px', fontSize: '0.78rem' }}
            onClick={() => onOpenInfo(file)}
            title="File Metadata & Info"
          >
            ℹ️ Info
          </button>

          <button
            className="v-btn v-btn-secondary"
            style={{ padding: '5px 8px', fontSize: '0.8rem' }}
            onClick={toggleFullScreen}
            title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
          >
            {isFullScreen ? '↙' : '⛶'}
          </button>
        </div>
      </div>

      {/* SUB-TOOLBAR: ANNOTATION TOOLBAR & SEARCH BAR */}
      <div
        style={{
          padding: '0.45rem 1.25rem',
          background: 'rgba(20, 27, 45, 0.9)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        {/* Annotation Tools */}
        {toggles.enableAnnotations && permissions.canAnnotate ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginRight: 4 }}>
              ✏️ Annotate:
            </span>

            <button
              className={`v-btn ${activeTool === 'none' ? 'v-btn-primary' : 'v-btn-secondary'}`}
              style={{ padding: '3px 8px', fontSize: '0.74rem' }}
              onClick={() => setActiveTool('none')}
            >
              Pointer
            </button>

            <button
              className={`v-btn ${activeTool === 'stamp' ? 'v-btn-primary' : 'v-btn-secondary'}`}
              style={{ padding: '3px 8px', fontSize: '0.74rem' }}
              onClick={() => setActiveTool('stamp')}
            >
              🔖 Stamp ({stampSelection})
            </button>

            {activeTool === 'stamp' && (
              <select
                className="v-select"
                style={{ width: 'auto', padding: '2px 6px', fontSize: '0.72rem' }}
                value={stampSelection}
                onChange={(e) => setStampSelection(e.target.value as any)}
              >
                <option value="APPROVED">APPROVED</option>
                <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                <option value="REVIEWED">REVIEWED</option>
                <option value="REJECTED">REJECTED</option>
                <option value="URGENT">URGENT</option>
              </select>
            )}

            <button
              className={`v-btn ${activeTool === 'signature' ? 'v-btn-primary' : 'v-btn-secondary'}`}
              style={{ padding: '3px 8px', fontSize: '0.74rem' }}
              onClick={() => setActiveTool('signature')}
            >
              ✍️ Sign
            </button>

            <button
              className={`v-btn ${activeTool === 'textbox' ? 'v-btn-primary' : 'v-btn-secondary'}`}
              style={{ padding: '3px 8px', fontSize: '0.74rem' }}
              onClick={() => setActiveTool('textbox')}
            >
              💬 Note
            </button>

            <button
              className={`v-btn ${activeTool === 'highlight' ? 'v-btn-primary' : 'v-btn-secondary'}`}
              style={{ padding: '3px 8px', fontSize: '0.74rem' }}
              onClick={() => setActiveTool('highlight')}
            >
              🖍️ Highlight
            </button>

            <button
              className={`v-btn ${activeTool === 'rect' ? 'v-btn-primary' : 'v-btn-secondary'}`}
              style={{ padding: '3px 8px', fontSize: '0.74rem' }}
              onClick={() => setActiveTool('rect')}
            >
              ▭ Box
            </button>

            <button
              className={`v-btn ${activeTool === 'circle' ? 'v-btn-primary' : 'v-btn-secondary'}`}
              style={{ padding: '3px 8px', fontSize: '0.74rem' }}
              onClick={() => setActiveTool('circle')}
            >
              ◯ Circle
            </button>

            {annotations.length > 0 && (
              <button
                className="v-btn v-btn-danger"
                style={{ padding: '3px 8px', fontSize: '0.72rem', marginLeft: 8 }}
                onClick={handleClearAllAnnotations}
              >
                Clear ({annotations.length})
              </button>
            )}
          </div>
        ) : (
          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Annotation suite locked by active role permissions
          </div>
        )}

        {/* View Mode: Single Page vs Continuous */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            className="v-btn v-btn-secondary"
            style={{ padding: '3px 8px', fontSize: '0.74rem' }}
            onClick={() => setIsThumbnailsOpen(!isThumbnailsOpen)}
          >
            {isThumbnailsOpen ? 'Hide Thumbnails' : 'Show Thumbnails'}
          </button>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 4, padding: 2 }}>
            <button
              className="v-btn"
              style={{
                padding: '2px 8px',
                fontSize: '0.72rem',
                background: viewMode === 'single' ? '#38bdf8' : 'transparent',
                color: viewMode === 'single' ? '#0f172a' : '#94a3b8',
              }}
              onClick={() => setViewMode('single')}
            >
              Single
            </button>
            <button
              className="v-btn"
              style={{
                padding: '2px 8px',
                fontSize: '0.72rem',
                background: viewMode === 'continuous' ? '#38bdf8' : 'transparent',
                color: viewMode === 'continuous' ? '#0f172a' : '#94a3b8',
              }}
              onClick={() => setViewMode('continuous')}
            >
              Continuous
            </button>
          </div>
        </div>
      </div>

      {/* SEARCH BAR POPDOWN */}
      {isSearchOpen && (
        <div
          style={{
            padding: '0.6rem 1.25rem',
            background: 'rgba(15, 23, 42, 0.95)',
            borderBottom: '1px solid rgba(56, 189, 248, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
            <input
              type="text"
              className="v-input"
              placeholder="Find in page text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            )}
          </div>
          <span style={{ fontSize: '0.82rem', color: '#38bdf8' }}>
            {searchMatches.length} {searchMatches.length === 1 ? 'match' : 'matches'} found
          </span>
          {searchMatches.length > 0 && (
            <div style={{ display: 'flex', gap: 6 }}>
              {searchMatches.map((m, idx) => (
                <button
                  key={idx}
                  className="v-btn v-btn-secondary"
                  style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                  onClick={() => goToPage(m.page)}
                >
                  Page {m.page}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MAIN VIEW CANVAS & SIDEBAR */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* COLLAPSIBLE THUMBNAIL DRAWER */}
        {isThumbnailsOpen && (
          <div
            style={{
              width: 170,
              background: 'rgba(15, 23, 42, 0.65)',
              borderRight: '1px solid rgba(255, 255, 255, 0.08)',
              overflowY: 'auto',
              padding: '1rem 0.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              flexShrink: 0,
            }}
          >
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
              Pages ({totalPages})
            </div>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
              const isSelected = currentPage === pageNum
              return (
                <div
                  key={pageNum}
                  onClick={() => goToPage(pageNum)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    cursor: 'pointer',
                    padding: 4,
                  }}
                >
                  <div
                    style={{
                      width: 110,
                      height: 140,
                      background: '#ffffff',
                      borderRadius: 3,
                      border: isSelected ? '2px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.15)',
                      boxShadow: isSelected ? '0 0 12px rgba(56, 189, 248, 0.4)' : '0 2px 6px rgba(0,0,0,0.3)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 6,
                      color: '#0f172a',
                      fontSize: '0.65rem',
                      textAlign: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ fontWeight: 700, color: '#0284c7', marginBottom: 4 }}>
                      PAGE {pageNum}
                    </div>
                    <div style={{ opacity: 0.6, fontSize: '0.58rem', overflow: 'hidden', maxHeight: 80 }}>
                      {file.documentPages?.[pageNum - 1]?.title || file.name}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: isSelected ? '#38bdf8' : '#94a3b8', marginTop: 4, fontWeight: isSelected ? 700 : 400 }}>
                    {pageNum}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* DOCUMENT SCROLL CANVAS */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'auto',
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 24,
            background: 'radial-gradient(ellipse at top, #1e293b 0%, #0f172a 100%)',
          }}
        >
          {viewMode === 'single' ? (
            renderPageCanvas(currentPage)
          ) : (
            Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => renderPageCanvas(p))
          )}
        </div>
      </div>

      {/* BOTTOM FOOTER STATUS */}
      <div
        style={{
          padding: '0.4rem 1.25rem',
          background: 'rgba(15, 23, 42, 0.95)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.74rem',
          color: '#94a3b8',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span>Viewing: {file.name}</span>
          <span>•</span>
          <span>Page {currentPage} of {totalPages}</span>
          <span>•</span>
          <span>Zoom: {zoomLevel}%</span>
          {rotation > 0 && (
            <>
              <span>•</span>
              <span>Rotation: {rotation}°</span>
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={handleCopySnippet}
            style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '0.74rem' }}
          >
            📋 Copy Summary
          </button>
          <span>•</span>
          <button
            onClick={handleExportPDF}
            style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '0.74rem' }}
          >
            📥 Export PDF
          </button>
          <span>•</span>
          <button
            onClick={handleDownloadOriginal}
            style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '0.74rem' }}
          >
            💾 Download Original
          </button>
        </div>
      </div>
    </div>
  )
}
