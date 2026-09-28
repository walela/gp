import type { Metadata } from 'next'

// The bare domain redirects here, so canonical URLs must use www.
export const SITE_URL = 'https://www.1700chess.sh'
export const SITE_NAME = 'Chess Kenya Grand Prix'

// Next replaces a parent's openGraph and twitter objects rather than merging them,
// so every page builds all three from the same title and description.
export function pageMetadata({ title, description, path }: {
  title: string
  description: string
  path: string
}): Metadata {
  const fullTitle = title === SITE_NAME ? title : `${title} - ${SITE_NAME}`
  return {
    title: title === SITE_NAME ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: { title: fullTitle, description, url: path, siteName: SITE_NAME, type: 'website', locale: 'en_KE' },
    twitter: { card: 'summary', title: fullTitle, description },
  }
}
