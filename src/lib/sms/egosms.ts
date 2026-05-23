/**
 * Thin Egosms client (https://www.egosms.co) used to send transactional SMS
 * from the portal. Egosms exposes a JSON POST endpoint that accepts a batch of
 * messages and returns per-message status. Reference docs:
 * https://developers.pahappa.com/docs/sending-sms/api-specs-and-usage
 *
 * Configure with:
 *   EGOSMS_USERNAME  — API account username
 *   EGOSMS_PASSWORD  — API account password
 *   EGOSMS_SENDER    — Sender ID approved on the account (e.g. "BICKOSA")
 *   EGOSMS_API_URL   — Optional override, defaults to https://www.egosms.co/api/v1/json/
 *   EGOSMS_DEFAULT_COUNTRY_CODE — Optional default country code for normalising
 *                                 local phone numbers (e.g. "256" for Uganda).
 *                                 Defaults to "256".
 */

const DEFAULT_API_URL = "https://www.egosms.co/api/v1/json/";

export type SendSmsInput = {
  to: string;
  message: string;
  priority?: "0" | "1" | "2" | "3" | "4";
};

export type SendSmsResult = {
  ok: boolean;
  provider: "egosms";
  to: string;
  providerRef?: string;
  status?: string;
  description?: string;
};

export class SmsConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SmsConfigurationError";
  }
}

export class SmsDeliveryError extends Error {
  readonly status?: string;
  readonly description?: string;
  constructor(message: string, options?: { status?: string; description?: string }) {
    super(message);
    this.name = "SmsDeliveryError";
    this.status = options?.status;
    this.description = options?.description;
  }
}

function getEnv(name: string): string | null {
  const value = process.env[name];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Normalise a loosely-formatted phone number into E.164 without the leading "+".
 * Egosms accepts numbers in the form "256772000000" (digits only). Local
 * Ugandan numbers (`0772…`) are rebased to the configured default country code.
 *
 * Returns null if the input doesn't look like a valid mobile number after
 * cleanup so callers can skip the send and warn instead of throwing.
 */
export function normalisePhoneForEgosms(
  raw: string,
  defaultCountryCode = getEnv("EGOSMS_DEFAULT_COUNTRY_CODE") ?? "256",
): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Strip everything except digits and a leading +
  const cleaned = trimmed.replace(/[^\d+]/g, "");
  if (!cleaned) return null;

  let digits: string;
  if (cleaned.startsWith("+")) {
    digits = cleaned.slice(1);
  } else if (cleaned.startsWith("00")) {
    digits = cleaned.slice(2);
  } else if (cleaned.startsWith("0")) {
    digits = `${defaultCountryCode}${cleaned.slice(1)}`;
  } else if (cleaned.startsWith(defaultCountryCode)) {
    digits = cleaned;
  } else {
    digits = `${defaultCountryCode}${cleaned}`;
  }

  // Reasonable bounds for an international mobile number.
  if (digits.length < 9 || digits.length > 15) {
    return null;
  }

  return digits;
}

type EgosmsResponse = {
  Status?: string;
  Code?: string;
  Description?: string;
  Data?: Array<{
    Status?: string;
    Number?: string;
    Code?: string;
    Description?: string;
    MsgRef?: string;
  }>;
};

export async function sendSms(input: SendSmsInput): Promise<SendSmsResult> {
  const username = getEnv("EGOSMS_USERNAME");
  const password = getEnv("EGOSMS_PASSWORD");
  const senderId = getEnv("EGOSMS_SENDER");

  if (!username || !password || !senderId) {
    throw new SmsConfigurationError(
      "Egosms credentials are not configured. Set EGOSMS_USERNAME, EGOSMS_PASSWORD, and EGOSMS_SENDER.",
    );
  }

  const apiUrl = getEnv("EGOSMS_API_URL") ?? DEFAULT_API_URL;
  const normalised = normalisePhoneForEgosms(input.to);
  if (!normalised) {
    throw new SmsDeliveryError("Phone number is not a valid mobile number for SMS delivery.");
  }

  const message = input.message.trim();
  if (!message) {
    throw new SmsDeliveryError("SMS message body is empty.");
  }

  const payload = {
    method: "SendSms",
    userdata: { username, password },
    msgdata: [
      {
        number: normalised,
        message,
        senderid: senderId,
        priority: input.priority ?? "0",
      },
    ],
  };

  let response: Response;
  try {
    response = await fetch(apiUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      // Don't keep the request hanging indefinitely if Egosms is slow.
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    throw new SmsDeliveryError(
      `Egosms request failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  let body: EgosmsResponse | null = null;
  try {
    body = (await response.json()) as EgosmsResponse;
  } catch {
    /* Body may not be JSON in error cases */
  }

  if (!response.ok) {
    throw new SmsDeliveryError(
      `Egosms HTTP ${response.status}: ${body?.Description ?? response.statusText}`,
      { status: body?.Status, description: body?.Description },
    );
  }

  const topStatus = (body?.Status ?? "").toUpperCase();
  const entry = body?.Data?.[0];
  const entryStatus = (entry?.Status ?? topStatus).toUpperCase();

  if (entryStatus !== "OK" && entryStatus !== "SUCCESS" && entryStatus !== "QUEUED") {
    throw new SmsDeliveryError(
      `Egosms rejected message: ${entry?.Description ?? body?.Description ?? "unknown reason"}`,
      {
        status: entry?.Status ?? body?.Status,
        description: entry?.Description ?? body?.Description,
      },
    );
  }

  return {
    ok: true,
    provider: "egosms",
    to: normalised,
    providerRef: entry?.MsgRef,
    status: entry?.Status ?? body?.Status,
    description: entry?.Description ?? body?.Description,
  };
}

export function isSmsConfigured(): boolean {
  return Boolean(
    getEnv("EGOSMS_USERNAME") && getEnv("EGOSMS_PASSWORD") && getEnv("EGOSMS_SENDER"),
  );
}
