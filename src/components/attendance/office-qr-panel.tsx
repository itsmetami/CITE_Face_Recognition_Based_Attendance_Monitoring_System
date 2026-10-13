"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

export type OfficeQrCode = {
  token: string;
  created_at: string;
  expires_at: string;
};

type OfficeQrPanelProps = {
  initialCode: OfficeQrCode | null;
  initialError: string | null;
};

function formatExpiry(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

export function OfficeQrPanel({ initialCode, initialError }: OfficeQrPanelProps) {
  const [code, setCode] = useState<OfficeQrCode | null>(initialCode);
  const [now, setNow] = useState(() => Date.now());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const requestInProgress = useRef(false);

  const generateCode = useCallback(async (force = false) => {
    if (requestInProgress.current) return;

    requestInProgress.current = true;
    setPending(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: createError } = await supabase.rpc("create_office_qr_code", { p_force: force });
      if (createError) throw createError;

      const nextCode = (Array.isArray(data) ? data[0] : data) as OfficeQrCode | undefined;
      if (!nextCode?.token || !nextCode.expires_at) {
        throw new Error("The office QR service returned no active code.");
      }

      setCode(nextCode);
      setNow(Date.now());
    } catch {
      setCode(null);
      setError("Could not create the office QR code. Check that migration 004 has run, then retry.");
    } finally {
      requestInProgress.current = false;
      setPending(false);
    }
  }, []);

  useEffect(() => {
    const currentIsValid = initialCode && Date.parse(initialCode.expires_at) > Date.now();
    if (currentIsValid) return;

    const requestTimer = window.setTimeout(() => void generateCode(), 0);
    return () => window.clearTimeout(requestTimer);
  }, [generateCode, initialCode]);

  useEffect(() => {
    if (!code) return;

    const expiresAt = Date.parse(code.expires_at);
    const refreshTimer = window.setTimeout(
      () => void generateCode(),
      Math.max(0, expiresAt - Date.now()),
    );
    const clockTimer = window.setInterval(() => setNow(Date.now()), 1000);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible" && Date.now() >= expiresAt) {
        void generateCode();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearTimeout(refreshTimer);
      window.clearInterval(clockTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [code, generateCode]);

  const secondsRemaining = code
    ? Math.max(0, Math.ceil((Date.parse(code.expires_at) - now) / 1000))
    : 0;
  return (
    <section className="space-y-5" aria-labelledby="office-qr-title">
      <div>
        <h2 id="office-qr-title" className="text-2xl font-semibold tracking-tight">Office attendance QR</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Keep this screen open in the office. The QR code renews every five minutes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current check-in code</CardTitle>
          <CardDescription>
            Teachers scan once before their first class to time in, then once at the end of the day to time out.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-5">
          {code && secondsRemaining > 0 ? (
            <div className="rounded-xl border border-border bg-white p-4">
              <QRCodeSVG value={code.token} size={256} level="M" includeMargin />
            </div>
          ) : (
            <div className="flex h-72 w-72 items-center justify-center rounded-xl border border-dashed border-border text-center text-sm text-muted-foreground">
              {pending ? "Generating a secure QR code…" : "QR code unavailable"}
            </div>
          )}

          <div className="text-center">
            {code && secondsRemaining > 0 ? (
              <>
                <p className="text-sm font-medium" role="status">
                  Refreshes in {Math.floor(secondsRemaining / 60)}:{String(secondsRemaining % 60).padStart(2, "0")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Expires at {formatExpiry(code.expires_at)} (Philippine time)
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground" role="status">
                {pending ? "Preparing a new code…" : "Waiting for an active code."}
              </p>
            )}
          </div>

          {error && <p className="max-w-md text-center text-sm text-destructive" role="alert">{error}</p>}

          <Button type="button" variant="outline" onClick={() => void generateCode(true)} disabled={pending}>
            {pending ? "Refreshing…" : "Rotate code now"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily attendance rule</CardTitle>
          <CardDescription>
            QR rotation is separate from attendance: each teacher gets one time-in and one time-out per day. A missed time-out is recorded as 11:59 PM and marked “Forgot to time out.”
          </CardDescription>
        </CardHeader>
      </Card>
    </section>
  );
}
