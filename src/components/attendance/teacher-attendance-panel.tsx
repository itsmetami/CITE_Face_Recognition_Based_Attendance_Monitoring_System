"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

export type TeacherAttendanceRecord = {
  id: string;
  work_date: string;
  time_in: string;
  time_out: string | null;
  time_out_status: "complete" | "forgot_time_out" | null;
};

type TeacherAttendancePanelProps = {
  initialRecord: TeacherAttendanceRecord | null;
  initialError: string | null;
};

type DetectedBarcode = { rawValue: string };
type BarcodeDetectorLike = {
  detect: (source: HTMLVideoElement) => Promise<DetectedBarcode[]>;
};
type BarcodeDetectorConstructor = new (options?: { formats: string[] }) => BarcodeDetectorLike;

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function manilaDateNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((value) => value.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function TeacherAttendancePanel({ initialRecord, initialError }: TeacherAttendancePanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);
  const [record, setRecord] = useState(initialRecord);
  const [scanning, setScanning] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(initialError);
  const [error, setError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  }, []);

  const submitToken = useCallback(async (rawValue: string) => {
    stopCamera();
    if (!isUuid(rawValue.trim())) {
      setError("That does not look like an office attendance QR code. Scan the code displayed by the secretary.");
      return;
    }

    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const supabase = createClient();
      const { data, error: scanError } = await supabase.rpc("record_attendance_scan", {
        p_token: rawValue.trim(),
      });
      if (scanError) throw scanError;

      const scanResult = (Array.isArray(data) ? data[0] : data) as
        | { record_id: string; work_date: string; time_in: string; time_out: string | null; scan_type: "time_in" | "time_out" }
        | undefined;
      if (!scanResult?.record_id || !scanResult.scan_type) {
        throw new Error("The attendance service returned no scan result.");
      }

      setRecord({
        id: scanResult.record_id,
        work_date: scanResult.work_date,
        time_in: scanResult.time_in,
        time_out: scanResult.time_out,
        time_out_status: scanResult.time_out ? "complete" : null,
      });
      setMessage(
        scanResult.scan_type === "time_in"
          ? `Time-in recorded at ${formatTime(scanResult.time_in)}.`
          : `Time-out recorded at ${scanResult.time_out ? formatTime(scanResult.time_out) : "the current time"}.`,
      );
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : "Could not record the scan. Please try again.");
    } finally {
      setPending(false);
    }
  }, [stopCamera]);

  const startCamera = useCallback(async () => {
    setError(null);
    setMessage(null);
    const Detector = (window as Window & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
    if (!Detector) {
      setError("QR scanning is not supported by this browser. Open the app in a recent version of Chrome or Edge.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera access is unavailable. Use HTTPS and allow camera access in your browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" } },
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        return;
      }

      video.srcObject = stream;
      await video.play();
      scanningRef.current = true;
      setScanning(true);
      const detector = new Detector({ formats: ["qr_code"] });

      while (scanningRef.current) {
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          const [barcode] = await detector.detect(video);
          if (barcode?.rawValue) {
            scanningRef.current = false;
            await submitToken(barcode.rawValue);
            return;
          }
        }
        await new Promise((resolve) => window.setTimeout(resolve, 250));
      }
    } catch (cameraError) {
      stopCamera();
      setError(
        cameraError instanceof Error && cameraError.name === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access in your browser settings and try again."
          : "Could not start the camera. Check camera permissions and try again.",
      );
    }
  }, [stopCamera, submitToken]);

  useEffect(() => () => {
    scanningRef.current = false;
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const attendanceDate = record
    ? new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila",
        dateStyle: "full",
      }).format(new Date(`${record.work_date}T12:00:00+08:00`))
    : null;
  const missedTimeOut = Boolean(
    record && !record.time_out &&
    (record.time_out_status === "forgot_time_out" || record.work_date < manilaDateNow()),
  );

  return (
    <section className="space-y-5" aria-labelledby="teacher-attendance-title">
      <div>
        <h2 id="teacher-attendance-title" className="text-2xl font-semibold tracking-tight">My attendance</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Scan the current QR displayed in the office. Your first scan is time-in; your second is time-out.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scan office QR</CardTitle>
          <CardDescription>The app records the scan time automatically using the attendance system clock.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <video
            ref={videoRef}
            className={scanning ? "aspect-video w-full rounded-lg bg-black object-cover" : "hidden"}
            playsInline
            muted
            aria-label="Camera view for scanning the office attendance QR code"
          />
          <div className="flex flex-wrap gap-3">
            {!scanning ? (
              <Button type="button" onClick={() => void startCamera()} disabled={pending}>
                {pending ? "Recording scan…" : "Open camera to scan"}
              </Button>
            ) : (
              <Button type="button" variant="outline" onClick={stopCamera}>Stop camera</Button>
            )}
          </div>
          {scanning && <p className="text-sm text-muted-foreground" role="status">Point your camera at the QR code shown in the office.</p>}
          {message && <p className="text-sm text-emerald-700" role="status">{message}</p>}
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Today’s record</CardTitle>
          <CardDescription>{attendanceDate ?? "Your latest daily time-in and time-out record."}</CardDescription>
        </CardHeader>
        <CardContent>
          {record ? (
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-muted-foreground">Time in</dt>
                <dd className="font-medium">{formatTime(record.time_in)}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Time out</dt>
                <dd className="font-medium">
                  {record.time_out
                    ? formatTime(record.time_out)
                    : missedTimeOut
                      ? "11:59 PM — Forgot to time out"
                      : "Not recorded yet"}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">No attendance record is available yet. Scan the office QR to record time-in.</p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
