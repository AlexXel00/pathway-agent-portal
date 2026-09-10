// Lets the user pick images from their Google Drive inside the portal.
// It loads Google's scripts on demand, opens the Drive Picker, downloads the
// chosen files and returns them as normal File objects - so the caller can
// upload them to Supabase Storage exactly like a local file upload.
//
// Requires three build-time environment variables:
//   VITE_GOOGLE_CLIENT_ID - OAuth 2.0 Web client ID
//   VITE_GOOGLE_API_KEY   - API key (developer key for the Picker)
//   VITE_GOOGLE_APP_ID    - the Google Cloud project NUMBER
//                           (needed so downloads of picked files work with the
//                            least-privilege drive.file scope)

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY as string
const APP_ID = import.meta.env.VITE_GOOGLE_APP_ID as string

// drive.file grants access only to files the user explicitly opens through the
// Picker. It is not a sensitive scope, so it needs no Google app verification.
const SCOPE = 'https://www.googleapis.com/auth/drive.file'

interface PickedDoc {
  id: string
  name: string
  mimeType: string
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve()
      return
    }
    const el = document.createElement('script')
    el.src = src
    el.async = true
    el.onload = () => resolve()
    el.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(el)
  })
}

function loadPickerModule(): Promise<void> {
  return new Promise((resolve, reject) => {
    const gapi = (window as unknown as { gapi?: any }).gapi
    if (!gapi) {
      reject(new Error('Google API script not loaded'))
      return
    }
    gapi.load('picker', {
      callback: () => resolve(),
      onerror: () => reject(new Error('Failed to load the Picker module')),
    })
  })
}

let cachedToken: string | null = null

function requestAccessToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    const google = (window as unknown as { google?: any }).google
    if (!google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services not loaded'))
      return
    }
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (response: any) => {
        if (response.error) {
          reject(new Error(response.error))
          return
        }
        cachedToken = response.access_token
        resolve(response.access_token)
      },
    })
    tokenClient.requestAccessToken({ prompt: cachedToken ? '' : 'consent' })
  })
}

function openPicker(token: string): Promise<PickedDoc[]> {
  return new Promise((resolve, reject) => {
    const google = (window as unknown as { google?: any }).google
    if (!google?.picker) {
      reject(new Error('Picker not available'))
      return
    }
    const view = new google.picker.DocsView(google.picker.ViewId.DOCS_IMAGES)
    view.setSelectFolderEnabled(false)

    const picker = new google.picker.PickerBuilder()
      .setAppId(APP_ID)
      .setOAuthToken(token)
      .setDeveloperKey(API_KEY)
      .addView(view)
      .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
      .setCallback((data: any) => {
        const action = data[google.picker.Response.ACTION]
        if (action === google.picker.Action.PICKED) {
          const docs: PickedDoc[] = (data[google.picker.Response.DOCUMENTS] || []).map((d: any) => ({
            id: d[google.picker.Document.ID],
            name: d[google.picker.Document.NAME],
            mimeType: d[google.picker.Document.MIME_TYPE],
          }))
          resolve(docs)
        } else if (action === google.picker.Action.CANCEL) {
          resolve([])
        }
      })
      .build()
    picker.setVisible(true)
  })
}

async function downloadFile(doc: PickedDoc, token: string): Promise<File> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${doc.id}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    throw new Error(`Download failed for ${doc.name} (${res.status})`)
  }
  const blob = await res.blob()
  return new File([blob], doc.name, { type: doc.mimeType || blob.type || 'image/jpeg' })
}

export async function pickImagesFromGoogleDrive(): Promise<File[]> {
  if (!CLIENT_ID || !API_KEY || !APP_ID) {
    throw new Error(
      'Google Drive is not configured. Set VITE_GOOGLE_CLIENT_ID, VITE_GOOGLE_API_KEY and VITE_GOOGLE_APP_ID.'
    )
  }
  await loadScript('https://accounts.google.com/gsi/client')
  await loadScript('https://apis.google.com/js/api.js')
  await loadPickerModule()
  const token = await requestAccessToken()
  const docs = await openPicker(token)
  const files: File[] = []
  for (const doc of docs) {
    files.push(await downloadFile(doc, token))
  }
  return files
}
