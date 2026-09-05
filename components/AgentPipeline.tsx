"use client";

import {
  BrainIcon,
  CheckIcon,
  DocIcon,
  PenIcon,
  SpinnerIcon,
} from "@/components/Icons";

export type StepStatus = "waiting" | "running" | "done";

const STEPS = [
  {
    label: "Planner Agent",
    icon: BrainIcon,
    iconClass: "bg-pink-100 text-pink-600 dark:bg-pink-950 dark:text-pink-400",
    waiting: "Waiting to start",
    running: "Breaking your question into sub-questions…",
    done: "Sub-questions ready",
  },
  {
    label: "Writer Agent",
    icon: PenIcon,
    iconClass: "bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400",
    waiting: "Waiting for planner",
    running: "Researching each sub-question…",
    done: "Research complete",
  },
  {
    label: "Report Generator",
    icon: DocIcon,
    iconClass: "bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400",
    waiting: "Waiting for writer",
    running: "Compiling your report…",
    done: "Report generated",
  },
];

function StatusBadge({ statuses }: { statuses: StepStatus[] }) {
  const allDone = statuses.every((s) => s === "done");
  const anyRunning = statuses.some((s) => s === "running");

  const label = allDone ? "Complete" : anyRunning ? "Running" : "Waiting";
  const classes = allDone
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
    : anyRunning
      ? "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400"
      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${classes}`}
    >
      {label}
    </span>
  );
}

function StepIndicator({ status }: { status: StepStatus }) {
  if (status === "done") {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
        <CheckIcon className="h-3.5 w-3.5" />
      </span>
    );
  }
  if (status === "running") {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400">
        <SpinnerIcon className="h-4 w-4" />
      </span>
    );
  }
  return <span className="h-6 w-6 shrink-0 rounded-full border-2 border-gray-200 dark:border-gray-700" />;
}

export default function AgentPipeline({ statuses }: { statuses: StepStatus[] }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-50">Agent Pipeline</h3>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Watch your research being generated
          </p>
        </div>
        <StatusBadge statuses={statuses} />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {STEPS.map((step, i) => {
          const status = statuses[i] ?? "waiting";
          const Icon = step.icon;
          return (
            <div
              key={step.label}
              className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                status === "running"
                  ? "border-violet-300 bg-violet-50/60 dark:border-violet-800 dark:bg-violet-950/40"
                  : "border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50"
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${step.iconClass}`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{step.label}</p>
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                  {status === "running" ? step.running : status === "done" ? step.done : step.waiting}
                </p>
              </div>
              <StepIndicator status={status} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
