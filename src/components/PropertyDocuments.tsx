import { useEffect, useState, type ChangeEvent } from 'react'
import { supabase, DOCUMENTS_BUCKET } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Agent, PropertyDocument } from '../lib/types'

export const DOCUMENT_TYPES = [
  'Title (TCT / OCT)',
  'Tax Declaration',
  'Survey / Lot Plan',
  'Technical Description',
  'Authority to Sell',
  'Deed of Sale',
  'Tax Clearance',
  'Owner ID',
  'Other',
]

function safeFileName(name: string) {
  const dot = name.lastIndexOf('.')
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60)
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : ''
  return `${base || 'document'}${ext ? `.${ext}` : ''}`
}

interface Props {
  propertyId: string
  agentsById?: Record<string, Agent>
}

// Title scans and other legal papers of one listing. Only rendered for admins, and the database
// and storage rules also refuse everyone else, so nothing leaks even if this is shown by mistake.
export default function PropertyDocuments({ propertyId, agentsById }: Props) {
  const { agent } = useAuth()
  const [docs, setDocs] = useState<PropertyDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [docType, setDocType] = useState(DOCUMENT_TYPES[0])
  const [notes, setNotes] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('property_documents')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })
      .then(({ data, error: loadError }) => {
        if (cancelled) return
        if (loadError) setError(loadError.message)
        setDocs(data ?? [])
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [propertyId])

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    setError(null)
    const added: PropertyDocument[] = []
    for (const file of Array.from(files)) {
      const path = `${propertyId}/${Date.now()}-${safeFileName(file.name)}`
      const { error: uploadError } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(path, file, {
        contentType: file.type || 'application/octet-stream',
      })
      if (uploadError) {
        setError(`Upload of ${file.name} failed: ${uploadError.message}`)
        continue
      }
      const { data, error: insertError } = await supabase
        .from('property_documents')
        .insert({
          property_id: propertyId,
          doc_type: docType,
          file_path: path,
          file_name: file.name,
          notes: notes.trim() || null,
          uploaded_by: agent?.id ?? null,
        })
        .select()
        .single()
      if (insertError || !data) {
        // Keep storage and list in sync: remove the file again if it could not be registered.
        await supabase.storage.from(DOCUMENTS_BUCKET).remove([path])
        setError(`Saving ${file.name} failed: ${insertError?.message ?? 'unknown error'}`)
        continue
      }
      added.push(data)
    }
    setDocs((prev) => [...added, ...prev])
    setNotes('')
    setUploading(false)
    e.target.value = ''
  }

  async function openDocument(doc: PropertyDocument) {
    setError(null)
    // Open the tab right away (a tab opened after waiting gets blocked by most browsers),
    // then point it to a link that only works for 5 minutes.
    const tab = window.open('', '_blank')
    const { data, error: urlError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .createSignedUrl(doc.file_path, 300)
    if (urlError || !data) {
      tab?.close()
      setError(`Could not open ${doc.file_name}: ${urlError?.message ?? 'unknown error'}`)
      return
    }
    if (tab) tab.location.href = data.signedUrl
    else window.location.href = data.signedUrl
  }

  async function deleteDocument(doc: PropertyDocument) {
    if (!window.confirm(`Delete "${doc.file_name}" permanently?`)) return
    setError(null)
    const { error: removeError } = await supabase.storage.from(DOCUMENTS_BUCKET).remove([doc.file_path])
    if (removeError) {
      setError(`Delete failed: ${removeError.message}`)
      return
    }
    const { error: deleteError } = await supabase.from('property_documents').delete().eq('id', doc.id)
    if (deleteError) {
      setError(`Delete failed: ${deleteError.message}`)
      return
    }
    setDocs((prev) => prev.filter((d) => d.id !== doc.id))
  }

  return (
    <div>
      {loading ? (
        <p style={{ color: 'var(--color-secondary)', fontSize: '0.85rem' }}>Loading documents...</p>
      ) : docs.length === 0 ? (
        <p style={{ color: 'var(--color-secondary)', fontSize: '0.85rem' }}>No documents yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {docs.map((doc) => {
            const uploader = doc.uploaded_by && agentsById ? agentsById[doc.uploaded_by]?.name : null
            return (
              <div
                key={doc.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  border: '1px solid var(--color-beige)',
                  borderRadius: 10,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--color-secondary)' }}>
                    {doc.doc_type}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', overflowWrap: 'anywhere' }}>{doc.file_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-secondary)' }}>
                    {new Date(doc.created_at).toLocaleDateString()}
                    {uploader ? ` - ${uploader}` : ''}
                    {doc.notes ? ` - ${doc.notes}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" className="btn btn-outline" onClick={() => openDocument(doc)} style={{ padding: '4px 14px' }}>
                    Open
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => deleteDocument(doc)} style={{ padding: '4px 10px' }}>
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="form-grid-2">
        <div className="field">
          <label htmlFor={`docType-${propertyId}`}>Document type</label>
          <select id={`docType-${propertyId}`} value={docType} onChange={(e) => setDocType(e.target.value)}>
            {DOCUMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`docNotes-${propertyId}`}>Note (optional)</label>
          <input
            id={`docNotes-${propertyId}`}
            type="text"
            placeholder="e.g. TCT No. 123-456, page 1-2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>
      <div className="field" style={{ marginBottom: 6 }}>
        <label htmlFor={`docFile-${propertyId}`}>Upload scan (PDF or photo, max. 25 MB)</label>
        <input
          id={`docFile-${propertyId}`}
          type="file"
          accept="application/pdf,image/*"
          multiple
          onChange={handleUpload}
          disabled={uploading}
        />
      </div>
      {uploading && <p style={{ fontSize: '0.82rem', color: 'var(--color-secondary)' }}>Uploading...</p>}
      {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }}>{error}</p>}
    </div>
  )
}
