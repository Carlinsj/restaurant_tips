"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, LogOut } from "lucide-react";
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
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function logout() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Logout failed");
      router.replace("/");
      router.refresh();
    } catch {
      setError("Could not sign out. Try again.");
      setLoading(false);
    }
  }

  if (appearance === "icon") {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={logout}
          disabled={loading}
          aria-label="Sign out"
          className={cn(inverse && "text-white/70 hover:bg-white/10 hover:text-white")}
        >
          {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <LogOut className="size-4" aria-hidden="true" />}
        </Button>
        {error && <span role="alert" className="text-[10px] text-destructive">{error}</span>}
      </div>
    );
  }

  if (appearance === "button") {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button type="button" variant="outline" onClick={logout} disabled={loading}>
          {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <LogOut className="size-4" aria-hidden="true" />}
          {loading ? "Signing out…" : "Sign out"}
        </Button>
        {error && <span role="alert" className="text-[10px] text-destructive">{error}</span>}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={logout}
        disabled={loading}
        className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-white/60 transition-colors hover:bg-white/7 hover:text-white disabled:cursor-wait disabled:opacity-60"
      >
        {loading ? <LoaderCircle className="size-[18px] animate-spin" aria-hidden="true" /> : <LogOut className="size-[18px]" aria-hidden="true" />}
        {loading ? "Signing out…" : "Sign out"}
      </button>
      {error && <p role="alert" className="px-3 pt-1 text-[10px] text-red-300">{error}</p>}
    </div>
  );
}
