import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Sidebar } from "@/components/sidebar";
import { listCourses } from "@/lib/repo/courses";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Research Notes — 研究所課程筆記",
  description: "個人研究所課程知識管理系統",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const courses = await listCourses();
  return (
    <html lang="zh-Hant" suppressHydrationWarning className="h-full">
      <body className="h-full min-h-screen bg-white text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100">
        <ThemeProvider>
          <div className="flex min-h-screen flex-col md:flex-row">
            <Sidebar courses={courses} />
            <main className="min-w-0 flex-1">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
