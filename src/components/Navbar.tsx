"use client";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Role } from "@prisma/client";

interface Props {
  user: { name: string; email: string; role: Role; title?: string };
}

export default function Navbar({ user }: Props) {
  return (
    <nav className="bg-blue-900 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="text-xl font-bold tracking-tight">
            Destiny Springs
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="/dashboard" className="hover:text-blue-200 transition">Dashboard</Link>
            <Link href="/dashboard/sr-packets/new" className="hover:text-blue-200 transition">New S&amp;R Packet</Link>
            <Link href="/dashboard/sr-packets" className="hover:text-blue-200 transition">All Packets</Link>
            {(user.role === Role.ADMIN || user.role === Role.SUPERVISOR) && (
              <>
                <Link href="/dashboard/analytics" className="hover:text-blue-200 transition">QAPI</Link>
                <Link href="/dashboard/admin" className="hover:text-blue-200 transition">Admin</Link>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-blue-200 hidden md:inline">
            {user.name} &middot; {user.title ?? user.role}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="bg-white text-blue-900 font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-100 transition"
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
}
