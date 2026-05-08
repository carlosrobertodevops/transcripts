import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function RootPage() {
  const cookieStore = await cookies()
  const session = cookieStore.get('transcripts_session')

  if (session) {
    redirect('/dashboard')
  }

  redirect('/inicio')
}
