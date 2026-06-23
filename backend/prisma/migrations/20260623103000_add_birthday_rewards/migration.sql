CREATE TABLE "BirthdayReward" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL DEFAULT 30,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "target" TEXT,
  "sentAt" TIMESTAMP(3),
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BirthdayReward_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BirthdayReward_userId_year_key" ON "BirthdayReward"("userId", "year");
CREATE INDEX "BirthdayReward_year_idx" ON "BirthdayReward"("year");
CREATE INDEX "BirthdayReward_status_idx" ON "BirthdayReward"("status");

ALTER TABLE "BirthdayReward"
ADD CONSTRAINT "BirthdayReward_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
