import React, { useState, useEffect, useRef } from 'react'
import type {
  FileItem,
  FolderItem,
  AuditLogItem,
  UserRole,
  ViewerPermissions,
  SystemFeatureToggles,
  SupportedFileType,
  FileVersion,
} from '../../types/viewerTypes'
import { defaultViewerStorage } from '../../services/viewerStorageService'
import { ViewerDashboard } from './ViewerDashboard'
import { FileExplorer } from './FileExplorer'
import { DocumentViewer } from './DocumentViewer'
import { FileInfoDrawer } from './FileInfoDrawer'
import { PrintModal } from './PrintModal'
import { ShareModal } from './ShareModal'
import { VersionHistoryDrawer } from './VersionHistoryDrawer'
import { AuditLogDrawer } from './AuditLogDrawer'
import { FileCompareModal } from './FileCompareModal'
import { SecurityAdminModal } from './SecurityAdminModal'
import './ViewerSystem.css'

interface TabItem {
  id: string // 'dashboard' | 'explorer' | file.id
  type: 'dashboard' | 'explorer' | 'file'
  title: string
  file?: FileItem
}

export const ViewerSystem: React.FC = () => {
  // State from storage service
  const [files, setFiles] = useState<FileItem[]>([])
  const [folders, setFolders] = useState<FolderItem[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([])
  const [currentRole, setCurrentRole] = useState<UserRole>('Super Admin')
  const [permissions, setPermissions] = useState<ViewerPermissions>(
    defaultViewerStorage.getPermissionsForRole('Super Admin')
  )
  const [toggles, setToggles] = useState<SystemFeatureToggles>(
    defaultViewerStorage.getFeatureToggles()
  )

  // Tabs state
  const [tabs, setTabs] = useState<TabItem[]>([
    { id: 'dashboard', type: 'dashboard', title: '📊 Dashboard' },
    { id: 'explorer', type: 'explorer', title: '📁 Documents' },
  ])
  const [activeTabId, setActiveTabId] = useState<string>('dashboard')

  // Split-screen state
  const [isSplitScreen, setIsSplitScreen] = useState<boolean>(false)
  const [splitSecondaryFile, setSplitSecondaryFile] = useState<FileItem | null>(null)

  // Modals / Drawers state
  const [infoFile, setInfoFile] = useState<FileItem | null>(null)
  const [printFile, setPrintFile] = useState<FileItem | null>(null)
  const [shareFile, setShareFile] = useState<FileItem | null>(null)
  const [versionsFile, setVersionsFile] = useState<FileItem | null>(null)
  const [isAuditOpen, setIsAuditOpen] = useState<boolean>(false)
  const [isSecurityOpen, setIsSecurityOpen] = useState<boolean>(false)
  const [compareFiles, setCompareFiles] = useState<{ file1: FileItem; file2?: FileItem } | null>(null)

  // File upload input ref
  const uploadInputRef = useRef<HTMLInputElement>(null)

  // Initial load
  const refreshData = () => {
    setFiles([...defaultViewerStorage.getFiles(true)])
    setFolders([...defaultViewerStorage.getFolders()])
    setAuditLogs([...defaultViewerStorage.getAuditLogs()])
    const role = defaultViewerStorage.getCurrentRole()
    setCurrentRole(role)
    setPermissions(defaultViewerStorage.getPermissionsForRole(role))
    setToggles(defaultViewerStorage.getFeatureToggles())
  }

  useEffect(() => {
    refreshData()
  }, [])

  // Open file in tab
  const handleOpenFile = (file: FileItem) => {
    // Check if tab already exists
    const existing = tabs.find((t) => t.id === file.id)
    if (existing) {
      setActiveTabId(file.id)
    } else {
      const newTab: TabItem = {
        id: file.id,
        type: 'file',
        title: file.name,
        file,
      }
      setTabs([...tabs, newTab])
      setActiveTabId(file.id)
    }
  }

  // Close tab
  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation()
    const newTabs = tabs.filter((t) => t.id !== tabId)
    setTabs(newTabs)
    if (activeTabId === tabId) {
      setActiveTabId(newTabs[newTabs.length - 1]?.id || 'dashboard')
    }
  }

  // Handle Role change
  const handleRoleChange = (newRole: UserRole) => {
    setCurrentRole(newRole)
    setPermissions(defaultViewerStorage.getPermissionsForRole(newRole))
  }

  // Handle File Upload from disk
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files?.[0]
    if (!uploaded) return

    const extension = uploaded.name.split('.').pop()?.toLowerCase() || 'txt'
    let detectedType: SupportedFileType = 'txt'
    if (['pdf'].includes(extension)) detectedType = 'pdf'
    else if (['docx', 'doc'].includes(extension)) detectedType = 'docx'
    else if (['xlsx', 'xls'].includes(extension)) detectedType = 'xlsx'
    else if (['png', 'jpg', 'jpeg'].includes(extension)) detectedType = 'png'
    else if (['csv'].includes(extension)) detectedType = 'csv'

    const sizeFormatted = `${(uploaded.size / (1024 * 1024)).toFixed(1)} MB`

    const newFile = defaultViewerStorage.addFile({
      name: uploaded.name,
      type: detectedType,
      size: sizeFormatted,
      sizeBytes: uploaded.size,
      createdBy: 'Laxman Choudhary',
      modifiedBy: 'Laxman Choudhary',
      folderId: 'fld-tech',
      versionNumber: 'v1.0',
      status: 'Draft',
      tags: ['Uploaded', detectedType.toUpperCase()],
      category: 'Engineering',
      description: `Uploaded document: ${uploaded.name}`,
      remarks: 'Imported via LBM Secure Viewer',
      isFavorite: false,
      isPinned: false,
      isArchived: false,
      isDeleted: false,
      pageCount: 1,
      contentSnippet: `Document content preview for ${uploaded.name}`,
      documentPages: [
        {
          pageNumber: 1,
          title: uploaded.name,
          text: `Sample preview text for imported file: ${uploaded.name}\n\nFile size: ${sizeFormatted}\nImport timestamp: ${new Date().toISOString()}`,
        },
      ],
    })

    refreshData()
    handleOpenFile(newFile)
    // Clear input
    if (uploadInputRef.current) uploadInputRef.current.value = ''
  }

  // Handle updated file (annotations, metadata)
  const handleUpdateFile = (updated: FileItem) => {
    defaultViewerStorage.updateFile(updated.id, updated)
    refreshData()
    // Also update in tabs
    setTabs(
      tabs.map((t) => (t.file?.id === updated.id ? { ...t, file: updated, title: updated.name } : t))
    )
  }

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0]

  return (
    <div
      className="v-system-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#090d16',
        color: '#f8fafc',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Hidden file upload input */}
      <input
        type="file"
        ref={uploadInputRef}
        style={{ display: 'none' }}
        onChange={handleFileUpload}
        accept=".pdf,.docx,.doc,.xlsx,.xls,.png,.jpg,.jpeg,.csv,.txt,.json"
      />

      {/* TOP MASTER SYSTEM BAR */}
      <div
        style={{
          height: 48,
          background: 'rgba(15, 23, 42, 0.98)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1rem',
          flexShrink: 0,
        }}
      >
        {/* Left: Brand title & Navigation Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, overflowX: 'auto', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
            <span style={{ fontSize: '1.2rem' }}>📁</span>
            <span style={{ fontWeight: 800, fontSize: '0.92rem', letterSpacing: '0.04em', color: '#38bdf8' }}>
              VIEWER SUITE
            </span>
          </div>

          {/* Dynamic Tabs list */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId
              return (
                <div
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: '6px 6px 0 0',
                    background: isActive ? 'rgba(56, 189, 248, 0.16)' : 'rgba(255, 255, 255, 0.03)',
                    borderBottom: isActive ? '2px solid #38bdf8' : 'none',
                    border: isActive ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(255,255,255,0.04)',
                    color: isActive ? '#f8fafc' : '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: isActive ? 600 : 400,
                    maxWidth: 180,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  <span>{tab.title}</span>
                  {tab.type === 'file' && (
                    <button
                      onClick={(e) => handleCloseTab(e, tab.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        padding: 0,
                        marginLeft: 4,
                      }}
                      title="Close Tab"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Master Actions: Upload, Split View, Role Badge, Audit Logs, Security */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* Upload Button */}
          <button
            className="v-btn v-btn-primary"
            style={{ padding: '4px 10px', fontSize: '0.78rem' }}
            onClick={() => uploadInputRef.current?.click()}
          >
            + Upload Document
          </button>

          {/* Split Screen Toggle (active if viewing a file) */}
          {activeTab.type === 'file' && (
            <button
              className={`v-btn ${isSplitScreen ? 'v-btn-primary' : 'v-btn-secondary'}`}
              style={{ padding: '4px 10px', fontSize: '0.78rem' }}
              onClick={() => {
                if (isSplitScreen) {
                  setIsSplitScreen(false)
                } else {
                  // Pick second file that is not active
                  const other = files.find((f) => f.id !== activeTab.file?.id && !f.isDeleted)
                  setSplitSecondaryFile(other || null)
                  setIsSplitScreen(true)
                }
              }}
              title="Toggle Split-Screen View"
            >
              ⚖️ {isSplitScreen ? 'Exit Split' : 'Split View'}
            </button>
          )}

          {/* Audit Logs button */}
          <button
            className="v-btn v-btn-secondary"
            style={{ padding: '4px 10px', fontSize: '0.78rem' }}
            onClick={() => setIsAuditOpen(true)}
            title="Open Non-Repudiable Audit Trail"
          >
            📋 Audit Stream
          </button>

          {/* Active Role Selector / Security button */}
          <button
            className="v-btn v-btn-secondary"
            style={{
              padding: '4px 10px',
              fontSize: '0.78rem',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              color: '#38bdf8',
            }}
            onClick={() => setIsSecurityOpen(true)}
            title="Configure Security & Role Permissions"
          >
            🛡️ Role: {currentRole}
          </button>
        </div>
      </div>

      {/* MAIN BODY WORKSPACE */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* TAB 1: DASHBOARD */}
        {activeTab.id === 'dashboard' && (
          <ViewerDashboard
            files={files}
            folders={folders}
            auditLogs={auditLogs}
            onOpenFile={handleOpenFile}
            onNavigateTab={(tab) => setActiveTabId(tab)}
            onUploadClick={() => uploadInputRef.current?.click()}
            onCreateFolderClick={() => setActiveTabId('explorer')}
          />
        )}

        {/* TAB 2: EXPLORER */}
        {activeTab.id === 'explorer' && (
          <FileExplorer
            files={files}
            folders={folders}
            onOpenFile={handleOpenFile}
            onRefresh={refreshData}
            onOpenInfo={(f) => setInfoFile(f)}
            onOpenShare={(f) => setShareFile(f)}
            onOpenPrint={(f) => setPrintFile(f)}
            onOpenVersions={(f) => setVersionsFile(f)}
            onOpenCompare={(f1, f2) => setCompareFiles({ file1: f1, file2: f2 })}
            currentRole={currentRole}
            permissions={permissions}
          />
        )}

        {/* FILE TABS (Single or Split) */}
        {activeTab.type === 'file' && activeTab.file && (
          <div style={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden' }}>
            {/* Primary Document Viewer */}
            <div style={{ flex: 1, height: '100%', overflow: 'hidden' }}>
              <DocumentViewer
                file={activeTab.file}
                onClose={() => setActiveTabId('explorer')}
                onOpenInfo={(f) => setInfoFile(f)}
                onOpenShare={(f) => setShareFile(f)}
                onOpenPrint={(f) => setPrintFile(f)}
                onOpenVersions={(f) => setVersionsFile(f)}
                onOpenCompare={(f) => setCompareFiles({ file1: f })}
                permissions={permissions}
                toggles={toggles}
                onUpdateFile={handleUpdateFile}
              />
            </div>

            {/* Split Screen Secondary Viewer */}
            {isSplitScreen && splitSecondaryFile && (
              <div
                style={{
                  flex: 1,
                  height: '100%',
                  borderLeft: '2px solid #38bdf8',
                  overflow: 'hidden',
                }}
              >
                <DocumentViewer
                  file={splitSecondaryFile}
                  onClose={() => setIsSplitScreen(false)}
                  onOpenInfo={(f) => setInfoFile(f)}
                  onOpenShare={(f) => setShareFile(f)}
                  onOpenPrint={(f) => setPrintFile(f)}
                  onOpenVersions={(f) => setVersionsFile(f)}
                  onOpenCompare={(f) => setCompareFiles({ file1: f })}
                  permissions={permissions}
                  toggles={toggles}
                  onUpdateFile={handleUpdateFile}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODALS & DRAWERS */}
      {/* 1. File Metadata Info Drawer */}
      {infoFile && (
        <FileInfoDrawer
          file={infoFile}
          folder={folders.find((f) => f.id === infoFile.folderId)}
          onClose={() => setInfoFile(null)}
          onToggleFavorite={(id: string) => {
            defaultViewerStorage.toggleFavorite(id)
            refreshData()
          }}
          onDuplicate={(id: string) => {
            defaultViewerStorage.duplicateFile(id)
            refreshData()
          }}
          onDelete={(id: string) => {
            defaultViewerStorage.deleteFile(id, false)
            setInfoFile(null)
            refreshData()
          }}
        />
      )}

      {/* 2. Print Modal */}
      {printFile && (
        <PrintModal
          file={printFile}
          currentPage={1}
          onClose={() => setPrintFile(null)}
          onExecutePrint={(s) => {
            defaultViewerStorage.logAction(
              printFile.id,
              printFile.name,
              'File Printed',
              `Printed ${s.copies} copies, Range: ${s.pageRange}`
            )
            setPrintFile(null)
          }}
        />
      )}

      {/* 3. Share Modal */}
      {shareFile && (
        <ShareModal
          file={shareFile}
          onClose={() => setShareFile(null)}
          onShareComplete={(cfg) => {
            defaultViewerStorage.logAction(
              shareFile.id,
              shareFile.name,
              'File Shared',
              `Shared via ${cfg.shareType} with ${cfg.target || 'link'}`
            )
            setShareFile(null)
          }}
          showToast={(msg: string) => console.log(msg)}
        />
      )}

      {/* 4. Version History Drawer */}
      {versionsFile && (
        <VersionHistoryDrawer
          file={versionsFile}
          onClose={() => setVersionsFile(null)}
          onAddVersion={(vNum: string, rem: string) => {
            defaultViewerStorage.addVersion(versionsFile.id, vNum, rem)
            refreshData()
          }}
          onRestoreVersion={(v: FileVersion) => {
            defaultViewerStorage.addVersion(
              versionsFile.id,
              `${v.versionNumber}-restored`,
              `Restored from ${v.versionNumber}`
            )
            refreshData()
          }}
          onCompareWithVersion={() => {
            setCompareFiles({ file1: versionsFile })
            setVersionsFile(null)
          }}
          showToast={(msg: string) => console.log(msg)}
        />
      )}

      {/* 5. Audit Log Drawer */}
      {isAuditOpen && (
        <AuditLogDrawer
          logs={auditLogs}
          onClose={() => setIsAuditOpen(false)}
          showToast={(msg: string) => console.log(msg)}
        />
      )}

      {/* 6. File Compare Modal */}
      {compareFiles && compareFiles.file1 && (
        <FileCompareModal
          primaryFile={compareFiles.file1}
          allFiles={files}
          onClose={() => setCompareFiles(null)}
        />
      )}

      {/* 7. Security & Admin Modal */}
      <SecurityAdminModal
        isOpen={isSecurityOpen}
        onClose={() => setIsSecurityOpen(false)}
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
        toggles={toggles}
        onTogglesChange={(updated) => setToggles(updated)}
      />
    </div>
  )
}
