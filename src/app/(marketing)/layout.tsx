import { BgGrid } from '@/components/app/bg-grid'
import { MarketingHeader } from '@/components/marketing/marketing-header'
import { Footer } from '@/components/marketing/footer'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen bg-background">
      <BgGrid />
      <MarketingHeader />
      <main className="relative z-10">
        {children}
      </main>
      <Footer />
    </div>
  )
}
