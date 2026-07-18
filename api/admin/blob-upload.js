import { handleUpload } from '@vercel/blob/client'
import { json, requireAdmin } from '../../lib/adminAuth.mjs'

const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]

/** 10 MB — keeps phone photos practical while blocking huge dumps */
const MAX_SIZE_BYTES = 10 * 1024 * 1024

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return json(res, 405, { error: 'Method not allowed' })
  }

  const auth = requireAdmin(req)
  if (!auth.ok) return json(res, auth.status, { error: auth.error })

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return json(res, 503, {
      error: 'Blob storage not configured',
      hint: 'Add BLOB_READ_WRITE_TOKEN in Vercel (Storage → Blob)',
    })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const result = await handleUpload({
      body,
      request: req,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async (pathname) => {
        const safePath = String(pathname || '')
          .replace(/[^a-zA-Z0-9._/-]/g, '-')
          .slice(0, 180)
        if (!safePath.startsWith('completed-jobs/')) {
          throw new Error('Invalid upload path')
        }
        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_SIZE_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ purpose: 'completed-job' }),
        }
      },
      onUploadCompleted: async () => {
        // Client attaches URLs when saving the job. Callback may not run on localhost.
      },
    })
    return json(res, 200, result)
  } catch (err) {
    console.error('[admin/blob-upload]', err?.message || err)
    const message = err?.message || 'Upload authorization failed'
    const status = /unauth|not authenticated|invalid upload path/i.test(message) ? 401 : 400
    return json(res, status, { error: message })
  }
}
