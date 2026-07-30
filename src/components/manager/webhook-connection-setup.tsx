"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Copy,
  LoaderCircle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type WebhookProvider = "CHEFOS" | "UNIVERSAL_WEBHOOK";

type CreatedSetup = {
  integration: {
    id: string;
    displayName: string;
    provider: WebhookProvider;
  };
  webhookSetup: {
    endpointPath: string;
    signingHeader: string;
    signingAlgorithm: string;
    secret: string;
  };
};

type CopyFieldProps = {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
};

function CopyField({ label, value, copied, onCopy }: CopyFieldProps) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <div className="flex min-w-0 items-center gap-2">
        <code className="min-w-0 flex-1 overflow-x-auto rounded-lg border border-border bg-muted/45 px-3 py-2.5 text-xs">
          {value}
        </code>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onCopy}
          aria-label={`Copy ${label}`}
        >
          {copied ? (
            <Check className="size-4" aria-hidden="true" />
          ) : (
            <Copy className="size-4" aria-hidden="true" />
          )}
        </Button>
      </div>
    </div>
  );
}

export function WebhookConnectionSetup({
  provider,
}: {
  provider: WebhookProvider;
}) {
  const isChefOs = provider === "CHEFOS";
  const [displayName, setDisplayName] = useState(
    isChefOs ? "ChefOS" : "Restaurant POS",
  );
  const [currency, setCurrency] = useState("INR");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [setup, setSetup] = useState<CreatedSetup | null>(null);
  const [copied, setCopied] = useState("");
  const endpoint =
    setup && typeof window !== "undefined"
      ? new URL(setup.webhookSetup.endpointPath, window.location.origin).href
      : setup?.webhookSetup.endpointPath ?? "";

  async function createConnection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError("");

    try {
      const response = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          displayName,
          settings: { defaultCurrency: currency.trim().toUpperCase() },
          credentials: {},
        }),
      });
      const result = (await response.json()) as CreatedSetup & {
        error?: string;
      };

      if (!response.ok || !result.webhookSetup) {
        setError(result.error ?? "The secure endpoint could not be created.");
        return;
      }
      setSetup(result);
    } catch {
      setError("Unable to reach TipSathi. Check the app server and try again.");
    } finally {
      setCreating(false);
    }
  }

  async function copyValue(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(""), 1800);
    } catch {
      setError(
        "Your browser blocked copying. Select the value and copy it manually.",
      );
    }
  }

  const credentials = setup
    ? [
        { label: "Endpoint", value: endpoint },
        {
          label: "Signing header",
          value: setup.webhookSetup.signingHeader,
        },
        { label: "Signing secret", value: setup.webhookSetup.secret },
      ]
    : [];

  return (
    <div className="max-w-3xl">
      <Button
        variant="ghost"
        size="sm"
        asChild
        className="-ms-2 mb-4 text-muted-foreground"
      >
        <Link href="/manager/integrations">
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          POS connections
        </Link>
      </Button>

      <h1 className="text-2xl font-semibold tracking-[-0.035em] sm:text-[32px]">
        {isChefOs ? "Connect ChefOS" : "Create a webhook"}
      </h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Create the endpoint, then add its URL and signing secret to the sending
        system.
      </p>

      {error ? (
        <Alert variant="destructive" className="mt-6">
          <AlertCircle className="size-4" aria-hidden="true" />
          <AlertTitle>Connection not created</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!setup ? (
        <form
          onSubmit={createConnection}
          className="mt-6 grid gap-5 rounded-xl border border-border bg-card p-5 sm:p-6"
        >
          <div className="grid gap-2">
            <Label htmlFor="connection-name">Connection name</Label>
            <Input
              id="connection-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              minLength={2}
              maxLength={80}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="connection-currency">Default ISO currency</Label>
            <Input
              id="connection-currency"
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              minLength={3}
              maxLength={3}
              pattern="[A-Za-z]{3}"
              className="uppercase"
              required
            />
          </div>
          <Button type="submit" disabled={creating} className="sm:w-fit">
            {creating ? (
              <LoaderCircle
                className="size-4 animate-spin"
                aria-hidden="true"
              />
            ) : null}
            Create endpoint
          </Button>
        </form>
      ) : (
        <>
          <Alert className="mt-6 border-emerald-200 bg-emerald-50">
            <Check className="size-4 text-emerald-700" aria-hidden="true" />
            <AlertTitle className="text-emerald-900">Endpoint ready</AlertTitle>
            <AlertDescription className="text-emerald-800">
              Copy the secret now. It is only shown once.
            </AlertDescription>
          </Alert>

          <section className="mt-4 grid gap-5 rounded-xl border border-border bg-card p-5 sm:p-6">
            <h2 className="text-base font-semibold">Webhook credentials</h2>
            {credentials.map((item) => (
              <CopyField
                key={item.label}
                label={item.label}
                value={item.value}
                copied={copied === item.label}
                onCopy={() => copyValue(item.label, item.value)}
              />
            ))}
          </section>

          <section className="mt-4 rounded-xl border border-border p-5 text-sm leading-6">
            <h2 className="font-semibold">Request requirements</h2>
            <ul className="mt-2 list-disc space-y-1 ps-5 text-muted-foreground">
              <li>Send JSON with a unique event ID, event type, and bill data.</li>
              <li>Send all money as integer minor units.</li>
              <li>
                Sign the exact body with HMAC-SHA256 and place{" "}
                <code className="text-foreground">sha256=&lt;digest&gt;</code>{" "}
                in the signing header.
              </li>
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
