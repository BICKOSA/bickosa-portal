import * as XLSX from "xlsx";

export type SchoolRecordImportRow = {
  fullName: string;
  graduationYear: number;
  stream: string | null;
  house: string | null;
  admissionNumber: string | null;
};

export type ParsedSchoolRecords = {
  headers: string[];
  rows: string[][];
  validRows: SchoolRecordImportRow[];
};

function normalizeOptional(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseCsvLine(line: string): string[] {
  const output: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      const isEscapedQuote = inQuotes && line[index + 1] === '"';
      if (isEscapedQuote) {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      output.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  output.push(current.trim());
  return output.map((value) => value.replace(/^"|"$/g, "").trim());
}

function mapSchoolRecordRow(
  headers: string[],
  values: string[],
): SchoolRecordImportRow | null {
  const toHeaderIndex = (aliases: string[]) =>
    headers.findIndex((header) =>
      aliases.includes(header.toLowerCase().trim()),
    );

  const fullNameIndex = toHeaderIndex(["full_name", "fullname", "name"]);
  const yearIndex = toHeaderIndex(["graduation_year", "year", "class_year"]);
  if (fullNameIndex < 0 || yearIndex < 0) {
    return null;
  }

  const streamIndex = toHeaderIndex(["stream"]);
  const houseIndex = toHeaderIndex(["house"]);
  const admissionIndex = toHeaderIndex(["admission_number", "admission_no"]);
  const graduationYear = Number.parseInt(values[yearIndex] ?? "", 10);
  if (!Number.isFinite(graduationYear)) {
    return null;
  }

  const fullName = (values[fullNameIndex] ?? "").trim();
  if (!fullName) {
    return null;
  }

  return {
    fullName,
    graduationYear,
    stream: normalizeOptional(values[streamIndex] ?? null),
    house: normalizeOptional(values[houseIndex] ?? null),
    admissionNumber: normalizeOptional(values[admissionIndex] ?? null),
  };
}

function parseCsv(text: string): ParsedSchoolRecords {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    return { headers: [], rows: [], validRows: [] };
  }

  const headers = parseCsvLine(lines[0] ?? "");
  const rows = lines.slice(1).map((line) => parseCsvLine(line));
  const validRows = rows
    .map((values) => mapSchoolRecordRow(headers, values))
    .filter((row): row is SchoolRecordImportRow => row !== null);

  return { headers, rows, validRows };
}

function parseXlsx(buffer: ArrayBuffer): ParsedSchoolRecords {
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return { headers: [], rows: [], validRows: [] };
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const table = XLSX.utils.sheet_to_json<(string | number | null)[]>(worksheet, {
    header: 1,
    blankrows: false,
  });
  if (table.length < 2) {
    return { headers: [], rows: [], validRows: [] };
  }

  const headers = (table[0] ?? []).map((value) => String(value ?? "").trim());
  const rows = table.slice(1).map((row) =>
    row.map((value) => String(value ?? "").trim()),
  );
  const validRows = rows
    .map((values) => mapSchoolRecordRow(headers, values))
    .filter((row): row is SchoolRecordImportRow => row !== null);

  return { headers, rows, validRows };
}

export function parseSchoolRecordsFile(input: {
  fileName: string;
  bytes: ArrayBuffer;
}): ParsedSchoolRecords {
  const extension = input.fileName.split(".").pop()?.toLowerCase();
  if (extension === "csv") {
    const text = new TextDecoder().decode(new Uint8Array(input.bytes));
    return parseCsv(text);
  }
  if (extension === "xlsx" || extension === "xls") {
    return parseXlsx(input.bytes);
  }
  throw new Error("Unsupported file type. Upload a CSV or XLSX file.");
}

export function parseSchoolRecordsCsvText(csvText: string): ParsedSchoolRecords {
  return parseCsv(csvText);
}
