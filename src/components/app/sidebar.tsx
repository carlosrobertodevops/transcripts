"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Bell,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  AudioWaveform,
  Tag,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import type { UserRole } from "@/lib/auth";

interface SidebarProps {
  userRole: UserRole;
}

export function Sidebar({ userRole }: SidebarProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  interface NavItem {
    label: string;
    href: string;
    icon: typeof LayoutDashboard;
    roles?: UserRole[];
  }

  const navItems: NavItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Transcrições", href: "/transcripts", icon: FileText },
    { label: "Tags", href: "/tags", icon: Tag },
    { label: "Notificações", href: "/notifications", icon: Bell },
    {
      label: "Usuários",
      href: "/admin/users",
      icon: Users,
      roles: ["super_admin", "admin", "pro"],
    },
    { label: "Perfil", href: "/profile", icon: User },
  ];

  const visibleNavItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(userRole)
  );

  return (
    <aside
      className={`flex h-screen flex-col border-r border-primary/15 bg-sidebar/55 backdrop-blur-2xl transition-all duration-300 ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-primary/15 p-4">
        <div className="flex items-center gap-2 min-w-0">
          <div className="rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 p-1.5 backdrop-blur-xl border border-primary/30 shrink-0">
            <AudioWaveform className="h-5 w-5 text-primary" />
          </div>
          {!isCollapsed && (
            <h1 className="text-lg font-bold text-foreground truncate">
              transcripts
            </h1>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8 shrink-0"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <nav className="flex-1 space-y-2 p-4">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className="w-full justify-start text-muted-foreground hover:bg-primary/10 hover:text-primary"
              >
                <Icon className="h-5 w-5" />
                {!isCollapsed && <span className="ml-3">{item.label}</span>}
              </Button>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border/40 p-4 space-y-2">
        <Button
          variant="ghost"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="w-full justify-start text-muted-foreground hover:bg-primary/10 hover:text-primary"
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
          {!isCollapsed && (
            <span className="ml-3">
              {theme === "dark" ? "Claro" : "Escuro"}
            </span>
          )}
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          {!isCollapsed && <span className="ml-3">Sair</span>}
        </Button>
      </div>
    </aside>
  );
}
