/**
 * Facebook Page posting unit tests (no Redis / live Graph API required).
 * Run: npm run test:facebook
 */
import assert from 'assert'
import {
  buildDefaultFacebookCaption,
  facebookStatusLabel,
  getFacebookConfigStatus,
  getFeaturedPhotoUrl,
  hasSuccessfulFacebookPost,
  maybePostProjectToFacebook,
  postPhotoToFacebookPage,
  sanitizeFacebookCaption,
  shouldAttemptFacebookOnSave,
  validateFacebookImageUrl,
  validateFacebookProjectUrl,
} from '../lib/facebookPagePost.mjs'
import { toPublicProject } from '../lib/projectsPublic.mjs'

function ok(name) {
  console.log(`PASS ${name}`)
}

function sampleProject(overrides = {}) {
  return {
    id: 'job-1111-2222',
    slug: 'window-cleaning-modesto-2026-07-30-abcd1234',
    status: 'published',
    service: 'window-cleaning',
    city: 'modesto',
    notes: 'Patio doors sparkling after a full clean.',
    photos: [{ url: 'https://blob.example.com/cover.jpg', label: 'after', sortOrder: 0 }],
    facebookPostStatus: 'not_posted',
    facebookPostId: null,
    facebookPostedAt: null,
    facebookPostError: null,
    facebookCaption: null,
    ...overrides,
  }
}

function memoryState(initial) {
  const store = { project: { ...initial } }
  return {
    store,
    async updateProjectFacebookState(_id, patch) {
      store.project = { ...store.project, ...patch, updatedAt: new Date().toISOString() }
      return store.project
    },
  }
}

{
  const caption = buildDefaultFacebookCaption(sampleProject())
  assert.match(caption, /Window Cleaning in Modesto, CA/)
  assert.match(caption, /Patio doors/)
  assert.match(caption, /https:\/\/www\.mikesexteriorcleaning\.com\/projects\//)
  ok('default caption includes service, city, notes, canonical URL')
}

{
  const dirty = sanitizeFacebookCaption('<b>Hi</b> call 209-555-1212 at 123 Main St')
  assert.equal(dirty.includes('<b>'), false)
  assert.match(dirty, /\[redacted\]/)
  ok('caption sanitizes HTML and PII')
}

{
  assert.equal(validateFacebookImageUrl('https://cdn.example/a.jpg').ok, true)
  assert.equal(validateFacebookImageUrl('http://cdn.example/a.jpg').ok, false)
  assert.equal(validateFacebookProjectUrl('https://www.mikesexteriorcleaning.com/projects/demo').ok, true)
  assert.equal(validateFacebookProjectUrl('https://www.mikesexteriorcleaning.com/services/x').ok, false)
  ok('validates image and project URLs')
}

{
  const cover = getFeaturedPhotoUrl(
    sampleProject({
      photos: [
        { url: 'https://blob.example.com/second.jpg', sortOrder: 1 },
        { url: 'https://blob.example.com/cover.jpg', sortOrder: 0 },
      ],
    }),
  )
  assert.equal(cover, 'https://blob.example.com/cover.jpg')
  ok('featured photo is cover (sortOrder 0)')
}

{
  assert.equal(facebookStatusLabel('posted'), 'Posted to Facebook')
  assert.equal(facebookStatusLabel('pending'), 'Facebook post pending')
  assert.equal(facebookStatusLabel('failed'), 'Facebook posting failed')
  assert.equal(facebookStatusLabel('not_posted'), 'Not posted to Facebook')
  ok('status labels')
}

{
  const prevEnv = {
    FACEBOOK_PAGE_ID: process.env.FACEBOOK_PAGE_ID,
    FACEBOOK_PAGE_ACCESS_TOKEN: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
    FACEBOOK_GRAPH_API_VERSION: process.env.FACEBOOK_GRAPH_API_VERSION,
  }
  delete process.env.FACEBOOK_PAGE_ID
  delete process.env.FACEBOOK_PAGE_ACCESS_TOKEN
  delete process.env.FACEBOOK_GRAPH_API_VERSION
  const status = getFacebookConfigStatus()
  assert.equal(status.configured, false)
  assert.equal('pageId' in status, false)
  assert.equal('token' in status, false)
  for (const [key, value] of Object.entries(prevEnv)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  ok('missing configuration handled safely without exposing secrets')
}

{
  const project = sampleProject()
  assert.equal(shouldAttemptFacebookOnSave({ previous: null, project, postToFacebook: true }), true)
  assert.equal(shouldAttemptFacebookOnSave({ previous: null, project, postToFacebook: false }), false)
  assert.equal(
    shouldAttemptFacebookOnSave({
      previous: sampleProject({ status: 'published' }),
      project,
      postToFacebook: true,
    }),
    false,
  )
  assert.equal(
    shouldAttemptFacebookOnSave({
      previous: sampleProject({ status: 'draft' }),
      project,
      postToFacebook: true,
    }),
    true,
  )
  ok('checkbox unchecked / edit published job does not auto-post')
}

{
  const project = sampleProject()
  const mem = memoryState(project)
  let posts = 0
  const result = await maybePostProjectToFacebook(
    project,
    { caption: buildDefaultFacebookCaption(project) },
    {
      updateProjectFacebookState: mem.updateProjectFacebookState,
      isFacebookConfigured: () => true,
      async postPhotoToFacebookPage() {
        posts += 1
        return { postId: 'fb_post_1' }
      },
    },
  )
  assert.equal(result.status, 'posted')
  assert.equal(result.project.facebookPostStatus, 'posted')
  assert.equal(result.project.facebookPostId, 'fb_post_1')
  assert.equal(posts, 1)
  ok('job posts to Facebook when Graph API succeeds')
}

{
  const project = sampleProject()
  const mem = memoryState(project)
  const result = await maybePostProjectToFacebook(
    project,
    { caption: buildDefaultFacebookCaption(project) },
    {
      updateProjectFacebookState: mem.updateProjectFacebookState,
      isFacebookConfigured: () => true,
      async postPhotoToFacebookPage() {
        throw new Error('Graph down')
      },
    },
  )
  assert.equal(result.status, 'failed')
  assert.equal(result.project.facebookPostStatus, 'failed')
  assert.match(result.project.facebookPostError || '', /Graph down/)
  assert.equal(result.project.status || project.status, 'published')
  ok('Facebook failure still leaves website job publishable / failed status saved')
}

{
  const project = sampleProject({
    facebookPostId: 'already_there',
    facebookPostStatus: 'posted',
  })
  const mem = memoryState(project)
  let posts = 0
  const first = await maybePostProjectToFacebook(project, { forceRetry: true }, {
    updateProjectFacebookState: mem.updateProjectFacebookState,
    isFacebookConfigured: () => true,
    async postPhotoToFacebookPage() {
      posts += 1
      return { postId: 'dup' }
    },
  })
  const second = await maybePostProjectToFacebook(first.project, { forceRetry: true }, {
    updateProjectFacebookState: mem.updateProjectFacebookState,
    isFacebookConfigured: () => true,
    async postPhotoToFacebookPage() {
      posts += 1
      return { postId: 'dup2' }
    },
  })
  assert.equal(first.skipped, true)
  assert.equal(second.skipped, true)
  assert.equal(posts, 0)
  assert.equal(hasSuccessfulFacebookPost(second.project), true)
  ok('duplicate submissions do not create duplicate posts')
}

{
  const project = sampleProject({ facebookPostStatus: 'failed', facebookPostError: 'temporary' })
  const mem = memoryState(project)
  let posts = 0
  const result = await maybePostProjectToFacebook(
    project,
    { forceRetry: true, caption: buildDefaultFacebookCaption(project) },
    {
      updateProjectFacebookState: mem.updateProjectFacebookState,
      isFacebookConfigured: () => true,
      async postPhotoToFacebookPage() {
        posts += 1
        return { postId: 'retry_ok' }
      },
    },
  )
  assert.equal(posts, 1)
  assert.equal(result.status, 'posted')
  assert.equal(result.facebookPostId, 'retry_ok')
  ok('retry works after failure')
}

{
  const publicProject = toPublicProject(
    sampleProject({
      facebookPostId: 'secret_post',
      facebookPostError: 'should not leak',
      facebookCaption: 'private caption',
    }),
  )
  assert.equal(publicProject.facebookPostId, undefined)
  assert.equal(publicProject.facebookPostError, undefined)
  assert.equal(publicProject.facebookCaption, undefined)
  ok('public project serializer omits Facebook fields')
}

{
  const prev = {
    FACEBOOK_PAGE_ID: process.env.FACEBOOK_PAGE_ID,
    FACEBOOK_PAGE_ACCESS_TOKEN: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
    FACEBOOK_GRAPH_API_VERSION: process.env.FACEBOOK_GRAPH_API_VERSION,
  }
  process.env.FACEBOOK_PAGE_ID = 'page123'
  process.env.FACEBOOK_PAGE_ACCESS_TOKEN = 'token-secret-value'
  process.env.FACEBOOK_GRAPH_API_VERSION = 'v21.0'

  const originalFetch = globalThis.fetch
  let sawTokenInUrl = false
  globalThis.fetch = async (url, init) => {
    const href = String(url)
    if (href.includes('token-secret-value')) sawTokenInUrl = true
    const body = String(init?.body || '')
    assert.match(body, /access_token=token-secret-value/)
    assert.match(body, /url=https%3A%2F%2Fblob\.example\.com%2Fcover\.jpg/)
    return {
      ok: true,
      async json() {
        return { id: 'photo1', post_id: 'page123_999' }
      },
    }
  }

  try {
    const result = await postPhotoToFacebookPage({
      imageUrl: 'https://blob.example.com/cover.jpg',
      caption: 'Hello https://www.mikesexteriorcleaning.com/projects/demo',
    })
    assert.equal(result.postId, 'page123_999')
    assert.equal(sawTokenInUrl, false)
    ok('Graph photo endpoint posts with token in body, not URL')
  } finally {
    globalThis.fetch = originalFetch
    for (const [key, value] of Object.entries(prev)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

console.log('All Facebook page-post checks passed.')
