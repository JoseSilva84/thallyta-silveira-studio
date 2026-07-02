ALTER TABLE "NotificationLog"
ADD COLUMN "providerMessageId" TEXT,
ADD COLUMN "providerAck" INTEGER,
ADD COLUMN "providerAckName" TEXT,
ADD COLUMN "resolvedTarget" TEXT,
ADD COLUMN "retryCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "nextRetryAt" TIMESTAMP(3),
ADD COLUMN "adminAlertedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "NotificationLog_providerMessageId_key" ON "NotificationLog"("providerMessageId");
