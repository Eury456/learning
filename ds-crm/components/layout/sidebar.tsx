"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building,
  MapPin,
  Briefcase,
  Activity,
  CheckSquare,
  DollarSign,
  Upload,
  Building2,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { label: "Dashboard",   href: "/",           icon: LayoutDashboard },
  { label: "Contacts",    href: "/contacts",    icon: Users },
  { label: "Companies",   href: "/companies",   icon: Building },
  { label: "Projects",    href: "/projects",    icon: MapPin },
  { label: "Matters",     href: "/matters",     icon: Briefcase },
  { label: "Activities",  href: "/activities",  icon: Activity },
  { label: "Tasks",       href: "/tasks",       icon: CheckSquare },
  { label: "Revenue",     href: "/revenue",     icon: DollarSign },
  { label: "Collections", href: "/collections", icon: ClipboardList },
  { label: "Import Data", href: "/import",      icon: Upload },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-slate-200 bg-slate-950">
      <div className="flex h-16 items-center gap-2 border-b border-slate-800 px-6">
        <Building2 className="h-5 w-5 text-amber-400" />
        <div>
          <p className="text-sm font-semibold text-white">DS-CRM</p>
          <p className="text-[10px] text-slate-400">BBG · Land Use &amp; Incentives</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {nav.map(({ label, href, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <p className="text-xs text-slate-500">Belkin · Burden · Goldman LLP</p>
      </div>
    </aside>
  );
}
