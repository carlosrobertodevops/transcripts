'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { Sidebar } from '@/components/app/sidebar'
import { Header } from '@/components/app/header'
import { PageTransition } from '@/components/providers/page-transition'

async function getCurrentUser() {
  const cookieStore = await cookies()
  const session = cookieStore.get('transcripts_session')?.value

  if (!session) {
    redirect('/login')
  }

  // TODO: Validate session token and fetch user data from backend
  // For now, return a basic user object
  return {
    id: '1',
    name: 'User',
    email: 'user@example.com',
  }
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await getCurrentUser()

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>
    </div>
  )
}
