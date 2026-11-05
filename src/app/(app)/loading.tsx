import { Skeleton } from "@/components/ui/skeleton";

// Shaped like the app shell, so the first load after the database wakes up doesn't look broken.
export default function AppLoading() {
  return (
    <div role="status" aria-label="Loading" className="flex min-h-svh flex-1 flex-col bg-navy lg:flex-row">
      <div className="flex shrink-0 flex-col gap-4 px-4 py-4 sm:px-6 lg:w-80 lg:py-6">
        <Skeleton className="h-7 w-32 bg-white/15" />
        <Skeleton className="h-9 w-full bg-white/10" />
        <Skeleton className="hidden h-9 w-full bg-white/10 lg:block" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-4 rounded-t-3xl bg-background p-4 sm:p-6 lg:my-3 lg:mr-3 lg:rounded-3xl lg:p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
