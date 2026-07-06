CREATE TABLE "ClientCrmProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "source" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "interests" JSONB,
  "preferredPeriods" JSONB,
  "contactPreference" TEXT,
  "tags" JSONB,
  "notes" TEXT,
  "allowPromotions" BOOLEAN NOT NULL DEFAULT true,
  "dismissedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "inviteSentAt" TIMESTAMP(3),
  "inviteSentById" TEXT,
  "lastInviteMessage" TEXT,
  "doNotInviteAt" TIMESTAMP(3),
  "doNotInviteById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ClientCrmProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClientCrmProfile_userId_key" ON "ClientCrmProfile"("userId");
CREATE INDEX "ClientCrmProfile_status_idx" ON "ClientCrmProfile"("status");
CREATE INDEX "ClientCrmProfile_completedAt_idx" ON "ClientCrmProfile"("completedAt");
CREATE INDEX "ClientCrmProfile_inviteSentAt_idx" ON "ClientCrmProfile"("inviteSentAt");
CREATE INDEX "ClientCrmProfile_doNotInviteAt_idx" ON "ClientCrmProfile"("doNotInviteAt");

ALTER TABLE "ClientCrmProfile"
ADD CONSTRAINT "ClientCrmProfile_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
