"use client";

import { PortalErrorState } from "@/components/layout/portal-error-state";

type DirectoryErrorProps = {
  error: Error;
  reset: () => void;
};

export default function DirectoryError({ error, reset }: DirectoryErrorProps) {
  return <PortalErrorState error={error} reset={reset} />;
}
