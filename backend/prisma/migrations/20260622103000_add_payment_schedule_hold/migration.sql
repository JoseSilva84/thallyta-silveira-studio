ALTER TABLE "BookingPayment" ADD COLUMN "scheduledAt" TIMESTAMP(3);
ALTER TABLE "BookingPayment" ADD COLUMN "endTime" TIMESTAMP(3);
ALTER TABLE "BookingPayment" ADD COLUMN "holdExpiresAt" TIMESTAMP(3);

CREATE INDEX "BookingPayment_scheduledAt_idx" ON "BookingPayment"("scheduledAt");
CREATE INDEX "BookingPayment_holdExpiresAt_idx" ON "BookingPayment"("holdExpiresAt");
