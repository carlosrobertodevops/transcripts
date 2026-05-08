import { Hero } from '@/components/marketing/hero'
import { Features } from '@/components/marketing/features'
import { Pricing } from '@/components/marketing/pricing'

export default function InitPage() {
  return (
    <div className="space-y-24 py-12 sm:space-y-32 sm:py-20">
      <Hero />
      <Features />
      <Pricing />
    </div>
  )
}
