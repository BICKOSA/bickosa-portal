"use client";

import { PortalErrorState } from "@/components/layout/portal-error-state";

type PortalErrorProps = {
  error: Error;
  reset: () => void;
};

export default function PortalError({ error, reset }: PortalErrorProps) {
  return <PortalErrorState error={error} reset={reset} />;
}
