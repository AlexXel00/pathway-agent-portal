import { useEffect, useState, type ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase, MEDIA_BUCKET } from '../lib/supabase'
import { PALAWAN_MUNICIPALITIES } from '../lib/constants'
import { pickImagesFromGoogleDrive } from '../lib/googleDrivePicker'
import type { CondoUnit } from '../lib/types'

const COMPLETION_OPTIONS = ['Ready for occupancy (RFO)', 'Under construction', 'Pre-selling']
const UNIT_TYPES = ['Studio', 'Studio w/ Balcony', '1-BR', '2-BR', '2-BR w/ Balcony']
const UNIT_STATUS = ['available', 'reserved', 'sold']
const AMENITIES = [
  'Swimming pool', 'Gym', 'Parking', '24/7 Security', 'Elevator', 'Balcony',
  'Backup generator', 'Function room', 'Playground', 'Garden', 'CCTV',
  'Lobby/Reception', 'Laundry', 'Wi-Fi', 'Pet-friendly', 'Day care', 'Sauna', 'Jacuzzi',
]

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function AdminCondoProject() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id || id === 'new'
  const navigate = useNavigate()

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // project fields
  const [name, setName] = useState('')
  const [developer, setDeveloper] = useState('')
  const [municipality, setMunicipality] = useState('')
  const [barangay, setBarangay] = useState('')
  const [completionStatus, setCompletionStatus] = useState('')
  const [floors, setFloors] = useState('')
  const [amenities, setAmenities] = useState<string[]>([])
  const [description, setDescription] = useState('')
  const [mapUrl, setMapUrl] = useState('')
  const [listingStatus, setListingStatus] = useState('Active')
  const [showOnWebsite, setShowOnWebsite] = useState(false)
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [pickingDrive, setPickingDrive] = useState(false)

  // units
  const [units, setUnits] = useState<CondoUnit[]>([])
  const [floorFilter, setFloorFilter] = useState<string>('all')

  // add-unit form
  const [nuFloor, setNuFloor] = useState('')
  const [nuLabel, setNuLabel] = useState('')
  const [nuNo, setNuNo] = useState('')
  const [nuType, setNuType] = useState('Studio')
  const [nuArea, setNuArea] = useState('')
  const [nuPrice, setNuPrice] = useState('')

  useEffect(() => {
    if (isNew) return
    ;(async () => {
      const { data: p, error: pe } = await supabase.from('condo_projects').select('*').eq('id', id).single()
      if (pe || !p) {
        setError('Could not load project.')
        setLoading(false)
        return
      }
      setName(p.name ?? '')
      setDeveloper(p.developer ?? '')
      setMunicipality(p.municipality ?? '')
      setBarangay(p.barangay ?? '')
      setCompletionStatus(p.completion_status ?? '')
      setFloors(p.floors != null ? String(p.floors) : '')
      setAmenities(p.amenities ?? [])
      setDescription(p.description ?? '')
      setMapUrl(p.map_url ?? '')
      setListingStatus(p.listing_status ?? 'Active')
      setShowOnWebsite(p.show_on_website ?? false)
      setPhotoUrls(p.photos ?? [])

      const { data: u } = await supabase
        .from('condo_units')
        .select('*')
        .eq('project_id', id)
        .order('floor', { ascending: true })
        .order('unit_no', { ascending: true })
      setUnits((u as CondoUnit[]) ?? [])
      setLoading(false)
    })()
  }, [id, isNew])

  function toggleAmenity(a: string) {
    setAmenities((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]))
  }

  async function uploadFiles(files: File[]) {
    const folder = slugify(name || 'condo-project') || `condo-${Date.now()}`
    const uploaded: string[] = []
    for (const file of files) {
      const path = `condos/${folder}/${Date.now()}-${slugify(file.name)}`
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
    setPhotoUrls((prev) => [...prev, ...uploaded])
  }

  async function handlePhotoSelect(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploadingPhotos(true)
    setError(null)
    await uploadFiles(Array.from(files))
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
        await uploadFiles(files)
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

  async function saveProject() {
    setError(null)
    if (!name.trim()) {
      setError('Please enter a project name.')
      return
    }
    setSaving(true)
    const payload = {
      name: name.trim(),
      developer: developer || null,
      municipality: municipality || null,
      barangay: barangay || null,
      completion_status: completionStatus || null,
      floors: floors ? Number(floors) : null,
      amenities,
      description: description || null,
      map_url: mapUrl || null,
      listing_status: listingStatus,
      show_on_website: showOnWebsite,
      photos: photoUrls,
    }
    const res = isNew
      ? await supabase.from('condo_projects').insert(payload).select().single()
      : await supabase.from('condo_projects').update(payload).eq('id', id).select().single()
    setSaving(false)
    if (res.error) {
      setError(res.error.message)
      return
    }
    if (isNew && res.data) {
      navigate(`/admin/condo/${res.data.id}`)
    }
  }

  async function updateUnitStatus(unitId: string, status: string) {
    setUnits((prev) => prev.map((u) => (u.id === unitId ? { ...u, status } : u)))
    await supabase.from('condo_units').update({ status }).eq('id', unitId)
  }

  async function deleteUnit(unitId: string) {
    setUnits((prev) => prev.filter((u) => u.id !== unitId))
    await supabase.from('condo_units').delete().eq('id', unitId)
  }

  async function addUnit() {
    if (isNew || !id) return
    const payload = {
      project_id: id,
      floor: nuFloor ? Number(nuFloor) : null,
      floor_label: nuLabel || (nuFloor ? `${nuFloor}/F` : null),
      unit_no: nuNo || null,
      unit_type: nuType,
      floor_area_sqm: nuArea ? Number(nuArea) : null,
      price_php: nuPrice ? Number(nuPrice) : null,
      status: 'available',
    }
    const { data, error: e } = await supabase.from('condo_units').insert(payload).select().single()
    if (e) {
      setError(e.message)
      return
    }
    if (data) setUnits((prev) => [...prev, data as CondoUnit])
    setNuNo(''); setNuArea(''); setNuPrice('')
  }

  if (loading) return <p style={{ color: 'var(--color-secondary)' }}>Loading...</p>

  const floorLabels = Array.from(new Set(units.map((u) => u.floor_label || String(u.floor)))).sort()
  const visibleUnits = floorFilter === 'all'
    ? units
    : units.filter((u) => (u.floor_label || String(u.floor)) === floorFilter)

  const availableCount = units.filter((u) => u.status === 'available').length

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
          saveProject()
        }}
      >
        <h2 style={{ marginTop: 0 }}>{isNew ? 'New condo project' : 'Edit condo project'}</h2>

        <div className="form-grid-2">
          <div className="field">
            <label htmlFor="name">Project name</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sonrisa Gardens - Tower 1" />
          </div>
          <div className="field">
            <label htmlFor="developer">Developer</label>
            <input id="developer" value={developer} onChange={(e) => setDeveloper(e.target.value)} />
          </div>
        </div>

        <div className="form-grid-2">
          <div className="field">
            <label htmlFor="municipality">Municipality</label>
            <select id="municipality" value={municipality} onChange={(e) => setMunicipality(e.target.value)}>
              <option value="">- Select -</option>
              {PALAWAN_MUNICIPALITIES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="barangay">Barangay</label>
            <input id="barangay" value={barangay} onChange={(e) => setBarangay(e.target.value)} />
          </div>
        </div>

        <div className="form-grid-2">
          <div className="field">
            <label htmlFor="completion">Completion status</label>
            <select id="completion" value={completionStatus} onChange={(e) => setCompletionStatus(e.target.value)}>
              <option value="">- Select -</option>
              {COMPLETION_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="floors">Number of floors</label>
            <input id="floors" type="number" min="0" value={floors} onChange={(e) => setFloors(e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label htmlFor="mapUrl">Google Maps link (optional)</label>
          <input id="mapUrl" value={mapUrl} onChange={(e) => setMapUrl(e.target.value)} />
        </div>

        <div className="field">
          <label>Amenities</label>
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
          <label htmlFor="description">Description</label>
          <textarea id="description" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="photos">Photos</label>
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
              {photoUrls.map((url) => (
                <div key={url} style={{ position: 'relative' }}>
                  <img src={url} alt="" style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 6 }} />
                  <button
                    type="button"
                    onClick={() => removePhoto(url)}
                    style={{ position: 'absolute', top: 2, right: 2, background: 'var(--color-danger)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, padding: '0 5px' }}
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-grid-2">
          <div className="field">
            <label htmlFor="listingStatus">Listing status</label>
            <select id="listingStatus" value={listingStatus} onChange={(e) => setListingStatus(e.target.value)}>
              <option>Active</option>
              <option>Sold out</option>
              <option>Inactive</option>
            </select>
          </div>
          <div className="field">
            <label className="checkbox-row" style={{ marginTop: 26 }}>
              <input type="checkbox" checked={showOnWebsite} onChange={(e) => setShowOnWebsite(e.target.checked)} />
              Show on public website
            </label>
          </div>
        </div>

        {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.88rem' }}>{error}</p>}

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : isNew ? 'Create project' : 'Save project'}
        </button>
      </form>

      {!isNew && (
        <div className="card" style={{ padding: '28px 30px', marginTop: 24 }}>
          <h3 style={{ marginTop: 0 }}>
            Units ({units.length}) &middot; {availableCount} available
          </h3>

          <div className="field" style={{ maxWidth: 220 }}>
            <label htmlFor="floorFilter">Filter by floor</label>
            <select id="floorFilter" value={floorFilter} onChange={(e) => setFloorFilter(e.target.value)}>
              <option value="all">All floors</option>
              {floorLabels.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--color-secondary)' }}>
                  <th style={{ padding: '6px 8px' }}>Floor</th>
                  <th style={{ padding: '6px 8px' }}>Unit</th>
                  <th style={{ padding: '6px 8px' }}>Type</th>
                  <th style={{ padding: '6px 8px' }}>Area</th>
                  <th style={{ padding: '6px 8px' }}>Price</th>
                  <th style={{ padding: '6px 8px' }}>Status</th>
                  <th style={{ padding: '6px 8px' }}></th>
                </tr>
              </thead>
              <tbody>
                {visibleUnits.map((u) => (
                  <tr key={u.id} style={{ borderTop: '1px solid var(--color-beige)' }}>
                    <td style={{ padding: '6px 8px' }}>{u.floor_label || u.floor}</td>
                    <td style={{ padding: '6px 8px' }}>{u.unit_no}</td>
                    <td style={{ padding: '6px 8px' }}>{u.unit_type}</td>
                    <td style={{ padding: '6px 8px' }}>{u.floor_area_sqm ? `${u.floor_area_sqm} sqm` : '-'}</td>
                    <td style={{ padding: '6px 8px' }}>
                      {u.price_php ? 'PHP ' + Number(u.price_php).toLocaleString() : '-'}
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <select value={u.status} onChange={(e) => updateUnitStatus(u.id, e.target.value)}>
                        {UNIT_STATUS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <button type="button" className="btn btn-ghost" style={{ padding: '2px 8px' }} onClick={() => deleteUnit(u.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 20, borderTop: '1px solid var(--color-beige)', paddingTop: 16 }}>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>Add a unit manually</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="field" style={{ width: 80 }}>
                <label>Floor #</label>
                <input type="number" value={nuFloor} onChange={(e) => setNuFloor(e.target.value)} />
              </div>
              <div className="field" style={{ width: 90 }}>
                <label>Floor label</label>
                <input value={nuLabel} onChange={(e) => setNuLabel(e.target.value)} placeholder="e.g. 3/F" />
              </div>
              <div className="field" style={{ width: 90 }}>
                <label>Unit no.</label>
                <input value={nuNo} onChange={(e) => setNuNo(e.target.value)} placeholder="U01" />
              </div>
              <div className="field" style={{ width: 150 }}>
                <label>Type</label>
                <select value={nuType} onChange={(e) => setNuType(e.target.value)}>
                  {UNIT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ width: 90 }}>
                <label>Area sqm</label>
                <input type="number" value={nuArea} onChange={(e) => setNuArea(e.target.value)} />
              </div>
              <div className="field" style={{ width: 130 }}>
                <label>Price PHP</label>
                <input type="number" value={nuPrice} onChange={(e) => setNuPrice(e.target.value)} />
              </div>
              <button type="button" className="btn btn-outline" onClick={addUnit}>
                Add unit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
