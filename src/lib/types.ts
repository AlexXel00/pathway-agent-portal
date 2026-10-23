import type { StoredLotShape } from './lotShape'

export type PropertyType =
  | 'Commercial'
  | 'Residential'
  | 'Apartment/Condo'
  | 'Agricultural'
  | 'A&D'
  | 'Ready for Titling'
  | 'Other'

export type StructureType = 'Condo' | 'Apartment' | 'House' | 'Hotel' | 'Resort' | 'Farm' | 'Other'

export type ListingStatus = 'Active' | 'Sold' | 'On Hold' | 'Withdrawn'

export type Broker = 'Jason' | 'Catherine' | 'Other'

// A special access tier on top of is_admin - independent of it. 'Marketing' unlocks the
// Marketing Material and Request pages; 'Broker' is just a label for now.
export type AgentRole = 'Agent' | 'Marketing' | 'Broker'

export type SocialRole = 'editor' | 'viewer'

export interface Agent {
  id: string
  user_id: string | null
  name: string
  email: string | null
  phone: string | null
  is_admin: boolean
  // The head admin's admin rights cannot be revoked by anyone, including other admins -
  // enforced by a database trigger, not just hidden in the UI.
  is_head_admin: boolean
  can_view_markup: boolean
  role: AgentRole
  // Social media calendar access: editor = plan and edit, viewer = read only, null = no access.
  social_role: SocialRole | null
  notes: string | null
  created_at: string
}

export interface MarketingMaterial {
  id: string
  title: string
  description: string | null
  url: string
  created_by: string | null
  created_at: string
}

export interface MarketingRequest {
  id: string
  sender_agent_id: string
  message: string
  created_at: string
}

export interface AgentStats {
  agent_id: string
  name: string
  email: string | null
  phone: string | null
  is_admin: boolean
  total_sales_count: number
  total_sale_value_php: number
  // Only populated for admins and for the agent's own row - masked to null otherwise.
  total_commission_php: number | null
  advertised_count: number
  potential_buyer_count: number
}

export interface Property {
  id: string
  internal_code: string | null
  name: string
  municipality: string | null
  barangay: string | null
  type: PropertyType | null
  category: string | null
  title_status: string | null
  electricity: string | null
  water: string | null
  has_structure: boolean
  structure_types: StructureType[]
  structure_size_sqm: number | null
  build_area_text: string | null
  listing_kind: string
  condo_floor_area_sqm: number | null
  floor_level: string | null
  bedrooms: string | null
  bathrooms: number | null
  amenities: string[]
  completion_status: string | null
  lot_size_sqm: number | null
  special_selling_point: string | null
  tags: string[]
  description: string | null
  name_de?: string | null
  description_de?: string | null
  build_area_text_de?: string | null
  price_total_php: number | null
  price_per_sqm_php: number | null
  approx_commission_php: number | null
  listing_agent_id: string | null
  // Used when the listing agent is not one of our in-house agents.
  listing_agent_other_name: string | null
  // Only populated for admins - non-admin reads (via the properties_for_agents view) always get null here.
  owner_contact_name: string | null
  is_direct_owner: boolean
  broker: Broker | null
  broker_other_name: string | null
  broker_contact: string | null
  // Second broker, when the deal involves two (e.g. a buyer-side and a seller-side broker).
  broker2: Broker | null
  broker2_other_name: string | null
  broker2_contact: string | null
  photos: string[]
  // Curated photos shown on the public website, in display order.
  // Empty means the website falls back to all photos above.
  website_photos: string[]
  videos: string[]
  map_url: string | null
  // Optional coordinates for the embedded map view on the listing detail page.
  latitude: number | null
  longitude: number | null
  // Lot shape drawn in the portal (corner points + lengths), or older bearing + distance entries.
  lot_shape?: StoredLotShape | null
  // When false the shape is only shown here in the portal, not on the public website.
  lot_shape_public?: boolean
  raw_media_url: string | null
  edited_media_url: string | null
  listing_status: ListingStatus
  closing_agent_id: string | null
  // Used when the sale was closed by an agent outside our in-house roster.
  closing_agent_other_name: string | null
  actual_commission_php: number | null
  sale_date: string | null
  created_at: string
  updated_at: string
}

// Title scans and other legal documents of a listing. Admins only (row level security).
export interface PropertyDocument {
  id: string
  property_id: string
  doc_type: string
  file_path: string
  file_name: string
  notes: string | null
  uploaded_by: string | null
  created_at: string
}

export interface AgentActivity {
  id: string
  property_id: string
  agent_id: string
  advertised: boolean
  advertised_where: string[]
  has_potential_buyer: boolean
  was_shown: boolean
  notes: string | null
  updated_at: string
}

// Either a 1:1 direct message between two agents, or the single shared 'General' channel
// (is_group = true) that every signed-in agent can read and post to.
export interface ChatChannel {
  id: string
  is_group: boolean
  name: string | null
  created_at: string
}

export interface ChatChannelMember {
  channel_id: string
  agent_id: string
}

export interface ChatMessage {
  id: string
  channel_id: string
  sender_agent_id: string
  message: string
  created_at: string
}

// Returned by the get_login_digest() RPC, called once per genuine sign-in - summarizes
// what changed since the agent's previous login so we can show a "welcome back" popup.
export interface LoginDigest {
  new_listings: number
  sold_listings: number
  missed_messages: number
  // null on an agent's very first-ever login (nothing to compare against yet).
  previous_login_at: string | null
}

export type CompanyCategory = 'Our Values' | 'Our Services' | 'FAQ' | 'Marketing Guide'

export interface CompanyInfo {
  id: string
  category: CompanyCategory
  title: string
  body: string | null
  image_url: string | null
  sort_order: number
  created_at: string
}

export interface CondoProject {
  id: string
  name: string
  developer: string | null
  municipality: string | null
  barangay: string | null
  completion_status: string | null
  amenities: string[]
  description: string | null
  tags: string[]
  photos: string[]
  website_photos: string[]
  videos: string[]
  map_url: string | null
  floors: number | null
  listing_status: string | null
  show_on_website: boolean
  development_id: string | null
}

export interface CondoUnit {
  id: string
  project_id: string
  floor: number | null
  floor_label: string | null
  unit_no: string | null
  unit_type: string | null
  floor_area_sqm: number | null
  price_php: number | null
  tcp_php: number | null
  reservation_fee_php: number | null
  status: string
}

export interface CondoDevelopment {
  id: string
  name: string
  description: string | null
  description_de?: string | null
  amenities: string[]
  photos: string[]
}

// ---- Social media content calendar ----

export type ContentStatus = 'idea' | 'in_progress' | 'ready' | 'posted'
export type ContentMediaType = 'photo' | 'video' | 'both'
export type ContentMediaKind = 'photo' | 'video'
export type ContentMediaSource = 'Canva' | 'CapCut' | 'Google Drive' | 'Other'

export interface ContentCategory {
  id: string
  name: string
  color: string
  // property = a post in this category must link a property, condo = a condo project, null = optional.
  requires_object: 'property' | 'condo' | null
  sort_order: number
  is_active: boolean
  created_at: string
}

// One fixed two-week planning block, always starting on a Monday. A row only exists once
// someone has written a plan for that block - empty blocks are simply missing.
export interface ContentBlock {
  id: string
  start_date: string
  focus: string | null
  notes: string | null
  production_day_1: string | null
  production_day_2: string | null
  target_facebook: number
  target_instagram: number
  target_tiktok: number
  property_ids: string[]
  condo_project_ids: string[]
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ContentMedia {
  id: string
  post_id: string
  url: string
  kind: ContentMediaKind
  source: ContentMediaSource
  label: string | null
  sort_order: number
  created_at: string
}

export interface ContentPost {
  id: string
  post_date: string
  post_time: string | null
  title: string
  caption: string | null
  category_id: string | null
  property_id: string | null
  condo_project_id: string | null
  media_type: ContentMediaType
  on_facebook: boolean
  on_instagram: boolean
  on_tiktok: boolean
  posted_facebook: boolean
  posted_instagram: boolean
  posted_tiktok: boolean
  status: ContentStatus
  assigned_to: string | null
  needed_photos: number
  needed_videos: number
  shot_notes: string | null
  thumbnail_path: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  content_media?: ContentMedia[]
}
