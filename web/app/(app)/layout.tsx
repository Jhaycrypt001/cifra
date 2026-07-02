import { Nav } from "@/components/Nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-5xl px-4 py-8">{children}</main>
      <footer className="mx-auto w-full max-w-5xl px-4 py-10 text-center text-[11px] uppercase tracking-[0.16em] text-paper-faint">
        Cifra · Built on the Zama Protocol · Amounts encrypted end-to-end
      </footer>
    </>
  );
}
