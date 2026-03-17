import Image from "next/image";

export default function PortalLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <div className="flex flex-col items-center gap-4 text-center">
        <Image
          src="/logo.png"
          alt="BICKOSA"
          width={64}
          height={64}
          className="size-16 object-contain"
          priority
        />
        <div className="size-9 animate-spin rounded-full border-2 border-[var(--navy-100)] border-t-[var(--navy-900)]" />
        <p className="text-sm text-[var(--text-2)]">Loading portal...</p>
      </div>
    </div>
  );
}
