import { ethers } from "ethers";
import { Invoice, registry, Status } from "./contracts";

export async function fetchInvoices(runner: ethers.ContractRunner, ids: bigint[]): Promise<Invoice[]> {
  const reg = registry(runner);
  const out = await Promise.all(
    ids.map(async (id) => {
      const r = await reg.getInvoice(id);
      return {
        id: Number(id),
        issuer: r.issuer as string,
        payer: r.payer as string,
        amountHandle: r.amount as string,
        dueDate: Number(r.dueDate),
        status: Number(r.status) as Status,
        recipient: r.recipient as string,
        memo: r.memo as string,
      } satisfies Invoice;
    }),
  );
  return out.sort((a, b) => b.id - a.id);
}

export async function invoicesFor(
  runner: ethers.ContractRunner,
  address: string,
): Promise<{ issued: Invoice[]; billed: Invoice[] }> {
  const reg = registry(runner);
  const [issuedIds, billedIds] = await Promise.all([
    reg.invoicesIssuedBy(address) as Promise<bigint[]>,
    reg.invoicesBilledTo(address) as Promise<bigint[]>,
  ]);
  const [issued, billed] = await Promise.all([
    fetchInvoices(runner, issuedIds),
    fetchInvoices(runner, billedIds),
  ]);
  return { issued, billed };
}
