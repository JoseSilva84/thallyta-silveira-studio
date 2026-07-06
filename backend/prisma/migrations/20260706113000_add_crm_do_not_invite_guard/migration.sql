ALTER TABLE "ClientCrmProfile"
ADD COLUMN IF NOT EXISTS "doNotInviteAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "doNotInviteById" TEXT;

CREATE INDEX IF NOT EXISTS "ClientCrmProfile_doNotInviteAt_idx" ON "ClientCrmProfile"("doNotInviteAt");
