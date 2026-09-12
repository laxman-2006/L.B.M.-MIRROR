import type {
  FileItem,
  FolderItem,
  AuditLogItem,
  UserRole,
  ViewerPermissions,
  SystemFeatureToggles,
  Annotation,
  FileVersion,
} from '../types/viewerTypes'

const STORAGE_KEY_FILES = 'lbm_viewer_files_v1'
const STORAGE_KEY_FOLDERS = 'lbm_viewer_folders_v1'
const STORAGE_KEY_AUDIT = 'lbm_viewer_audit_v1'
const STORAGE_KEY_ROLE = 'lbm_viewer_user_role_v1'
const STORAGE_KEY_TOGGLES = 'lbm_viewer_feature_toggles_v1'

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, ViewerPermissions> = {
  'Super Admin': {
    canView: true,
    canEdit: true,
    canDownload: true,
    canPrint: true,
    canShare: true,
    canDelete: true,
    canAnnotate: true,
    canManageVersions: true,
  },
  Admin: {
    canView: true,
    canEdit: true,
    canDownload: true,
    canPrint: true,
    canShare: true,
    canDelete: true,
    canAnnotate: true,
    canManageVersions: true,
  },
  Manager: {
    canView: true,
    canEdit: true,
    canDownload: true,
    canPrint: true,
    canShare: true,
    canDelete: false,
    canAnnotate: true,
    canManageVersions: true,
  },
  Staff: {
    canView: true,
    canEdit: true,
    canDownload: true,
    canPrint: true,
    canShare: false,
    canDelete: false,
    canAnnotate: true,
    canManageVersions: false,
  },
  Viewer: {
    canView: true,
    canEdit: false,
    canDownload: false,
    canPrint: false,
    canShare: false,
    canDelete: false,
    canAnnotate: false,
    canManageVersions: false,
  },
  Auditor: {
    canView: true,
    canEdit: false,
    canDownload: true,
    canPrint: true,
    canShare: false,
    canDelete: false,
    canAnnotate: true,
    canManageVersions: false,
  },
}

export const DEFAULT_FEATURE_TOGGLES: SystemFeatureToggles = {
  enableSearch: true,
  enableAnnotations: true,
  enablePrinting: true,
  enableDownloading: true,
  enableSharing: true,
  enableVersionControl: true,
  enableAuditLogs: true,
  enableComparison: true,
  enableFileManagement: true,
  enableSecurityProtection: true,
}

const INITIAL_FOLDERS: FolderItem[] = [
  {
    id: 'fld-finance',
    name: 'Finance & Accounts',
    parentId: null,
    createdDate: '2026-08-10',
    createdBy: 'Admin',
    color: '#10b981',
    isFavorite: true,
    description: 'Corporate quarterly audits, balance sheets, and tax reports',
  },
  {
    id: 'fld-tech',
    name: 'Technical Architecture',
    parentId: null,
    createdDate: '2026-08-15',
    createdBy: 'Super Admin',
    color: '#38bdf8',
    isFavorite: true,
    description: 'System specifications, blueprint designs, and API contracts',
  },
  {
    id: 'fld-sales',
    name: 'Sales & Marketing',
    parentId: null,
    createdDate: '2026-08-20',
    createdBy: 'Manager',
    color: '#f59e0b',
    isFavorite: false,
    description: 'Revenue growth data, customer feedback, and quarterly targets',
  },
  {
    id: 'fld-legal',
    name: 'Legal & Compliance',
    parentId: null,
    createdDate: '2026-09-01',
    createdBy: 'Super Admin',
    color: '#ec4899',
    isFavorite: false,
    description: 'Corporate agreements, enterprise policies, and NDAs',
  },
]

const INITIAL_FILES: FileItem[] = [
  {
    id: 'file-1',
    name: 'Q3_Corporate_Financial_Audit.pdf',
    type: 'pdf',
    size: '4.8 MB',
    sizeBytes: 5033164,
    createdDate: '2026-09-01',
    modifiedDate: '2026-09-10',
    createdBy: 'Laxman Choudhary',
    modifiedBy: 'Audit Lead',
    folderId: 'fld-finance',
    versionNumber: 'v2.1',
    status: 'Approved',
    tags: ['Quarterly', 'Audit', 'Approved', 'Confidential'],
    category: 'Finance',
    description: 'Comprehensive financial audit report detailing Q3 revenue, operating margin, and tax liabilities.',
    remarks: 'Approved by board of directors on September 10, 2026.',
    isFavorite: true,
    isPinned: true,
    isArchived: false,
    isDeleted: false,
    pageCount: 4,
    contentSnippet: 'EXECUTIVE SUMMARY: Total net revenue for Q3 2026 reached $14.2M, representing a 28% YoY expansion across Asia-Pacific and North American markets. Operating margins expanded by 340 bps due to serverless infrastructure optimization.',
    documentPages: [
      {
        pageNumber: 1,
        title: 'Executive Financial Summary & KPI Dashboard',
        text: 'LBM MIRROR ENTERPRISE AUDIT REPORT — Q3 2026\n\nExecutive Overview:\nNet Gross Revenue: $14,280,000 (+28.4% YoY)\nGross Margin: 74.2%\nEBITDA: $4,820,000 (33.7% Margin)\nCash Position: $18,940,000\nActive Enterprise Subscriptions: 14,820\n\nThe company maintained zero long-term debt while scaling high-availability WebRTC and TURN relay clusters worldwide.',
      },
      {
        pageNumber: 2,
        title: 'Segment Revenue Breakdown by Region',
        text: 'Regional Distribution Table:\n- North America: $6,420,000 (45%)\n- Europe & UK: $4,140,000 (29%)\n- Asia Pacific & India: $2,860,000 (20%)\n- Latin America: $860,000 (6%)\n\nInfrastructure expenditures decreased by 18% following deployment of custom WebRTC peer routing algorithms.',
      },
      {
        pageNumber: 3,
        title: 'Capital Expenditure & R&D Allocations',
        text: 'Research and Development Investment:\n- WebRTC 60 FPS Video Compression: $1,250,000\n- Remote Desktop Input Automation Engine: $840,000\n- Enterprise Document & Viewer Security Suite: $620,000\n- High-Speed Relay Infrastructure: $480,000\n\nTotal R&D expenditure represented 22.3% of total operational expenditure for the period.',
      },
      {
        pageNumber: 4,
        title: 'Statutory Compliance, Sign-Off & Verification',
        text: 'Auditor Opinion:\nIn our opinion, the accompanying consolidated financial statements present fairly, in all material respects, the financial position of LBM Mirror as of September 30, 2026.\n\nSigned by Senior Partner, Corporate Audit Services LLP\nAuthorized Signatory: Laxman Choudhary (CEO)',
      },
    ],
    versions: [
      {
        id: 'ver-1-1',
        versionNumber: 'v1.0',
        createdDate: '2026-08-25',
        createdBy: 'Finance Intern',
        remarks: 'Initial draft of preliminary numbers',
        fileSize: '4.2 MB',
      },
      {
        id: 'ver-1-2',
        versionNumber: 'v2.0',
        createdDate: '2026-09-05',
        createdBy: 'Finance Manager',
        remarks: 'Incorporated tax depreciation schedule',
        fileSize: '4.6 MB',
      },
      {
        id: 'ver-1-3',
        versionNumber: 'v2.1',
        createdDate: '2026-09-10',
        createdBy: 'Audit Lead',
        remarks: 'Final signed version with board seal',
        fileSize: '4.8 MB',
      },
    ],
    annotations: [
      {
        id: 'ant-1',
        fileId: 'file-1',
        pageNumber: 1,
        type: 'stamp',
        x: 65,
        y: 12,
        width: 140,
        height: 50,
        stampType: 'APPROVED',
        author: 'Chief Financial Officer',
        createdAt: '2026-09-10 14:30',
      },
      {
        id: 'ant-2',
        fileId: 'file-1',
        pageNumber: 1,
        type: 'highlight',
        x: 10,
        y: 42,
        width: 80,
        height: 5,
        color: '#fef08a',
        author: 'Senior Auditor',
        createdAt: '2026-09-11 11:20',
      },
    ],
  },
  {
    id: 'file-2',
    name: 'LBM_System_Architecture_Spec.docx',
    type: 'docx',
    size: '2.4 MB',
    sizeBytes: 2516582,
    createdDate: '2026-08-18',
    modifiedDate: '2026-09-08',
    createdBy: 'Chief Architect',
    modifiedBy: 'DevOps Lead',
    folderId: 'fld-tech',
    versionNumber: 'v3.0',
    status: 'In Review',
    tags: ['Architecture', 'WebRTC', 'Security', 'Engineering'],
    category: 'Engineering',
    description: 'Detailed technical specification of LBM Mirror zero-latency streaming and native Windows user32 input agent.',
    remarks: 'Pending security team validation of user32 sendInput bypass constraints.',
    isFavorite: true,
    isPinned: false,
    isArchived: false,
    isDeleted: false,
    pageCount: 3,
    contentSnippet: 'TECHNICAL ARCHITECTURE: PeerJS connection broker routes WebRTC signaling across global STUN and dual-port OpenRelay TURN servers. Input bridge executes low-level mouse_event and keybd_event with <0.1ms dispatch latency.',
    documentPages: [
      {
        pageNumber: 1,
        title: 'Core Engine & Signaling Architecture',
        text: '1. PROTOCOL OVERVIEW\nLBM Mirror utilizes WebRTC DataChannels for bi-directional binary control transport and MediaStream tracks for 60 FPS desktop capture.\n\nKey Modules:\n- PeerService: Manages PeerJS signaling and auto-reconnect.\n- WebRtcService: Captures physical displays at 1080p60.\n- RemoteInputBridge: PowerShell child process communicating over stdio to user32.dll.\n- SecurityGateway: PIN & Passcode authentication handshake.',
      },
      {
        pageNumber: 2,
        title: 'Input Bridge & Latency Benchmarks',
        text: '2. INPUT DISPATCH BENCHMARKS\n- Local dispatch latency: 0.12 ms\n- WebRTC data channel transit: 14.8 ms (same region)\n- Frame rendering pipeline: 16.6 ms (60 FPS)\n- End-to-end user input to display response: < 35 ms\n\nSecurity Architecture:\n- Passcode hashed with salt on signaling broker\n- DataChannels encrypted with DTLS 1.3\n- Automatic session timeout after 30 minutes of inactivity',
      },
      {
        pageNumber: 3,
        title: 'Deployment & CI/CD Pipeline',
        text: '3. INFRASTRUCTURE & RELEASES\n- Frontend: React 19 + TypeScript + Vite Bundler\n- Desktop: Electron 44.2 + NSIS Installer\n- Cloud CDN: Vercel Global Edge Network\n- TURN Relay: Metered OpenRelay TCP/UDP Port 80 & 443',
      },
    ],
    versions: [
      {
        id: 'ver-2-1',
        versionNumber: 'v1.0',
        createdDate: '2026-08-18',
        createdBy: 'Chief Architect',
        remarks: 'Initial architectural draft',
        fileSize: '1.8 MB',
      },
      {
        id: 'ver-2-2',
        versionNumber: 'v2.0',
        createdDate: '2026-08-30',
        createdBy: 'DevOps Lead',
        remarks: 'Added TURN failover topology',
        fileSize: '2.2 MB',
      },
      {
        id: 'ver-2-3',
        versionNumber: 'v3.0',
        createdDate: '2026-09-08',
        createdBy: 'DevOps Lead',
        remarks: 'Current working revision with input agent',
        fileSize: '2.4 MB',
      },
    ],
    annotations: [],
  },
  {
    id: 'file-3',
    name: 'Global_Sales_Revenue_Analysis.xlsx',
    type: 'xlsx',
    size: '1.6 MB',
    sizeBytes: 1677721,
    createdDate: '2026-09-02',
    modifiedDate: '2026-09-11',
    createdBy: 'Sales Director',
    modifiedBy: 'Sales Director',
    folderId: 'fld-sales',
    versionNumber: 'v1.4',
    status: 'Approved',
    tags: ['Sales', 'Quarterly', 'Excel', 'Revenue'],
    category: 'Sales',
    description: 'Quarterly sales numbers by enterprise tier, conversion rates, and churn metrics.',
    remarks: 'Updated with latest enterprise contract wins.',
    isFavorite: false,
    isPinned: false,
    isArchived: false,
    isDeleted: false,
    pageCount: 1,
    contentSnippet: 'SALES SPREADSHEET: Enterprise licenses generated $8.4M. Small-medium business licenses grew 44% with average ACV of $4,800/yr.',
    tabularData: {
      headers: ['Tier / Plan', 'Active Accounts', 'Monthly Recurring ($)', 'Annual ARR ($)', 'Renewal Rate', 'Status'],
      rows: [
        ['Enterprise Elite (Unlimited)', '420', '$420,000', '$5,040,000', '98.4%', 'Active'],
        ['Pro Multi-Screen (10 PCs)', '1,850', '$370,000', '$4,440,000', '94.2%', 'Active'],
        ['Standard Desktop (3 PCs)', '4,600', '$230,000', '$2,760,000', '89.1%', 'Active'],
        ['Education & Non-Profit', '840', '$42,000', '$504,000', '96.0%', 'Active'],
        ['Custom OEM White-Label', '12', '$128,000', '$1,536,000', '100%', 'Contracted'],
        ['TOTAL CONSOLIDATED', '7,722', '$1,190,000', '$14,280,000', '95.5%', 'Verified'],
      ],
    },
    versions: [
      {
        id: 'ver-3-1',
        versionNumber: 'v1.0',
        createdDate: '2026-09-02',
        createdBy: 'Sales Director',
        remarks: 'Initial Q3 consolidated workbook',
        fileSize: '1.4 MB',
      },
      {
        id: 'ver-3-2',
        versionNumber: 'v1.4',
        createdDate: '2026-09-11',
        createdBy: 'Sales Director',
        remarks: 'Added OEM white-label account rows',
        fileSize: '1.6 MB',
      },
    ],
    annotations: [],
  },
  {
    id: 'file-4',
    name: 'Product_Design_Blueprint_2026.png',
    type: 'png',
    size: '3.2 MB',
    sizeBytes: 3355443,
    createdDate: '2026-08-28',
    modifiedDate: '2026-09-04',
    createdBy: 'Lead Designer',
    modifiedBy: 'Lead Designer',
    folderId: 'fld-tech',
    versionNumber: 'v1.2',
    status: 'Approved',
    tags: ['Design', 'Blueprint', 'UI', 'Schematic'],
    category: 'Design',
    description: 'High-resolution architectural schematic diagram showing dual-monitor mirroring pipelines.',
    remarks: 'Approved for hardware acceleration benchmarks.',
    isFavorite: false,
    isPinned: false,
    isArchived: false,
    isDeleted: false,
    pageCount: 1,
    contentSnippet: 'HIGH-RESOLUTION SYSTEM SCHEMATIC: Diagram of Host GPU capture engine feeding low-latency VP9 hardware encoder.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&auto=format&fit=crop&q=80',
    versions: [
      {
        id: 'ver-4-1',
        versionNumber: 'v1.0',
        createdDate: '2026-08-28',
        createdBy: 'Lead Designer',
        remarks: 'Initial blueprint export',
        fileSize: '3.0 MB',
      },
    ],
    annotations: [],
  },
  {
    id: 'file-5',
    name: 'Customer_Feedback_Dataset.csv',
    type: 'csv',
    size: '720 KB',
    sizeBytes: 737280,
    createdDate: '2026-09-06',
    modifiedDate: '2026-09-10',
    createdBy: 'Support Lead',
    modifiedBy: 'Support Lead',
    folderId: 'fld-sales',
    versionNumber: 'v1.0',
    status: 'In Review',
    tags: ['Feedback', 'Support', 'CSV', 'Customer Care'],
    category: 'Support',
    description: 'Real-world customer ratings, latency reports, and feature requests for Windows remote control.',
    remarks: 'Extracted from 2,400 user survey responses.',
    isFavorite: false,
    isPinned: false,
    isArchived: false,
    isDeleted: false,
    pageCount: 1,
    tabularData: {
      headers: ['Feedback ID', 'Customer Name', 'Platform', 'Rating (1-5)', 'Reported Latency', 'Comment / Request'],
      rows: [
        ['FB-101', 'Rajesh Sharma', 'Windows 11', '5 / 5', '18 ms', 'UltraViewer mode connected in 1 click across city. Super smooth!'],
        ['FB-102', 'Elena Rostova', 'Windows 10', '5 / 5', '24 ms', 'Mouse drag and keyboard typing works without any lag.'],
        ['FB-103', 'Vikram Patel', 'Windows 11', '4 / 5', '32 ms', 'Love the Win and Alt+Tab shortcuts bar.'],
        ['FB-104', 'David Miller', 'Windows 11', '5 / 5', '19 ms', 'Connected from home Wi-Fi to office hotspot seamlessly.'],
        ['FB-105', 'Anita Desai', 'Windows 10', '5 / 5', '16 ms', 'Document viewer and full screen workspace are wonderful additions.'],
      ],
    },
    versions: [
      {
        id: 'ver-5-1',
        versionNumber: 'v1.0',
        createdDate: '2026-09-06',
        createdBy: 'Support Lead',
        remarks: 'Weekly user feedback aggregation',
        fileSize: '720 KB',
      },
    ],
    annotations: [],
  },
  {
    id: 'file-6',
    name: 'Enterprise_Security_Policy.txt',
    type: 'txt',
    size: '140 KB',
    sizeBytes: 143360,
    createdDate: '2026-08-01',
    modifiedDate: '2026-09-01',
    createdBy: 'Security Officer',
    modifiedBy: 'Security Officer',
    folderId: 'fld-legal',
    versionNumber: 'v4.0',
    status: 'Confidential',
    tags: ['Security', 'Compliance', 'Confidential', 'Policy'],
    category: 'Compliance',
    description: 'Mandatory corporate data governance, encryption standards, and remote access hygiene guidelines.',
    remarks: 'Annual audit mandatory for all users with Admin role.',
    isFavorite: false,
    isPinned: false,
    isArchived: false,
    isDeleted: false,
    pageCount: 2,
    documentPages: [
      {
        pageNumber: 1,
        title: 'Data Governance & Encryption Standards',
        text: 'LBM MIRROR CONFIDENTIAL SECURITY DIRECTIVE\n\n1. AUTHENTICATION & ACCESS CONTROL\nAll operators accessing remote computing infrastructure must maintain a minimum 4-digit randomized dynamic passcode. Sessions will automatically terminate after 30 minutes of operator inactivity.\n\n2. ENCRYPTION SPECIFICATIONS\n- WebRTC payload: DTLS-SRTP AES-GCM-256\n- DataChannels: SCTP over DTLS 1.3\n- Static Assets: TLS 1.3 with HSTS enabled',
      },
      {
        pageNumber: 2,
        title: 'Audit Logging & Compliance Enforcement',
        text: '3. ACTIVITY AUDIT TRAILS\nAll file downloads, document exports, print executions, and remote connection handshakes are permanently recorded in non-repudiable audit logs.\n\n4. PENALTIES FOR UNAUTHORIZED EXPORT\nAny unauthorized extraction or printing of Confidential files will result in immediate role suspension and audit escalation.\n\nApproved: Corporate Security Review Board',
      },
    ],
    versions: [
      {
        id: 'ver-6-1',
        versionNumber: 'v4.0',
        createdDate: '2026-09-01',
        createdBy: 'Security Officer',
        remarks: 'Annual update incorporating remote viewer guidelines',
        fileSize: '140 KB',
      },
    ],
    annotations: [
      {
        id: 'ant-6-1',
        fileId: 'file-6',
        pageNumber: 1,
        type: 'stamp',
        x: 60,
        y: 10,
        width: 160,
        height: 50,
        stampType: 'CONFIDENTIAL',
        author: 'Security Officer',
        createdAt: '2026-09-01 09:00',
      },
    ],
  },
]

const INITIAL_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: 'log-1',
    fileId: 'file-1',
    fileName: 'Q3_Corporate_Financial_Audit.pdf',
    action: 'File Viewed',
    userName: 'Laxman Choudhary',
    timestamp: '2026-09-12 10:14:22',
    ipAddress: '192.168.1.45',
    deviceInfo: 'Windows 11 • Chrome 128.0',
    details: 'Reviewed Pages 1-4 with 100% Zoom',
  },
  {
    id: 'log-2',
    fileId: 'file-1',
    fileName: 'Q3_Corporate_Financial_Audit.pdf',
    action: 'Annotation Added',
    userName: 'Chief Financial Officer',
    timestamp: '2026-09-10 14:30:11',
    ipAddress: '192.168.1.18',
    deviceInfo: 'Windows 11 • LBM Mirror Desktop',
    details: 'Applied APPROVED stamp on Page 1',
  },
  {
    id: 'log-3',
    fileId: 'file-2',
    fileName: 'LBM_System_Architecture_Spec.docx',
    action: 'Version Created',
    userName: 'DevOps Lead',
    timestamp: '2026-09-08 17:45:00',
    ipAddress: '10.0.4.12',
    deviceInfo: 'Windows 10 • Desktop App',
    details: 'Promoted specification to v3.0',
  },
  {
    id: 'log-4',
    fileId: 'file-3',
    fileName: 'Global_Sales_Revenue_Analysis.xlsx',
    action: 'File Downloaded',
    userName: 'Sales Director',
    timestamp: '2026-09-11 16:20:44',
    ipAddress: '192.168.1.88',
    deviceInfo: 'Windows 11 • Edge 128.0',
    details: 'Downloaded copy as Excel Workbook',
  },
]

class ViewerStorageService {
  private files: FileItem[] = []
  private folders: FolderItem[] = []
  private auditLogs: AuditLogItem[] = []
  private currentRole: UserRole = 'Super Admin'
  private featureToggles: SystemFeatureToggles = { ...DEFAULT_FEATURE_TOGGLES }

  constructor() {
    this.init()
  }

  private init() {
    try {
      const storedFiles = localStorage.getItem(STORAGE_KEY_FILES)
      if (storedFiles) {
        this.files = JSON.parse(storedFiles)
      } else {
        this.files = [...INITIAL_FILES]
        this.saveFiles()
      }

      const storedFolders = localStorage.getItem(STORAGE_KEY_FOLDERS)
      if (storedFolders) {
        this.folders = JSON.parse(storedFolders)
      } else {
        this.folders = [...INITIAL_FOLDERS]
        this.saveFolders()
      }

      const storedAudit = localStorage.getItem(STORAGE_KEY_AUDIT)
      if (storedAudit) {
        this.auditLogs = JSON.parse(storedAudit)
      } else {
        this.auditLogs = [...INITIAL_AUDIT_LOGS]
        this.saveAudit()
      }

      const storedRole = localStorage.getItem(STORAGE_KEY_ROLE)
      if (storedRole) {
        this.currentRole = storedRole as UserRole
      }

      const storedToggles = localStorage.getItem(STORAGE_KEY_TOGGLES)
      if (storedToggles) {
        this.featureToggles = { ...DEFAULT_FEATURE_TOGGLES, ...JSON.parse(storedToggles) }
      }
    } catch (err) {
      console.warn('[ViewerStorageService] Error loading local storage:', err)
      this.files = [...INITIAL_FILES]
      this.folders = [...INITIAL_FOLDERS]
      this.auditLogs = [...INITIAL_AUDIT_LOGS]
    }
  }

  private saveFiles() {
    try {
      localStorage.setItem(STORAGE_KEY_FILES, JSON.stringify(this.files))
    } catch {}
  }

  private saveFolders() {
    try {
      localStorage.setItem(STORAGE_KEY_FOLDERS, JSON.stringify(this.folders))
    } catch {}
  }

  private saveAudit() {
    try {
      localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify(this.auditLogs))
    } catch {}
  }

  // ─── File CRUD ─────────────────────────────────────────────────────────────
  getFiles(includeDeleted = false): FileItem[] {
    return this.files.filter((f) => (includeDeleted ? f.isDeleted : !f.isDeleted))
  }

  getFileById(id: string): FileItem | undefined {
    return this.files.find((f) => f.id === id)
  }

  addFile(file: Omit<FileItem, 'id' | 'createdDate' | 'modifiedDate' | 'versions' | 'annotations'>): FileItem {
    const now = new Date().toISOString().split('T')[0]
    const newFile: FileItem = {
      ...file,
      id: `file-${Date.now()}`,
      createdDate: now,
      modifiedDate: now,
      versions: [
        {
          id: `ver-${Date.now()}`,
          versionNumber: file.versionNumber || 'v1.0',
          createdDate: now,
          createdBy: file.createdBy || 'Current User',
          remarks: 'Initial upload',
          fileSize: file.size,
        },
      ],
      annotations: [],
    }

    this.files.unshift(newFile)
    this.saveFiles()
    this.logAction(newFile.id, newFile.name, 'File Edited', `Created and uploaded file: ${newFile.name}`)
    return newFile
  }

  updateFile(id: string, updates: Partial<FileItem>): FileItem | null {
    const idx = this.files.findIndex((f) => f.id === id)
    if (idx === -1) return null

    const oldFile = this.files[idx]
    const updatedFile: FileItem = {
      ...oldFile,
      ...updates,
      modifiedDate: new Date().toISOString().split('T')[0],
    }

    this.files[idx] = updatedFile
    this.saveFiles()
    return updatedFile
  }

  renameFile(id: string, newName: string): boolean {
    const file = this.getFileById(id)
    if (!file) return false

    const oldName = file.name
    file.name = newName.trim()
    file.modifiedDate = new Date().toISOString().split('T')[0]
    this.saveFiles()
    this.logAction(id, file.name, 'File Renamed', `Renamed from "${oldName}" to "${file.name}"`)
    return true
  }

  moveFile(id: string, targetFolderId: string): boolean {
    const file = this.getFileById(id)
    if (!file) return false

    file.folderId = targetFolderId
    file.modifiedDate = new Date().toISOString().split('T')[0]
    this.saveFiles()
    this.logAction(id, file.name, 'File Moved', `Moved to folder ID: ${targetFolderId}`)
    return true
  }

  duplicateFile(id: string): FileItem | null {
    const original = this.getFileById(id)
    if (!original) return null

    const now = new Date().toISOString().split('T')[0]
    const copy: FileItem = {
      ...original,
      id: `file-${Date.now()}`,
      name: `Copy of ${original.name}`,
      createdDate: now,
      modifiedDate: now,
      createdBy: 'Current User',
      isFavorite: false,
      isPinned: false,
      versions: [
        {
          id: `ver-${Date.now()}`,
          versionNumber: 'v1.0',
          createdDate: now,
          createdBy: 'Current User',
          remarks: `Duplicated from ${original.name}`,
          fileSize: original.size,
        },
      ],
      annotations: [],
    }

    this.files.unshift(copy)
    this.saveFiles()
    this.logAction(copy.id, copy.name, 'File Edited', `Duplicated from "${original.name}"`)
    return copy
  }

  deleteFile(id: string, permanent = false): boolean {
    const idx = this.files.findIndex((f) => f.id === id)
    if (idx === -1) return false

    const file = this.files[idx]
    if (permanent) {
      this.files.splice(idx, 1)
      this.saveFiles()
      this.logAction(id, file.name, 'File Deleted', `Permanently deleted from recycle bin`)
    } else {
      file.isDeleted = true
      file.deletedDate = new Date().toISOString()
      this.saveFiles()
      this.logAction(id, file.name, 'File Deleted', `Moved to Recycle Bin`)
    }
    return true
  }

  restoreFile(id: string): boolean {
    const file = this.getFileById(id)
    if (!file) return false

    file.isDeleted = false
    file.deletedDate = undefined
    this.saveFiles()
    this.logAction(id, file.name, 'File Restored', `Restored from Recycle Bin`)
    return true
  }

  addVersion(fileId: string, versionNumber: string, remarks: string, newSize?: string): FileVersion | null {
    const file = this.getFileById(fileId)
    if (!file) return null

    const now = new Date().toISOString().split('T')[0]
    const newVer: FileVersion = {
      id: `ver-${Date.now()}`,
      versionNumber: versionNumber.trim(),
      createdDate: now,
      createdBy: 'Current User',
      remarks: remarks.trim(),
      fileSize: newSize || file.size,
    }

    file.versionNumber = newVer.versionNumber
    file.modifiedDate = now
    file.versions.unshift(newVer)
    this.saveFiles()
    this.logAction(file.id, file.name, 'Version Created', `Created version ${newVer.versionNumber}: ${remarks}`)
    return newVer
  }

  saveAnnotations(fileId: string, annotations: Annotation[]): boolean {
    const file = this.getFileById(fileId)
    if (!file) return false

    file.annotations = [...annotations]
    this.saveFiles()
    this.logAction(file.id, file.name, 'Annotation Added', `Saved ${annotations.length} annotations`)
    return true
  }

  toggleFavorite(fileId: string): boolean {
    const file = this.getFileById(fileId)
    if (!file) return false

    file.isFavorite = !file.isFavorite
    this.saveFiles()
    return file.isFavorite
  }

  // ─── Folder CRUD ───────────────────────────────────────────────────────────
  getFolders(): FolderItem[] {
    return this.folders
  }

  addFolder(name: string, parentId: string | null = null, color = '#38bdf8'): FolderItem {
    const newFolder: FolderItem = {
      id: `fld-${Date.now()}`,
      name: name.trim(),
      parentId,
      createdDate: new Date().toISOString().split('T')[0],
      createdBy: 'Current User',
      color,
      isFavorite: false,
    }

    this.folders.push(newFolder)
    this.saveFolders()
    return newFolder
  }

  renameFolder(id: string, name: string): boolean {
    const fld = this.folders.find((f) => f.id === id)
    if (!fld) return false
    fld.name = name.trim()
    this.saveFolders()
    return true
  }

  deleteFolder(id: string): boolean {
    const idx = this.folders.findIndex((f) => f.id === id)
    if (idx === -1) return false
    this.folders.splice(idx, 1)
    this.saveFolders()
    return true
  }

  // ─── Audit Trail ───────────────────────────────────────────────────────────
  getAuditLogs(): AuditLogItem[] {
    return this.auditLogs
  }

  logAction(
    fileId: string,
    fileName: string,
    action: AuditLogItem['action'],
    details = ''
  ): AuditLogItem {
    const now = new Date()
    const timeStr = `${now.toISOString().split('T')[0]} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`

    const log: AuditLogItem = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      fileId,
      fileName,
      action,
      userName: 'Current User',
      timestamp: timeStr,
      ipAddress: '192.168.1.102',
      deviceInfo: navigator.userAgent.includes('Windows') ? 'Windows 11 • LBM Mirror' : 'Desktop Browser',
      details,
    }

    this.auditLogs.unshift(log)
    if (this.auditLogs.length > 500) {
      this.auditLogs = this.auditLogs.slice(0, 500)
    }
    this.saveAudit()
    return log
  }

  // ─── Role & Permissions ───────────────────────────────────────────────────
  getCurrentRole(): UserRole {
    return this.currentRole
  }

  setCurrentRole(role: UserRole) {
    this.currentRole = role
    try {
      localStorage.setItem(STORAGE_KEY_ROLE, role)
    } catch {}
  }

  getPermissionsForRole(role: UserRole = this.currentRole): ViewerPermissions {
    return DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.Viewer
  }

  getFeatureToggles(): SystemFeatureToggles {
    return this.featureToggles
  }

  updateFeatureToggles(toggles: Partial<SystemFeatureToggles>) {
    this.featureToggles = { ...this.featureToggles, ...toggles }
    try {
      localStorage.setItem(STORAGE_KEY_TOGGLES, JSON.stringify(this.featureToggles))
    } catch {}
  }
}

export const defaultViewerStorage = new ViewerStorageService()
