"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

type Teacher = { user_id: string; display_name: string };
type AttendanceRecord = {
  id: string;
  teacher_id: string;
  work_date: string;
  time_in: string;
  time_out: string | null;
  time_out_status: "complete" | "forgot_time_out" | null;
};

type OfficeAttendanceListProps = {
  teachers: Teacher[];
  initialError: string | null;
};

const PAGE_SIZE = 20;

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

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

function csvCell(value: string) {
  // Prevent spreadsheet software from treating user-controlled text as a formula.
  const safeValue = /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safeValue.replaceAll('"', '""')}"`;
}

export function OfficeAttendanceList({ teachers, initialError }: OfficeAttendanceListProps) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(initialError);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [page, setPage] = useState(0);
  const [loadKey, setLoadKey] = useState(0);

  const loadRecords = useCallback(async (isCurrent: () => boolean) => {
    setLoading(true);
    setError(initialError);
    try {
      const supabase = createClient();
      const allRecords: AttendanceRecord[] = [];
      const batchSize = 500;
      for (let offset = 0; ; offset += batchSize) {
        const { data, error: queryError } = await supabase
          .from("attendance_records")
          .select("id, teacher_id, work_date, time_in, time_out, time_out_status")
          .order("work_date", { ascending: false })
          .order("time_in", { ascending: false })
          .range(offset, offset + batchSize - 1);
        if (queryError) throw queryError;
        const batch = (data ?? []) as AttendanceRecord[];
        allRecords.push(...batch);
        if (batch.length < batchSize) break;
      }
      if (isCurrent()) setRecords(allRecords);
    } catch {
      if (isCurrent()) setError("Could not load attendance records. Refresh and try again.");
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [initialError]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => void loadRecords(() => active), 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [loadKey, loadRecords]);

  const teacherNames = useMemo(
    () => new Map(teachers.map((teacher) => [teacher.user_id, teacher.display_name])),
    [teachers],
  );
  const filteredRecords = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return records.filter((record) => {
      if (dateFilter && record.work_date !== dateFilter) return false;
      const displayName = teacherNames.get(record.teacher_id) ?? "Unknown teacher";
      return !query || displayName.toLocaleLowerCase().includes(query);
    });
  }, [dateFilter, records, search, teacherNames]);
  const pageCount = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleRecords = filteredRecords.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  function exportCsv() {
    const header = ["Teacher", "Work date", "Time in (Philippine time)", "Time out (Philippine time)", "Status"];
    const today = manilaDateNow();
    const rows = filteredRecords.map((record) => {
      const forgotten = !record.time_out &&
        (record.time_out_status === "forgot_time_out" || record.work_date < today);
      const timeOut = record.time_out
        ? formatTime(record.time_out)
        : forgotten
          ? "11:59 PM"
          : "Not recorded";
      const status = record.time_out
        ? "Complete"
        : forgotten
          ? "Forgot to time out"
          : "Time out pending";
      return [
        teacherNames.get(record.teacher_id) ?? "Unknown teacher",
        record.work_date,
        formatTime(record.time_in),
        timeOut,
        status,
      ];
    });
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cite-attendance-${dateFilter || manilaDateNow()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="space-y-5" aria-labelledby="office-attendance-title">
      <div className="space-y-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#e8f0e9] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#285c37] dark:bg-[#273b2c] dark:text-[#a5d5ad]">
          <span className="size-1.5 rounded-full bg-[#4c915b]" /> Office records
        </span>
        <h2 id="office-attendance-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">Faculty attendance records</h2>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Review attendance across the faculty or download the filtered list as a CSV file for Excel or Google Sheets.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance log</CardTitle>
          <CardDescription>Records are loaded from the attendance database. Philippine time is used for display and export.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
            <div className="space-y-2">
              <Label htmlFor="attendance-teacher-search">Search teacher</Label>
              <Input
                id="attendance-teacher-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Enter a teacher name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="attendance-date-filter">Filter by date</Label>
              <Input
                id="attendance-date-filter"
                type="date"
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground" role="status">
              {loading ? "Loading attendance records…" : `${filteredRecords.length} record${filteredRecords.length === 1 ? "" : "s"}`}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setLoadKey((key) => key + 1)} disabled={loading}>
                <RefreshCw className="mr-2 size-4" aria-hidden="true" /> Refresh
              </Button>
              <Button type="button" onClick={exportCsv} disabled={loading || filteredRecords.length === 0}>
                <Download className="mr-2 size-4" aria-hidden="true" /> Download CSV
              </Button>
            </div>
          </div>

          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="bg-[#f0f5ef] text-[#385c3e] dark:bg-[#202a23] dark:text-[#d5e4d6]">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Teacher</th>
                  <th scope="col" className="px-4 py-3 font-medium">Work date</th>
                  <th scope="col" className="px-4 py-3 font-medium">Time in</th>
                  <th scope="col" className="px-4 py-3 font-medium">Time out</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleRecords.map((record) => {
                  const forgotten = !record.time_out &&
                    (record.time_out_status === "forgot_time_out" || record.work_date < manilaDateNow());
                  return (
                    <tr key={record.id} className="transition-colors hover:bg-[#f8faf7] dark:hover:bg-[#202a23]">
                      <td className="px-4 py-3 font-medium">{teacherNames.get(record.teacher_id) ?? "Unknown teacher"}</td>
                      <td className="whitespace-nowrap px-4 py-3">{record.work_date}</td>
                      <td className="whitespace-nowrap px-4 py-3">{formatTime(record.time_in)}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {record.time_out ? formatTime(record.time_out) : forgotten ? "11:59 PM" : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {record.time_out ? "Complete" : forgotten ? "Forgot to time out" : "Time out pending"}
                      </td>
                    </tr>
                  );
                })}
                {!loading && visibleRecords.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No attendance records match these filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Page {currentPage + 1} of {pageCount}</p>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setPage((value) => Math.max(0, value - 1))} disabled={currentPage === 0}>Previous</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))} disabled={currentPage >= pageCount - 1}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
