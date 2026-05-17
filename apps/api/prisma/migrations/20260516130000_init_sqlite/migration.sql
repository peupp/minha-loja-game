-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pin" TEXT NOT NULL,
    "facilitatorToken" TEXT NOT NULL,
    "phase" TEXT NOT NULL DEFAULT 'LOBBY',
    "currentRound" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "storeToken" TEXT NOT NULL,
    "planDraft" JSON,
    "planSubmitted" JSON,
    "cashRemaining" REAL,
    "connected" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Store_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RoundResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "results" JSON NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoundResult_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FinalRanking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "ebitdaPercent" REAL NOT NULL,
    "position" INTEGER NOT NULL,
    CONSTRAINT "FinalRanking_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_pin_key" ON "Session"("pin");

-- CreateIndex
CREATE INDEX "Store_sessionId_idx" ON "Store"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Store_sessionId_companyName_key" ON "Store"("sessionId", "companyName");

-- CreateIndex
CREATE INDEX "RoundResult_sessionId_idx" ON "RoundResult"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "RoundResult_sessionId_round_key" ON "RoundResult"("sessionId", "round");

-- CreateIndex
CREATE INDEX "FinalRanking_sessionId_idx" ON "FinalRanking"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "FinalRanking_sessionId_storeId_key" ON "FinalRanking"("sessionId", "storeId");
