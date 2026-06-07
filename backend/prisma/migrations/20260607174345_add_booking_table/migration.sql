-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_userId_fkey";

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "attendeeEmail" TEXT,
ADD COLUMN     "attendeeName" TEXT,
ADD COLUMN     "attendeePhone" TEXT,
ADD COLUMN     "calPayload" JSONB,
ADD COLUMN     "endTime" TIMESTAMP(3),
ADD COLUMN     "location" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
