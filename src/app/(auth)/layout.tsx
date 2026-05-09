import { VisualPanel } from '@/components/auth/visual-panel'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      {/* Visual Panel - Hidden on mobile */}
      <div className="hidden lg:w-2/3 lg:h-screen lg:block bg-gradient-to-br from-background via-sidebar to-background relative overflow-hidden">
        <VisualPanel />
      </div>

      {/* Auth Form - 100% on mobile, 1/3 on desktop */}
      <div className="w-full lg:w-1/3 flex items-center justify-center p-[16pt]">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  )
}
