-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'MANAGER', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('WAITER', 'CAPTAIN', 'RUNNER', 'BARTENDER', 'BUSSER', 'HOST', 'KITCHEN', 'OTHER');

-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('DRAFT', 'OPEN', 'UNDER_REVIEW', 'CLOSED', 'PAID');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('OPEN', 'PAID', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "TipMethod" AS ENUM ('CASH', 'DIGITAL', 'MANUAL', 'POS_IMPORT');

-- CreateEnum
CREATE TYPE "TipStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "DistributionStrategy" AS ENUM ('DIRECT', 'WEIGHTED', 'EQUAL', 'HOURS_POOL', 'POINTS_POOL', 'HYBRID');

-- CreateEnum
CREATE TYPE "AllocationType" AS ENUM ('DIRECT', 'TABLE_SPLIT', 'POOL', 'ADJUSTMENT', 'REVERSAL');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PosProvider" AS ENUM ('GENERIC_API', 'CSV_IMPORT', 'MANUAL', 'MOCK', 'PETPOOJA', 'RESTROWORKS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PosIntegrationStatus" AS ENUM ('DISCONNECTED', 'CONNECTED', 'ERROR', 'DISABLED');

-- CreateEnum
CREATE TYPE "PosMappingStatus" AS ENUM ('PENDING', 'MAPPED', 'IGNORED');

-- CreateEnum
CREATE TYPE "PosWebhookStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'IGNORED', 'FAILED');

-- CreateEnum
CREATE TYPE "PosSyncType" AS ENUM ('FULL', 'INCREMENTAL', 'MANUAL', 'WEBHOOK', 'CSV_IMPORT');

-- CreateEnum
CREATE TYPE "PosSyncStatus" AS ENUM ('RUNNING', 'COMPLETED', 'PARTIAL', 'FAILED');

-- CreateTable
CREATE TABLE "Restaurant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "defaultTipPercentages" INTEGER[] DEFAULT ARRAY[5, 10, 15]::INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Restaurant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "jobType" "JobType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantTable" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 4,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "businessDate" DATE NOT NULL,
    "status" "ShiftStatus" NOT NULL DEFAULT 'DRAFT',
    "startedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "closedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftEmployee" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "clockInAt" TIMESTAMP(3) NOT NULL,
    "clockOutAt" TIMESTAMP(3),
    "points" INTEGER NOT NULL DEFAULT 1,
    "minutesWorked" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TableAssignment" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "assignmentRole" "JobType" NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 100,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TableAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bill" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "billNumber" TEXT NOT NULL,
    "publicToken" TEXT NOT NULL,
    "subtotalPaise" INTEGER NOT NULL,
    "taxPaise" INTEGER NOT NULL DEFAULT 0,
    "totalPaise" INTEGER NOT NULL,
    "status" "BillStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tip" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "percentage" INTEGER,
    "method" "TipMethod" NOT NULL,
    "status" "TipStatus" NOT NULL DEFAULT 'PENDING',
    "customerNote" TEXT,
    "idempotencyKey" TEXT,
    "sourceIntegrationId" TEXT,
    "externalReference" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipRule" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "strategy" "DistributionStrategy" NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "directPercentage" INTEGER,
    "poolPercentage" INTEGER,
    "configuration" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TipRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipAllocation" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "tipId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "allocationType" "AllocationType" NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "weight" INTEGER,
    "points" INTEGER,
    "calculationDetails" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TipAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Adjustment" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "tipId" TEXT,
    "employeeId" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Adjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT,
    "reference" TEXT,
    "approvedByUserId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorEmployeeId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "previousValue" JSONB,
    "newValue" JSONB,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosIntegration" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "provider" "PosProvider" NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" "PosIntegrationStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "credentialsEncrypted" TEXT,
    "settingsJson" JSONB NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    "lastSuccessfulSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalOutletMapping" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "posIntegrationId" TEXT NOT NULL,
    "externalOutletId" TEXT NOT NULL,
    "localOutletKey" TEXT NOT NULL DEFAULT 'PRIMARY',
    "externalName" TEXT NOT NULL,
    "status" "PosMappingStatus" NOT NULL DEFAULT 'MAPPED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalOutletMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalEmployeeMapping" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "posIntegrationId" TEXT NOT NULL,
    "externalEmployeeId" TEXT NOT NULL,
    "employeeId" TEXT,
    "externalCode" TEXT,
    "externalName" TEXT NOT NULL,
    "status" "PosMappingStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalEmployeeMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalTableMapping" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "posIntegrationId" TEXT NOT NULL,
    "externalTableId" TEXT NOT NULL,
    "tableId" TEXT,
    "externalNumber" INTEGER,
    "externalName" TEXT NOT NULL,
    "status" "PosMappingStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalTableMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalBillMapping" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "posIntegrationId" TEXT NOT NULL,
    "externalBillId" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "externalBillNumber" TEXT NOT NULL,
    "lastExternalStatus" "BillStatus" NOT NULL,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawPayloadJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalBillMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosWebhookEvent" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "posIntegrationId" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "signatureValid" BOOLEAN NOT NULL,
    "status" "PosWebhookStatus" NOT NULL DEFAULT 'RECEIVED',
    "errorMessage" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "PosWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosSyncRun" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "posIntegrationId" TEXT NOT NULL,
    "syncType" "PosSyncType" NOT NULL,
    "status" "PosSyncStatus" NOT NULL DEFAULT 'RUNNING',
    "recordsReceived" INTEGER NOT NULL DEFAULT 0,
    "recordsCreated" INTEGER NOT NULL DEFAULT 0,
    "recordsUpdated" INTEGER NOT NULL DEFAULT 0,
    "recordsIgnored" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "detailsJson" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PosSyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_code_key" ON "Restaurant"("code");

-- CreateIndex
CREATE INDEX "User_restaurantId_isActive_idx" ON "User"("restaurantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "User_restaurantId_email_key" ON "User"("restaurantId", "email");

-- CreateIndex
CREATE INDEX "Employee_restaurantId_isActive_idx" ON "Employee"("restaurantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_restaurantId_employeeCode_key" ON "Employee"("restaurantId", "employeeCode");

-- CreateIndex
CREATE INDEX "RestaurantTable_restaurantId_isActive_idx" ON "RestaurantTable"("restaurantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantTable_restaurantId_number_key" ON "RestaurantTable"("restaurantId", "number");

-- CreateIndex
CREATE INDEX "Shift_restaurantId_businessDate_status_idx" ON "Shift"("restaurantId", "businessDate", "status");

-- CreateIndex
CREATE INDEX "ShiftEmployee_shiftId_isActive_idx" ON "ShiftEmployee"("shiftId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftEmployee_shiftId_employeeId_key" ON "ShiftEmployee"("shiftId", "employeeId");

-- CreateIndex
CREATE INDEX "TableAssignment_shiftId_tableId_endedAt_idx" ON "TableAssignment"("shiftId", "tableId", "endedAt");

-- CreateIndex
CREATE INDEX "TableAssignment_employeeId_shiftId_idx" ON "TableAssignment"("employeeId", "shiftId");

-- CreateIndex
CREATE UNIQUE INDEX "Bill_publicToken_key" ON "Bill"("publicToken");

-- CreateIndex
CREATE INDEX "Bill_shiftId_status_idx" ON "Bill"("shiftId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Bill_restaurantId_billNumber_key" ON "Bill"("restaurantId", "billNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Tip_idempotencyKey_key" ON "Tip"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Tip_restaurantId_status_createdAt_idx" ON "Tip"("restaurantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Tip_billId_status_idx" ON "Tip"("billId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Tip_sourceIntegrationId_externalReference_key" ON "Tip"("sourceIntegrationId", "externalReference");

-- CreateIndex
CREATE INDEX "TipRule_restaurantId_isDefault_isActive_idx" ON "TipRule"("restaurantId", "isDefault", "isActive");

-- CreateIndex
CREATE INDEX "TipAllocation_shiftId_employeeId_idx" ON "TipAllocation"("shiftId", "employeeId");

-- CreateIndex
CREATE INDEX "TipAllocation_tipId_idx" ON "TipAllocation"("tipId");

-- CreateIndex
CREATE INDEX "Adjustment_shiftId_employeeId_idx" ON "Adjustment"("shiftId", "employeeId");

-- CreateIndex
CREATE INDEX "Payout_shiftId_employeeId_status_idx" ON "Payout"("shiftId", "employeeId", "status");

-- CreateIndex
CREATE INDEX "AuditLog_restaurantId_createdAt_idx" ON "AuditLog"("restaurantId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "PosIntegration_restaurantId_status_idx" ON "PosIntegration"("restaurantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PosIntegration_restaurantId_displayName_key" ON "PosIntegration"("restaurantId", "displayName");

-- CreateIndex
CREATE INDEX "ExternalOutletMapping_posIntegrationId_status_idx" ON "ExternalOutletMapping"("posIntegrationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalOutletMapping_restaurantId_posIntegrationId_externa_key" ON "ExternalOutletMapping"("restaurantId", "posIntegrationId", "externalOutletId");

-- CreateIndex
CREATE INDEX "ExternalEmployeeMapping_posIntegrationId_status_idx" ON "ExternalEmployeeMapping"("posIntegrationId", "status");

-- CreateIndex
CREATE INDEX "ExternalEmployeeMapping_employeeId_idx" ON "ExternalEmployeeMapping"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalEmployeeMapping_restaurantId_posIntegrationId_exter_key" ON "ExternalEmployeeMapping"("restaurantId", "posIntegrationId", "externalEmployeeId");

-- CreateIndex
CREATE INDEX "ExternalTableMapping_posIntegrationId_status_idx" ON "ExternalTableMapping"("posIntegrationId", "status");

-- CreateIndex
CREATE INDEX "ExternalTableMapping_tableId_idx" ON "ExternalTableMapping"("tableId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalTableMapping_restaurantId_posIntegrationId_external_key" ON "ExternalTableMapping"("restaurantId", "posIntegrationId", "externalTableId");

-- CreateIndex
CREATE INDEX "ExternalBillMapping_billId_idx" ON "ExternalBillMapping"("billId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalBillMapping_restaurantId_posIntegrationId_externalB_key" ON "ExternalBillMapping"("restaurantId", "posIntegrationId", "externalBillId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalBillMapping_posIntegrationId_billId_key" ON "ExternalBillMapping"("posIntegrationId", "billId");

-- CreateIndex
CREATE INDEX "PosWebhookEvent_restaurantId_receivedAt_idx" ON "PosWebhookEvent"("restaurantId", "receivedAt");

-- CreateIndex
CREATE INDEX "PosWebhookEvent_posIntegrationId_status_idx" ON "PosWebhookEvent"("posIntegrationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PosWebhookEvent_posIntegrationId_providerEventId_key" ON "PosWebhookEvent"("posIntegrationId", "providerEventId");

-- CreateIndex
CREATE INDEX "PosSyncRun_restaurantId_startedAt_idx" ON "PosSyncRun"("restaurantId", "startedAt");

-- CreateIndex
CREATE INDEX "PosSyncRun_posIntegrationId_startedAt_idx" ON "PosSyncRun"("posIntegrationId", "startedAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantTable" ADD CONSTRAINT "RestaurantTable_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftEmployee" ADD CONSTRAINT "ShiftEmployee_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftEmployee" ADD CONSTRAINT "ShiftEmployee_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableAssignment" ADD CONSTRAINT "TableAssignment_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableAssignment" ADD CONSTRAINT "TableAssignment_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "RestaurantTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableAssignment" ADD CONSTRAINT "TableAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "RestaurantTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tip" ADD CONSTRAINT "Tip_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tip" ADD CONSTRAINT "Tip_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tip" ADD CONSTRAINT "Tip_sourceIntegrationId_fkey" FOREIGN KEY ("sourceIntegrationId") REFERENCES "PosIntegration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tip" ADD CONSTRAINT "Tip_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipRule" ADD CONSTRAINT "TipRule_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipAllocation" ADD CONSTRAINT "TipAllocation_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipAllocation" ADD CONSTRAINT "TipAllocation_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipAllocation" ADD CONSTRAINT "TipAllocation_tipId_fkey" FOREIGN KEY ("tipId") REFERENCES "Tip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipAllocation" ADD CONSTRAINT "TipAllocation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Adjustment" ADD CONSTRAINT "Adjustment_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Adjustment" ADD CONSTRAINT "Adjustment_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Adjustment" ADD CONSTRAINT "Adjustment_tipId_fkey" FOREIGN KEY ("tipId") REFERENCES "Tip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Adjustment" ADD CONSTRAINT "Adjustment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Adjustment" ADD CONSTRAINT "Adjustment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorEmployeeId_fkey" FOREIGN KEY ("actorEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosIntegration" ADD CONSTRAINT "PosIntegration_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalOutletMapping" ADD CONSTRAINT "ExternalOutletMapping_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalOutletMapping" ADD CONSTRAINT "ExternalOutletMapping_posIntegrationId_fkey" FOREIGN KEY ("posIntegrationId") REFERENCES "PosIntegration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalEmployeeMapping" ADD CONSTRAINT "ExternalEmployeeMapping_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalEmployeeMapping" ADD CONSTRAINT "ExternalEmployeeMapping_posIntegrationId_fkey" FOREIGN KEY ("posIntegrationId") REFERENCES "PosIntegration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalEmployeeMapping" ADD CONSTRAINT "ExternalEmployeeMapping_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalTableMapping" ADD CONSTRAINT "ExternalTableMapping_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalTableMapping" ADD CONSTRAINT "ExternalTableMapping_posIntegrationId_fkey" FOREIGN KEY ("posIntegrationId") REFERENCES "PosIntegration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalTableMapping" ADD CONSTRAINT "ExternalTableMapping_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "RestaurantTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalBillMapping" ADD CONSTRAINT "ExternalBillMapping_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalBillMapping" ADD CONSTRAINT "ExternalBillMapping_posIntegrationId_fkey" FOREIGN KEY ("posIntegrationId") REFERENCES "PosIntegration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalBillMapping" ADD CONSTRAINT "ExternalBillMapping_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosWebhookEvent" ADD CONSTRAINT "PosWebhookEvent_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosWebhookEvent" ADD CONSTRAINT "PosWebhookEvent_posIntegrationId_fkey" FOREIGN KEY ("posIntegrationId") REFERENCES "PosIntegration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosSyncRun" ADD CONSTRAINT "PosSyncRun_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PosSyncRun" ADD CONSTRAINT "PosSyncRun_posIntegrationId_fkey" FOREIGN KEY ("posIntegrationId") REFERENCES "PosIntegration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

