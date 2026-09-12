export type SupportedFileType =
  | 'pdf'
  | 'docx'
  | 'xlsx'
  | 'pptx'
  | 'png'
  | 'jpg'
  | 'csv'
  | 'txt'
  | 'json'

export type FileStatus = 'Draft' | 'In Review' | 'Approved' | 'Archived' | 'Confidential'

export type UserRole = 'Super Admin' | 'Admin' | 'Manager' | 'Staff' | 'Viewer' | 'Auditor'

export interface ViewerPermissions {
  canView: boolean
  canEdit: boolean
  canDownload: boolean
  canPrint: boolean
  canShare: boolean
  canDelete: boolean
  canAnnotate: boolean
  canManageVersions: boolean
}

export interface Annotation {
  id: string
  fileId: string
  pageNumber: number
  type:
    | 'highlight'
    | 'underline'
    | 'strikethrough'
    | 'textbox'
    | 'comment'
    | 'drawing'
    | 'arrow'
    | 'rect'
    | 'circle'
    | 'stamp'
    | 'signature'
  x: number // percentage 0-100
  y: number // percentage 0-100
  width?: number
  height?: number
  color?: string
  text?: string
  points?: Array<{ x: number; y: number }>
  author: string
  createdAt: string
  stampType?: 'APPROVED' | 'CONFIDENTIAL' | 'REVIEWED' | 'REJECTED' | 'URGENT'
}

export interface FileVersion {
  id: string
  versionNumber: string
  createdDate: string
  createdBy: string
  remarks: string
  fileSize: string
  content?: string
}

export interface FileItem {
  id: string
  name: string
  type: SupportedFileType
  size: string
  sizeBytes: number
  createdDate: string
  modifiedDate: string
  createdBy: string
  modifiedBy: string
  folderId: string
  versionNumber: string
  status: FileStatus
  tags: string[]
  category: string
  description: string
  remarks: string
  isFavorite: boolean
  isPinned: boolean
  isArchived: boolean
  isDeleted: boolean
  deletedDate?: string
  password?: string
  pageCount: number
  thumbnailUrl?: string
  contentSnippet?: string
  tabularData?: { headers: string[]; rows: string[][] }
  documentPages?: Array<{ pageNumber: number; title: string; text: string; image?: string }>
  versions: FileVersion[]
  annotations: Annotation[]
}

export interface FolderItem {
  id: string
  name: string
  parentId: string | null
  createdDate: string
  createdBy: string
  color?: string
  isFavorite?: boolean
  description?: string
}

export interface AuditLogItem {
  id: string
  fileId: string
  fileName: string
  action:
    | 'File Opened'
    | 'File Viewed'
    | 'File Downloaded'
    | 'File Printed'
    | 'File Shared'
    | 'File Renamed'
    | 'File Moved'
    | 'File Deleted'
    | 'File Restored'
    | 'File Edited'
    | 'Version Created'
    | 'Annotation Added'
    | 'Permissions Changed'
  userName: string
  timestamp: string
  ipAddress: string
  deviceInfo: string
  details?: string
}

export interface SearchFilterState {
  keyword: string
  dateFrom: string
  dateTo: string
  fileType: string
  category: string
  userName: string
  folderId: string
  status: string
  tag: string
  sizeRange: 'all' | 'small' | 'medium' | 'large'
  matchMode: 'contains' | 'exact' | 'starts_with'
  caseSensitive: boolean
}

export interface SortConfig {
  field: 'name' | 'modifiedDate' | 'createdDate' | 'sizeBytes' | 'type' | 'status'
  direction: 'asc' | 'desc'
}

export interface PrintSettings {
  pageRange: 'all' | 'current' | 'custom'
  customPages: string
  copies: number
  pageSize: 'A4' | 'Letter' | 'Legal'
  orientation: 'portrait' | 'landscape'
  margins: 'normal' | 'narrow' | 'wide'
  scale: number
  fitToPage: boolean
  includeHeaderFooter: boolean
}

export interface ShareConfig {
  shareType: 'link' | 'email' | 'internal' | 'department'
  target: string
  permissions: {
    canView: boolean
    canEdit: boolean
    canDownload: boolean
    canPrint: boolean
  }
  expiryDate?: string
  password?: string
}

export interface SystemFeatureToggles {
  enableSearch: boolean
  enableAnnotations: boolean
  enablePrinting: boolean
  enableDownloading: boolean
  enableSharing: boolean
  enableVersionControl: boolean
  enableAuditLogs: boolean
  enableComparison: boolean
  enableFileManagement: boolean
  enableSecurityProtection: boolean
}
