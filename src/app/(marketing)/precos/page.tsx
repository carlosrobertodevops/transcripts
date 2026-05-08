import { Pricing } from "@/components/marketing/pricing";

export default function PricingPage() {
  return (
    <div className="space-y-12">
      <section className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Planos Transparentes
        </h1>
        <p className="text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
          Escolha o plano perfeito para suas necessidades de transcrição.
        </p>
      </section>
      <Pricing />
    </div>
  );
}
