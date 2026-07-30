import Link from "next/link";
import { CircleDollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

type BrandProps = {
  href?: string;
  inverse?: boolean;
  compact?: boolean;
  className?: string;
};

export function Brand({
  href = "/",
  inverse = false,
  compact = false,
  className,
}: BrandProps) {
  return (
    <Link
      href={href}
      aria-label="TipSathi home"
      className={cn("inline-flex items-center gap-2.5", className)}
    >
      <span
        className={cn(
          "relative flex size-9 items-center justify-center rounded-[12px] shadow-sm",
          inverse
            ? "bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)]"
            : "bg-primary text-primary-foreground",
        )}
      >
        <CircleDollarSign className="size-[18px]" strokeWidth={2.5} />
        <span className="absolute -end-0.5 -top-0.5 size-2.5 rounded-full border-2 border-current bg-[#f7c85b]" />
      </span>
      {!compact && (
        <span
          className={cn(
            "text-[19px] font-semibold tracking-[-0.04em]",
            inverse ? "text-[var(--sidebar-foreground)]" : "text-foreground",
          )}
        >
          TipSathi
        </span>
      )}
    </Link>
  );
}
