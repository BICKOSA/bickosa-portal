import { importSchoolRecordsRows } from "@/lib/alumni-growth";
import type { SchoolRecordImportRow } from "@/lib/school-records-parser";

export type SchoolRecordImportJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed";

export type SchoolRecordImportJob = {
  id: string;
  sourceFile: string;
  status: SchoolRecordImportJobStatus;
  totalRows: number;
  processedRows: number;
  importedRows: number;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

const jobStore = new Map<
  string,
  {
    state: SchoolRecordImportJob;
    rows: SchoolRecordImportRow[];
    uploadedBy: string;
  }
>();

const CHUNK_SIZE = 250;

function toPublicJob(job: SchoolRecordImportJob): SchoolRecordImportJob {
  return { ...job };
}

export function getSchoolRecordImportJob(jobId: string) {
  const job = jobStore.get(jobId);
  return job ? toPublicJob(job.state) : null;
}

async function runJob(jobId: string) {
  const job = jobStore.get(jobId);
  if (!job) {
    return;
  }

  job.state.status = "running";
  job.state.startedAt = new Date().toISOString();

  try {
    for (let index = 0; index < job.rows.length; index += CHUNK_SIZE) {
      const chunk = job.rows.slice(index, index + CHUNK_SIZE);
      const { imported } = await importSchoolRecordsRows({
        rows: chunk,
        sourceFile: job.state.sourceFile,
        uploadedBy: job.uploadedBy,
      });
      job.state.importedRows += imported;
      job.state.processedRows = Math.min(index + CHUNK_SIZE, job.rows.length);
    }

    job.state.status = "completed";
    job.state.finishedAt = new Date().toISOString();
  } catch (error) {
    job.state.status = "failed";
    job.state.errorMessage =
      error instanceof Error ? error.message : "Import job failed.";
    job.state.finishedAt = new Date().toISOString();
  }
}

export function createSchoolRecordImportJob(input: {
  rows: SchoolRecordImportRow[];
  sourceFile: string;
  uploadedBy: string;
}) {
  if (input.rows.length === 0) {
    throw new Error("No valid school records found in uploaded file.");
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const state: SchoolRecordImportJob = {
    id,
    sourceFile: input.sourceFile,
    status: "queued",
    totalRows: input.rows.length,
    processedRows: 0,
    importedRows: 0,
    errorMessage: null,
    createdAt: now,
    startedAt: null,
    finishedAt: null,
  };

  jobStore.set(id, {
    state,
    rows: input.rows,
    uploadedBy: input.uploadedBy,
  });

  void runJob(id);
  return toPublicJob(state);
}
