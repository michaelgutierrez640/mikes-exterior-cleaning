/**
 * Hardened pigeon-guard submit helpers (timeouts, idempotency, photo attach).
 * Pure logic is unit-tested; network callers are injected for tests.
 */

import { createIdempotencyKey as createLeadIdempotencyKey } from './idempotencyKey.js'

export const SUBMIT_TIMEOUT_MS = 25000
export const UPLOAD_TIMEOUT_MS = 45000
export const FORM_SUBMIT_TIMEOUT_MS = 8000

export function createIdempotencyKey() {
  return createLeadIdempotencyKey('pg')
}

export function withTimeout(promise, ms, label = 'Request') {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(`${label} timed out. Please try again.`)
      err.code = 'TIMEOUT'
      reject(err)
    }, ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

/**
 * Run pigeon estimate submission.
 * Lead is created first; photos attach afterward. FormSubmit never blocks CRM success.
 *
 * @returns {Promise<{
 *   ok: true,
 *   id: string|null,
 *   photoWarning: string|null,
 *   status: 'success'
 * }>}
 */
export async function runPigeonGuardSubmission(
  {
    form,
    problems,
    photos,
    smsConsent,
    idempotencyKey,
    companyWebsite = '',
  },
  deps = {},
) {
  const {
    uploadPhoto,
    createLead,
    attachPhotos,
    notifyEmail,
    deletePhotos,
    onPhotoProgress,
  } = deps

  if (String(companyWebsite || '').trim()) {
    return { ok: true, id: null, photoWarning: null, status: 'success', honeypot: true }
  }

  if (typeof createLead !== 'function') {
    throw new Error('Missing createLead dependency')
  }

  let leadId = null
  const uploaded = []

  try {
    const leadResult = await withTimeout(
      createLead({ form, problems, smsConsent, idempotencyKey }),
      SUBMIT_TIMEOUT_MS,
      'Saving your estimate request',
    )
    leadId = leadResult?.id || null
  } catch (err) {
    // Lead-first flow: photos are uploaded after create. If a future caller uploads first,
    // clean orphans when create fails.
    if (uploaded.length && typeof deletePhotos === 'function') {
      try {
        await deletePhotos(uploaded)
      } catch {
        // non-fatal
      }
    }
    throw err
  }

  let photoWarning = null

  if (Array.isArray(photos) && photos.length && typeof uploadPhoto === 'function') {
    for (let i = 0; i < photos.length; i += 1) {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
      try {
        onPhotoProgress?.(i + 1, photos.length)
        const meta = await withTimeout(
          uploadPhoto(photos[i], {
            leadId,
            idempotencyKey,
            index: i,
            abortSignal: controller?.signal,
          }),
          UPLOAD_TIMEOUT_MS,
          `Photo ${i + 1} upload`,
        )
        if (meta) uploaded.push(meta)
      } catch (err) {
        try {
          controller?.abort()
        } catch {
          // ignore
        }
        photoWarning =
          err?.code === 'TIMEOUT'
            ? 'Your request was saved, but a photo upload timed out. Mike can follow up if needed.'
            : 'Your request was saved, but one or more photos could not be uploaded. Mike can follow up if needed.'
      }
    }

    if (uploaded.length && leadId && typeof attachPhotos === 'function') {
      try {
        await withTimeout(
          attachPhotos({ leadId, idempotencyKey, photos: uploaded, photoWarning }),
          SUBMIT_TIMEOUT_MS,
          'Attaching photos',
        )
      } catch {
        photoWarning =
          photoWarning ||
          'Your request was saved, but photos could not be attached. Mike can follow up if needed.'
      }
    } else if (photos.length && !uploaded.length) {
      photoWarning =
        photoWarning ||
        'Your request was saved, but photos could not be uploaded. Mike can follow up if needed.'
      if (leadId && typeof attachPhotos === 'function' && photoWarning) {
        try {
          await attachPhotos({ leadId, idempotencyKey, photos: [], photoWarning })
        } catch {
          // non-fatal
        }
      }
    }
  }

  // Email notify is best-effort and must never leave the UI stuck.
  if (typeof notifyEmail === 'function') {
    try {
      await withTimeout(
        notifyEmail({ form, problems, leadId }),
        FORM_SUBMIT_TIMEOUT_MS,
        'Email notification',
      )
    } catch {
      // CRM lead already saved — ignore email/network failures.
    }
  }

  return {
    ok: true,
    id: leadId,
    photoWarning,
    status: 'success',
  }
}
