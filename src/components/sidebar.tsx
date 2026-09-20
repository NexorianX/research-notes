"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Clock,
  BookOpen,
  StickyNote,
  Bookmark,
  Lightbulb,
  Tag as TagIcon,
  Search,
  Settings,
  Plus,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { ImportDowayModal } from "@/components/import-doway-modal";
import type { Course } from "@/lib/types";

function NavLink({
  href,
  icon: Icon,
  children,
  onNavigate,
}: {
  href: string;
  icon: React.ElementType;
  children: React.ReactNode;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/" && pathname.startsWith(href));
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors",
        active
          ? "bg-neutral-100 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
          : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800/60 dark:hover:text-neutral-100"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{children}</span>
    </Link>
  );
}

function SidebarContent({
  courses,
  onNavigate,
}: {
  courses: Course[];
  onNavigate?: () => void;
}) {
  const [importOpen, setImportOpen] = React.useState(false);
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-4">
        <div className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          Research Notes
        </div>
        <div className="text-xs text-neutral-400">研究所課程筆記</div>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-2 pb-4">
        <div className="space-y-0.5">
          <NavLink href="/" icon={LayoutDashboard} onNavigate={onNavigate}>
            Dashboard
          </NavLink>
          <NavLink href="/timeline" icon={Clock} onNavigate={onNavigate}>
            Semester Timeline
          </NavLink>
        </div>

        <div>
          <div className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-neutral-400">
            Courses
          </div>
          <div className="space-y-0.5">
            {courses.map((c) => (
              <NavLink
                key={c.id}
                href={`/courses/${c.id}`}
                icon={BookOpen}
                onNavigate={onNavigate}
              >
                {c.name}
              </NavLink>
            ))}
          </div>
        </div>

        <div className="space-y-0.5">
          <NavLink href="/notes" icon={StickyNote} onNavigate={onNavigate}>
            Notes
          </NavLink>
          <NavLink href="/bookmarks" icon={Bookmark} onNavigate={onNavigate}>
            Bookmarks
          </NavLink>
          <NavLink href="/thesis-ideas" icon={Lightbulb} onNavigate={onNavigate}>
            Thesis Ideas
          </NavLink>
          <NavLink href="/tags" icon={TagIcon} onNavigate={onNavigate}>
            Tags
          </NavLink>
          <NavLink href="/search" icon={Search} onNavigate={onNavigate}>
            Search
          </NavLink>
          <NavLink href="/settings" icon={Settings} onNavigate={onNavigate}>
            Settings
          </NavLink>
        </div>
      </nav>

      <div className="space-y-3 border-t border-neutral-200 p-3 dark:border-neutral-800">
        <button
          onClick={() => setImportOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
        >
          <Plus className="h-4 w-4" />
          匯入課程錄音
        </button>
        <div className="flex justify-center">
          <ThemeToggle />
        </div>
      </div>
      <ImportDowayModal
        courses={courses}
        open={importOpen}
        onOpenChange={setImportOpen}
      />
    </div>
  );
}

export function Sidebar({ courses }: { courses: Course[] }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-neutral-200 p-3 md:hidden dark:border-neutral-800">
        <div className="text-sm font-semibold">Research Notes</div>
        <button onClick={() => setMobileOpen(true)} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-neutral-200 md:block dark:border-neutral-800">
        <SidebarContent courses={courses} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-72 bg-white dark:bg-neutral-900">
            <button
              className="absolute right-3 top-3"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent courses={courses} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
