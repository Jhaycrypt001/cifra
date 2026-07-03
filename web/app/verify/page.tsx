import { Suspense } from "react";
import { VerifyProof } from "@/components/verify-proof";

export const metadata = {
  title: "Verify proof of income · Cifra",
};

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center text-sm text-paper-dim">Loading…</div>}>
      <VerifyProof />
    </Suspense>
  );
}
