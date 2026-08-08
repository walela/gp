import {
  RankingsPageContent,
  metadata as rankingsMetadata,
  type RankingsPageProps
} from './rankings/page'

export const metadata = rankingsMetadata
export const revalidate = 0

export default function HomePage(props: RankingsPageProps) {
  return RankingsPageContent(props)
}
