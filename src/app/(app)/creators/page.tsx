import { db } from "@/db";
import { creators } from "@/db/schema";
import { Card, PageHeader, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CreatorsPage() {
  const rows = await db.select().from(creators);

  return (
    <div>
      <PageHeader title="Creators" subtitle="Managed roster" />
      {rows.length === 0 ? (
        <EmptyState message="No creators yet. Run `npm run db:seed` to load sample data." />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {rows.map((c) => (
            <Card key={c.id}>
              <div className="font-medium">{c.name}</div>
              {c.handle && <div className="text-sm text-neutral-400">{c.handle}</div>}
              {c.notes && <p className="mt-2 text-sm text-neutral-500">{c.notes}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
