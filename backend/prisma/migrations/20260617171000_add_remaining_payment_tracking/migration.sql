-- AlterTable
ALTER TABLE "BookingPayment" ADD COLUMN "remainingPaidAt" TIMESTAMP(3);
ALTER TABLE "BookingPayment" ADD COLUMN "remainingPaidBy" TEXT;
