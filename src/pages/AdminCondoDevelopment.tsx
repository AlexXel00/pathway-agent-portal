import { useEffect, useState, type ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase, MEDIA_BUCKET } from '../lib/supabase'
import { pickImagesFromGoogleDrive } from '../lib/googleDrivePicker'

const AMENITIES = [
  'Swimming pool', 'Gym', 'Parking', '24/7 Security', 'Elevator', 'Balcony',
  'Backup generator', 'Function room', 'Playground', 'Garden', 'CCTV',
  'Lobby/Reception', 'Laundry', 'Wi-Fi', 'Pet-friendly', 'Day care', 'Sauna', 'Jacuzzi',
]

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function AdminCondoDevelopment() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id || id === 'new'
  const navigate = useNavigate()

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [amenities, setAmenities] = useState<string[]>([])
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [pickingDrive, setPickingDrive] = useState(false)
  const [projectNames, setProjectNames] = useState<string[]>([])

  useEffect(() => {
    if (isNew) return
    ;(async () => {
      const { data: d, error: de } = await supabase.from('condo_developments').select('*').eq('id', id).single()
      if (de || !d) {
        setError('Could not load development.')
        setLoading(false)
        return
      }
      setName(d.name ?? '')
      setDescription(d.description ?? '')
      setAmenities(d.amenities ?? [])
      setPhotoUrls(d.photos ?? [])
      const { data: projs } = await supabase.from('condo_projects').select('name').eq('development_id', id).order('name')
      setProjectNames((projs ?? []).map((p: { name: string }) => p.name))
      setLoading(false)
    })()
  }, [id, isNew])

  function toggleAmenity(a: string) {
    setAmenities((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]))
  }

  async function uploadFilesReturn(files: File[]): Promise<string[]> {
    const folder = slugify(name || 'development') || `dev-${Date.now()}`
    const uploaded: string[] = []
    for (const file of files) {
      const path = `developments/${folder}/${Date.now()}-${slugify(file.name)}`
      const { error: ue } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
        contentType: file.type || 'image/jpeg',
      })
      if (ue) {
        setError(`Photo upload failed: ${ue.message}`)
        continue
      }
      const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path)
      uploaded.push(data.publicUrl)
    }
    return uploaded
  }

  async function handlePhotoSelect(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploadingPhotos(true)
    setError(null)
    const urls = await uploadFilesReturn(Array.from(files))
    setPhotoUrls((prev) => [...prev, ...urls])
    setUploadingPhotos(false)
    e.target.value = ''
  }

  async function handleDrivePick() {
    setError(null)
    setPickingDrive(true)
    try {
      const files = await pickImagesFromGoogleDrive()
      if (files.length > 0) {
        setUploadingPhotos(true)
        const urls = await uploadFilesReturn(files)
        setPhotoUrls((prev) => [...prev, ...urls])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google Drive selection failed.')
    } finally {
      setUploadingPhotos(false)
      setPickingDrive(false)
    }
  }

  function removePhoto(url: string) {
    setPhotoUrls((prev) => prev.filter((u) => u !== url))
  }

  function movePhoto(index: number, dir: -1 | 1) {
    setPhotoUrls((prev) => {
      const target = index + dir
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      const tmp = next[index]
      next[index] = next[target]
      next[target] = tmp
      return next
    })
  }

  async function save() {
    setError(null)
    if (!name.trim()) {
      setError('Please enter a development name.')
      return
    }
    setSaving(true)
    const payload = {
      name: name.trim(),
      description: description || null,
      amenities,
      photos: photoUrls,
    }
    const res = isNew
      ? await supabase.from('condo_developments').insert(payload).select().single()
      : await supabase.from('condo_developments').update(payload).eq('id', id).select().single()
    setSaving(false)
    if (res.error) {
      setError(res.error.message)
      return
    }
    navigate('/listings')
  }

  if (loading) return <p style={{ color: 'var(--color-secondary)' }}>Loading...</p>

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <button className="btn btn-ghost" onClick={() => navigate('/listings')} style={{ marginBottom: 16 }}>
        &larr; Back to listings
      </button>

      <form
        className="card"
        style={{ padding: '28px 30px' }}
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <h2 style={{ marginTop: 0 }}>{isNew ? 'New development' : 'Edit development'}</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-secondary)', marginTop: 0 }}>
          A development groups several towers (e.g. Sonrisa Gardens - Tower 1, 2, 3). The description and amenities you
          enter here are shown on the website for every tower and unit type in this development.
        </p>

        <div className="field">
          <label htmlFor="name">Development name</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sonrisa Gardens" />
        </div>

        <div className="field">
          <label htmlFor="description">Shared description (shown on all towers)</label>
          <textarea id="description" rows={7} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="field">
          <label>Shared amenities</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {AMENITIES.map((a) => {
              const on = amenities.includes(a)
              return (
                <button
                  key={a}
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => toggleAmenity(a)}
                  style={{
                    padding: '2px 10px',
                    background: on ? 'var(--color-primary)' : 'var(--color-beige)',
                    color: on ? 'var(--color-ivory)' : 'var(--color-charcoal)',
                  }}
                >
                  {a}
                </button>
              )
            })}
          </div>
        </div>

        <div className="field">
          <label htmlFor="photos">Shared photos</label>
          <input id="photos" type="file" accept="image/*" multiple onChange={handlePhotoSelect} disabled={uploadingPhotos} />
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleDrivePick}
            disabled={pickingDrive || uploadingPhotos}
            style={{ marginTop: 8 }}
          >
            {pickingDrive ? 'Google Drive...' : 'Aus Google Drive waehlen'}
          </button>
          {uploadingPhotos && <p style={{ fontSize: '0.82rem', color: 'var(--color-secondary)' }}>Uploading...</p>}
          {photoUrls.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              {photoUrls.map((url, i) => (
                <div key={url} style={{ position: 'relative' }}>
                  <img src={url} alt="" style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 6, border: i === 0 ? '2px solid var(--color-primary)' : '2px solid transparent' }} />
                  {i === 0 && (
                    <span style={{ position: 'absolute', bottom: 2, left: 2, background: 'var(--color-primary)', color: '#fff', fontSize: 9, padding: '0 4px', borderRadius: 3 }}>Cover</span>
                  )}
                  <button
                    type="button"
                    onClick={() => removePhoto(url)}
                    style={{ position: 'absolute', top: 2, right: 2, background: 'var(--color-danger)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, padding: '0 5px' }}
                  >
                    x
                  </button>
                  <div style={{ position: 'absolute', bottom: 2, right: 2, display: 'flex', gap: 2 }}>
                    <button type="button" onClick={() => movePhoto(i, -1)} disabled={i === 0} style={{ background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: 3, cursor: i === 0 ? 'default' : 'pointer', fontSize: 11, padding: '0 5px', opacity: i === 0 ? 0.4 : 1 }}>&larr;</button>
                    <button type="button" onClick={() => movePhoto(i, 1)} disabled={i === photoUrls.length - 1} style={{ background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: 3, cursor: i === photoUrls.length - 1 ? 'default' : 'pointer', fontSize: 11, padding: '0 5px', opacity: i === photoUrls.length - 1 ? 0.4 : 1 }}>&rarr;</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {!isNew && projectNames.length > 0 && (
          <div className="field">
            <label>Towers in this development</label>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-secondary)', margin: 0 }}>{projectNames.join(', ')}</p>
          </div>
        )}

        {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.88rem' }}>{error}</p>}

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : isNew ? 'Create development' : 'Save development'}
        </button>
      </form>
    </div>
  )
}
