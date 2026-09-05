"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { listReports, ReportSummary } from "@/lib/api";
import NavBar from "@/components/NavBar";
import { DocIcon } from "@/components/Icons";

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.push("/login");
        return;
      }
      try {
        setReports(await listReports());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }, [router]);

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="bg-gray-100 dark:bg-zinc-950">
        <div className="mx-auto max-w-4xl px-6 py-10">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Past reports</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            All the research reports you've generated.
          </p>

          {error && (
            <p className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
              {error}
            </p>
          )}

          {reports && reports.length === 0 && (
            <div className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-900">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400">
                <DocIcon className="h-6 w-6" />
              </span>
              <p className="mt-4 text-sm font-medium text-gray-900 dark:text-gray-50">
                No reports yet
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Ask your first question to generate a report.
              </p>
            </div>
          )}

          <ul className="mt-8 flex flex-col gap-3">
            {reports?.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/report?id=${r.id}`}
                  className="group block rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-violet-300 hover:shadow dark:border-gray-800 dark:bg-gray-900 dark:hover:border-violet-700"
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className="font-medium text-gray-900 group-hover:text-violet-700 dark:text-gray-50 dark:group-hover:text-violet-400">
                      {r.query}
                    </p>
                    <span className="hidden shrink-0 rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700 sm:inline dark:bg-violet-950 dark:text-violet-300">
                      Report
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                    {new Date(r.created_at).toLocaleString()}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
