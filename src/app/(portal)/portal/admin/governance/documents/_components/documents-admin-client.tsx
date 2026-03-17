"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import type { AdminGovernanceDocument } from "@/lib/admin-governance";

type DocumentsAdminClientProps = {
  initialDocuments: AdminGovernanceDocument[];
};

const categoryOptions = [
  { value: "constitution", label: "Constitution" },
  { value: "annual_report", label: "Annual Reports" },
  { value: "financial", label: "Financial Summaries" },
  { value: "minutes", label: "AGM Minutes" },
  { value: "policy", label: "Policies" },
] as const;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function categoryLabel(value: AdminGovernanceDocument["category"]): string {
  return categoryOptions.find((option) => option.value === value)?.label ?? value;
}

export function DocumentsAdminClient({ initialDocuments }: DocumentsAdminClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [year, setYear] = useState("");
  const [category, setCategory] = useState<(typeof categoryOptions)[number]["value"]>("constitution");
  const [isPublic, setIsPublic] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState(initialDocuments);

  async function onUploadSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      toast({
        title: "Missing file",
        description: "Select a PDF or Word document to upload.",
      });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.set("title", title);
    formData.set("description", description);
    formData.set("category", category);
    formData.set("year", year);
    formData.set("isPublic", String(isPublic));
    formData.set("file", file);

    const response = await fetch("/api/admin/governance/documents", {
      method: "POST",
      body: formData,
    });
    setIsUploading(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      toast({
        title: "Upload failed",
        description: body?.message ?? "Try again.",
      });
      return;
    }

    toast({
      title: "Document uploaded",
      variant: "success",
    });
    setTitle("");
    setDescription("");
    setYear("");
    setFile(null);
    router.refresh();
  }

  async function toggleVisibility(id: string, nextVisibility: boolean) {
    const response = await fetch(`/api/admin/governance/documents/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isPublic: nextVisibility }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      toast({
        title: "Update failed",
        description: body?.message ?? "Could not change visibility.",
      });
      return;
    }

    setDocuments((current) =>
      current.map((doc) => (doc.id === id ? { ...doc, isPublic: nextVisibility } : doc)),
    );
    toast({
      title: nextVisibility ? "Document is now public" : "Document set to private",
      variant: "success",
    });
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="p-5">
          <form onSubmit={onUploadSubmit} className="grid gap-4 md:grid-cols-2">
            <Input
              label="Title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
            <div>
              <p className="mb-1.5 text-sm font-medium text-(--text-1)">Category</p>
              <Select value={category} onValueChange={(value) => setCategory(value as typeof category)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Input
              label="Description (optional)"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            <Input
              label="Year (optional)"
              type="number"
              value={year}
              onChange={(event) => setYear(event.target.value)}
            />

            <Input
              label="File"
              type="file"
              accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              required
            />

            <label className="flex items-center gap-2 rounded-(--r-md) border border-(--border) px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(event) => setIsPublic(event.target.checked)}
              />
              Publish publicly
            </label>

            <div className="md:col-span-2">
              <Button type="submit" isLoading={isUploading}>
                Upload document
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          {documents.length === 0 ? (
            <p className="text-sm text-(--text-3)">No governance documents uploaded yet.</p>
          ) : (
            documents.map((doc) => (
              <div key={doc.id} className="rounded-(--r-lg) border border-(--border) p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-(--text-1)">{doc.title}</p>
                    <p className="mt-1 text-xs text-(--text-3)">
                      {categoryLabel(doc.category)} · {formatFileSize(doc.fileSize)}
                      {doc.year ? ` · ${doc.year}` : ""}
                    </p>
                    {doc.description ? (
                      <p className="mt-1 text-sm text-(--text-2)">{doc.description}</p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={doc.isPublic ? "outline" : "navy"}
                    onClick={() => toggleVisibility(doc.id, !doc.isPublic)}
                  >
                    {doc.isPublic ? "Make private" : "Make public"}
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
