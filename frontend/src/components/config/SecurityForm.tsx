import type { SecurityConfig } from '../../types/gatus'

interface Props {
  value: SecurityConfig
  onChange: (v: SecurityConfig) => void
}

export function SecurityForm({ value, onChange }: Props) {
  const setBasic = (patch: Partial<SecurityConfig['basic']>) =>
    onChange({ ...value, basic: { ...value.basic, ...patch } })
  const setOidc = (patch: Partial<SecurityConfig['oidc']>) =>
    onChange({ ...value, oidc: { ...value.oidc, ...patch } })

  return (
    <div className="space-y-6">
      <h2 className="section-title">Security</h2>

      <div className="border rounded-md p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Basic Authentication</h3>
        <p className="text-xs text-gray-500">Password must be a bcrypt hash, base64-encoded.</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Username</label>
            <input className="input" value={value.basic?.username ?? ''} onChange={(e) => setBasic({ username: e.target.value })} />
          </div>
          <div>
            <label className="label">Password (bcrypt hash, base64)</label>
            <input type="password" className="input" value={value.basic?.['password-bcrypt-hash-base64-encoded'] ?? ''} onChange={(e) => setBasic({ 'password-bcrypt-hash-base64-encoded': e.target.value })} placeholder="Base64-encoded bcrypt hash" />
          </div>
        </div>
      </div>

      <div className="border rounded-md p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">OIDC Authentication</h3>
        <p className="text-xs text-gray-500">Configure if you want OpenID Connect / OAuth2 login.</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Issuer URL</label>
            <input className="input" placeholder="https://accounts.google.com" value={value.oidc?.['issuer-url'] ?? ''} onChange={(e) => setOidc({ 'issuer-url': e.target.value })} />
          </div>
          <div>
            <label className="label">Client ID</label>
            <input className="input" value={value.oidc?.['client-id'] ?? ''} onChange={(e) => setOidc({ 'client-id': e.target.value })} />
          </div>
          <div>
            <label className="label">Client Secret</label>
            <input type="password" className="input" value={value.oidc?.['client-secret'] ?? ''} onChange={(e) => setOidc({ 'client-secret': e.target.value })} />
          </div>
          <div>
            <label className="label">Redirect URL</label>
            <input className="input" placeholder="https://status.example.com/authorization-code/callback" value={value.oidc?.['redirect-url'] ?? ''} onChange={(e) => setOidc({ 'redirect-url': e.target.value })} />
          </div>
        </div>
      </div>
    </div>
  )
}
