"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImageUp, Upload } from "lucide-react";
import Image from "next/image";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";

export type UploadedFileValue = {
  name: string;
  size: number;
  type: string;
  url?: string;
  key?: string;
};

type FileUploadProps = {
  accept: string | string[];
  maxSize: number;
  onUpload: (params: {
    file: File;
    onProgress: (percent: number) => void;
  }) => Promise<UploadedFileValue>;
  value?: UploadedFileValue | null;
  onChange?: (value: UploadedFileValue | null) => void;
};

function normalizeAccept(accept: string | string[]): string[] {
  if (Array.isArray(accept)) {
    return accept.map((item) => item.trim()).filter(Boolean);
  }
  return accept
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function matchesAccept(file: File, acceptTokens: string[]): boolean {
  if (acceptTokens.length === 0) {
    return true;
  }

  const fileExtension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;

  return acceptTokens.some((token) => {
    if (token.startsWith(".")) {
      return token.toLowerCase() === fileExtension;
    }
    if (token.endsWith("/*")) {
      const typePrefix = token.slice(0, -1).toLowerCase();
      return file.type.toLowerCase().startsWith(typePrefix);
    }
    return token.toLowerCase() === file.type.toLowerCase();
  });
}

function buildErrorMessage(file: File, acceptTokens: string[], maxSize: number): string | null {
  if (!matchesAccept(file, acceptTokens)) {
    return `Invalid file type. Allowed: ${acceptTokens.join(", ")}`;
  }

  if (file.size > maxSize) {
    return `File is too large. Max size is ${formatBytes(maxSize)}.`;
  }

  return null;
}

export function FileUpload({ accept, maxSize, onUpload, value, onChange }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const acceptTokens = useMemo(() => normalizeAccept(accept), [accept]);

  const previewUrl = useMemo(() => {
    if (!selectedFile || !selectedFile.type.startsWith("image/")) {
      return null;
    }
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function handleSelectFile(file: File) {
    const error = buildErrorMessage(file, acceptTokens, maxSize);
    if (error) {
      setErrorMessage(error);
      return;
    }
    setErrorMessage(null);
    setSelectedFile(file);
    setProgress(0);
  }

  async function handleUpload() {
    if (!selectedFile) {
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);

    try {
      const uploaded = await onUpload({
        file: selectedFile,
        onProgress: (percent) => {
          setProgress(Math.max(0, Math.min(100, percent)));
        },
      });

      setProgress(100);
      setSelectedFile(null);
      onChange?.(uploaded);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed. Please try again.";
      setErrorMessage(message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        className={cn(
          "w-full rounded-[var(--r-lg)] border border-dashed p-6 text-left transition-colors",
          isDragging
            ? "border-[var(--navy-700)] bg-[var(--navy-100)]"
            : "border-[var(--border)] bg-[var(--navy-50)]",
        )}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          const file = event.dataTransfer.files.item(0);
          if (file) {
            handleSelectFile(file);
          }
        }}
      >
        <div className="flex items-start gap-3">
          <div className="rounded-[var(--r-md)] bg-[var(--white)] p-2 shadow-[var(--shadow-sm)]">
            <ImageUp className="size-5 text-[var(--navy-700)]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-1)]">Drag and drop a file, or click to browse</p>
            <p className="text-xs text-[var(--text-3)]">
              Accepted: {acceptTokens.join(", ")} - Max {formatBytes(maxSize)}
            </p>
          </div>
        </div>
      </button>

      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept={Array.isArray(accept) ? accept.join(",") : accept}
        onChange={(event) => {
          const file = event.target.files?.item(0);
          if (file) {
            handleSelectFile(file);
          }
        }}
      />

      {selectedFile ? (
        <div className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--white)] p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[var(--text-1)]">{selectedFile.name}</p>
              <p className="text-xs text-[var(--text-3)]">{formatBytes(selectedFile.size)}</p>
            </div>
            <Button
              type="button"
              variant="navy"
              size="sm"
              isLoading={isUploading}
              disabled={isUploading}
              onClick={handleUpload}
            >
              <Upload className="size-4" />
              Upload
            </Button>
          </div>

          {previewUrl ? (
            <div className="mt-3">
              <Image
                src={previewUrl}
                alt="Upload preview"
                width={640}
                height={240}
                unoptimized
                className="h-36 w-full rounded-[var(--r-md)] border border-[var(--border)] object-cover"
              />
            </div>
          ) : null}

          {isUploading || progress > 0 ? (
            <div className="mt-3 space-y-1">
              <ProgressBar value={progress} />
              <p className="text-xs text-[var(--text-3)]">{Math.round(progress)}%</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {value ? (
        <div className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--white)] px-3 py-2 text-sm text-[var(--text-2)]">
          Uploaded: <span className="font-medium text-[var(--text-1)]">{value.name}</span>
        </div>
      ) : null}

      {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
    </div>
  );
}
