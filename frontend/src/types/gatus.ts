// Gatus configuration TypeScript types (mirrors the YAML schema)

export interface EndpointUI {
  'hide-url'?: boolean
  badge?: { 'response-time'?: number[] }
}

export interface DNSConfig {
  'query-name': string
  'query-type': string
}

export interface SSHConfig {
  username?: string
  password?: string
  'private-key'?: string
}

export interface OAuth2Config {
  'token-url': string
  'client-id': string
  'client-secret': string
  scopes?: string[]
}

export interface TLSConfig {
  'certificate-file'?: string
  'private-key-file'?: string
}

export interface ClientConfig {
  timeout?: string
  insecure?: boolean
  'ignore-redirect'?: boolean
  'dns-resolver'?: string
  'proxy-url'?: string
  network?: string
  oauth2?: OAuth2Config
  tls?: TLSConfig
  tunnel?: string
}

export interface Alert {
  type: string
  enabled?: boolean
  'failure-threshold'?: number
  'success-threshold'?: number
  'minimum-reminder-interval'?: string
  description?: string
  'send-on-resolved'?: boolean
  'provider-override'?: Record<string, unknown>
}

export interface MaintenanceWindow {
  enabled?: boolean
  start?: string
  duration?: string
  timezone?: string
  every?: string[]
}

export interface Endpoint {
  name: string
  group?: string
  url: string
  method?: string
  body?: string
  graphql?: boolean
  headers?: Record<string, string>
  'extra-labels'?: Record<string, string>
  interval?: string
  enabled?: boolean
  conditions?: string[]
  alerts?: Alert[]
  'maintenance-windows'?: MaintenanceWindow[]
  dns?: DNSConfig
  ssh?: SSHConfig
  client?: ClientConfig
  ui?: EndpointUI
  // suite-specific
  store?: Record<string, string>
  'always-run'?: boolean
}

export interface ExternalEndpoint {
  name: string
  token?: string
  heartbeat?: { interval?: string }
}

export interface SuiteStep extends Endpoint {}

export interface Suite {
  name: string
  interval?: string
  context?: Record<string, string>
  endpoints?: SuiteStep[]
}

export interface AlertingProviderBase {
  'default-alert'?: Partial<Alert>
  overrides?: Array<{ group: string; [key: string]: unknown }>
}

export interface SlackProvider extends AlertingProviderBase {
  'webhook-url': string
  title?: string
}

export type AlertingConfig = Record<string, AlertingProviderBase & Record<string, unknown>>

export interface StorageConfig {
  type?: 'memory' | 'sqlite' | 'postgres'
  path?: string
  caching?: boolean
  'maximum-number-of-results'?: number
  'maximum-number-of-events'?: number
}

export interface WebConfig {
  address?: string
  port?: number
  'read-buffer-size'?: number
  tls?: TLSConfig
}

export interface UIButton {
  name: string
  link: string
}

export interface FaviconConfig {
  default?: string
  '16x16'?: string
  '32x32'?: string
}

export interface UIConfig {
  title?: string
  description?: string
  header?: string
  'dashboard-heading'?: string
  'dashboard-subheading'?: string
  'login-subtitle'?: string
  logo?: string
  link?: string
  favicon?: FaviconConfig
  'custom-css'?: string
  'dark-mode'?: boolean
  buttons?: UIButton[]
  'default-sort-by'?: 'name' | 'group' | 'health'
  'default-filter-by'?: 'none' | 'failing' | 'unstable'
}

export interface BasicSecurityConfig {
  username?: string
  'password-bcrypt-hash-base64-encoded'?: string
}

export interface OIDCConfig {
  'issuer-url'?: string
  'client-id'?: string
  'client-secret'?: string
  'redirect-url'?: string
  scopes?: string[]
}

export interface SecurityConfig {
  basic?: BasicSecurityConfig
  oidc?: OIDCConfig
}

export interface ConnectivityChecker {
  target?: string
  interval?: string
}

export interface ConnectivityConfig {
  checker?: ConnectivityChecker
}

export interface RemoteInstance {
  'endpoint-prefix': string
  url: string
}

export interface RemoteConfig {
  instances?: RemoteInstance[]
  client?: ClientConfig
}

export interface Announcement {
  timestamp?: string
  type?: 'outage' | 'warning' | 'information' | 'operational' | 'none'
  message: string
  archived?: boolean
}

export interface GatusConfig {
  debug?: boolean
  metrics?: boolean
  'skip-invalid-config-update'?: boolean
  'disable-monitoring-lock'?: boolean
  concurrency?: number
  endpoints?: Endpoint[]
  'external-endpoints'?: ExternalEndpoint[]
  suites?: Suite[]
  alerting?: AlertingConfig
  storage?: StorageConfig
  web?: WebConfig
  ui?: UIConfig
  security?: SecurityConfig
  maintenance?: MaintenanceWindow
  remote?: RemoteConfig
  connectivity?: ConnectivityConfig
  tunneling?: Record<string, unknown>
  announcements?: Announcement[]
  [key: string]: unknown  // preserve unknown fields
}
