import {
  RankingsPageContent,
  generateMetadata as rankingsMetadata,
  type RankingsPageProps
} from './rankings/page'

export const generateMetadata = rankingsMetadata
export const revalidate = 0

export default function HomePage(props: RankingsPageProps) {
  return RankingsPageContent(props)
}
