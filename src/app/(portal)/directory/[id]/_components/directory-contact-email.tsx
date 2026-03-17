"use client";

import { trackPortalEventClient } from "@/lib/analytics/client";

type DirectoryContactEmailProps = {
  email: string;
};

export function DirectoryContactEmail({ email }: DirectoryContactEmailProps) {
  async function handleClick() {
    await trackPortalEventClient({
      event: "message_sent",
      properties: {
        via: "directory",
      },
    });
    window.location.href = `mailto:${email}`;
  }

  return (
    <button
      type="button"
      className="mt-1 inline-block text-[var(--navy-700)] hover:underline"
      onClick={() => {
        void handleClick();
      }}
    >
      {email}
    </button>
  );
}
