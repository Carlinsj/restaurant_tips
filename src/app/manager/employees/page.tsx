import { UserCheck, Users, WalletCards } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { demoEmployees } from "@/lib/demo-data";
import { formatInr } from "@/lib/currency";

export default function EmployeesPage() {
  const metrics = [
    { label: "Active employees", value: "8", copy: "All roles", icon: Users },
    { label: "On shift", value: "8", copy: "7 floor · 1 break", icon: UserCheck },
    { label: "Current earnings", value: "₹10,590", copy: "Before finalization", icon: WalletCards },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold tracking-[0.1em] text-primary uppercase">Restaurant team</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-[32px]">Employees</h1>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.label} className="gap-2 border-[#dfd8ca] bg-white/72 py-4 shadow-none">
            <CardContent className="flex items-start justify-between px-4">
              <div>
                <p className="text-xs text-muted-foreground">{metric.label}</p>
                <p className="font-tabular mt-2 text-2xl font-semibold">{metric.value}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{metric.copy}</p>
              </div>
              <span className="flex size-9 items-center justify-center rounded-xl bg-[#e4efe9] text-primary">
                <metric.icon className="size-[17px]" />
              </span>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="gap-0 overflow-hidden border-[#ded7ca] bg-white/76 py-0 shadow-none">
        <CardHeader className="border-b border-[#e8e1d6] px-5 py-4">
          <CardTitle className="text-sm">Team directory</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#faf8f3]">
                  <TableHead className="ps-5">Employee</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Assignment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pe-5 text-end">Tips today</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {demoEmployees.map((employee) => (
                  <TableRow key={employee.code}>
                    <TableCell className="ps-5">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarFallback className="bg-[#e5eee9] text-[10px] font-semibold text-primary">{employee.initials}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-semibold">{employee.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-[10px] text-muted-foreground">{employee.code}</TableCell>
                    <TableCell className="text-xs">{employee.role}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{employee.tables}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={employee.status === "Break" ? "border-[#e8d2aa] bg-[#f7ecd5] text-[#966b20]" : "border-[#c8dfd4] bg-[#e5f0ea] text-[#2e735f]"}>{employee.status}</Badge>
                    </TableCell>
                    <TableCell className="font-tabular pe-5 text-end text-xs font-semibold">{formatInr(employee.tipsPaise)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
