import type { WebConfig } from '../../types/gatus'

interface Props {
  value: WebConfig
  onChange: (v: WebConfig) => void
}

export function WebForm({ value, onChange }: Props) {
  const set = (patch: Partial<WebConfig>) => onChange({ ...value, ...patch })

  return (
    <div className="space-y-4">
      <h2 className="section-title">Web Server</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Listen Address</label>
          <input
            className="input"
            placeholder="0.0.0.0"
            value={value.address ?? ''}
            onChange={(e) => set({ address: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Port</label>
          <input
            type="number"
            className="input"
            placeholder="8080"
            value={value.port ?? ''}
            onChange={(e) => set({ port: parseInt(e.target.value) || undefined })}
          />
        </div>
        <div>
          <label className="label">Read Buffer Size (bytes)</label>
          <input
            type="number"
            className="input"
            placeholder="8192"
            value={value['read-buffer-size'] ?? ''}
            onChange={(e) => set({ 'read-buffer-size': parseInt(e.target.value) || undefined })}
          />
        </div>
      </div>
      <div className="border rounded-md p-4 space-y-3">
        <h3 className="text-sm font-medium text-gray-700">TLS (optional)</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Certificate File (PEM)</label>
            <input
              className="input"
              placeholder="/certs/cert.pem"
              value={value.tls?.['certificate-file'] ?? ''}
              onChange={(e) => set({ tls: { ...value.tls, 'certificate-file': e.target.value } })}
            />
          </div>
          <div>
            <label className="label">Private Key File (PEM)</label>
            <input
              className="input"
              placeholder="/certs/key.pem"
              value={value.tls?.['private-key-file'] ?? ''}
              onChange={(e) => set({ tls: { ...value.tls, 'private-key-file': e.target.value } })}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
