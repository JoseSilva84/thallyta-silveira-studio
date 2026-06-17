-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "paymentId" TEXT;

-- CreateTable
CREATE TABLE "BookingPayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "servicePrice" DOUBLE PRECISION NOT NULL,
    "paymentType" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "minimumAmount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "preferenceId" TEXT,
    "mercadoPagoPaymentId" TEXT,
    "externalReference" TEXT NOT NULL,
    "initPoint" TEXT,
    "sandboxInitPoint" TEXT,
    "metadata" JSONB,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Booking_paymentId_key" ON "Booking"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingPayment_preferenceId_key" ON "BookingPayment"("preferenceId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingPayment_mercadoPagoPaymentId_key" ON "BookingPayment"("mercadoPagoPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingPayment_externalReference_key" ON "BookingPayment"("externalReference");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "BookingPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPayment" ADD CONSTRAINT "BookingPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
