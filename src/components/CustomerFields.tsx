export function CustomerFields({ c }: { c?: { name: string; phone: string | null; address: string | null; notes: string | null } }) {
  return (
    <>
      <div><label className="label" htmlFor="name">Name</label><input className="input" id="name" name="name" required defaultValue={c?.name} /></div>
      <div><label className="label" htmlFor="phone">Phone (for WhatsApp reminders)</label><input className="input" id="phone" name="phone" type="tel" inputMode="tel" placeholder="0803 123 4567" defaultValue={c?.phone ?? ""} /></div>
      <div><label className="label" htmlFor="address">Address</label><input className="input" id="address" name="address" defaultValue={c?.address ?? ""} /></div>
      <div><label className="label" htmlFor="notes">Notes</label><input className="input" id="notes" name="notes" defaultValue={c?.notes ?? ""} /></div>
    </>
  );
}
