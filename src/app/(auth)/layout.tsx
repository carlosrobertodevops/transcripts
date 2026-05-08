import { VisualPanel } from '@/components/auth/visual-panel'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      {/* Visual Panel - Hidden on mobile */}
      <div className="hidden lg:w-2/3 lg:block bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
        <VisualPanel />
      </div>

      {/* Auth Form - 100% on mobile, 1/3 on desktop */}
      <div className="w-full lg:w-1/3 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  )
}
