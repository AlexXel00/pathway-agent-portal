// Edge Function: read-lot-shape
// Reads the boundary of a lot (bearing + distance per side) from a scan or photo of a land title,
// technical description or survey plan, using Claude. Admins only.
//
// Request (POST, JSON): { file_base64: string, media_type: "image/jpeg" | "image/png" | "image/webp" | "application/pdf" }
// Response: { found, sides: [{ ns, deg, min, sec, ew, dist }], lot_area_sqm, lot_label, notes }
//
// Needs the secret ANTHROPIC_API_KEY (Supabase Dashboard > Edge Functions > Secrets).

import { createClient } from 'npm:@supabase/supabase-js@2'

const MODEL = 'claude-opus-5-5'
const MAX_BASE64_LENGTH = 24 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const INSTRUCTIONS = `You read Philippine land documents (land titles TCT/OCT, technical descriptions, lot plans / survey plans).
Find the technical description of the lot boundary and report every side of the lot in order, using the report_lot tool.

Rules:
- A technical description usually reads like: Beginning at a point marked "1" on plan, being N. 45 deg. 31' E., 1,234.56 m. from BLLM No. 1, ...; thence S. 12 deg. 34' E., 25.00 m. to point 2; thence ... to the point of beginning.
- The FIRST line ("... from BLLM / BBM / MBM / monument / corner ...") is only a tie line to a survey monument. It is NOT a side of the lot. Never include it.
- Then report each "thence" line in order, from corner 1 back to corner 1. Typically 3 to 30 sides.
- Bearing: ns is N or S, deg/min/sec are numbers, ew is E or W. "Due North" = N 0 0 0 E, "Due South" = S 0 0 0 E, "Due East" = N 90 0 0 E, "Due West" = N 90 0 0 W.
- dist is the distance in meters as a plain number (1,234.56 -> 1234.56).
- On a survey plan the same data is often in a table of lines (e.g. "1-2 | S 12 34 E | 25.00"). Use it if there is no written technical description.
- If the document shows several lots, use the main lot (the one the title is for) and say so in notes.
- Read digits very carefully. Never guess a value. If any bearing or distance of the boundary is not readable, set found to false and explain in notes which line is unreadable.
- lot_area_sqm: the area stated in the document in square meters, if any. lot_label: e.g. "Lot 4567, Cad-850-D", if any.
- notes: short, plain English, at most 2 sentences.`

const TOOL = {
  name: 'report_lot',
  description: 'Report the boundary sides of the lot read from the document.',
  input_schema: {
    type: 'object',
    properties: {
      found: { type: 'boolean', description: 'True if a complete boundary was read.' },
      sides: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            ns: { type: 'string', enum: ['N', 'S'] },
            deg: { type: 'number' },
            min: { type: 'number' },
            sec: { type: 'number' },
            ew: { type: 'string', enum: ['E', 'W'] },
            dist: { type: 'number', description: 'Distance in meters' },
          },
          required: ['ns', 'deg', 'min', 'sec', 'ew', 'dist'],
        },
      },
      lot_area_sqm: { type: ['number', 'null'] },
      lot_label: { type: ['string', 'null'] },
      notes: { type: 'string' },
    },
    required: ['found', 'sides', 'notes'],
  },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  // 1) Only logged-in admins may use this (it sends documents to an outside service and costs money).
  const authHeader = req.headers.get('Authorization') ?? ''
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin')
  if (adminError || isAdmin !== true) return json({ error: 'Only admins can read lot shapes from scans.' }, 403)

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    return json({ error: 'The Anthropic API key is not set up yet (secret ANTHROPIC_API_KEY in Supabase).' }, 500)
  }

  // 2) Check the file
  let body: { file_base64?: string; media_type?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid request.' }, 400)
  }
  const data = body.file_base64 ?? ''
  const mediaType = body.media_type ?? ''
  if (!data || !ALLOWED_TYPES.includes(mediaType)) {
    return json({ error: 'Please use a photo (JPG, PNG, WEBP) or a PDF.' }, 400)
  }
  if (data.length > MAX_BASE64_LENGTH) return json({ error: 'The file is too large (max. about 18 MB).' }, 413)

  const fileBlock =
    mediaType === 'application/pdf'
      ? { type: 'document', source: { type: 'base64', media_type: mediaType, data } }
      : { type: 'image', source: { type: 'base64', media_type: mediaType, data } }

  // 3) Ask Claude, forcing the answer into the report_lot tool so we always get clean JSON
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      system: INSTRUCTIONS,
      tools: [TOOL],
      tool_choice: { type: 'tool', name: 'report_lot' },
      messages: [
        {
          role: 'user',
          content: [fileBlock, { type: 'text', text: 'Read the lot boundary from this document.' }],
        },
      ],
    }),
  })

  if (!response.ok) {
    const details = await response.text()
    console.error('Anthropic API error', response.status, details)
    const reason =
      response.status === 401
        ? 'The Anthropic API key is not valid.'
        : response.status === 400 && details.includes('credit')
          ? 'The Anthropic account has no credit left.'
          : 'The document could not be read right now. Please try again.'
    return json({ error: reason }, 502)
  }

  const result = await response.json()
  const toolUse = (result.content ?? []).find((b: { type: string }) => b.type === 'tool_use')
  if (!toolUse) return json({ error: 'The document could not be read.' }, 502)

  const input = toolUse.input ?? {}
  const sides = (Array.isArray(input.sides) ? input.sides : [])
    .map((s: Record<string, unknown>) => ({
      ns: s.ns === 'S' ? 'S' : 'N',
      deg: Number(s.deg) || 0,
      min: Number(s.min) || 0,
      sec: Number(s.sec) || 0,
      ew: s.ew === 'W' ? 'W' : 'E',
      dist: Number(s.dist) || 0,
    }))
    .filter((s: { deg: number; min: number; sec: number; dist: number }) => s.dist > 0 && s.deg <= 90 && s.min < 60 && s.sec < 60)

  return json({
    found: Boolean(input.found) && sides.length >= 3,
    sides,
    lot_area_sqm: typeof input.lot_area_sqm === 'number' ? input.lot_area_sqm : null,
    lot_label: typeof input.lot_label === 'string' ? input.lot_label : null,
    notes: typeof input.notes === 'string' ? input.notes : '',
  })
})
