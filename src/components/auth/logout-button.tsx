import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LogoutButtonProps = {
  appearance?: "sidebar" | "icon" | "button";
  inverse?: boolean;
};

export function LogoutButton({
  appearance = "sidebar",
  inverse = false,
}: LogoutButtonProps) {
  if (appearance === "icon") {
    return (
      <form action="/api/auth/logout" method="post">
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          aria-label="Sign out"
          className={cn(inverse && "text-white/70 hover:bg-white/10 hover:text-white")}
        >
          <LogOut className="size-4" aria-hidden="true" />
        </Button>
      </form>
    );
  }

  if (appearance === "button") {
    return (
      <form action="/api/auth/logout" method="post">
        <Button type="submit" variant="outline">
          <LogOut className="size-4" aria-hidden="true" />
          Sign out
        </Button>
      </form>
    );
  }

  return (
    <form action="/api/auth/logout" method="post">
      <button
        type="submit"
        className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-white/60 transition-colors hover:bg-white/7 hover:text-white"
      >
        <LogOut className="size-[18px]" aria-hidden="true" />
        Sign out
      </button>
    </form>
  );
}
