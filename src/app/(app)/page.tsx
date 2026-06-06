import { desc } from "drizzle-orm";
import { db } from "@/db";
import { brands } from "@/db/schema";
import { safe } from "@/lib/safe-query";
import { PageHero } from "@/components/panel-ui";
import { ProduceFlow } from "@/components/produce/produce-flow";

export const revalidate = 30;

export default async function ProducePage() {
  const rows = await safe(
    db.select({ id: brands.id, name: brands.name }).from(brands).orderBy(desc(brands.createdAt)),
    [],
  );

  return (
    <div>
      <PageHero
        title="Produce"
        subtitle="Pick a brand template, drop in raw footage, get the finished cut."
      />
      <ProduceFlow brands={rows} />
    </div>
  );
}
