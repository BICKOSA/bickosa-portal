"use client";

import { useMemo, useRef, useState } from "react";
import { ImageUp, Upload } from "lucide-react";
import { toast } from "sonner";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AvatarUploadProps = {
  fullName: string;
  currentAvatarUrl: string | null;
  onAvatarUpdated: (avatarUrl: string | null, avatarKey: string | null) => void;
};

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AvatarUpload({
  fullName,
  currentAvatarUrl,
  onAvatarUpdated,
}: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const previewUrl = useMemo(() => {
    if (!pendingFile) return null;
    return URL.createObjectURL(pendingFile);
  }, [pendingFile]);

  const avatarToShow = previewUrl || currentAvatarUrl;

  function validateFile(file: File): string | null {
    if (!ACCEPTED_TYPES.has(file.type)) {
      return "Please upload a JPG, PNG, or WEBP image.";
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return "Image must be 5MB or less.";
    }
    return null;
  }

  function handleSelectedFile(file: File) {
    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return;
    }
    setPendingFile(file);
  }

  async function handleConfirmUpload() {
    if (!pendingFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", pendingFile);

      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;
        throw new Error(errorBody?.message ?? "Failed to upload avatar.");
      }

      const json = (await response.json()) as {
        avatarUrl: string | null;
        avatarKey: string | null;
      };

      onAvatarUpdated(json.avatarUrl, json.avatarKey);
      setPendingFile(null);
      toast.success("Profile photo updated.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to upload avatar right now.";
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Card id="avatar-upload">
      <CardHeader>
        <CardTitle>Profile Photo</CardTitle>
        <CardDescription>
          Upload a clear profile image (JPG, PNG, WEBP, max 5MB).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar
            shape="rounded"
            size="xl"
            src={avatarToShow}
            name={fullName}
            className="size-20 rounded-[14px]"
          />
          <div className="text-sm text-[var(--text-2)]">
            {pendingFile ? (
              <>
                <p className="font-medium text-[var(--text-1)]">{pendingFile.name}</p>
                <p>{formatBytes(pendingFile.size)}</p>
              </>
            ) : (
              <p>No pending upload.</p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
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
              handleSelectedFile(file);
            }
          }}
          className={
            "w-full rounded-[var(--r-lg)] border border-dashed px-4 py-8 text-center transition-colors " +
            (isDragging
              ? "border-[var(--navy-700)] bg-[var(--navy-50)]"
              : "border-[var(--border-2)] bg-[var(--surface-2)]")
          }
        >
          <ImageUp className="mx-auto size-6 text-[var(--navy-700)]" />
          <p className="mt-2 text-sm font-medium text-[var(--text-1)]">
            Click to upload or drag and drop
          </p>
          <p className="mt-1 text-xs text-[var(--text-3)]">JPG, PNG, WEBP up to 5MB</p>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.item(0);
            if (file) {
              handleSelectedFile(file);
            }
          }}
        />

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="navy"
            isLoading={isUploading}
            disabled={!pendingFile}
            onClick={handleConfirmUpload}
          >
            <Upload className="size-4" />
            Confirm Upload
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!pendingFile || isUploading}
            onClick={() => setPendingFile(null)}
          >
            Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
