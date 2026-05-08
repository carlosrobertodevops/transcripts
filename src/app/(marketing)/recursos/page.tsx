import { Features } from "@/components/marketing/features";

export default function FeaturesPage() {
  return (
    <div className="space-y-12">
      <section className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Recursos Poderosos
        </h1>
        <p className="text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
          Tudo que você precisa para transcrever, editar e compartilhar áudio.
        </p>
      </section>
      <Features />
    </div>
  );
}
