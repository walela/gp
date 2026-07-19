import { timingSafeEqual } from 'node:crypto'
import { revalidateTag } from 'next/cache'
import type { NextRequest } from 'next/server'
import { GP_DATA_CACHE_TAG } from '@/lib/data-cache'

function secretsMatch(received: string | null, expected: string): boolean {
  if (!received) return false

  const receivedBuffer = Buffer.from(received)
  const expectedBuffer = Buffer.from(`Bearer ${expected}`)

  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  )
}

export async function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET

  if (!secret) {
    console.error('REVALIDATE_SECRET is not configured')
    return Response.json({ error: 'Revalidation is not configured' }, { status: 503 })
  }

  if (!secretsMatch(request.headers.get('authorization'), secret)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // expire: 0 makes the next request wait for fresh data instead of serving one
  // stale response while the cache refreshes in the background.
  revalidateTag(GP_DATA_CACHE_TAG, { expire: 0 })

  return Response.json({ revalidated: true, tag: GP_DATA_CACHE_TAG })
}
