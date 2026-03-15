import type { ReactNode } from "react";
import Image from "next/image";

import { Card, CardContent } from "@/components/ui/card";

type AuthPageShellProps = {
  children: ReactNode;
};

export function AuthPageShell({ children }: AuthPageShellProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--white)] px-4 py-10">
      <Card className="w-full max-w-xl border-[var(--border)] shadow-[var(--shadow-sm)]">
        <CardContent className="px-6 py-8 sm:px-8">
          <div className="mb-8 flex flex-col items-center text-center">
            <Image
              src="/logo.png"
              alt="BICKOSA Alumni Portal"
              width={120}
              height={120}
              className="object-contain"
              priority
            />
            <p className="mt-3 text-sm text-[var(--text-2)]">Per Aspera Ad Astra</p>
          </div>
          {children}
        </CardContent>
      </Card>
    </main>
  );
}
