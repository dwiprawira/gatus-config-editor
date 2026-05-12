import { useCallback, useEffect, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import { Save, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { validateConfig, saveConfig } from '../../api/config'
import { ValidationPanel } from '../ui/ValidationPanel'
import type { ValidationResult } from '../../api/types'
import { useDirty } from '../../hooks/useDirty'

interface Props {
  filename: string
  initialContent: string
  onChange?: (content: string) => void
  onSaved: (content: string) => void
}

export function RawYamlEditor({ filename, initialContent, onChange, onSaved }: Props) {
  const [content, setContent] = useState(initialContent)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [validating, setValidating] = useState(false)
  const [saving, setSaving] = useState(false)
  const { dirty, markClean } = useDirty(content)

  // Keep a ref so the keyboard handler always sees fresh content
  const contentRef = useRef(content)
  useEffect(() => { contentRef.current = content }, [content])
  useEffect(() => {
    if (!dirty) {
      setContent(initialContent)
      markClean(initialContent)
    }
  }, [dirty, initialContent, markClean])

  const handleSave = useCallback(async (force = false) => {
    setSaving(true)
    try {
      await saveConfig(filename, contentRef.current, force)
      onSaved(contentRef.current)
      markClean(contentRef.current)
      toast.success('Saved')
      const res = await validateConfig(contentRef.current)
      setValidation(res.data)
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
      if (typeof detail === 'object' && detail !== null && 'errors' in detail) {
        toast.error('Validation failed — use Force Save to override')
      } else {
        toast.error(String(detail) || 'Save failed')
      }
    } finally {
      setSaving(false)
    }
  }, [filename, markClean, onSaved])

  const handleValidate = async () => {
    setValidating(true)
    try {
      const res = await validateConfig(content)
      setValidation(res.data)
      if (res.data.valid) toast.success('Config is valid')
      else toast.error(`${res.data.errors.length} validation error(s)`)
    } catch {
      toast.error('Validation request failed')
    } finally {
      setValidating(false)
    }
  }

  // Ctrl+S / Cmd+S → save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        void handleSave(false)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [handleSave])

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-gray-700 font-mono">{filename}</span>
        {dirty && (
          <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded">Unsaved changes</span>
        )}
        <div className="ml-auto flex gap-2">
          <button className="btn-secondary text-sm" onClick={handleValidate} disabled={validating}>
            <CheckCircle className="h-4 w-4" />
            {validating ? 'Validating…' : 'Validate'}
          </button>
          <button className="btn-secondary text-sm" onClick={() => void handleSave(true)}>
            Force Save
          </button>
          <button className="btn-primary text-sm" onClick={() => void handleSave(false)} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
        Advanced mode — editing raw YAML. The form editor is the recommended interface.
        Ctrl+S / Cmd+S to save.
      </p>

      {validation && <ValidationPanel result={validation} />}

      <div className="flex-1 min-h-0 border rounded-md overflow-hidden">
        <Editor
          language="yaml"
          value={content}
          onChange={(v) => {
            const next = v ?? ''
            setContent(next)
            onChange?.(next)
          }}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: 2,
            insertSpaces: true,
            renderWhitespace: 'boundary',
          }}
          height="100%"
        />
      </div>
    </div>
  )
}
