import { useEffect, useState, type ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase, MEDIA_BUCKET } from '../lib/supabase'
import type { Agent, Broker, ListingStatus, PropertyType, StructureType } from '../lib/types'
import { COMMON_TAGS, PALAWAN_MUNICIPALITIES } from '../lib/constants'
import { useAuth } from '../context/AuthContext'

const TYPES: PropertyType[] = [
  'Residential',
  'Commercial',
  'Apartment/Condo',
  'Agricultural',
  'A&D',
  'Ready for Titling',
  'Other',
]
const STRUCTURE_TYPES: StructureType[] = ['Condo', 'Apartment', 'House', 'Hotel', 'Resort', 'Farm', 'Other']
const BROKERS: Broker[] = ['Jason', 'Catherine', 'Other']
const STATUSES: ListingStatus[] = ['Active', 'Sold', 'On Hold', 'Withdrawn']

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60)
}

export default function AdminNewListing() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { agent } = useAuth()
  const isHeadAdmin = agent?.is_head_admin ?? false
  const isEdit = Boolean(id)
  const [loadingExisting, setLoadingExisting] = useState(isEdit)
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
  const [structureTypes, setStructureTypes] = useState<StructureType[]>([])
  const [structureSize, setStructureSize] = useState('')
  const [lotSize, setLotSize] = useState('')
  const [sellingPoint, setSellingPoint] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [customTag, setCustomTag] = useState('')
  const [description, setDescription] = useState('')
  const [priceTotal, setPriceTotal] = useState('')
  const [approxCommission, setApproxCommission] = useState('')
  const [listingAgentId, setListingAgentId] = useState('')
  const [listingAgentOtherName, setListingAgentOtherName] = useState('')
  const [ownerContact, setOwnerContact] = useState('')
  const [isDirectOwner, setIsDirectOwner] = useState(true)
  const [broker, setBroker] = useState<Broker | ''>('')
  const [brokerOtherName, setBrokerOtherName] = useState('')
  const [brokerContact, setBrokerContact] = useState('')
  const [broker2, setBroker2] = useState<Broker | ''>('')
  const [broker2OtherName, setBroker2OtherName] = useState('')
  const [broker2Contact, setBroker2Contact] = useState('')
  const [mapUrl, setMapUrl] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [videoUrls, setVideoUrls] = useState('')
  const [rawMediaUrl, setRawMediaUrl] = useState('')
  const [editedMediaUrl, setEditedMediaUrl] = useState('')
  const [listingStatus, setListingStatus] = useState<ListingStatus>('Active')
  const [closingAgentId, setClosingAgentId] = useState('')
  const [closingAgentOtherName, setClosingAgentOtherName] = useState('')
  const [actualCommission, setActualCommission] = useState('')
  const [saleDate, setSaleDate] = useState('')

  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [websitePhotos, setWebsitePhotos] = useState<string[]>([])
  const [uploadingWebsitePhotos, setUploadingWebsitePhotos] = useState(false)
  const [agents, setAgents] = useState<Agent[]>([])
  // Tracks whether the commission field still holds our auto-computed suggestion (true) or
  // was overwritten by hand (false) - once edited manually we stop recalculating it.
  const [commissionAuto, setCommissionAuto] = useState(!isEdit)

  useEffect(() => {
    supabase
      .from('agents')
      .select('*')
      .order('name')
      .then(({ data }) => setAgents(data ?? []))
  }, [])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function loadExisting() {
      const { data, error: fetchError } = await supabase.from('properties').select('*').eq('id', id).single()
      if (cancelled) return
      if (fetchError || !data) {
        setError(fetchError?.message ?? 'Listing not found.')
        setLoadingExisting(false)
        return
      }
      setName(data.name ?? '')
      setInternalCode(data.internal_code ?? '')
      setMunicipality(data.municipality ?? '')
      setBarangay(data.barangay ?? '')
      setType((data.type as PropertyType) ?? 'Residential')
      setTitleStatus(data.title_status ?? '')
      setHasStructure(data.has_structure ?? false)
      setStructureTypes((data.structure_types as StructureType[]) ?? [])
      setStructureSize(data.structure_size_sqm != null ? String(data.structure_size_sqm) : '')
      setLotSize(data.lot_size_sqm != null ? String(data.lot_size_sqm) : '')
      setSellingPoint(data.special_selling_point ?? '')
      setTags(data.tags ?? [])
      setDescription(data.description ?? '')
      setPriceTotal(data.price_total_php != null ? String(data.price_total_php) : '')
      setApproxCommission(data.approx_commission_php != null ? String(data.approx_commission_php) : '')
      setListingAgentId(data.listing_agent_id ?? (data.listing_agent_other_name ? 'other' : ''))
      setListingAgentOtherName(data.listing_agent_other_name ?? '')
      setOwnerContact(data.owner_contact_name ?? '')
      setIsDirectOwner(data.is_direct_owner ?? true)
      setBroker((data.broker as Broker) ?? '')
      setBrokerOtherName(data.broker_other_name ?? '')
      setBrokerContact(data.broker_contact ?? '')
      setBroker2((data.broker2 as Broker) ?? '')
      setBroker2OtherName(data.broker2_other_name ?? '')
      setBroker2Contact(data.broker2_contact ?? '')
      setMapUrl(data.map_url ?? '')
      setLatitude(data.latitude != null ? String(data.latitude) : '')
      setLongitude(data.longitude != null ? String(data.longitude) : '')
      setVideoUrls((data.videos ?? []).join('\n'))
      setRawMediaUrl(data.raw_media_url ?? '')
      setEditedMediaUrl(data.edited_media_url ?? '')
      setPhotoUrls(data.photos ?? [])
      setWebsitePhotos(data.website_photos ?? [])
      setListingStatus((data.listing_status as ListingStatus) ?? 'Active')
      setClosingAgentId(data.closing_agent_id ?? (data.closing_agent_other_name ? 'other' : ''))
      setClosingAgentOtherName(data.closing_agent_other_name ?? '')
      setActualCommission(data.actual_commission_php != null ? String(data.actual_commission_php) : '')
      setSaleDate(data.sale_date ?? '')
      setLoadingExisting(false)
    }
    loadExisting()
    return () => {
      cancelled = true
    }
  }, [id])

  function toggleTag(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  function toggleStructureType(t: StructureType) {
    setStructureTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
  }

  function addCustomTag() {
    const value = customTag.trim()
    if (value && !tags.includes(value)) {
      setTags((prev) => [...prev, value])
    }
    setCustomTag('')
  }

  // Selling agent commission, matching Pathway's standard rule: total pool is 5% of the
  // price; if there is a broker on the deal, they take 1% of the price off the top
  // (shared between two brokers if both are set, so the broker cut is always 1% total),
  // and the selling agent gets 30% of whatever remains.
  useEffect(() => {
    if (!commissionAuto) return
    const price = Number(priceTotal)
    if (!(price > 0)) {
      setApproxCommission('')
      return
    }
    const totalPool = price * 0.05
    const brokerCut = broker || broker2 ? price * 0.01 : 0
    const agentCommission = (totalPool - brokerCut) * 0.3
    setApproxCommission(String(Math.round(agentCommission)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceTotal, broker, broker2, commissionAuto])

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

  function toggleWebsitePhoto(url: string) {
    setWebsitePhotos((prev) => (prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]))
  }

  function removeWebsitePhoto(url: string) {
    setWebsitePhotos((prev) => prev.filter((u) => u !== url))
  }

  function moveWebsitePhoto(index: number, direction: -1 | 1) {
    setWebsitePhotos((prev) => {
      const target = index + direction
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      const temp = next[index]
      next[index] = next[target]
      next[target] = temp
      return next
    })
  }

  async function handleWebsitePhotoUpload(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploadingWebsitePhotos(true)
    setError(null)
    const folder = slugify(name || internalCode || 'listing') || `listing-${Date.now()}`
    const uploaded: string[] = []
    for (const file of Array.from(files)) {
      const path = `properties/${folder}/website/${Date.now()}-${slugify(file.name)}`
      const { error: uploadError } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
        contentType: file.type || 'image/jpeg',
      })
      if (uploadError) {
        setError(`Website photo upload failed: ${uploadError.message}`)
        continue
      }
      const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path)
      uploaded.push(data.publicUrl)
    }
    setWebsitePhotos((prev) => [...prev, ...uploaded])
    setUploadingWebsitePhotos(false)
    e.target.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const payload = {
      name,
      internal_code: internalCode || null,
      municipality: municipality || null,
      barangay: barangay || null,
      type,
      title_status: titleStatus || null,
      has_structure: hasStructure,
      structure_types: hasStructure ? structureTypes : [],
      structure_size_sqm: hasStructure && structureSize ? Number(structureSize) : null,
      lot_size_sqm: lotSize ? Number(lotSize) : null,
      special_selling_point: sellingPoint || null,
      tags,
      description: description || null,
      price_total_php: priceTotal ? Number(priceTotal) : null,
      approx_commission_php: approxCommission ? Number(approxCommission) : null,
      listing_agent_id: listingAgentId && listingAgentId !== 'other' ? listingAgentId : null,
      listing_agent_other_name: listingAgentId === 'other' ? listingAgentOtherName || null : null,
      owner_contact_name: ownerContact || null,
      is_direct_owner: isDirectOwner,
      broker: broker || null,
      broker_other_name: broker === 'Other' ? brokerOtherName || null : null,
      broker_contact: broker ? brokerContact || null : null,
      broker2: broker2 || null,
      broker2_other_name: broker2 === 'Other' ? broker2OtherName || null : null,
      broker2_contact: broker2 ? broker2Contact || null : null,
      photos: photoUrls,
      website_photos: websitePhotos,
      videos: videoUrls
        .split(/\n|,/)
        .map((v) => v.trim())
        .filter(Boolean),
      map_url: mapUrl || null,
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      raw_media_url: rawMediaUrl || null,
      edited_media_url: editedMediaUrl || null,
      listing_status: isEdit ? listingStatus : ('Active' as ListingStatus),
      closing_agent_id: isEdit && listingStatus === 'Sold' && closingAgentId !== 'other' ? closingAgentId || null : null,
      closing_agent_other_name:
        isEdit && listingStatus === 'Sold' && closingAgentId === 'other' ? closingAgentOtherName || null : null,
      actual_commission_php: isEdit && listingStatus === 'Sold' && actualCommission ? Number(actualCommission) : null,
      sale_date: isEdit && listingStatus === 'Sold' && saleDate ? saleDate : null,
    }

    const { data, error } = isEdit
      ? await supabase.from('properties').update(payload).eq('id', id).select().single()
      : await supabase.from('properties').insert(payload).select().single()

    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setSuccess(true)
    setTimeout(() => navigate(`/listings`), 900)
    void data
  }

  if (loadingExisting) {
    return <p style={{ color: 'var(--color-secondary)' }}>Loading listing...</p>
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h1>{isEdit ? 'Edit Listing' : 'New Listing'}</h1>
      <p style={{ color: 'var(--color-secondary)', marginBottom: 24 }}>
        {isEdit
          ? 'Update the details below - changes are visible in Listings immediately.'
          : 'Fill in the details, add photos, and publish - it appears in Listings immediately.'}
      </p>

      <form onSubmit={handleSubmit} className="card" style={{ padding: '28px 30px' }}>
        {isEdit && (
          <div className={listingStatus === 'Sold' ? 'form-grid-2' : undefined}>
            <div className="field">
              <label htmlFor="listingStatus">Listing status</label>
              <select id="listingStatus" value={listingStatus} onChange={(e) => setListingStatus(e.target.value as ListingStatus)}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            {listingStatus === 'Sold' && (
              <div className="field">
                <label htmlFor="closingAgent">Closing agent</label>
                <select id="closingAgent" value={closingAgentId} onChange={(e) => setClosingAgentId(e.target.value)}>
                  <option value="">- None -</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                  <option value="other">Other (not in-house)</option>
                </select>
              </div>
            )}
          </div>
        )}

        {isEdit && listingStatus === 'Sold' && closingAgentId === 'other' && (
          <div className="field">
            <label htmlFor="closingAgentOtherName">Closing agent name</label>
            <input
              id="closingAgentOtherName"
              type="text"
              value={closingAgentOtherName}
              onChange={(e) => setClosingAgentOtherName(e.target.value)}
            />
          </div>
        )}

        {isEdit && listingStatus === 'Sold' && (
          <div className="form-grid-2">
            <div className="field">
              <label htmlFor="actualCommission">Actual commission (PHP)</label>
              <input
                id="actualCommission"
                type="number"
                min="0"
                value={actualCommission}
                onChange={(e) => setActualCommission(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="saleDate">Sale date</label>
              <input id="saleDate" type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} />
            </div>
          </div>
        )}

        <div className="field">
          <label htmlFor="name">Property name</label>
          <input id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="form-grid-2">
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

        <div className="form-grid-2">
          <div className="field">
            <label htmlFor="municipality">Municipality</label>
            <select id="municipality" value={municipality} onChange={(e) => setMunicipality(e.target.value)}>
              <option value="">- Select -</option>
              {PALAWAN_MUNICIPALITIES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="barangay">Barangay</label>
            <input id="barangay" type="text" value={barangay} onChange={(e) => setBarangay(e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label htmlFor="titleStatus">Title status</label>
          <select id="titleStatus" value={titleStatus} onChange={(e) => setTitleStatus(e.target.value)}>
            <option value="">- Select -</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <label className="checkbox-row" style={{ marginBottom: 12 }}>
          <input type="checkbox" checked={hasStructure} onChange={(e) => setHasStructure(e.target.checked)} />
          Has a structure
        </label>

        {hasStructure && (
          <>
            <div className="field">
              <label>Structure type (select all that apply)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {STRUCTURE_TYPES.map((t) => {
                  const active = structureTypes.includes(t)
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleStructureType(t)}
                      className="badge"
                      style={{
                        cursor: 'pointer',
                        border: 'none',
                        background: active ? 'var(--color-primary)' : 'var(--color-beige)',
                        color: active ? 'var(--color-ivory)' : 'var(--color-charcoal)',
                      }}
                    >
                      {t}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="field">
              <label htmlFor="structureSize">Structure size (sqm)</label>
              <input id="structureSize" type="number" min="0" value={structureSize} onChange={(e) => setStructureSize(e.target.value)} />
            </div>
          </>
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
          <label>Highlights (used for filtering)</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            {COMMON_TAGS.map((tag) => {
              const active = tags.includes(tag)
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className="badge"
                  style={{
                    cursor: 'pointer',
                    border: 'none',
                    background: active ? 'var(--color-primary)' : 'var(--color-beige)',
                    color: active ? 'var(--color-ivory)' : 'var(--color-charcoal)',
                  }}
                >
                  {tag}
                </button>
              )
            })}
            {tags
              .filter((t) => !COMMON_TAGS.includes(t))
              .map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className="badge"
                  style={{ cursor: 'pointer', border: 'none', background: 'var(--color-primary)', color: 'var(--color-ivory)' }}
                >
                  {tag} x
                </button>
              ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="Add a custom highlight..."
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addCustomTag()
                }
              }}
            />
            <button type="button" className="btn btn-outline" onClick={addCustomTag}>
              Add
            </button>
          </div>
        </div>

        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea id="description" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="form-grid-2">
          <div className="field">
            <label htmlFor="price">Price total (PHP)</label>
            <input id="price" type="number" min="0" value={priceTotal} onChange={(e) => setPriceTotal(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="commission">Selling agent commission (PHP)</label>
            <input
              id="commission"
              type="number"
              min="0"
              value={approxCommission}
              onChange={(e) => {
                setApproxCommission(e.target.value)
                setCommissionAuto(false)
              }}
            />
          </div>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-secondary)', marginTop: -10, marginBottom: 16 }}>
          Auto-calculated as 30% of the 5% total commission, minus 1% for the broker if one is set (shared
          between both brokers when two are set) - edit it directly if this deal is different.
        </p>

        <div className="form-grid-2">
          <div className="field">
            <label htmlFor="listingAgent">Listing agent</label>
            <select id="listingAgent" value={listingAgentId} onChange={(e) => setListingAgentId(e.target.value)}>
              <option value="">- None -</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
              <option value="other">Other (not in-house)</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="owner">Owner contact name</label>
            <input id="owner" type="text" value={ownerContact} onChange={(e) => setOwnerContact(e.target.value)} />
          </div>
        </div>

        {listingAgentId === 'other' && (
          <div className="field">
            <label htmlFor="listingAgentOtherName">Listing agent name</label>
            <input
              id="listingAgentOtherName"
              type="text"
              value={listingAgentOtherName}
              onChange={(e) => setListingAgentOtherName(e.target.value)}
            />
          </div>
        )}

        <p style={{ fontSize: '0.78rem', color: 'var(--color-secondary)', marginTop: -10, marginBottom: 16 }}>
          Listing agent is visible to every agent. Owner contact name is only ever shown to admins - fill in
          whichever of the two you have, or both.
        </p>

        <label className="checkbox-row" style={{ marginBottom: 16 }}>
          <input type="checkbox" checked={isDirectOwner} onChange={(e) => setIsDirectOwner(e.target.checked)} />
          Direct owner (not via another broker)
        </label>

        <div className="field">
          <label htmlFor="broker">Broker</label>
          <select id="broker" value={broker} onChange={(e) => setBroker(e.target.value as Broker | '')}>
            <option value="">- None -</option>
            {BROKERS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        {broker && (
          <div className={broker === 'Other' ? 'form-grid-2' : undefined}>
            {broker === 'Other' && (
              <div className="field">
                <label htmlFor="brokerOtherName">Broker name</label>
                <input id="brokerOtherName" type="text" value={brokerOtherName} onChange={(e) => setBrokerOtherName(e.target.value)} />
              </div>
            )}
            <div className="field">
              <label htmlFor="brokerContact">Broker contact</label>
              <input id="brokerContact" type="text" value={brokerContact} onChange={(e) => setBrokerContact(e.target.value)} />
            </div>
          </div>
        )}

        <div className="field">
          <label htmlFor="broker2">Broker 2 (if there is a second one on this deal)</label>
          <select id="broker2" value={broker2} onChange={(e) => setBroker2(e.target.value as Broker | '')}>
            <option value="">- None -</option>
            {BROKERS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        {broker2 && (
          <div className={broker2 === 'Other' ? 'form-grid-2' : undefined}>
            {broker2 === 'Other' && (
              <div className="field">
                <label htmlFor="broker2OtherName">Broker 2 name</label>
                <input id="broker2OtherName" type="text" value={broker2OtherName} onChange={(e) => setBroker2OtherName(e.target.value)} />
              </div>
            )}
            <div className="field">
              <label htmlFor="broker2Contact">Broker 2 contact</label>
              <input id="broker2Contact" type="text" value={broker2Contact} onChange={(e) => setBroker2Contact(e.target.value)} />
            </div>
          </div>
        )}

        <div className="field">
          <label htmlFor="map">Map link</label>
          <input id="map" type="url" placeholder="https://maps.google.com/..." value={mapUrl} onChange={(e) => setMapUrl(e.target.value)} />
        </div>

        <div className="form-grid-2">
          <div className="field">
            <label htmlFor="latitude">Latitude (optional, shows an embedded map)</label>
            <input
              id="latitude"
              type="number"
              step="any"
              placeholder="e.g. 10.1994"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="longitude">Longitude (optional)</label>
            <input
              id="longitude"
              type="number"
              step="any"
              placeholder="e.g. 118.7961"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
            />
          </div>
        </div>
        <p style={{ color: 'var(--color-secondary)', fontSize: '0.8rem', marginTop: -14, marginBottom: 20 }}>
          Tip: in Google Maps, right-click the exact spot and click the coordinates to copy them.
        </p>

        <div className="field">
          <label htmlFor="videos">Video links (one per line)</label>
          <textarea id="videos" rows={2} value={videoUrls} onChange={(e) => setVideoUrls(e.target.value)} />
        </div>

        <div className="form-grid-2">
          <div className="field">
            <label htmlFor="rawMedia">Raw media link</label>
            <input
              id="rawMedia"
              type="url"
              placeholder="https://drive.google.com/..."
              value={rawMediaUrl}
              onChange={(e) => setRawMediaUrl(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="editedMedia">Edited / prepared media link</label>
            <input
              id="editedMedia"
              type="url"
              placeholder="https://drive.google.com/..."
              value={editedMediaUrl}
              onChange={(e) => setEditedMediaUrl(e.target.value)}
            />
          </div>
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

        {isHeadAdmin && (
          <div className="field">
            <label>Website-Fotos (nur Head-Admin)</label>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-secondary)', marginTop: 0 }}>
              Waehle aus, welche Fotos auf der oeffentlichen Website erscheinen, und bringe sie in die gewuenschte
              Reihenfolge. Solange hier nichts gewaehlt ist, zeigt die Website automatisch alle Fotos von oben.
            </p>

            {photoUrls.length > 0 && (
              <>
                <p style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: 6 }}>Aus vorhandenen Fotos waehlen</p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                  {photoUrls.map((url) => {
                    const selected = websitePhotos.includes(url)
                    return (
                      <button
                        key={url}
                        type="button"
                        onClick={() => toggleWebsitePhoto(url)}
                        style={{
                          position: 'relative',
                          padding: 0,
                          border: selected ? '3px solid var(--color-primary)' : '3px solid transparent',
                          borderRadius: 8,
                          cursor: 'pointer',
                          background: 'none',
                          lineHeight: 0,
                        }}
                      >
                        <img
                          src={url}
                          alt=""
                          style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 6, display: 'block' }}
                        />
                        {selected && (
                          <span
                            style={{
                              position: 'absolute',
                              bottom: 4,
                              right: 4,
                              background: 'var(--color-primary)',
                              color: '#fff',
                              fontSize: '0.68rem',
                              padding: '1px 6px',
                              borderRadius: 4,
                            }}
                          >
                            Website
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            <label htmlFor="websitePhotoUpload" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
              Zusaetzliche Website-Fotos hochladen
            </label>
            <input
              id="websitePhotoUpload"
              type="file"
              accept="image/*"
              multiple
              onChange={handleWebsitePhotoUpload}
              disabled={uploadingWebsitePhotos}
            />
            {uploadingWebsitePhotos && (
              <p style={{ fontSize: '0.82rem', color: 'var(--color-secondary)' }}>Uploading...</p>
            )}

            {websitePhotos.length > 0 && (
              <>
                <p style={{ fontSize: '0.82rem', fontWeight: 600, margin: '12px 0 6px' }}>
                  Reihenfolge auf der Website ({websitePhotos.length})
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {websitePhotos.map((url, index) => (
                    <div
                      key={url}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: 6,
                        border: '1px solid var(--color-beige)',
                        borderRadius: 8,
                      }}
                    >
                      <span style={{ fontSize: '0.82rem', width: 20, textAlign: 'center', color: 'var(--color-secondary)' }}>
                        {index + 1}
                      </span>
                      <img src={url} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6 }} />
                      <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => moveWebsitePhoto(index, -1)}
                          disabled={index === 0}
                          style={{ padding: '2px 8px' }}
                        >
                          Hoch
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => moveWebsitePhoto(index, 1)}
                          disabled={index === websitePhotos.length - 1}
                          style={{ padding: '2px 8px' }}
                        >
                          Runter
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => removeWebsitePhoto(url)}
                          style={{ padding: '2px 8px' }}
                        >
                          Entfernen
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.88rem' }}>{error}</p>}
        {success && (
          <p style={{ color: 'var(--color-success)', fontSize: '0.88rem' }}>{isEdit ? 'Listing updated!' : 'Listing created!'}</p>
        )}

        <button type="submit" className="btn btn-primary" disabled={saving || uploadingPhotos} style={{ marginTop: 10 }}>
          {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Publish listing'}
        </button>
      </form>
    </div>
  )
}
