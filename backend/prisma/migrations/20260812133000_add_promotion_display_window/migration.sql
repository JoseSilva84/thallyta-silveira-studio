ALTER TABLE "Promotion" ADD COLUMN "displayStartsAt" TIMESTAMP(3);
ALTER TABLE "Promotion" ADD COLUMN "displayEndsAt" TIMESTAMP(3);

CREATE INDEX "Promotion_displayStartsAt_idx" ON "Promotion"("displayStartsAt");
CREATE INDEX "Promotion_displayEndsAt_idx" ON "Promotion"("displayEndsAt");
