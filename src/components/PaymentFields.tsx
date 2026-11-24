import { SubmitButton } from "./SubmitButton";

export function PaymentFields({ today, suggested }: { today: string; suggested?: number }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="amount">Amount received (₦)</label>
          <input className="input" id="amount" name="amount" type="number" inputMode="numeric" min={1} step="any" required defaultValue={suggested && suggested > 0 ? suggested : undefined} />
        </div>
        <div>
          <label className="label" htmlFor="paid_on">Date</label>
          <input className="input" id="paid_on" name="paid_on" type="date" defaultValue={today} max={today} required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="method">Paid by</label>
          <select className="input" id="method" name="method" defaultValue="cash">
            <option value="cash">Cash</option><option value="transfer">Transfer</option><option value="pos">POS</option><option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="notes">Note</label>
          <input className="input" id="notes" name="notes" />
        </div>
      </div>
      <SubmitButton>Save payment</SubmitButton>
    </>
  );
}
