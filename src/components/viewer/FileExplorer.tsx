import React, { useState, useMemo } from 'react'
import type {
  FileItem,
  FolderItem,
  SearchFilterState,
  SortConfig,
  UserRole,
  ViewerPermissions,
} from '../../types/viewerTypes'
import { defaultViewerStorage } from '../../services/viewerStorageService'

interface FileExplorerProps {
  files: FileItem[]
  folders: FolderItem[]
  onOpenFile: (file: FileItem) => void
  onRefresh: () => void
  onOpenInfo: (file: FileItem) => void
  onOpenShare: (file: FileItem) => void
  onOpenPrint: (file: FileItem) => void
  onOpenVersions: (file: FileItem) => void
  onOpenCompare: (file1: FileItem, file2?: FileItem) => void
  currentRole: UserRole
  permissions: ViewerPermissions
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  files,
  folders,
  onOpenFile,
  onRefresh,
  onOpenInfo,
  onOpenShare,
  onOpenPrint,
  onOpenVersions,
  onOpenCompare,
  permissions,
}) => {
  // Navigation & view states
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [isRecycleBinView, setIsRecycleBinView] = useState<boolean>(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'compact'>('grid')
  const [showFilterDrawer, setShowFilterDrawer] = useState<boolean>(false)

  // Selection for bulk operations
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([])

  // Search & Filters state
  const [filters, setFilters] = useState<SearchFilterState>({
    keyword: '',
    dateFrom: '',
    dateTo: '',
    fileType: '',
    category: '',
    userName: '',
    folderId: '',
    status: '',
    tag: '',
    sizeRange: 'all',
    matchMode: 'contains',
    caseSensitive: false,
  })

  // Sort state
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'modifiedDate',
    direction: 'desc',
  })

  // Folder creation modal state
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderColor, setNewFolderColor] = useState('#38bdf8')

  // Move files modal state
  const [isMoveOpen, setIsMoveOpen] = useState(false)
  const [targetMoveFolderId, setTargetMoveFolderId] = useState('')

  // Toast / notification feedback
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 2500)
  }

  // Active folder object
  const currentFolder = useMemo(() => {
    return folders.find((f) => f.id === selectedFolderId)
  }, [folders, selectedFolderId])

  // Filter & Search pipeline
  const processedFiles = useMemo(() => {
    let result = files.filter((f) => (isRecycleBinView ? f.isDeleted : !f.isDeleted))

    // Folder constraint (unless viewing recycle bin or all)
    if (!isRecycleBinView && selectedFolderId) {
      result = result.filter((f) => f.folderId === selectedFolderId)
    }

    // Keyword search
    if (filters.keyword.trim()) {
      const kw = filters.caseSensitive ? filters.keyword.trim() : filters.keyword.trim().toLowerCase()
      result = result.filter((f) => {
        const name = filters.caseSensitive ? f.name : f.name.toLowerCase()
        const snippet = filters.caseSensitive ? f.contentSnippet || '' : (f.contentSnippet || '').toLowerCase()
        const desc = filters.caseSensitive ? f.description || '' : (f.description || '').toLowerCase()

        if (filters.matchMode === 'exact') {
          return name === kw || f.tags.some((t) => (filters.caseSensitive ? t : t.toLowerCase()) === kw)
        } else if (filters.matchMode === 'starts_with') {
          return name.startsWith(kw)
        } else {
          return name.includes(kw) || snippet.includes(kw) || desc.includes(kw) || f.tags.some((t) => (filters.caseSensitive ? t : t.toLowerCase()).includes(kw))
        }
      })
    }

    // Type filter
    if (filters.fileType) {
      result = result.filter((f) => f.type === filters.fileType)
    }

    // Category filter
    if (filters.category) {
      result = result.filter((f) => f.category === filters.category)
    }

    // Status filter
    if (filters.status) {
      result = result.filter((f) => f.status === filters.status)
    }

    // User filter
    if (filters.userName) {
      result = result.filter((f) => f.createdBy.toLowerCase().includes(filters.userName.toLowerCase()))
    }

    // Tag filter
    if (filters.tag) {
      result = result.filter((f) => f.tags.some((t) => t.toLowerCase() === filters.tag.toLowerCase()))
    }

    // Size range
    if (filters.sizeRange === 'small') {
      result = result.filter((f) => f.sizeBytes < 1024 * 1024) // < 1MB
    } else if (filters.sizeRange === 'medium') {
      result = result.filter((f) => f.sizeBytes >= 1024 * 1024 && f.sizeBytes <= 5 * 1024 * 1024) // 1-5MB
    } else if (filters.sizeRange === 'large') {
      result = result.filter((f) => f.sizeBytes > 5 * 1024 * 1024) // > 5MB
    }

    // Date range
    if (filters.dateFrom) {
      result = result.filter((f) => f.modifiedDate >= filters.dateFrom)
    }
    if (filters.dateTo) {
      result = result.filter((f) => f.modifiedDate <= filters.dateTo)
    }

    // Sorting
    result.sort((a, b) => {
      let valA: any = a[sortConfig.field]
      let valB: any = b[sortConfig.field]
      if (typeof valA === 'string') {
        return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
      }
      return sortConfig.direction === 'asc' ? valA - valB : valB - valA
    })

    return result
  }, [files, isRecycleBinView, selectedFolderId, filters, sortConfig])

  // Count helper for folder badges
  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    files.forEach((f) => {
      if (!f.isDeleted) {
        counts[f.folderId] = (counts[f.folderId] || 0) + 1
      }
    })
    return counts
  }, [files])

  const recycleBinCount = useMemo(() => {
    return files.filter((f) => f.isDeleted).length
  }, [files])

  // Bulk selection handlers
  const handleSelectAll = () => {
    if (selectedFileIds.length === processedFiles.length) {
      setSelectedFileIds([])
    } else {
      setSelectedFileIds(processedFiles.map((f) => f.id))
    }
  }

  const toggleSelectFile = (id: string) => {
    if (selectedFileIds.includes(id)) {
      setSelectedFileIds(selectedFileIds.filter((item) => item !== id))
    } else {
      setSelectedFileIds([...selectedFileIds, id])
    }
  }

  // Single file actions
  const handleRename = (file: FileItem) => {
    if (!permissions.canEdit) {
      showToast('Permission denied: cannot edit files')
      return
    }
    const newName = window.prompt('Enter new file name:', file.name)
    if (newName && newName.trim() && newName.trim() !== file.name) {
      defaultViewerStorage.renameFile(file.id, newName.trim())
      onRefresh()
      showToast(`Renamed to "${newName.trim()}"`)
    }
  }

  const handleDuplicate = (file: FileItem) => {
    defaultViewerStorage.duplicateFile(file.id)
    onRefresh()
    showToast(`Created duplicate of "${file.name}"`)
  }

  const handleDelete = (file: FileItem) => {
    if (!permissions.canDelete && !isRecycleBinView) {
      showToast('Permission denied: cannot delete files')
      return
    }
    if (isRecycleBinView) {
      if (window.confirm(`Permanently delete "${file.name}"? This action cannot be undone.`)) {
        defaultViewerStorage.deleteFile(file.id, true)
        onRefresh()
        showToast(`Permanently deleted "${file.name}"`)
      }
    } else {
      defaultViewerStorage.deleteFile(file.id, false)
      onRefresh()
      showToast(`Moved "${file.name}" to Recycle Bin`)
    }
  }

  const handleRestore = (file: FileItem) => {
    defaultViewerStorage.restoreFile(file.id)
    onRefresh()
    showToast(`Restored "${file.name}" to its original folder`)
  }

  const handleToggleFav = (e: React.MouseEvent, file: FileItem) => {
    e.stopPropagation()
    defaultViewerStorage.toggleFavorite(file.id)
    onRefresh()
    showToast(file.isFavorite ? 'Removed from favorites' : 'Marked as favorite')
  }

  // Bulk Actions
  const handleBulkDelete = () => {
    if (selectedFileIds.length === 0) return
    if (isRecycleBinView) {
      if (window.confirm(`Permanently delete ${selectedFileIds.length} files?`)) {
        selectedFileIds.forEach((id) => defaultViewerStorage.deleteFile(id, true))
        setSelectedFileIds([])
        onRefresh()
        showToast('Permanently deleted selected files')
      }
    } else {
      if (window.confirm(`Move ${selectedFileIds.length} files to Recycle Bin?`)) {
        selectedFileIds.forEach((id) => defaultViewerStorage.deleteFile(id, false))
        setSelectedFileIds([])
        onRefresh()
        showToast('Moved selected files to Recycle Bin')
      }
    }
  }

  const handleBulkRestore = () => {
    if (selectedFileIds.length === 0) return
    selectedFileIds.forEach((id) => defaultViewerStorage.restoreFile(id))
    setSelectedFileIds([])
    onRefresh()
    showToast('Restored selected files')
  }

  const handleBulkDownload = () => {
    if (selectedFileIds.length === 0) return
    showToast(`Downloading ${selectedFileIds.length} files archive...`)
    selectedFileIds.forEach((id) => {
      const f = files.find((item) => item.id === id)
      if (f) {
        defaultViewerStorage.logAction(f.id, f.name, 'File Downloaded', 'Bulk archive export')
      }
    })
  }

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return
    defaultViewerStorage.addFolder(newFolderName.trim(), null, newFolderColor)
    setNewFolderName('')
    setIsNewFolderOpen(false)
    onRefresh()
    showToast(`Created folder "${newFolderName.trim()}"`)
  }

  const handleExecuteMove = () => {
    if (!targetMoveFolderId || selectedFileIds.length === 0) return
    selectedFileIds.forEach((id) => {
      defaultViewerStorage.moveFile(id, targetMoveFolderId)
    })
    setIsMoveOpen(false)
    setSelectedFileIds([])
    onRefresh()
    showToast(`Moved ${selectedFileIds.length} files to target folder`)
  }

  const resetFilters = () => {
    setFilters({
      keyword: '',
      dateFrom: '',
      dateTo: '',
      fileType: '',
      category: '',
      userName: '',
      folderId: '',
      status: '',
      tag: '',
      sizeRange: 'all',
      matchMode: 'contains',
      caseSensitive: false,
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return <span className="v-tag v-tag-approved">✓ Approved</span>
      case 'In Review':
        return <span className="v-tag v-tag-review">⏳ In Review</span>
      case 'Draft':
        return <span className="v-tag v-tag-draft">📝 Draft</span>
      case 'Confidential':
        return <span className="v-tag v-tag-confidential">🔒 Confidential</span>
      default:
        return <span className="v-tag">{status}</span>
    }
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Toast Notification */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid #38bdf8',
            color: '#f8fafc',
            padding: '10px 18px',
            borderRadius: 8,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: '0.85rem',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <span>ℹ️</span> {toastMsg}
        </div>
      )}

      {/* LEFT SIDEBAR: FOLDER TREE & VIEWS */}
      <div
        style={{
          width: 260,
          background: 'rgba(15, 23, 42, 0.65)',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#f8fafc' }}>
            🗂️ DIRECTORIES
          </div>
          <button
            className="v-btn v-btn-secondary"
            style={{ padding: '3px 8px', fontSize: '0.75rem' }}
            onClick={() => setIsNewFolderOpen(true)}
            title="Create New Folder"
          >
            + New
          </button>
        </div>

        <div style={{ padding: '0.75rem 0.5rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* All Files button */}
          <button
            onClick={() => {
              setSelectedFolderId(null)
              setIsRecycleBinView(false)
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderRadius: 6,
              background: !isRecycleBinView && selectedFolderId === null ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: !isRecycleBinView && selectedFolderId === null ? '#38bdf8' : '#94a3b8',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.84rem',
              textAlign: 'left',
              width: '100%',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              📁 All Documents
            </span>
            <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
              {files.filter((f) => !f.isDeleted).length}
            </span>
          </button>

          {/* Folder List */}
          <div style={{ margin: '8px 0 4px 10px', fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em' }}>
            Custom Folders
          </div>

          {folders.map((fld) => {
            const isSelected = !isRecycleBinView && selectedFolderId === fld.id
            const count = folderCounts[fld.id] || 0
            return (
              <button
                key={fld.id}
                onClick={() => {
                  setSelectedFolderId(fld.id)
                  setIsRecycleBinView(false)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: 6,
                  background: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  color: isSelected ? '#38bdf8' : '#cbd5e1',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  textAlign: 'left',
                  width: '100%',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <span style={{ color: fld.color || '#38bdf8' }}>📁</span>
                  {fld.name}
                </span>
                <span style={{ fontSize: '0.72rem', opacity: 0.7, marginLeft: 4 }}>
                  {count}
                </span>
              </button>
            )
          })}

          <div style={{ margin: '14px 0 4px 10px', fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em' }}>
            Special Views
          </div>

          {/* Recycle Bin button */}
          <button
            onClick={() => {
              setIsRecycleBinView(true)
              setSelectedFolderId(null)
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderRadius: 6,
              background: isRecycleBinView ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
              color: isRecycleBinView ? '#f87171' : '#94a3b8',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.82rem',
              textAlign: 'left',
              width: '100%',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              🗑️ Recycle Bin
            </span>
            {recycleBinCount > 0 && (
              <span style={{ fontSize: '0.72rem', background: '#ef4444', color: '#fff', padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>
                {recycleBinCount}
              </span>
            )}
          </button>
        </div>

        {/* Storage stats indicator */}
        <div style={{ padding: '0.85rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)', fontSize: '0.75rem', color: '#94a3b8' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span>Vault Quota</span>
            <span style={{ color: '#38bdf8', fontWeight: 600 }}>14.8 MB / 5.0 GB</span>
          </div>
          <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: '3%', height: '100%', background: '#38bdf8' }} />
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* TOP TOOLBAR: BREADCRUMBS, SEARCH & VIEW TOGGLES */}
        <div
          style={{
            padding: '0.75rem 1.25rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            background: 'rgba(15, 23, 42, 0.4)',
          }}
        >
          {/* Breadcrumbs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.88rem', fontWeight: 600, color: '#f8fafc' }}>
            <span>📁 Explorer</span>
            <span style={{ color: '#64748b' }}>/</span>
            {isRecycleBinView ? (
              <span style={{ color: '#f87171' }}>Recycle Bin</span>
            ) : currentFolder ? (
              <span style={{ color: '#38bdf8' }}>{currentFolder.name}</span>
            ) : (
              <span style={{ color: '#38bdf8' }}>All Files</span>
            )}
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 400, marginLeft: 4 }}>
              ({processedFiles.length} {processedFiles.length === 1 ? 'file' : 'files'})
            </span>
          </div>

          {/* Search bar & filter drawer toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, maxWidth: 520 }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type="text"
                className="v-input"
                style={{ paddingLeft: 32, fontSize: '0.82rem' }}
                placeholder="Search by file name, keyword, tag, or content snippet..."
                value={filters.keyword}
                onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
              />
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '0.85rem' }}>
                🔍
              </span>
              {filters.keyword && (
                <button
                  onClick={() => setFilters({ ...filters, keyword: '' })}
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

            <button
              className={`v-btn ${showFilterDrawer ? 'v-btn-primary' : 'v-btn-secondary'}`}
              style={{ padding: '6px 12px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
              onClick={() => setShowFilterDrawer(!showFilterDrawer)}
            >
              🌪️ Filters
            </button>
          </div>

          {/* Layout Mode switcher & Sorting */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Sort Field */}
            <select
              className="v-select"
              style={{ width: 'auto', fontSize: '0.78rem', padding: '5px 8px' }}
              value={sortConfig.field}
              onChange={(e) => setSortConfig({ ...sortConfig, field: e.target.value as SortConfig['field'] })}
            >
              <option value="modifiedDate">Sort: Date Modified</option>
              <option value="name">Sort: Name (A-Z)</option>
              <option value="sizeBytes">Sort: Size</option>
              <option value="type">Sort: Type</option>
              <option value="status">Sort: Status</option>
            </select>

            {/* Sort Direction */}
            <button
              className="v-btn v-btn-secondary"
              style={{ padding: '5px 8px', fontSize: '0.8rem' }}
              onClick={() =>
                setSortConfig({
                  ...sortConfig,
                  direction: sortConfig.direction === 'asc' ? 'desc' : 'asc',
                })
              }
              title={`Sorting ${sortConfig.direction.toUpperCase()}`}
            >
              {sortConfig.direction === 'asc' ? '↑ Asc' : '↓ Desc'}
            </button>

            {/* View layout modes */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 6, padding: 2 }}>
              <button
                className="v-btn"
                style={{
                  padding: '4px 8px',
                  background: viewMode === 'grid' ? '#38bdf8' : 'transparent',
                  color: viewMode === 'grid' ? '#0f172a' : '#94a3b8',
                }}
                onClick={() => setViewMode('grid')}
                title="Grid View"
              >
                ⊞
              </button>
              <button
                className="v-btn"
                style={{
                  padding: '4px 8px',
                  background: viewMode === 'list' ? '#38bdf8' : 'transparent',
                  color: viewMode === 'list' ? '#0f172a' : '#94a3b8',
                }}
                onClick={() => setViewMode('list')}
                title="List View"
              >
                ☰
              </button>
              <button
                className="v-btn"
                style={{
                  padding: '4px 8px',
                  background: viewMode === 'compact' ? '#38bdf8' : 'transparent',
                  color: viewMode === 'compact' ? '#0f172a' : '#94a3b8',
                }}
                onClick={() => setViewMode('compact')}
                title="Compact View"
              >
                ▤
              </button>
            </div>
          </div>
        </div>

        {/* ADVANCED MULTI-FILTER DRAWER / EXPANDER */}
        {showFilterDrawer && (
          <div
            style={{
              padding: '0.85rem 1.25rem',
              background: 'rgba(15, 23, 42, 0.85)',
              borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
              alignItems: 'flex-end',
            }}
          >
            {/* File Type */}
            <div>
              <label className="v-label">Type</label>
              <select
                className="v-select"
                style={{ fontSize: '0.8rem' }}
                value={filters.fileType}
                onChange={(e) => setFilters({ ...filters, fileType: e.target.value })}
              >
                <option value="">All Formats</option>
                <option value="pdf">PDF Documents (.pdf)</option>
                <option value="docx">Word Files (.docx)</option>
                <option value="xlsx">Excel Sheets (.xlsx)</option>
                <option value="png">Images (.png, .jpg)</option>
                <option value="csv">CSV Datasets (.csv)</option>
                <option value="txt">Text & Markdown (.txt)</option>
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="v-label">Category</label>
              <select
                className="v-select"
                style={{ fontSize: '0.8rem' }}
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              >
                <option value="">All Categories</option>
                <option value="Finance">Finance</option>
                <option value="Engineering">Engineering</option>
                <option value="Sales">Sales</option>
                <option value="Design">Design</option>
                <option value="Compliance">Compliance & Legal</option>
                <option value="Support">Support & Feedback</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="v-label">Status</label>
              <select
                className="v-select"
                style={{ fontSize: '0.8rem' }}
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">All Statuses</option>
                <option value="Approved">Approved</option>
                <option value="In Review">In Review</option>
                <option value="Draft">Draft</option>
                <option value="Confidential">Confidential</option>
              </select>
            </div>

            {/* Size Range */}
            <div>
              <label className="v-label">Size Range</label>
              <select
                className="v-select"
                style={{ fontSize: '0.8rem' }}
                value={filters.sizeRange}
                onChange={(e) => setFilters({ ...filters, sizeRange: e.target.value as any })}
              >
                <option value="all">Any Size</option>
                <option value="small">Small (&lt; 1 MB)</option>
                <option value="medium">Medium (1 MB - 5 MB)</option>
                <option value="large">Large (&gt; 5 MB)</option>
              </select>
            </div>

            {/* Date Range */}
            <div>
              <label className="v-label">Date From</label>
              <input
                type="date"
                className="v-input"
                style={{ fontSize: '0.8rem', padding: '5px 8px' }}
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              />
            </div>

            <div>
              <label className="v-label">Date To</label>
              <input
                type="date"
                className="v-input"
                style={{ fontSize: '0.8rem', padding: '5px 8px' }}
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              />
            </div>

            {/* Match Mode */}
            <div>
              <label className="v-label">Match Mode</label>
              <select
                className="v-select"
                style={{ fontSize: '0.8rem' }}
                value={filters.matchMode}
                onChange={(e) => setFilters({ ...filters, matchMode: e.target.value as any })}
              >
                <option value="contains">Contains Word</option>
                <option value="exact">Exact Match</option>
                <option value="starts_with">Starts With</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                className="v-btn v-btn-secondary"
                style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                onClick={resetFilters}
              >
                ↺ Reset Filters
              </button>
            </div>
          </div>
        )}

        {/* BULK ACTION BAR (Visible when files are selected) */}
        {selectedFileIds.length > 0 && (
          <div
            style={{
              padding: '0.6rem 1.25rem',
              background: 'rgba(56, 189, 248, 0.12)',
              borderBottom: '1px solid rgba(56, 189, 248, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontWeight: 700, color: '#38bdf8', fontSize: '0.85rem' }}>
                ✓ {selectedFileIds.length} {selectedFileIds.length === 1 ? 'file' : 'files'} selected
              </span>
              <button
                className="v-btn v-btn-secondary"
                style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                onClick={() => setSelectedFileIds([])}
              >
                Clear Selection
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {isRecycleBinView ? (
                <>
                  <button
                    className="v-btn v-btn-primary"
                    style={{ padding: '5px 12px', fontSize: '0.8rem' }}
                    onClick={handleBulkRestore}
                  >
                    ↺ Restore Selected
                  </button>
                  <button
                    className="v-btn v-btn-danger"
                    style={{ padding: '5px 12px', fontSize: '0.8rem' }}
                    onClick={handleBulkDelete}
                  >
                    🗑️ Permanently Delete
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="v-btn v-btn-secondary"
                    style={{ padding: '5px 12px', fontSize: '0.8rem' }}
                    onClick={handleBulkDownload}
                  >
                    📥 Download Archive
                  </button>
                  <button
                    className="v-btn v-btn-secondary"
                    style={{ padding: '5px 12px', fontSize: '0.8rem' }}
                    onClick={() => setIsMoveOpen(true)}
                  >
                    📂 Move to Folder
                  </button>
                  {selectedFileIds.length === 2 && (
                    <button
                      className="v-btn v-btn-primary"
                      style={{ padding: '5px 12px', fontSize: '0.8rem' }}
                      onClick={() => {
                        const f1 = files.find((f) => f.id === selectedFileIds[0])
                        const f2 = files.find((f) => f.id === selectedFileIds[1])
                        if (f1 && f2) onOpenCompare(f1, f2)
                      }}
                    >
                      ⚖️ Compare (2 Selected)
                    </button>
                  )}
                  <button
                    className="v-btn v-btn-danger"
                    style={{ padding: '5px 12px', fontSize: '0.8rem' }}
                    onClick={handleBulkDelete}
                  >
                    🗑️ Move to Trash
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* FILES DISPLAY CONTAINER */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
          {processedFiles.length === 0 ? (
            <div
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                gap: 12,
              }}
            >
              <div style={{ fontSize: '3rem' }}>📂</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#94a3b8' }}>
                {isRecycleBinView ? 'Recycle Bin is Empty' : 'No Documents Found'}
              </div>
              <div style={{ fontSize: '0.85rem', maxWidth: 360, textAlign: 'center' }}>
                {isRecycleBinView
                  ? 'Files deleted from your directory will appear here for 30 days before permanent purging.'
                  : 'Try clearing your search query or reset active filters to view all documents.'}
              </div>
              {Object.values(filters).some((v) => Boolean(v)) && (
                <button className="v-btn v-btn-secondary" onClick={resetFilters}>
                  Reset All Filters
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            /* GRID VIEW */
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1rem',
              }}
            >
              {processedFiles.map((file) => {
                const isSelected = selectedFileIds.includes(file.id)
                return (
                  <div
                    key={file.id}
                    className="v-card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      border: isSelected ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.08)',
                      background: isSelected ? 'rgba(56, 189, 248, 0.08)' : 'rgba(30, 41, 59, 0.45)',
                      position: 'relative',
                      cursor: 'pointer',
                    }}
                    onClick={() => onOpenFile(file)}
                  >
                    {/* Card Top: Checkbox, Badge & Favorite */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation()
                            toggleSelectFile(file.id)
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="v-badge" style={{ textTransform: 'uppercase' }}>
                          {file.type}
                        </span>
                        {getStatusBadge(file.status)}
                      </div>

                      <button
                        onClick={(e) => handleToggleFav(e, file)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: file.isFavorite ? '#f59e0b' : '#64748b',
                          cursor: 'pointer',
                          fontSize: '1rem',
                        }}
                        title={file.isFavorite ? 'Remove Favorite' : 'Mark Favorite'}
                      >
                        {file.isFavorite ? '★' : '☆'}
                      </button>
                    </div>

                    {/* File Title & Description */}
                    <div style={{ fontWeight: 600, fontSize: '0.92rem', color: '#f8fafc', marginBottom: 4, wordBreak: 'break-word' }}>
                      {file.name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.4, height: 36, overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 12 }}>
                      {file.description || file.contentSnippet || 'No preview description available.'}
                    </div>

                    {/* Meta rows: Size, Version, Modified */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#64748b', marginBottom: 10 }}>
                      <span>📦 {file.size}</span>
                      <span>🔄 {file.versionNumber}</span>
                      <span>📅 {file.modifiedDate}</span>
                    </div>

                    {/* Tags */}
                    {file.tags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                        {file.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="v-tag" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Action buttons footer */}
                    <div
                      style={{
                        marginTop: 'auto',
                        paddingTop: 8,
                        borderTop: '1px solid rgba(255,255,255,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isRecycleBinView ? (
                        <>
                          <button
                            className="v-btn v-btn-primary"
                            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                            onClick={() => handleRestore(file)}
                          >
                            ↺ Restore
                          </button>
                          <button
                            className="v-btn v-btn-danger"
                            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                            onClick={() => handleDelete(file)}
                          >
                            🗑️ Delete Permanently
                          </button>
                        </>
                      ) : (
                        <>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              className="v-btn v-btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              onClick={() => onOpenInfo(file)}
                              title="Metadata & Info"
                            >
                              ℹ️
                            </button>
                            <button
                              className="v-btn v-btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              onClick={() => onOpenVersions(file)}
                              title="Version History"
                            >
                              🔄
                            </button>
                            <button
                              className="v-btn v-btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              onClick={() => onOpenShare(file)}
                              title="Share Document"
                            >
                              🔗
                            </button>
                            <button
                              className="v-btn v-btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              onClick={() => onOpenPrint(file)}
                              title="Print Document"
                            >
                              🖨️
                            </button>
                          </div>

                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              className="v-btn v-btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              onClick={() => handleRename(file)}
                              title="Rename File"
                            >
                              ✏️
                            </button>
                            <button
                              className="v-btn v-btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              onClick={() => handleDuplicate(file)}
                              title="Duplicate File"
                            >
                              📑
                            </button>
                            <button
                              className="v-btn v-btn-danger"
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              onClick={() => handleDelete(file)}
                              title="Move to Recycle Bin"
                            >
                              🗑️
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* LIST & COMPACT VIEW */
            <div style={{ overflowX: 'auto' }}>
              <table className="v-table" style={{ width: '100%', fontSize: viewMode === 'compact' ? '0.78rem' : '0.84rem' }}>
                <thead>
                  <tr>
                    <th style={{ width: 36, textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedFileIds.length > 0 && selectedFileIds.length === processedFiles.length}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th>Document Name</th>
                    <th>Status</th>
                    <th>Type</th>
                    <th>Size</th>
                    <th>Version</th>
                    <th>Modified Date</th>
                    <th>Author</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {processedFiles.map((file) => {
                    const isSelected = selectedFileIds.includes(file.id)
                    return (
                      <tr
                        key={file.id}
                        style={{
                          background: isSelected ? 'rgba(56, 189, 248, 0.08)' : undefined,
                          cursor: 'pointer',
                        }}
                        onClick={() => onOpenFile(file)}
                      >
                        <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectFile(file.id)}
                          />
                        </td>
                        <td style={{ fontWeight: 600, color: '#f8fafc' }}>
                          <span style={{ marginRight: 6 }}>{file.isFavorite ? '★' : '📄'}</span>
                          {file.name}
                        </td>
                        <td>{getStatusBadge(file.status)}</td>
                        <td>
                          <span className="v-badge">{file.type}</span>
                        </td>
                        <td style={{ color: '#94a3b8' }}>{file.size}</td>
                        <td style={{ color: '#38bdf8' }}>{file.versionNumber}</td>
                        <td style={{ color: '#94a3b8' }}>{file.modifiedDate}</td>
                        <td style={{ color: '#94a3b8' }}>{file.createdBy}</td>
                        <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                          {isRecycleBinView ? (
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                              <button
                                className="v-btn v-btn-primary"
                                style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                                onClick={() => handleRestore(file)}
                              >
                                Restore
                              </button>
                              <button
                                className="v-btn v-btn-danger"
                                style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                                onClick={() => handleDelete(file)}
                              >
                                Purge
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                              <button
                                className="v-btn v-btn-secondary"
                                style={{ padding: '3px 6px', fontSize: '0.72rem' }}
                                onClick={() => onOpenInfo(file)}
                                title="Details"
                              >
                                ℹ️
                              </button>
                              <button
                                className="v-btn v-btn-secondary"
                                style={{ padding: '3px 6px', fontSize: '0.72rem' }}
                                onClick={() => onOpenShare(file)}
                                title="Share"
                              >
                                🔗
                              </button>
                              <button
                                className="v-btn v-btn-secondary"
                                style={{ padding: '3px 6px', fontSize: '0.72rem' }}
                                onClick={() => onOpenPrint(file)}
                                title="Print"
                              >
                                🖨️
                              </button>
                              <button
                                className="v-btn v-btn-secondary"
                                style={{ padding: '3px 6px', fontSize: '0.72rem' }}
                                onClick={() => handleRename(file)}
                                title="Rename"
                              >
                                ✏️
                              </button>
                              <button
                                className="v-btn v-btn-danger"
                                style={{ padding: '3px 6px', fontSize: '0.72rem' }}
                                onClick={() => handleDelete(file)}
                                title="Delete"
                              >
                                🗑️
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* NEW FOLDER MODAL */}
      {isNewFolderOpen && (
        <div className="v-modal-overlay" onClick={() => setIsNewFolderOpen(false)}>
          <div className="v-modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div className="v-modal-header">
              <div className="v-modal-title">📁 Create New Folder</div>
              <button className="v-btn v-btn-secondary" onClick={() => setIsNewFolderOpen(false)}>
                ✕
              </button>
            </div>
            <div className="v-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="v-label">Folder Name</label>
                <input
                  type="text"
                  className="v-input"
                  placeholder="e.g. Operations & Compliance"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="v-label">Accent Color</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['#38bdf8', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444'].map((c) => (
                    <div
                      key={c}
                      onClick={() => setNewFolderColor(c)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: c,
                        cursor: 'pointer',
                        border: newFolderColor === c ? '2px solid #fff' : 'none',
                        boxShadow: newFolderColor === c ? '0 0 10px ' + c : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="v-modal-footer">
              <button className="v-btn v-btn-secondary" onClick={() => setIsNewFolderOpen(false)}>
                Cancel
              </button>
              <button className="v-btn v-btn-primary" onClick={handleCreateFolder}>
                Create Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOVE FILES MODAL */}
      {isMoveOpen && (
        <div className="v-modal-overlay" onClick={() => setIsMoveOpen(false)}>
          <div className="v-modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="v-modal-header">
              <div className="v-modal-title">📂 Move {selectedFileIds.length} Files</div>
              <button className="v-btn v-btn-secondary" onClick={() => setIsMoveOpen(false)}>
                ✕
              </button>
            </div>
            <div className="v-modal-body">
              <label className="v-label">Select Destination Folder</label>
              <select
                className="v-select"
                value={targetMoveFolderId}
                onChange={(e) => setTargetMoveFolderId(e.target.value)}
              >
                <option value="">-- Select Folder --</option>
                {folders.map((fld) => (
                  <option key={fld.id} value={fld.id}>
                    📁 {fld.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="v-modal-footer">
              <button className="v-btn v-btn-secondary" onClick={() => setIsMoveOpen(false)}>
                Cancel
              </button>
              <button
                className="v-btn v-btn-primary"
                disabled={!targetMoveFolderId}
                onClick={handleExecuteMove}
              >
                Move Here
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
