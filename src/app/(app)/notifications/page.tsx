import { requireUser, getNotifications } from "@/lib/auth-server";
import { NotificationList } from "@/components/app/notification-list";

export default async function Page() {
  const user = await requireUser();
  const list = await getNotifications(user.id);

  const mapped = list.map((n) => ({
    ...n,
    createdAt: n.createdAt.toISOString(),
  }));

  return (
    <div className="max-w-3xl space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Notificações
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Atualizações sobre suas transcrições.
          </p>
        </div>
      </header>
      <NotificationList initial={mapped} />
    </div>
  );
}
