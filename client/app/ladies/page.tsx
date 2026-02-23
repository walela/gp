import { redirect } from 'next/navigation'

export default function LadiesPage() {
  redirect('/rankings?category=ladies')
}
