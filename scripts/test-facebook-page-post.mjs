/**
 * Facebook Page posting unit tests (no Redis / live Graph API required).
 * Run: npm run test:facebook
 *
 * These tests never create a real Facebook post.
 */
import assert from 'assert'
import {
  buildDefaultFacebookCaption,
  countProjectUrlOccurrences,
  facebookStatusLabel,
  finalizeFacebookCaption,
  getFacebookConfigStatus,
  getFeaturedPhotoUrl,
  hasSuccessfulFacebookPost,
  isAmbiguousFacebookError,
  maybePostProjectToFacebook,
  postPhotoToFacebookPage,
  sanitizeFacebookCaption,
  shortFacebookBlurb,
  shouldAttemptFacebookOnSave,
  stripProjectUrlsFromText,
  validateFacebookImageUrl,
  validateFacebookProjectUrl,
} from '../lib/facebookPagePost.mjs'
import { toPublicProject } from '../lib/projectsPublic.mjs'

const liveUrlOk = async (url) => ({ ok: true, url, status: 200 })

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
    notes:
      'Professional window cleaning, screen cleaning, and hard water removal completed for a Modesto, CA home. We restored clearer glass, cleaner screens, and a brighter interior view throughout the property after a full interior and exterior service.',
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
  const project = sampleProject()
  const caption = buildDefaultFacebookCaption(project)
  assert.match(caption, /Window Cleaning in Modesto, CA/)
  assert.match(
    caption,
    /https:\/\/www\.mikesexteriorcleaning\.com\/projects\/window-cleaning-modesto-2026-07-30-abcd1234/,
  )
  assert.match(caption, /Mike's Exterior Cleaning Services/)
  assert.ok(!caption.includes('brighter interior view throughout the property'))
  assert.ok(!caption.includes('your-new-project'))
  assert.equal(countProjectUrlOccurrences(caption), 1)
  assert.ok(shortFacebookBlurb(sampleProject().notes).length <= 100)
  ok('default caption is concise and includes service, city, canonical URL')
}

{
  const dirtyNotes =
    'Great results. See https://www.mikesexteriorcleaning.com/projects/your-new-project and also /projects/old-job-slug for details.'
  const blurb = shortFacebookBlurb(dirtyNotes)
  assert.ok(!blurb.includes('your-new-project'))
  assert.ok(!blurb.includes('/projects/'))
  ok('blurb strips placeholder and existing project URLs from notes')
}

{
  const project = sampleProject()
  const dirtyCaption = [
    'Window Cleaning in Modesto, CA',
    'Nice work https://www.mikesexteriorcleaning.com/projects/your-new-project',
    'Also https://www.mikesexteriorcleaning.com/projects/some-other-job',
    "Mike's Exterior Cleaning Services",
  ].join('\n')
  const finalized = finalizeFacebookCaption(project, dirtyCaption)
  assert.equal(finalized.ok, true)
  assert.equal(countProjectUrlOccurrences(finalized.caption), 1)
  assert.ok(finalized.caption.includes(finalized.projectUrl))
  assert.ok(!finalized.caption.includes('your-new-project'))
  assert.ok(!finalized.caption.includes('some-other-job'))
  assert.equal(
    finalized.projectUrl,
    'https://www.mikesexteriorcleaning.com/projects/window-cleaning-modesto-2026-07-30-abcd1234',
  )
  ok('finalize strips placeholders/duplicates and keeps one saved-slug URL')
}

{
  const missing = finalizeFacebookCaption(sampleProject({ slug: '' }), 'Hello')
  assert.equal(missing.ok, false)
  assert.match(missing.error || '', /saved project slug/i)
  const placeholder = finalizeFacebookCaption(sampleProject({ slug: 'your-new-project' }), 'Hello')
  assert.equal(placeholder.ok, false)
  assert.equal(validateFacebookProjectUrl('https://www.mikesexteriorcleaning.com/projects/your-new-project').ok, false)
  ok('missing or placeholder slug fails with actionable error')
}

{
  assert.equal(stripProjectUrlsFromText('See /projects/your-new-project today').includes('your-new-project'), false)
  ok('stripProjectUrlsFromText removes path-only placeholders')
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
  const timeoutErr = new Error('Facebook request timed out')
  timeoutErr.code = 'FACEBOOK_TIMEOUT'
  assert.equal(isAmbiguousFacebookError(timeoutErr), true)
  assert.equal(isAmbiguousFacebookError(new Error('Graph down')), false)
  ok('timeout errors are treated as ambiguous')
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
  let postedCaption = ''
  const result = await maybePostProjectToFacebook(
    project,
    { caption: buildDefaultFacebookCaption(project) },
    {
      updateProjectFacebookState: mem.updateProjectFacebookState,
      isFacebookConfigured: () => true,
      verifyProjectUrl: liveUrlOk,
      async findPagePostByProjectUrl() {
        return null
      },
      async postPhotoToFacebookPage({ caption }) {
        posts += 1
        postedCaption = caption
        return { postId: 'fb_post_1' }
      },
    },
  )
  assert.equal(result.status, 'posted')
  assert.equal(result.project.facebookPostStatus, 'posted')
  assert.equal(result.project.facebookPostId, 'fb_post_1')
  assert.equal(posts, 1)
  assert.equal(countProjectUrlOccurrences(postedCaption), 1)
  assert.ok(!postedCaption.includes('your-new-project'))
  ok('job posts to Facebook when Graph API succeeds')
}

{
  const project = sampleProject({
    notes: 'See https://www.mikesexteriorcleaning.com/projects/existing-job-slug for reference.',
  })
  const mem = memoryState(project)
  let postedCaption = ''
  const dirtyClientCaption = [
    'Window Cleaning in Modesto, CA',
    'See https://www.mikesexteriorcleaning.com/projects/your-new-project',
    "Mike's Exterior Cleaning Services",
  ].join('\n')
  const result = await maybePostProjectToFacebook(
    project,
    { caption: dirtyClientCaption },
    {
      updateProjectFacebookState: mem.updateProjectFacebookState,
      isFacebookConfigured: () => true,
      verifyProjectUrl: liveUrlOk,
      async findPagePostByProjectUrl() {
        return null
      },
      async postPhotoToFacebookPage({ caption }) {
        postedCaption = caption
        return { postId: 'fb_clean_caption' }
      },
    },
  )
  assert.equal(result.status, 'posted')
  assert.equal(countProjectUrlOccurrences(postedCaption), 1)
  assert.ok(postedCaption.includes(project.slug))
  assert.ok(!postedCaption.includes('your-new-project'))
  assert.ok(!postedCaption.includes('existing-job-slug'))
  assert.equal(result.project.facebookCaption, postedCaption)
  ok('publish with placeholder + notes URL posts one correct saved-slug link')
}

{
  const project = sampleProject({ slug: '' })
  const mem = memoryState(project)
  let posts = 0
  const result = await maybePostProjectToFacebook(
    project,
    { caption: 'Window Cleaning in Modesto, CA\nhttps://www.mikesexteriorcleaning.com/projects/your-new-project' },
    {
      updateProjectFacebookState: mem.updateProjectFacebookState,
      isFacebookConfigured: () => true,
      verifyProjectUrl: liveUrlOk,
      async findPagePostByProjectUrl() {
        return null
      },
      async postPhotoToFacebookPage() {
        posts += 1
        return { postId: 'should_not_post' }
      },
    },
  )
  assert.equal(posts, 0)
  assert.equal(result.status, 'failed')
  assert.match(result.error || '', /saved project slug/i)
  ok('missing saved slug blocks Facebook post with actionable error')
}

{
  const project = sampleProject({
    facebookPostStatus: 'failed',
    facebookPostError: 'old error',
    facebookCaption:
      'Retry me https://www.mikesexteriorcleaning.com/projects/your-new-project https://www.mikesexteriorcleaning.com/projects/wrong-slug',
  })
  const mem = memoryState(project)
  let postedCaption = ''
  const result = await maybePostProjectToFacebook(
    project,
    { forceRetry: true, caption: project.facebookCaption },
    {
      updateProjectFacebookState: mem.updateProjectFacebookState,
      isFacebookConfigured: () => true,
      verifyProjectUrl: liveUrlOk,
      async findPagePostByProjectUrl() {
        return null
      },
      async postPhotoToFacebookPage({ caption }) {
        postedCaption = caption
        return { postId: 'retry_clean' }
      },
    },
  )
  assert.equal(result.status, 'posted')
  assert.equal(countProjectUrlOccurrences(postedCaption), 1)
  assert.ok(postedCaption.includes(project.slug))
  assert.ok(!postedCaption.includes('your-new-project'))
  assert.ok(!postedCaption.includes('wrong-slug'))
  ok('Retry Facebook Post strips bad links and uses saved slug')
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
      async verifyProjectUrl() {
        return { ok: false, error: 'Project page is not live yet (HTTP 404). Wait for publishing to finish, then use Retry Facebook Post.' }
      },
      async findPagePostByProjectUrl() {
        return null
      },
      async postPhotoToFacebookPage() {
        posts += 1
        return { postId: 'should_not_post' }
      },
    },
  )
  assert.equal(posts, 0)
  assert.equal(result.status, 'failed')
  assert.match(result.error || '', /not live yet/i)
  ok('non-200 project URL blocks Facebook post')
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
      verifyProjectUrl: liveUrlOk,
      async findPagePostByProjectUrl() {
        return null
      },
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
  const project = sampleProject()
  const mem = memoryState(project)
  let posts = 0
  const timeoutErr = new Error('Facebook request timed out')
  timeoutErr.code = 'FACEBOOK_TIMEOUT'
  const result = await maybePostProjectToFacebook(
    project,
    { caption: buildDefaultFacebookCaption(project) },
    {
      updateProjectFacebookState: mem.updateProjectFacebookState,
      isFacebookConfigured: () => true,
      verifyProjectUrl: liveUrlOk,
      async findPagePostByProjectUrl() {
        // First call (pre-post) finds nothing; second call (after timeout) finds the accepted post.
        if (posts === 0) return null
        return { postId: 'page_timeout_reconciled', source: 'feed' }
      },
      async postPhotoToFacebookPage() {
        posts += 1
        throw timeoutErr
      },
    },
  )
  assert.equal(posts, 1)
  assert.equal(result.status, 'posted')
  assert.equal(result.reason, 'reconciled_after_timeout')
  assert.equal(result.project.facebookPostId, 'page_timeout_reconciled')
  assert.equal(result.project.facebookPostStatus, 'posted')
  assert.equal(result.project.facebookPostError, null)
  ok('ambiguous timeout reconciles to Posted when Facebook already accepted the post')
}

{
  const project = sampleProject({
    facebookPostStatus: 'failed',
    facebookPostError: 'Facebook request timed out',
  })
  const mem = memoryState(project)
  let posts = 0
  const result = await maybePostProjectToFacebook(
    project,
    { forceRetry: true, caption: buildDefaultFacebookCaption(project) },
    {
      updateProjectFacebookState: mem.updateProjectFacebookState,
      isFacebookConfigured: () => true,
      verifyProjectUrl: liveUrlOk,
      async findPagePostByProjectUrl() {
        return { postId: 'existing_from_timeout', source: 'published_posts' }
      },
      async postPhotoToFacebookPage() {
        posts += 1
        return { postId: 'should_not_create' }
      },
    },
  )
  assert.equal(posts, 0)
  assert.equal(result.skipped, true)
  assert.equal(result.reason, 'reconciled_existing')
  assert.equal(result.status, 'posted')
  assert.equal(result.facebookPostId, 'existing_from_timeout')
  ok('Retry adopts existing Facebook post instead of creating a duplicate')
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
    verifyProjectUrl: liveUrlOk,
    async findPagePostByProjectUrl() {
      return { postId: 'already_there', source: 'feed' }
    },
    async postPhotoToFacebookPage() {
      posts += 1
      return { postId: 'dup' }
    },
  })
  const second = await maybePostProjectToFacebook(first.project, { forceRetry: true }, {
    updateProjectFacebookState: mem.updateProjectFacebookState,
    isFacebookConfigured: () => true,
    verifyProjectUrl: liveUrlOk,
    async findPagePostByProjectUrl() {
      return { postId: 'already_there', source: 'feed' }
    },
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
      verifyProjectUrl: liveUrlOk,
      async findPagePostByProjectUrl() {
        return null
      },
      async postPhotoToFacebookPage() {
        posts += 1
        return { postId: 'retry_ok' }
      },
    },
  )
  assert.equal(posts, 1)
  assert.equal(result.status, 'posted')
  assert.equal(result.facebookPostId, 'retry_ok')
  ok('retry works after a real failure when no existing post is found')
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
