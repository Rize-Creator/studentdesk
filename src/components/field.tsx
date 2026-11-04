import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const selectClass =
  "h-9 w-full rounded-md border border-input bg-card px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

export function Field({
  id,
  label,
  errors,
  className,
  children,
}: {
  id: string;
  label: string;
  errors?: string[];
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {errors?.map((error) => (
        <p key={error} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ))}
    </div>
  );
}
