"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Role } from "@prisma/client";

interface Props {
  user: { name: string; email: string; role: Role; title?: string };
}

function NavLink({ href, children, exact }: { href: string; children: React.ReactNode; exact?: boolean }) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={`relative py-1 transition text-sm font-medium after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:rounded-full after:transition-transform after:duration-200 ${
        isActive
          ? "text-white after:bg-blue-300 after:scale-x-100"
          : "text-blue-200 hover:text-white after:bg-blue-300 after:scale-x-0 hover:after:scale-x-100"
      }`}
    >
      {children}
    </Link>
  );
}

export default function Navbar({ user }: Props) {
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <nav className="bg-gradient-to-r from-slate-900 via-blue-950 to-blue-900 text-white shadow-lg border-b border-blue-800/50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo + Nav */}
        <div className="flex items-center gap-7">
          <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow">
              <span className="text-white font-bold text-xs tracking-tight">DS</span>
            </div>
            <span className="text-base font-bold tracking-tight text-white">Destiny Springs</span>
          </Link>

          <div className="hidden md:flex items-center gap-5">
            <NavLink href="/dashboard" exact>Dashboard</NavLink>
            <NavLink href="/dashboard/sr-packets/new">New S&amp;R Packet</NavLink>
            <NavLink href="/dashboard/sr-packets">All Packets</NavLink>
            {(user.role === Role.ADMIN || user.role === Role.SUPERVISOR) && (
              <>
                <NavLink href="/dashboard/analytics">QAPI</NavLink>
                <NavLink href="/dashboard/admin">Admin</NavLink>
              </>
            )}
          </div>
        </div>

        {/* User + Sign Out */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-blue-600 border border-blue-400/40 flex items-center justify-center text-xs font-bold text-white">
              {initials}
            </div>
            <span className="text-sm text-blue-200 leading-none">
              <span className="text-white font-medium">{user.name}</span>
              <span className="block text-xs text-blue-300/80">{user.title ?? user.role}</span>
            </span>
          </div>
          <div className="h-5 w-px bg-blue-700/60 hidden md:block" />
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-sm text-blue-200 hover:text-white font-medium transition px-2 py-1 rounded hover:bg-white/10"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
