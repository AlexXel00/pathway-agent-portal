import { useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, MEDIA_BUCKET } from '../lib/supabase'
import type { PropertyType, StructureType } from '../lib/types'

const TYPES: PropertyType[] = ['Commercial', 'Residential', 'Apartment/Condo', 'Agricultural', 'A&D', 'Other']
const STRUCTURE_TYPES: StructureType[] = ['Condo', 'Apartment', 'House', 'Hotel', 'Resort', 'Other']

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60)
}

export default function AdminNewListing() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [name, setName] = useState('')
  const [internalCode, setInternalCode] = useState('')
  const [municipality, setMunicipality] = useState('')
  const [barangay, setBarangay] = useState('')
  const [type, setType] = useState<PropertyType>('Residential')
  const [titleStatus, setTitleStatus] = useState('')
  const [hasStructure, setHasStructure] = useState(false)
  const [structureType, setStructureType] = useState<StructureType>('House')
  const [structureSize, setStructureSize] = useState('')
  const [lotSize, setLotSize] = useState('')
  const [sellingPoint, setSellingPoint] = useState('')
  const [description, setDescription] = useState('')
  const [priceTotal, setPriceTotal] = useState('')
  const [approxCommission, setApproxCommission] = useState('')
  const [ownerContact, setOwnerContact] = useState('')
  const [isDirectOwner, setIsDirectOwner] = useState(true)
  const [hasOtherBroker, setHasOtherBroker] = useState(false)
  const [otherBrokerName, setOtherBrokerName] = useState('')
  const [otherBrokerContact, setOtherBrokerContact] = useState('')
  const [mapUrl, setMapUrl] = useState('')
  const [videoUrls, setVideoUrls] = useState('')

  const [photoUrls, setPhotoUrls] = useState<string[]>([])

  // Default commission suggestion: 5% of price, matching Pathway's standard rule
  function onPriceBlur() {
    const price = Number(priceTotal)
    if (price > 0 && !approxCommission) {
      setApproxCommission(String(Math.round(price * 0.05)))
    }
  }

  async function handlePhotoSelect(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploadingPhotos(true)
    setError(null)
    const folder = slugify(name || internalCode || 'listing') || `listing-${Date.now()}`
    const uploaded: string[] = []
    for (const file of Array.from(files)) {
      const path = `properties/${folder}/${Date.now()}-${slugify(file.name)}`
      const { error: uploadError } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
        contentType: file.type || 'image/jpeg',
      })
      if (uploadError) {
        setError(`Photo upload failed: ${uploadError.message}`)
        continue
      }
      const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path)
      uploaded.push(data.publicUrl)
    }
    setPhotoUrls((prev) => [...prev, ...uploaded])
    setUploadingPhotos(false)
    e.target.value = ''
  }

  function removePhoto(url: string) {
    setPhotoUrls((prev) => prev.filter((u) => u !== url))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    const { data, error } = await supabase
      .from('properties')
      .insert({
        name,
        internal_code: internalCode || null,
        municipality: municipality || null,
        barangay: barangay || null,
        type,
        title_status: titleStatus || null,
        has_structure: hasStructure,
        structure_type: hasStructure ? structureType : null,
        structure_size_sqm: hasStructure && structureSize ? Number(structureSize) : null,
        lot_size_sqm: lotSize ? Number(lotSize) : null,
        special_selling_point: sellingPoint || null,
        description: description || null,
        price_total_php: priceTotal ? Number(priceTotal) : null,
        approx_commission_php: approxCommission ? Number(approxCommission) : null,
        owner_contact_name: ownerContact || null,
        is_direct_owner: isDirectOwner,
        has_other_broker: hasOtherBroker,
        other_broker_name: hasOtherBroker ? otherBrokerName || null : null,
        other_broker_contact: hasOtherBroker ? otherBrokerContact || null : null,
        photos: photoUrls,
        videos: videoUrls
          .split(/\n|,/)
          .map((v) => v.trim())
          .filter(Boolean),
        map_url: mapUrl || null,
        listing_status: 'Active',
      })
      .select()
      .single()

    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setSuccess(true)
    setTimeout(() => navigate(`/listings`), 900)
    void data
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h1>New Listing</h1>
      <p style={{ color: 'var(--color-secondary)', marginBottom: 24 }}>
        Fill in the details, add photos, and publish - it appears in Listings immediately.
      </p>

      <form onSubmit={handleSubmit} className="card" style={{ padding: '28px 30px' }}>
        <div className="field">
          <label htmlFor="name">Property name</label>
          <input id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="field">
            <label htmlFor="code">Internal code</label>
            <input id="code" type="text" value={internalCode} onChange={(e) => setInternalCode(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="type">Type</label>
            <select id="type" value={type} onChange={(e) => setType(e.target.value as PropertyType)}>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="field">
            <label htmlFor="municipality">Municipality</label>
            <input id="municipality" type="text" value={municipality} onChange={(e) => setMunicipality(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="barangay">Barangay</label>
            <input id="barangay" type="text" value={barangay} onChange={(e) => setBarangay(e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label htmlFor="titleStatus">Title status</label>
          <input
            id="titleStatus"
            type="text"
            placeholder="e.g. Titled (TCT), Tax Declaration, Free Patent, A&D"
            value={titleStatus}
            onChange={(e) => setTitleStatus(e.target.value)}
          />
        </div>

        <label className="checkbox-row" style={{ marginBottom: 12 }}>
          <input type="checkbox" checked={hasStructure} onChange={(e) => setHasStructure(e.target.checked)} />
          Has a structure
        </label>

        {hasStructure && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="field">
              <label htmlFor="structureType">Structure type</label>
              <select id="structureType" value={structureType} onChange={(e) => setStructureType(e.target.value as StructureType)}>
                {STRUCTURE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="structureSize">Structure size (sqm)</label>
              <input id="structureSize" type="number" min="0" value={structureSize} onChange={(e) => setStructureSize(e.target.value)} />
            </div>
          </div>
        )}

        <div className="field">
          <label htmlFor="lotSize">Lot size (sqm)</label>
          <input id="lotSize" type="number" min="0" value={lotSize} onChange={(e) => setLotSize(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="sellingPoint">Special selling point</label>
          <input id="sellingPoint" type="text" value={sellingPoint} onChange={(e) => setSellingPoint(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea id="description" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="field">
            <label htmlFor="price">Price total (PHP)</label>
            <input id="price" type="number" min="0" value={priceTotal} onChange={(e) => setPriceTotal(e.target.value)} onBlur={onPriceBlur} />
          </div>
          <div className="field">
            <label htmlFor="commission">Approx. commission (PHP)</label>
            <input id="commission" type="number" min="0" value={approxCommission} onChange={(e) => setApproxCommission(e.target.value)} />
          </div>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-secondary)', marginTop: -10, marginBottom: 16 }}>
          Commission auto-fills at 5% of the price when you leave the price field - adjust if needed.
        </p>

        <div className="field">
          <label htmlFor="owner">Listing agent / owner contact name</label>
          <input id="owner" type="text" value={ownerContact} onChange={(e) => setOwnerContact(e.target.value)} />
        </div>

        <label className="checkbox-row" style={{ marginBottom: 12 }}>
          <input type="checkbox" checked={isDirectOwner} onChange={(e) => setIsDirectOwner(e.target.checked)} />
          Direct owner (not via another broker)
        </label>

        <label className="checkbox-row" style={{ marginBottom: 12 }}>
          <input type="checkbox" checked={hasOtherBroker} onChange={(e) => setHasOtherBroker(e.target.checked)} />
          There is another broker involved
        </label>

        {hasOtherBroker && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="field">
              <label htmlFor="brokerName">Other broker name</label>
              <input id="brokerName" type="text" value={otherBrokerName} onChange={(e) => setOtherBrokerName(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="brokerContact">Other broker contact</label>
              <input id="brokerContact" type="text" value={otherBrokerContact} onChange={(e) => setOtherBrokerContact(e.target.value)} />
            </div>
          </div>
        )}

        <div className="field">
          <label htmlFor="map">Map link</label>
          <input id="map" type="url" placeholder="https://maps.google.com/..." value={mapUrl} onChange={(e) => setMapUrl(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="videos">Video links (one per line)</label>
          <textarea id="videos" rows={2} value={videoUrls} onChange={(e) => setVideoUrls(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="photos">Photos</label>
          <input id="photos" type="file" accept="image/*" multiple onChange={handlePhotoSelect} disabled={uploadingPhotos} />
          {uploadingPhotos && <p style={{ fontSize: '0.82rem', color: 'var(--color-secondary)' }}>Uploading...</p>}
          {photoUrls.length > 0 && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
              {photoUrls.map((url) => (
                <div key={url} style={{ position: 'relative' }}>
                  <img src={url} alt="" style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 8 }} />
                  <button
                    type="button"
                    onClick={() => removePhoto(url)}
                    className="btn btn-ghost"
                    style={{ position: 'absolute', top: -8, right: -8, background: '#fff', borderRadius: '50%', width: 24, height: 24, padding: 0, boxShadow: 'var(--shadow-soft)' }}
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.88rem' }}>{error}</p>}
        {success && <p style={{ color: 'var(--color-success)', fontSize: '0.88rem' }}>Listing created!</p>}

        <button type="submit" className="btn btn-primary" disabled={saving || uploadingPhotos} style={{ marginTop: 10 }}>
          {saving ? 'Publishing...' : 'Publish listing'}
        </button>
      </form>
    </div>
  )
}
