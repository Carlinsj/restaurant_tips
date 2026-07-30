import {
  AllocationType,
  BillStatus,
  PosMappingStatus,
  PosSyncStatus,
  PosSyncType,
  Prisma,
  TipMethod,
  TipStatus,
  type PosIntegration,
  type PrismaClient,
} from "@prisma/client";
import { getPrisma } from "@/lib/database/prisma";
import { calculateTableLoadAllocation } from "@/lib/tips";
import { writeAuditLog } from "@/server/audit";
import { normalizeCurrencyCode } from "@/lib/currency";
import type { PosAdapter } from "./adapter";
import { PosIntegrationError } from "./adapter";
import { matchExternalEmployee, matchExternalTable } from "./matching";
import { createPosAdapter } from "./registry";
import { decryptCredentials } from "./security/encryption";
import { redactSecrets, safeIntegrationError } from "./security/redaction";
import type {
  ExternalBill,
  ExternalEmployee,
  ExternalOutlet,
  ExternalTable,
  NormalizedPosEvent,
  PosProviderName,
} from "./types";

type SyncFailure = {
  entity: "OUTLET" | "EMPLOYEE" | "TABLE" | "BILL" | "EVENT";
  externalId: string;
  message: string;
};

type SyncCounters = {
  received: number;
  created: number;
  updated: number;
  ignored: number;
};

export type PosSyncResult = SyncCounters & {
  syncRunId: string;
  status: "COMPLETED" | "PARTIAL" | "FAILED";
  failures: SyncFailure[];
};

type IntegrationRecord = PosIntegration;

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(redactSecrets(value))) as Prisma.InputJsonValue;
}

function providerName(provider: string): PosProviderName {
  return provider as PosProviderName;
}

async function processOutlet(
  prisma: PrismaClient,
  integration: IntegrationRecord,
  outlet: ExternalOutlet,
  actorUserId?: string,
): Promise<"created" | "updated"> {
  const existing = await prisma.externalOutletMapping.findUnique({
    where: {
      restaurantId_posIntegrationId_externalOutletId: {
        restaurantId: integration.restaurantId,
        posIntegrationId: integration.id,
        externalOutletId: outlet.externalOutletId,
      },
    },
  });
  if (existing) {
    await prisma.externalOutletMapping.update({
      where: { id: existing.id },
      data: { externalName: outlet.name },
    });
    return "updated";
  }
  const mapping = await prisma.externalOutletMapping.create({
    data: {
      restaurantId: integration.restaurantId,
      posIntegrationId: integration.id,
      externalOutletId: outlet.externalOutletId,
      externalName: outlet.name,
      localOutletKey: "PRIMARY",
      status: PosMappingStatus.MAPPED,
    },
  });
  await writeAuditLog(prisma, {
    restaurantId: integration.restaurantId,
    actorUserId,
    action: "POS_OUTLET_MAPPING_CREATED",
    entityType: "ExternalOutletMapping",
    entityId: mapping.id,
    newValue: { externalOutletId: outlet.externalOutletId, externalName: outlet.name },
  });
  return "created";
}

export async function processExternalEmployee(
  prisma: PrismaClient,
  integration: IntegrationRecord,
  external: ExternalEmployee,
  actorUserId?: string,
): Promise<"created" | "updated"> {
  const unique = {
    restaurantId: integration.restaurantId,
    posIntegrationId: integration.id,
    externalEmployeeId: external.externalEmployeeId,
  };
  const existing = await prisma.externalEmployeeMapping.findUnique({
    where: { restaurantId_posIntegrationId_externalEmployeeId: unique },
  });
  if (existing) {
    await prisma.externalEmployeeMapping.update({
      where: { id: existing.id },
      data: {
        externalCode: external.employeeCode,
        externalName: external.name,
      },
    });
    return "updated";
  }

  const employees = await prisma.employee.findMany({
    where: { restaurantId: integration.restaurantId },
    select: { id: true, employeeCode: true, name: true },
  });
  const matched = matchExternalEmployee(external, employees);
  const mapping = await prisma.externalEmployeeMapping.create({
    data: {
      ...unique,
      employeeId: matched?.id,
      externalCode: external.employeeCode,
      externalName: external.name,
      status: matched ? PosMappingStatus.MAPPED : PosMappingStatus.PENDING,
    },
  });
  await writeAuditLog(prisma, {
    restaurantId: integration.restaurantId,
    actorUserId,
    action: "POS_EMPLOYEE_MAPPING_CREATED",
    entityType: "ExternalEmployeeMapping",
    entityId: mapping.id,
    newValue: {
      externalEmployeeId: external.externalEmployeeId,
      employeeId: matched?.id ?? null,
      status: mapping.status,
    },
  });
  return "created";
}

export async function processExternalTable(
  prisma: PrismaClient,
  integration: IntegrationRecord,
  external: ExternalTable,
  actorUserId?: string,
): Promise<"created" | "updated"> {
  const unique = {
    restaurantId: integration.restaurantId,
    posIntegrationId: integration.id,
    externalTableId: external.externalTableId,
  };
  const existing = await prisma.externalTableMapping.findUnique({
    where: { restaurantId_posIntegrationId_externalTableId: unique },
  });
  if (existing) {
    await prisma.externalTableMapping.update({
      where: { id: existing.id },
      data: {
        externalName: external.name,
        externalNumber: external.tableNumber,
      },
    });
    return "updated";
  }
  const tables = await prisma.restaurantTable.findMany({
    where: { restaurantId: integration.restaurantId },
    select: { id: true, number: true, name: true },
  });
  const matched = matchExternalTable(external, tables);
  const mapping = await prisma.externalTableMapping.create({
    data: {
      ...unique,
      tableId: matched?.id,
      externalNumber: external.tableNumber,
      externalName: external.name,
      status: matched ? PosMappingStatus.MAPPED : PosMappingStatus.PENDING,
    },
  });
  await writeAuditLog(prisma, {
    restaurantId: integration.restaurantId,
    actorUserId,
    action: "POS_TABLE_MAPPING_CREATED",
    entityType: "ExternalTableMapping",
    entityId: mapping.id,
    newValue: {
      externalTableId: external.externalTableId,
      tableId: matched?.id ?? null,
      status: mapping.status,
    },
  });
  return "created";
}

async function ensureImportedEmployeeAssignment(
  transaction: Prisma.TransactionClient,
  integration: IntegrationRecord,
  bill: ExternalBill,
  shiftId: string,
  tableId: string,
): Promise<void> {
  if (!bill.externalEmployeeId) return;
  const mapping = await transaction.externalEmployeeMapping.findUnique({
    where: {
      restaurantId_posIntegrationId_externalEmployeeId: {
        restaurantId: integration.restaurantId,
        posIntegrationId: integration.id,
        externalEmployeeId: bill.externalEmployeeId,
      },
    },
    include: {
      employee: {
        select: { id: true, jobType: true },
      },
    },
  });
  if (!mapping?.employee) return;
  const activeAssignments = await transaction.tableAssignment.findMany({
    where: { shiftId, tableId, endedAt: null },
  });
  if (activeAssignments.some((assignment) => assignment.employeeId === mapping.employeeId)) return;
  if (activeAssignments.length > 0) return;
  await transaction.tableAssignment.create({
    data: {
      shiftId,
      tableId,
      employeeId: mapping.employee.id,
      assignmentRole: mapping.employee.jobType,
      weight: 100,
      startedAt: bill.openedAt ?? new Date(),
      isPrimary: true,
    },
  });
}

async function importConfirmedTip(
  transaction: Prisma.TransactionClient,
  integration: IntegrationRecord,
  external: ExternalBill,
  localBill: { id: string; shiftId: string; tableId: string },
  actorUserId?: string,
): Promise<"created" | "ignored"> {
  if (external.status !== "PAID" || external.tipPaise === undefined || external.tipPaise <= 0) {
    return "ignored";
  }
  const externalReference = external.externalTipId ?? `${external.externalBillId}:tip`;
  const existing = await transaction.tip.findUnique({
    where: {
      sourceIntegrationId_externalReference: {
        sourceIntegrationId: integration.id,
        externalReference,
      },
    },
  });
  if (existing) return "ignored";

  const assignments = await transaction.tableAssignment.findMany({
    where: {
      shiftId: localBill.shiftId,
      endedAt: null,
    },
    select: { employeeId: true, tableId: true },
  });
  if (!assignments.some((assignment) => assignment.tableId === localBill.tableId)) {
    throw new PosIntegrationError(
      "The bill was imported, but its tip needs a mapped table assignment before allocation.",
      "MAPPING_REQUIRED",
    );
  }
  const allocations = calculateTableLoadAllocation(
    external.tipPaise,
    localBill.tableId,
    assignments,
  );
  const tip = await transaction.tip.create({
    data: {
      restaurantId: integration.restaurantId,
      billId: localBill.id,
      amountPaise: external.tipPaise,
      method: TipMethod.POS_IMPORT,
      status: TipStatus.CONFIRMED,
      confirmedAt: external.paidAt ?? new Date(),
      sourceIntegrationId: integration.id,
      externalReference,
      idempotencyKey: `pos:${integration.id}:${externalReference}`,
      allocations: {
        create: allocations.map((allocation) => ({
          restaurantId: integration.restaurantId,
          shiftId: localBill.shiftId,
          employeeId: allocation.employeeId,
          allocationType: AllocationType.TABLE_SPLIT,
          amountPaise: allocation.amountPaise,
          weight: allocation.shareBasisPoints,
          calculationDetails: {
            strategy: "INVERSE_TABLE_LOAD_V1",
            source: "POS_IMPORT",
            externalReference,
            activeTableCount: allocation.activeTableCount,
            shareBasisPoints: allocation.shareBasisPoints,
            remainderPaise: allocation.remainderPaise,
          },
        })),
      },
    },
  });
  await writeAuditLog(transaction, {
    restaurantId: integration.restaurantId,
    actorUserId,
    action: "POS_TIP_IMPORTED",
    entityType: "Tip",
    entityId: tip.id,
    newValue: {
      amountPaise: external.tipPaise,
      externalReference,
      integrationId: integration.id,
    },
  });
  return "created";
}

export async function processExternalBill(
  prisma: PrismaClient,
  integration: IntegrationRecord,
  external: ExternalBill,
  actorUserId?: string,
): Promise<"created" | "updated" | "ignored"> {
  if (external.totalPaise < 0 || external.subtotalPaise < 0 || (external.tipPaise ?? 0) < 0) {
    throw new PosIntegrationError("The POS bill contains a negative financial amount.", "INVALID_RESPONSE");
  }
  const [restaurant, shift] = await Promise.all([
    prisma.restaurant.findUnique({
      where: { id: integration.restaurantId },
      select: { currency: true },
    }),
    prisma.shift.findFirst({
      where: { restaurantId: integration.restaurantId, status: "OPEN" },
      orderBy: { startedAt: "desc" },
    }),
  ]);
  if (!restaurant) {
    throw new PosIntegrationError("The integration restaurant no longer exists.", "INVALID_CONFIGURATION");
  }
  const restaurantCurrency = normalizeCurrencyCode(restaurant.currency);
  if (normalizeCurrencyCode(external.currency) !== restaurantCurrency) {
    throw new PosIntegrationError(
      `The POS bill uses ${external.currency}, but this restaurant is configured for ${restaurantCurrency}.`,
      "INVALID_RESPONSE",
    );
  }
  if (!shift) {
    throw new PosIntegrationError("Open a TipSathi shift before importing POS bills.", "MAPPING_REQUIRED");
  }
  if (!external.externalTableId) {
    throw new PosIntegrationError("The external bill does not identify a table.", "MAPPING_REQUIRED");
  }
  const tableMapping = await prisma.externalTableMapping.findUnique({
    where: {
      restaurantId_posIntegrationId_externalTableId: {
        restaurantId: integration.restaurantId,
        posIntegrationId: integration.id,
        externalTableId: external.externalTableId,
      },
    },
  });
  if (!tableMapping?.tableId || tableMapping.status !== "MAPPED") {
    throw new PosIntegrationError(`Table ${external.tableName ?? external.externalTableId} needs manager mapping.`, "MAPPING_REQUIRED");
  }
  const mappedTableId = tableMapping.tableId;

  return prisma.$transaction(async (transaction) => {
    const mapping = await transaction.externalBillMapping.findUnique({
      where: {
        restaurantId_posIntegrationId_externalBillId: {
          restaurantId: integration.restaurantId,
          posIntegrationId: integration.id,
          externalBillId: external.externalBillId,
        },
      },
      include: { bill: true },
    });

    let localBill: { id: string; shiftId: string; tableId: string };
    let result: "created" | "updated" | "ignored";
    if (mapping) {
      localBill = mapping.bill;
      const finalized = mapping.bill.status !== BillStatus.OPEN;
      if (finalized && mapping.bill.status !== external.status) {
        return "ignored";
      }
      if (!finalized) {
        await transaction.bill.update({
          where: { id: mapping.billId },
          data: {
            subtotalPaise: external.subtotalPaise,
            taxPaise: external.taxPaise ?? 0,
            totalPaise: external.totalPaise,
            status: external.status,
            openedAt: external.openedAt,
            paidAt: external.status === "PAID" ? external.paidAt ?? new Date() : undefined,
          },
        });
      }
      await transaction.externalBillMapping.update({
        where: { id: mapping.id },
        data: {
          lastExternalStatus: external.status,
          lastSyncedAt: new Date(),
          rawPayloadJson: toJsonValue(external.rawPayload ?? external),
        },
      });
      result = finalized ? "ignored" : "updated";
    } else {
      let localBillNumber = external.billNumber;
      const duplicateNumber = await transaction.bill.findUnique({
        where: {
          restaurantId_billNumber: {
            restaurantId: integration.restaurantId,
            billNumber: localBillNumber,
          },
        },
      });
      if (duplicateNumber) {
        localBillNumber = `POS-${integration.id.slice(-5)}-${external.billNumber}`;
      }
      const created = await transaction.bill.create({
        data: {
          restaurantId: integration.restaurantId,
          shiftId: shift.id,
          tableId: mappedTableId,
          billNumber: localBillNumber,
          subtotalPaise: external.subtotalPaise,
          taxPaise: external.taxPaise ?? 0,
          totalPaise: external.totalPaise,
          status: external.status,
          openedAt: external.openedAt ?? new Date(),
          paidAt: external.status === "PAID" ? external.paidAt ?? new Date() : undefined,
        },
      });
      localBill = created;
      await transaction.externalBillMapping.create({
        data: {
          restaurantId: integration.restaurantId,
          posIntegrationId: integration.id,
          externalBillId: external.externalBillId,
          billId: created.id,
          externalBillNumber: external.billNumber,
          lastExternalStatus: external.status,
          rawPayloadJson: toJsonValue(external.rawPayload ?? external),
        },
      });
      await writeAuditLog(transaction, {
        restaurantId: integration.restaurantId,
        actorUserId,
        action: "POS_BILL_IMPORTED",
        entityType: "Bill",
        entityId: created.id,
        newValue: {
          externalBillId: external.externalBillId,
          externalBillNumber: external.billNumber,
          totalPaise: external.totalPaise,
          status: external.status,
        },
      });
      result = "created";
    }

    await ensureImportedEmployeeAssignment(
      transaction,
      integration,
      external,
      localBill.shiftId,
      localBill.tableId,
    );
    await importConfirmedTip(transaction, integration, external, localBill, actorUserId);
    return result;
  });
}

export async function syncPosIntegration(input: {
  restaurantId: string;
  integrationId: string;
  syncType?: PosSyncType;
  actorUserId?: string;
  adapterOverride?: PosAdapter;
}): Promise<PosSyncResult> {
  const prisma = getPrisma();
  const integration = await prisma.posIntegration.findFirst({
    where: {
      id: input.integrationId,
      restaurantId: input.restaurantId,
      status: { not: "DISABLED" },
    },
  });
  if (!integration) throw new Error("POS integration not found.");
  const run = await prisma.posSyncRun.create({
    data: {
      restaurantId: input.restaurantId,
      posIntegrationId: integration.id,
      syncType: input.syncType ?? PosSyncType.MANUAL,
    },
  });
  const counters: SyncCounters = { received: 0, created: 0, updated: 0, ignored: 0 };
  const failures: SyncFailure[] = [];

  try {
    const credentials = decryptCredentials(integration.credentialsEncrypted);
    const adapter =
      input.adapterOverride ??
      createPosAdapter(providerName(integration.provider), integration.settingsJson, credentials);
    const context = {
      restaurantId: integration.restaurantId,
      integrationId: integration.id,
      since: integration.lastSuccessfulSyncAt ?? undefined,
    };
    const [outlets, employees, tables, bills] = await Promise.all([
      adapter.getOutlets(context),
      adapter.getEmployees(context),
      adapter.getTables(context),
      adapter.getBills(context),
    ]);
    counters.received = outlets.length + employees.length + tables.length + bills.length;

    const processRecord = async (
      entity: SyncFailure["entity"],
      externalId: string,
      operation: () => Promise<"created" | "updated" | "ignored">,
    ) => {
      try {
        const outcome = await operation();
        counters[outcome] += 1;
      } catch (error) {
        counters.ignored += 1;
        failures.push({ entity, externalId, message: safeIntegrationError(error) });
      }
    };
    for (const outlet of outlets) {
      await processRecord("OUTLET", outlet.externalOutletId, () => processOutlet(prisma, integration, outlet, input.actorUserId));
    }
    for (const employee of employees) {
      await processRecord("EMPLOYEE", employee.externalEmployeeId, () => processExternalEmployee(prisma, integration, employee, input.actorUserId));
    }
    for (const table of tables) {
      await processRecord("TABLE", table.externalTableId, () => processExternalTable(prisma, integration, table, input.actorUserId));
    }
    for (const bill of bills) {
      await processRecord("BILL", bill.externalBillId, () => processExternalBill(prisma, integration, bill, input.actorUserId));
    }

    const status = failures.length === 0 ? PosSyncStatus.COMPLETED : PosSyncStatus.PARTIAL;
    const completedAt = new Date();
    await prisma.$transaction([
      prisma.posSyncRun.update({
        where: { id: run.id },
        data: {
          status,
          recordsReceived: counters.received,
          recordsCreated: counters.created,
          recordsUpdated: counters.updated,
          recordsIgnored: counters.ignored,
          errorMessage: failures.length > 0 ? `${failures.length} record(s) need attention.` : null,
          detailsJson: toJsonValue({ failures }),
          completedAt,
        },
      }),
      prisma.posIntegration.update({
        where: { id: integration.id },
        data: {
          status: failures.length === counters.received && counters.received > 0 ? "ERROR" : "CONNECTED",
          lastSyncAt: completedAt,
          lastSuccessfulSyncAt: status === PosSyncStatus.COMPLETED ? completedAt : integration.lastSuccessfulSyncAt,
          lastError: failures.length > 0 ? `${failures.length} record(s) need attention.` : null,
        },
      }),
    ]);
    return {
      syncRunId: run.id,
      status: status === PosSyncStatus.COMPLETED ? "COMPLETED" : "PARTIAL",
      ...counters,
      failures,
    };
  } catch (error) {
    const message = safeIntegrationError(error);
    await prisma.$transaction([
      prisma.posSyncRun.update({
        where: { id: run.id },
        data: { status: PosSyncStatus.FAILED, errorMessage: message, completedAt: new Date() },
      }),
      prisma.posIntegration.update({
        where: { id: integration.id },
        data: { status: "ERROR", lastSyncAt: new Date(), lastError: message },
      }),
    ]);
    throw new Error(message);
  }
}

export async function processNormalizedPosEvent(input: {
  integration: IntegrationRecord;
  event: NormalizedPosEvent;
}): Promise<"processed" | "ignored"> {
  const prisma = getPrisma();
  if (input.event.bill) {
    await processExternalBill(prisma, input.integration, input.event.bill);
    return "processed";
  }
  if (input.event.employee) {
    await processExternalEmployee(prisma, input.integration, input.event.employee);
    return "processed";
  }
  if (input.event.table) {
    await processExternalTable(prisma, input.integration, input.event.table);
    return "processed";
  }
  return "ignored";
}
