"use client";

import { PortalErrorState } from "@/components/layout/portal-error-state";

type DonateErrorProps = {
  error: Error;
  reset: () => void;
};

export default function DonateError({ error, reset }: DonateErrorProps) {
  return <PortalErrorState error={error} reset={reset} />;
}
