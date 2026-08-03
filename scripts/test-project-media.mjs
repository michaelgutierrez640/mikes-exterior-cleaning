#!/usr/bin/env node
/**
 * Completed Jobs media tests: photos, videos, mixed, validation, Facebook photo guard.
 * Run: npm run test:project-media
 */
import assert from 'assert'
import {
  getCoverPhoto,
  inferMediaKind,
  isPhotoMedia,
  isVideoContentType,
  isVideoMedia,
  MAX_MEDIA_ITEMS,
  MAX_PHOTO_BYTES,
  MAX_VIDEO_BYTES,
  sanitizeUploadFilename,
} from '../lib/projectMedia.mjs'
import { validateProjectInput } from '../lib/projectsStore.mjs'
import { getFeaturedPhotoUrl, shouldAttemptFacebookOnSave } from '../lib/facebookPagePost.mjs'
import { toPublicProject, toPublicProjectCard } from '../lib/projectsPublic.mjs'

/** Mirror of SEO VideoObject gating (avoids importing Vite-resolved src/ modules in Node). */
function buildVideoObjects(project) {
  const media = Array.isArray(project?.photos) ? project.photos : []
  const videos = media.filter((p) => isVideoMedia(p) || isVideoContentType(p.contentType, p.url))
  return videos
    .filter((video) => video?.url)
    .map((video) => ({
      '@type': 'VideoObject',
      contentUrl: video.url,
      thumbnailUrl: video.posterUrl || null,
      duration:
        Number.isFinite(Number(video.durationSeconds)) && Number(video.durationSeconds) > 0
          ? `PT${Math.round(Number(video.durationSeconds))}S`
          : undefined,
    }))
}

function ok(name) {
  console.log(`PASS ${name}`)
}

const base = {
  service: 'window-cleaning',
  city: 'manteca',
  propertyType: 'residential',
  completedAt: '2026-08-02',
  notes: 'Patio glass',
}

{
  const r = validateProjectInput({
    ...base,
    status: 'published',
    photos: [{ url: 'https://blob.example/a.jpg', label: 'after', contentType: 'image/jpeg' }],
  })
  assert.equal(r.ok, true)
  assert.equal(r.data.photos[0].kind, 'photo')
  ok('photo-only publish')
}

{
  const r = validateProjectInput({
    ...base,
    status: 'published',
    photos: [
      {
        url: 'https://blob.example/clip.mp4',
        label: 'general',
        contentType: 'video/mp4',
        kind: 'video',
        posterUrl: 'https://blob.example/poster.jpg',
        durationSeconds: 28,
      },
    ],
  })
  assert.equal(r.ok, true)
  assert.equal(r.data.photos[0].kind, 'video')
  assert.equal(r.data.photos[0].posterUrl, 'https://blob.example/poster.jpg')
  ok('video-only publish')
}

{
  const r = validateProjectInput({
    ...base,
    status: 'published',
    photos: [
      { url: 'https://blob.example/a.jpg', label: 'before', contentType: 'image/jpeg', sortOrder: 0 },
      {
        url: 'https://blob.example/clip.mov',
        label: 'general',
        contentType: 'video/quicktime',
        kind: 'video',
        sortOrder: 1,
      },
      { url: 'https://blob.example/b.jpg', label: 'after', contentType: 'image/jpeg', sortOrder: 2 },
    ],
  })
  assert.equal(r.ok, true)
  assert.equal(r.data.photos.length, 3)
  assert.equal(r.data.photos[0].kind, 'photo')
  assert.equal(r.data.photos[1].kind, 'video')
  assert.equal(r.data.photos[2].kind, 'photo')
  ok('mixed photo/video publish keeps order')
}

{
  const r = validateProjectInput({
    ...base,
    status: 'published',
    photos: [],
  })
  assert.equal(r.ok, false)
  ok('reject publish with no media')
}

{
  const tooMany = Array.from({ length: MAX_MEDIA_ITEMS + 1 }, (_, i) => ({
    url: `https://blob.example/${i}.jpg`,
    label: 'general',
  }))
  const r = validateProjectInput({ photos: tooMany }, { partial: true })
  assert.equal(r.ok, false)
  ok('reject oversized media count')
}

{
  const r = validateProjectInput(
    { photos: [{ url: 'http://insecure.example/a.mp4', kind: 'video', contentType: 'video/mp4' }] },
    { partial: true },
  )
  assert.equal(r.ok, false)
  ok('reject non-https video url')
}

{
  assert.equal(isVideoContentType('video/mp4', 'clip.mp4'), true)
  assert.equal(isVideoContentType('video/quicktime', 'clip.MOV'), true)
  assert.equal(isVideoContentType('video/webm', 'clip.webm'), true)
  assert.equal(isVideoContentType('image/jpeg', 'a.jpg'), false)
  assert.ok(MAX_PHOTO_BYTES < MAX_VIDEO_BYTES)
  assert.equal(sanitizeUploadFilename('../../evil name!!.MP4'), 'evil-name-.MP4')
  ok('type helpers + filename sanitize')
}

{
  const project = {
    status: 'published',
    photos: [
      { url: 'https://blob.example/clip.mp4', kind: 'video', contentType: 'video/mp4' },
      { url: 'https://blob.example/cover.jpg', kind: 'photo', contentType: 'image/jpeg', label: 'after' },
    ],
  }
  assert.equal(getFeaturedPhotoUrl(project), 'https://blob.example/cover.jpg')
  assert.equal(getCoverPhoto(project.photos)?.url, 'https://blob.example/cover.jpg')
  ok('Facebook/cover prefer photo over video')
}

{
  const previous = { status: 'published', facebookPostId: '123' }
  const next = {
    status: 'published',
    photos: [
      ...(previous.photos || []),
      { url: 'https://blob.example/new.mp4', kind: 'video', contentType: 'video/mp4' },
    ],
  }
  assert.equal(
    shouldAttemptFacebookOnSave({ previous, project: next, postToFacebook: true }),
    false,
  )
  ok('editing published job with video does not Facebook auto-post')
}

{
  const publicProject = toPublicProject({
    status: 'published',
    slug: 'window-cleaning-manteca-2026-08-02-abcdef12',
    service: 'window-cleaning',
    city: 'manteca',
    propertyType: 'residential',
    completedAt: '2026-08-02',
    notes: 'Clear glass',
    publishedAt: '2026-08-02T12:00:00.000Z',
    photos: [
      { url: 'https://blob.example/a.jpg', label: 'after', contentType: 'image/jpeg', kind: 'photo' },
      {
        url: 'https://blob.example/clip.mp4',
        label: 'general',
        contentType: 'video/mp4',
        kind: 'video',
        posterUrl: 'https://blob.example/poster.jpg',
        durationSeconds: 22,
      },
    ],
  })
  assert.ok(publicProject)
  assert.equal(publicProject.photos.length, 2)
  assert.equal(publicProject.photos[1].kind, 'video')
  const card = toPublicProjectCard({
    status: 'published',
    slug: publicProject.slug,
    service: 'window-cleaning',
    city: 'manteca',
    propertyType: 'residential',
    completedAt: '2026-08-02',
    notes: 'Clear glass',
    photos: publicProject.photos,
  })
  assert.equal(card.videoCount, 1)
  assert.equal(card.photoCount, 1)
  ok('public serializer preserves mixed media')
}

{
  const legacy = toPublicProject({
    status: 'published',
    slug: 'solar-panel-cleaning-tracy-2026-07-31-4feb345a',
    service: 'solar-panel-cleaning',
    city: 'tracy',
    propertyType: 'residential',
    completedAt: '2026-07-31',
    notes: '',
    photos: [{ url: 'https://blob.example/old.jpg', label: 'general' }],
  })
  assert.equal(legacy.photos[0].kind, 'photo')
  ok('existing photo-only jobs remain valid')
}

{
  const project = {
    photos: [
      { url: 'https://blob.example/a.jpg', label: 'after', kind: 'photo' },
      {
        url: 'https://blob.example/clip.mp4',
        kind: 'video',
        contentType: 'video/mp4',
        posterUrl: 'https://blob.example/poster.jpg',
        durationSeconds: 30,
      },
    ],
  }
  const videos = buildVideoObjects(project)
  assert.equal(videos.length, 1)
  assert.equal(videos[0].contentUrl, 'https://blob.example/clip.mp4')
  assert.equal(videos[0].thumbnailUrl, 'https://blob.example/poster.jpg')
  assert.equal(videos[0].duration, 'PT30S')
  ok('VideoObject schema when valid video present')
}

{
  const videos = buildVideoObjects({
    photos: [{ url: 'https://blob.example/a.jpg', kind: 'photo' }],
  })
  assert.equal(videos.length, 0)
  ok('no VideoObject for photo-only jobs')
}

{
  assert.equal(inferMediaKind({ contentType: 'video/webm' }), 'video')
  assert.equal(isPhotoMedia({ kind: 'photo' }), true)
  assert.equal(isVideoMedia({ kind: 'video' }), true)
  ok('kind inference helpers')
}

console.log('\nAll project media checks passed.')
