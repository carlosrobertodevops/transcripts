import { requireUser } from "@/lib/auth-server";
import { ProfileForm } from "@/components/app/profile-form";

export default async function Page() {
  const user = await requireUser();

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Perfil</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Atualize suas informações e senha.
        </p>
      </header>
      <ProfileForm user={user} />
    </div>
  );
}
