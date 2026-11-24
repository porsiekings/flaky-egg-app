import { naira, waNumber } from "@/lib/format";

export function WhatsAppButton({ phone, name, balance, business, small }: { phone: string | null; name: string; balance: number; business: string; small?: boolean }) {
  const n = waNumber(phone);
  if (!n || balance <= 0) return null;
  const text = `Good day ${name}, this is ${business}. A gentle reminder that your balance for eggs is ${naira(balance)}. Thank you for your patronage! 🥚`;
  return (
    <a href={`https://wa.me/${n}?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer"
      className={small ? "pill bg-[#25D366]/15 text-[#128C7E]" : "btn border border-[#25D366]/40 bg-[#25D366]/10 text-[#128C7E]"}>
      WhatsApp reminder
    </a>
  );
}
