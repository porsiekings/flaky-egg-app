import { Flash, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { requireMember } from "@/lib/auth";
import { addCustomer } from "../actions";
import { CustomerFields } from "@/components/CustomerFields";

export default async function NewCustomer({ searchParams }: { searchParams: { error?: string } }) {
  await requireMember();
  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="New customer" />
      <Flash error={searchParams.error} />
      <form action={addCustomer} className="card space-y-4">
        <CustomerFields />
        <SubmitButton>Save customer</SubmitButton>
      </form>
    </div>
  );
}

