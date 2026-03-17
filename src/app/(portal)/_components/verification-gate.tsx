"use client";

import { usePathname } from "next/navigation";

const UNGATED_PREFIXES = ["/profile", "/settings"];

type VerificationGateProps = {
  gatedContent: React.ReactNode;
  children: React.ReactNode;
};

export function VerificationGate({
  gatedContent,
  children,
}: VerificationGateProps) {
  const pathname = usePathname();

  const isUngated = UNGATED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isUngated) {
    return <>{children}</>;
  }

  return <>{gatedContent}</>;
}
