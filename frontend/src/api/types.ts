export interface UserInfo {
  username: string
  csrf_token?: string
}

export interface LoginResponse {
  username: string
  message: string
  csrf_token: string
}

export interface ConfigFileSummary {
  name: string
  path: string
  size_bytes: number
  last_modified: number
}

export interface ConfigContent {
  name: string
  path: string
  content: string
}

export interface ValidationIssue {
  field: string
  message: string
  severity: 'error' | 'warning'
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
  native_validation_available: boolean
  native_validation_note: string
}

export interface BackupMeta {
  id: string
  original: string
  backup: string
  timestamp: string
  user: string
  sha256: string
  exists: boolean
}

export interface BackupContent {
  id: string
  content: string
  meta: BackupMeta
}

export interface DiffResponse {
  diff: string
  old_content: string
  new_content: string
  backup_id: string
  target_file: string
}

export interface GatusStatus {
  name: string
  container_id: string
  status: string
  image: string
  started_at: string | null
  health: string | null
  docker_available: boolean
  error?: string
}

export interface RestartResponse {
  success: boolean
  status: GatusStatus
  message: string
}

export interface LogsResponse {
  logs: string
  container_name: string
}
