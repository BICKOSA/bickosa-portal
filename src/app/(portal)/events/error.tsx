"use client";

import { PortalErrorState } from "@/components/layout/portal-error-state";

type EventsErrorProps = {
  error: Error;
  reset: () => void;
};

export default function EventsError({ error, reset }: EventsErrorProps) {
  return <PortalErrorState error={error} reset={reset} />;
}
