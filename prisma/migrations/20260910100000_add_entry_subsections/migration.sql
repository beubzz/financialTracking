ALTER TABLE "MoneyEntry" ADD COLUMN "parentId" TEXT;

ALTER TABLE "MoneyEntry"
ADD CONSTRAINT "MoneyEntry_parentId_fkey"
FOREIGN KEY ("parentId") REFERENCES "MoneyEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "MoneyEntry_parentId_idx" ON "MoneyEntry"("parentId");