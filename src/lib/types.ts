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
  role: AgentRole
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
