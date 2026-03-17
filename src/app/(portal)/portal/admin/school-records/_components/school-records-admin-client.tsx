"use client";

import { useMemo, useState } from "react";
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
};

export function SchoolRecordsAdminClient({ batches, records }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [fileName, setFileName] = useState("");
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const canSubmit = useMemo(
    () => fileName.trim() && csvText.trim(),
    [fileName, csvText],
  );

  async function requestPreview() {
    setIsBusy(true);
    try {
      const response = await fetch("/api/admin/school-records/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sourceFile: fileName,
          csvText,
          previewOnly: true,
        }),
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
    setIsBusy(true);
    try {
      const response = await fetch("/api/admin/school-records/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sourceFile: fileName,
          csvText,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(payload?.message ?? "Import failed.");
      }
      toast({
        title: "School records imported",
        variant: "success",
      });
      setPreview(null);
      setCsvText("");
      setFileName("");
      router.refresh();
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
            CSV content
            <textarea
              value={csvText}
              onChange={(event) => setCsvText(event.target.value)}
              rows={10}
              placeholder="Paste CSV content exported from school records."
              className="rounded-[var(--r-md)] border-[1.5px] border-[var(--border)] bg-[var(--white)] px-3 py-2 text-sm text-[var(--text-1)] outline-none focus:border-[var(--navy-400)]"
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
        </div>

        {preview ? (
          <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--white)] p-4">
            <p className="mb-2 text-sm font-medium text-[var(--text-1)]">
              Preview
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
