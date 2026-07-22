import { NextResponse } from "next/server";
import { requireManagerSession } from "@/lib/auth/authorize";
import { getPrisma } from "@/lib/database/prisma";
import { mappingUpdateSchema } from "@/lib/validation/integration";
import { writeAuditLog } from "@/server/audit";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireManagerSession();
  if (!session) return NextResponse.json({ error: "Manager access required." }, { status: 401 });
  const { id } = await context.params;
  const prisma = getPrisma();
  const integration = await prisma.posIntegration.findFirst({ where: { id, restaurantId: session.restaurantId } });
  if (!integration) return NextResponse.json({ error: "Integration not found." }, { status: 404 });
  const [employees, tables, employeeOptions, tableOptions] = await Promise.all([
    prisma.externalEmployeeMapping.findMany({ where: { posIntegrationId: id, restaurantId: session.restaurantId }, include: { employee: { select: { id: true, name: true, employeeCode: true } } }, orderBy: [{ status: "asc" }, { externalName: "asc" }] }),
    prisma.externalTableMapping.findMany({ where: { posIntegrationId: id, restaurantId: session.restaurantId }, include: { table: { select: { id: true, name: true, number: true } } }, orderBy: [{ status: "asc" }, { externalName: "asc" }] }),
    prisma.employee.findMany({ where: { restaurantId: session.restaurantId, isActive: true }, select: { id: true, name: true, employeeCode: true }, orderBy: { name: "asc" } }),
    prisma.restaurantTable.findMany({ where: { restaurantId: session.restaurantId, isActive: true }, select: { id: true, name: true, number: true }, orderBy: { number: "asc" } }),
  ]);
  return NextResponse.json({ mappings: { employees, tables }, options: { employees: employeeOptions, tables: tableOptions } });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireManagerSession();
  if (!session) return NextResponse.json({ error: "Manager access required." }, { status: 401 });
  const parsed = mappingUpdateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Select a valid local record and mapping status." }, { status: 400 });
  const { id } = await context.params;
  const prisma = getPrisma();
  const integration = await prisma.posIntegration.findFirst({ where: { id, restaurantId: session.restaurantId } });
  if (!integration) return NextResponse.json({ error: "Integration not found." }, { status: 404 });

  if (parsed.data.type === "EMPLOYEE") {
    const existing = await prisma.externalEmployeeMapping.findFirst({ where: { id: parsed.data.mappingId, posIntegrationId: id, restaurantId: session.restaurantId } });
    if (!existing) return NextResponse.json({ error: "Employee mapping not found." }, { status: 404 });
    if (parsed.data.employeeId) {
      const employee = await prisma.employee.findFirst({ where: { id: parsed.data.employeeId, restaurantId: session.restaurantId } });
      if (!employee) return NextResponse.json({ error: "Employee does not belong to this restaurant." }, { status: 403 });
    }
    const mapping = await prisma.externalEmployeeMapping.update({ where: { id: existing.id }, data: { employeeId: parsed.data.employeeId, status: parsed.data.status } });
    await writeAuditLog(prisma, { restaurantId: session.restaurantId, actorUserId: session.subjectId, action: "POS_EMPLOYEE_MAPPING_CHANGED", entityType: "ExternalEmployeeMapping", entityId: mapping.id, previousValue: { employeeId: existing.employeeId, status: existing.status }, newValue: { employeeId: mapping.employeeId, status: mapping.status } });
    return NextResponse.json({ mapping });
  }

  const existing = await prisma.externalTableMapping.findFirst({ where: { id: parsed.data.mappingId, posIntegrationId: id, restaurantId: session.restaurantId } });
  if (!existing) return NextResponse.json({ error: "Table mapping not found." }, { status: 404 });
  if (parsed.data.tableId) {
    const table = await prisma.restaurantTable.findFirst({ where: { id: parsed.data.tableId, restaurantId: session.restaurantId } });
    if (!table) return NextResponse.json({ error: "Table does not belong to this restaurant." }, { status: 403 });
  }
  const mapping = await prisma.externalTableMapping.update({ where: { id: existing.id }, data: { tableId: parsed.data.tableId, status: parsed.data.status } });
  await writeAuditLog(prisma, { restaurantId: session.restaurantId, actorUserId: session.subjectId, action: "POS_TABLE_MAPPING_CHANGED", entityType: "ExternalTableMapping", entityId: mapping.id, previousValue: { tableId: existing.tableId, status: existing.status }, newValue: { tableId: mapping.tableId, status: mapping.status } });
  return NextResponse.json({ mapping });
}
