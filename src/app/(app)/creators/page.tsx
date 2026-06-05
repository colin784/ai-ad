import { db } from "@/db";
import { creators } from "@/db/schema";
import { Card, EmptyState, PageHero, palette, mono } from "@/components/panel-ui";

export const dynamic = "force-dynamic";

export default async function CreatorsPage() {
  const rows = await db.select().from(creators);

  return (
    <div>
      <PageHero title="Creators" subtitle="Managed roster" />
      {rows.length === 0 ? (
        <EmptyState>
          No creators yet. Run <code style={{ fontFamily: mono }}>npm run db:seed</code> to
          load sample data.
        </EmptyState>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
          {rows.map((c) => (
            <Card key={c.id}>
              <div style={{ fontSize: 15, fontWeight: 700, color: palette.titleText }}>
                {c.name}
              </div>
              {c.handle && (
                <div style={{ marginTop: 4, fontSize: 12, color: palette.secondary }}>
                  {c.handle}
                </div>
              )}
              {c.notes && (
                <div style={{ marginTop: 12, fontSize: 13, color: palette.body, lineHeight: 1.6 }}>
                  {c.notes}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
