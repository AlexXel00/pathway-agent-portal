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

export interface Agent {
  id: string
  user_id: string | null
  name: string
  email: string | null
  phone: string | null
  is_admin: boolean
  notes: string | null
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
  total_commission_php: number
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
  title_status: string | null
  has_structure: boolean
  structure_types: StructureType[]
  structure_size_sqm: number | null
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
  videos: string[]
  map_url: string | null
  raw_media_url: string | null
  edited_media_url: string | null
  listing_status: ListingStatus
  closing_agent_id: string | null
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
  advertised_where: string | null
  has_potential_buyer: boolean
  was_shown: boolean
  notes: string | null
  updated_at: string
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
