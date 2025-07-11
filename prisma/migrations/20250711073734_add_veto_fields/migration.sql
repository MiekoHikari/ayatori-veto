-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "currentTurn" TEXT,
ADD COLUMN     "vetoCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vetoStarted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vetoState" JSONB;
