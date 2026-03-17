"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";

type BatchRow = {
  sourceFile: string;
  uploadedAt: Date;
  rowCount: number;
  uploadedBy: string | null;
};

type RecordRow = {
  id: string;
  fullName: string;
  graduationYear: number;
  stream: string | null;
  house: string | null;
  sourceFile: string;
};

type Props = {
  batches: BatchRow[];
  records: RecordRow[];
};

type PreviewPayload = {
  headers: string[];
  rows: string[][];
  validRows: number;
  totalRows: number;
};

type ImportJob = {
  id: string;
  sourceFile: string;
  status: "queued" | "running" | "completed" | "failed";
  totalRows: number;
  processedRows: number;
  importedRows: number;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

export function SchoolRecordsAdminClient({ batches, records }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [fileName, setFileName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [activeJob, setActiveJob] = useState<ImportJob | null>(null);

  const canSubmit = useMemo(() => fileName.trim() && file, [fileName, file]);

  useEffect(() => {
    if (!activeJob) {
      return;
    }

    if (activeJob.status === "completed" || activeJob.status === "failed") {
      return;
    }

    const interval = window.setInterval(async () => {
      try {
        const response = await fetch(
          `/api/admin/school-records/import/jobs/${activeJob.id}`,
        );
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as { job: ImportJob };
        setActiveJob(payload.job);
        if (payload.job.status === "completed") {
          toast({
            title: `Imported ${payload.job.importedRows} school records`,
            variant: "success",
          });
          setFile(null);
          setFileName("");
          setPreview(null);
          router.refresh();
        }
        if (payload.job.status === "failed") {
          toast({
            title: "Import failed",
            description: payload.job.errorMessage ?? "Please retry.",
          });
        }
      } catch {
        // Ignore transient polling failures and retry on next interval.
      }
    }, 1500);

    return () => window.clearInterval(interval);
  }, [activeJob, router, toast]);

  async function requestPreview() {
    if (!file) {
      return;
    }

    setIsBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sourceFile", fileName.trim());
      formData.append("previewOnly", "true");
      const response = await fetch("/api/admin/school-records/import", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(payload?.message ?? "Preview failed.");
      }
      const payload = (await response.json()) as PreviewPayload;
      setPreview(payload);
    } catch (error) {
      toast({
        title: "Preview failed",
        description: error instanceof Error ? error.message : "Please retry.",
      });
    } finally {
      setIsBusy(false);
    }
  }

  async function runImport() {
    if (!file) {
      return;
    }

    setIsBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sourceFile", fileName.trim());
      const response = await fetch("/api/admin/school-records/import", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(payload?.message ?? "Import failed.");
      }
      const payload = (await response.json()) as { job: ImportJob };
      setActiveJob(payload.job);
    } catch (error) {
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Please retry.",
      });
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <Tabs defaultValue="upload">
      <TabsList>
        <TabsTrigger value="upload">Upload</TabsTrigger>
        <TabsTrigger value="browse">Browse</TabsTrigger>
      </TabsList>

      <TabsContent value="upload" className="space-y-4">
        <div className="grid gap-3 rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--text-1)]">
            Source filename
            <input
              value={fileName}
              onChange={(event) => setFileName(event.target.value)}
              placeholder="e.g. bck_records_2006.csv"
              className="h-10 rounded-[var(--r-md)] border-[1.5px] border-[var(--border)] bg-[var(--white)] px-3 text-sm text-[var(--text-1)] outline-none focus:border-[var(--navy-400)]"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--text-1)]">
            Upload CSV or XLSX
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(event) => {
                const nextFile = event.target.files?.[0] ?? null;
                setFile(nextFile);
                setFileName(nextFile?.name ?? "");
                setPreview(null);
              }}
              className="h-10 rounded-[var(--r-md)] border-[1.5px] border-[var(--border)] bg-[var(--white)] px-2 text-sm text-[var(--text-1)] file:mr-3 file:rounded-[var(--r-sm)] file:border-0 file:bg-[var(--navy-50)] file:px-3 file:py-1.5 file:text-xs file:font-medium"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!canSubmit || isBusy}
              onClick={() => void requestPreview()}
            >
              Preview first 10 rows
            </Button>
            <Button
              type="button"
              variant="navy"
              isLoading={isBusy}
              disabled={!canSubmit}
              onClick={() => void runImport()}
            >
              Import records
            </Button>
          </div>

          {activeJob ? (
            <div className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] p-3">
              <p className="text-xs font-medium text-[var(--text-1)]">
                Import job: {activeJob.sourceFile}
              </p>
              <p className="mt-1 text-xs text-[var(--text-2)]">
                Status: {activeJob.status} · {activeJob.processedRows}/
                {activeJob.totalRows} processed
              </p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded bg-[var(--surface-2)]">
                <div
                  className="h-full bg-[var(--navy-700)] transition-all"
                  style={{
                    width: `${
                      activeJob.totalRows > 0
                        ? Math.round(
                            (activeJob.processedRows / activeJob.totalRows) * 100,
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>

        {preview ? (
          <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-4">
            <p className="mb-2 text-sm font-medium text-[var(--text-1)]">
              Preview ({preview.validRows} valid rows out of {preview.totalRows})
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left">
                    {preview.headers.map((header) => (
                      <th key={header} className="px-2 py-1">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className="border-b border-[var(--border)]"
                    >
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="px-2 py-1">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-4">
          <p className="mb-2 text-sm font-medium text-[var(--text-1)]">
            Imported batches
          </p>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[var(--text-3)]">
                <th className="px-2 py-1">Filename</th>
                <th className="px-2 py-1">Date</th>
                <th className="px-2 py-1">Rows</th>
                <th className="px-2 py-1">Uploaded by</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((batch) => (
                <tr
                  key={`${batch.sourceFile}-${batch.uploadedAt.toISOString()}`}
                  className="border-b border-[var(--border)]"
                >
                  <td className="px-2 py-1">{batch.sourceFile}</td>
                  <td className="px-2 py-1">
                    {batch.uploadedAt.toLocaleString()}
                  </td>
                  <td className="px-2 py-1">{batch.rowCount}</td>
                  <td className="px-2 py-1">{batch.uploadedBy ?? "Unknown"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TabsContent>

      <TabsContent value="browse">
        <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-4">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-[var(--text-3)]">
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Year</th>
                  <th className="px-3 py-2 font-medium">Stream</th>
                  <th className="px-3 py-2 font-medium">House</th>
                  <th className="px-3 py-2 font-medium">Source file</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr
                    key={record.id}
                    className="border-b border-[var(--border)] bg-[#f2f4fa]"
                  >
                    <td className="px-3 py-2">{record.fullName}</td>
                    <td className="px-3 py-2">{record.graduationYear}</td>
                    <td className="px-3 py-2">{record.stream ?? "-"}</td>
                    <td className="px-3 py-2">{record.house ?? "-"}</td>
                    <td className="px-3 py-2">{record.sourceFile}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
