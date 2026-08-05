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

function assertNotesPlusUrlCaption(caption, project) {
  const projectUrl = `https://www.mikesexteriorcleaning.com/projects/${project.slug}`
  const notesBody = stripProjectUrlsFromText(project.notes)
  assert.equal(caption, `${notesBody}\n${projectUrl}`)
  assert.equal(countProjectUrlOccurrences(caption), 1)
  assert.ok(!caption.includes('your-new-project'))
}

{
  const project = sampleProject()
  const caption = buildDefaultFacebookCaption(project)
  assertNotesPlusUrlCaption(caption, project)
  assert.ok(caption.includes('brighter interior view throughout the property'))
  assert.ok(!caption.includes("Mike's Exterior Cleaning Services"))
  assert.ok(!caption.includes('Window Cleaning in Modesto'))
  ok('default caption is exact short job notes plus one canonical URL')
}

{
  const dirtyNotes =
    'Great results. See https://www.mikesexteriorcleaning.com/projects/your-new-project and also /projects/old-job-slug for details.'
  const project = sampleProject({ notes: dirtyNotes })
  const finalized = finalizeFacebookCaption(project)
  assert.equal(finalized.ok, true)
  assert.equal(countProjectUrlOccurrences(finalized.caption), 1)
  assert.ok(!finalized.caption.includes('your-new-project'))
  assert.ok(!finalized.caption.includes('old-job-slug'))
  assert.ok(finalized.caption.startsWith('Great results.'))
  assert.ok(finalized.caption.endsWith(finalized.projectUrl))
  assert.ok(finalized.caption.includes(`\n${finalized.projectUrl}`))
  ok('notes strip placeholder and existing project URLs before appending saved-slug URL')
}

{
  const project = sampleProject()
  const ignoredLegacyCaption = [
    'Window Cleaning in Modesto, CA',
    'Nice work https://www.mikesexteriorcleaning.com/projects/your-new-project',
    "Mike's Exterior Cleaning Services",
  ].join('\n')
  const finalized = finalizeFacebookCaption(project, ignoredLegacyCaption)
  assert.equal(finalized.ok, true)
  assertNotesPlusUrlCaption(finalized.caption, project)
  assert.ok(!finalized.caption.includes('your-new-project'))
  ok('finalize ignores separate caption field and uses short job notes')
}

{
  const missing = finalizeFacebookCaption(sampleProject({ slug: '' }))
  assert.equal(missing.ok, false)
  assert.match(missing.error || '', /saved project slug/i)
  const placeholder = finalizeFacebookCaption(sampleProject({ slug: 'your-new-project' }))
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
  const multiline = sanitizeFacebookCaption('Line one\n\nLine two\nhttps://www.mikesexteriorcleaning.com/projects/demo-slug')
  assert.ok(multiline.includes('\n'))
  assert.match(multiline, /Line one\n\nLine two\nhttps:\/\/www\.mikesexteriorcleaning\.com\/projects\/demo-slug/)
  ok('caption sanitizes HTML and PII while preserving newlines')
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
  assert.equal(facebookStatusLabel('failed'), 'Facebook posting failed')
  assert.equal(facebookStatusLabel('pending'), 'Facebook post pending')
  assert.equal(facebookStatusLabel('not_posted'), 'Not posted to Facebook')
  ok('status labels')
}

{
  const timeout = new Error('Facebook request timed out')
  timeout.code = 'FACEBOOK_TIMEOUT'
  assert.equal(isAmbiguousFacebookError(timeout), true)
  assert.equal(isAmbiguousFacebookError(new Error('Graph down')), false)
  ok('timeout errors are treated as ambiguous')
}

{
  const previous = process.env.FACEBOOK_PAGE_ACCESS_TOKEN
  const previousId = process.env.FACEBOOK_PAGE_ID
  delete process.env.FACEBOOK_PAGE_ACCESS_TOKEN
  delete process.env.FACEBOOK_PAGE_ID
  const status = getFacebookConfigStatus()
  assert.equal(status.configured, false)
  assert.ok(!JSON.stringify(status).includes('EAA'))
  if (previous !== undefined) process.env.FACEBOOK_PAGE_ACCESS_TOKEN = previous
  if (previousId !== undefined) process.env.FACEBOOK_PAGE_ID = previousId
  ok('missing configuration handled safely without exposing secrets')
}

{
  const project = sampleProject({ status: 'published', facebookPostId: 'already' })
  assert.equal(hasSuccessfulFacebookPost(project), true)
  assert.equal(
    shouldAttemptFacebookOnSave({
      previous: sampleProject({ status: 'published' }),
      project: sampleProject({ status: 'published' }),
      postToFacebook: true,
    }),
    false,
  )
  assert.equal(
    shouldAttemptFacebookOnSave({
      previous: null,
      project: sampleProject({ status: 'published' }),
      postToFacebook: false,
    }),
    false,
  )
  assert.equal(
    shouldAttemptFacebookOnSave({
      previous: sampleProject({ status: 'draft' }),
      project: sampleProject({ status: 'published' }),
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
    {},
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
  assertNotesPlusUrlCaption(postedCaption, project)
  ok('job posts to Facebook when Graph API succeeds')
}

{
  const project = sampleProject({
    notes: 'See https://www.mikesexteriorcleaning.com/projects/existing-job-slug for reference.',
  })
  const mem = memoryState(project)
  let postedCaption = ''
  const result = await maybePostProjectToFacebook(
    project,
    {
      caption: [
        'Window Cleaning in Modesto, CA',
        'See https://www.mikesexteriorcleaning.com/projects/your-new-project',
        "Mike's Exterior Cleaning Services",
      ].join('\n'),
    },
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
  assertNotesPlusUrlCaption(postedCaption, project)
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
    {},
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
    { forceRetry: true },
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
  assertNotesPlusUrlCaption(postedCaption, project)
  assert.ok(!postedCaption.includes('wrong-slug'))
  ok('Retry Facebook Post uses short job notes and one saved-slug link')
}

{
  const project = sampleProject()
  const mem = memoryState(project)
  let posts = 0
  const result = await maybePostProjectToFacebook(
    project,
    {},
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
    {},
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
    {},
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
  ok('ambiguous timeout reconciles to Posted when Facebook already accepted the post')
}

{
  const project = sampleProject({
    facebookPostStatus: 'failed',
    facebookPostError: 'timeout',
  })
  const mem = memoryState(project)
  let posts = 0
  const result = await maybePostProjectToFacebook(
    project,
    { forceRetry: true },
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
    facebookPostStatus: 'posted',
    facebookPostId: 'existing_post',
  })
  const mem = memoryState(project)
  let posts = 0
  const result = await maybePostProjectToFacebook(
    project,
    { forceRetry: true },
    {
      updateProjectFacebookState: mem.updateProjectFacebookState,
      isFacebookConfigured: () => true,
      verifyProjectUrl: liveUrlOk,
      async findPagePostByProjectUrl() {
        return null
      },
      async postPhotoToFacebookPage() {
        posts += 1
        return { postId: 'dup' }
      },
    },
  )
  assert.equal(posts, 0)
  assert.equal(result.skipped, true)
  assert.equal(result.reason, 'already_posted')
  ok('duplicate submissions do not create duplicate posts')
}

{
  const project = sampleProject({
    facebookPostStatus: 'failed',
    facebookPostError: 'previous failure',
  })
  const mem = memoryState(project)
  let posts = 0
  const result = await maybePostProjectToFacebook(
    project,
    { forceRetry: true },
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
  assert.equal(result.project.facebookPostId, 'retry_ok')
  ok('retry works after a real failure when no existing post is found')
}

{
  const pub = toPublicProject(
    sampleProject({
      facebookPostId: 'secret',
      facebookPostStatus: 'posted',
      facebookCaption: 'internal',
      facebookPostError: 'x',
    }),
  )
  assert.equal(pub.facebookPostId, undefined)
  assert.equal(pub.facebookCaption, undefined)
  assert.equal(pub.facebookPostError, undefined)
  ok('public project serializer omits Facebook fields')
}

{
  const previous = process.env.FACEBOOK_PAGE_ACCESS_TOKEN
  const previousId = process.env.FACEBOOK_PAGE_ID
  const previousVersion = process.env.FACEBOOK_GRAPH_API_VERSION
  process.env.FACEBOOK_PAGE_ACCESS_TOKEN = 'EAA_test_token'
  process.env.FACEBOOK_PAGE_ID = '12345'
  process.env.FACEBOOK_GRAPH_API_VERSION = 'v21.0'
  let capturedUrl = ''
  let capturedBody = ''
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (url, init) => {
    capturedUrl = String(url)
    capturedBody = String(init?.body || '')
    return {
      ok: true,
      status: 200,
      async json() {
        return { id: 'photo_1', post_id: 'page_post_1' }
      },
      async text() {
        return ''
      },
    }
  }
  try {
    const result = await postPhotoToFacebookPage({
      imageUrl: 'https://blob.example.com/cover.jpg',
      caption: 'Hello\nhttps://www.mikesexteriorcleaning.com/projects/demo',
    })
    assert.equal(result.postId, 'page_post_1')
    assert.ok(capturedUrl.includes('/photos'))
    assert.ok(!capturedUrl.includes('access_token'))
    assert.ok(capturedBody.includes('access_token='))
    assert.ok(capturedBody.includes(encodeURIComponent('Hello\nhttps://www.mikesexteriorcleaning.com/projects/demo')))
  } finally {
    globalThis.fetch = originalFetch
    if (previous !== undefined) process.env.FACEBOOK_PAGE_ACCESS_TOKEN = previous
    else delete process.env.FACEBOOK_PAGE_ACCESS_TOKEN
    if (previousId !== undefined) process.env.FACEBOOK_PAGE_ID = previousId
    else delete process.env.FACEBOOK_PAGE_ID
    if (previousVersion !== undefined) process.env.FACEBOOK_GRAPH_API_VERSION = previousVersion
    else delete process.env.FACEBOOK_GRAPH_API_VERSION
  }
  ok('Graph photo endpoint posts with token in body, not URL')
}

console.log('All Facebook page-post checks passed.')
