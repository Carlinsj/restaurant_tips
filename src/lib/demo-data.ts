export type DemoShiftSummary = {
  name: string;
  date: string;
  startTime: string;
  totalTipsPaise: number;
  cashTipsPaise: number;
  digitalTipsPaise: number;
  averageTipPercent: number;
  billsPaid: number;
  billsTotal: number;
  employeesOnDuty: number;
};

export type DemoTable = {
  number: number;
  status: string;
  billPaise: number;
  staff: string;
  seats: number;
  tipPaise: number;
  tipAllocations: {
    name: string;
    amountPaise: number;
  }[];
};

export type DemoEmployee = {
  name: string;
  code: string;
  role: string;
  tables: string;
  tipsPaise: number;
  status: string;
  initials: string;
};

export type DemoRecentTip = {
  id: string;
  table: string;
  time: string;
  amountPaise: number;
  method: "Cash" | "Digital";
  split: string;
};

export type ManagerDashboardData = {
  shift: DemoShiftSummary;
  tables: DemoTable[];
  employees: DemoEmployee[];
  recentTips: DemoRecentTip[];
};

export const demoShift: DemoShiftSummary = {
  name: "Dinner service",
  date: "22 July 2026",
  startTime: "6:00 PM",
  totalTipsPaise: 1_228_000,
  cashTipsPaise: 378_000,
  digitalTipsPaise: 850_000,
  averageTipPercent: 11.8,
  billsPaid: 31,
  billsTotal: 42,
  employeesOnDuty: 8,
};

export const demoTables: DemoTable[] = [
  { number: 1, status: "Settled", billPaise: 0, staff: "Neha", seats: 2, tipPaise: 0, tipAllocations: [] },
  { number: 2, status: "Dining", billPaise: 168_000, staff: "Vikram", seats: 4, tipPaise: 0, tipAllocations: [] },
  { number: 3, status: "Bill ready", billPaise: 245_000, staff: "Arjun", seats: 4, tipPaise: 0, tipAllocations: [] },
  { number: 4, status: "Open", billPaise: 0, staff: "—", seats: 4, tipPaise: 0, tipAllocations: [] },
  { number: 5, status: "Dining", billPaise: 312_000, staff: "Meera", seats: 6, tipPaise: 0, tipAllocations: [] },
  { number: 6, status: "Bill ready", billPaise: 200_000, staff: "Arjun · Priya", seats: 4, tipPaise: 0, tipAllocations: [] },
  { number: 7, status: "Dining", billPaise: 98_000, staff: "Kabir", seats: 2, tipPaise: 0, tipAllocations: [] },
  { number: 8, status: "Settled", billPaise: 0, staff: "Neha", seats: 4, tipPaise: 0, tipAllocations: [] },
  { number: 9, status: "Bill ready", billPaise: 176_000, staff: "Vikram", seats: 4, tipPaise: 0, tipAllocations: [] },
  { number: 10, status: "Open", billPaise: 0, staff: "—", seats: 6, tipPaise: 0, tipAllocations: [] },
];

export const demoEmployees: DemoEmployee[] = [
  { name: "Arjun Mehta", code: "W001", role: "Waiter", tables: "3, 6", tipsPaise: 170_000, status: "On floor", initials: "AM" },
  { name: "Priya Shah", code: "R001", role: "Runner", tables: "2, 3, 6", tipsPaise: 86_000, status: "On floor", initials: "PS" },
  { name: "Neha Iyer", code: "W004", role: "Waiter", tables: "1, 8", tipsPaise: 176_000, status: "On floor", initials: "NI" },
  { name: "Vikram Singh", code: "W007", role: "Captain", tables: "2, 9", tipsPaise: 212_000, status: "On floor", initials: "VS" },
  { name: "Meera Nair", code: "W011", role: "Waiter", tables: "5", tipsPaise: 148_000, status: "On floor", initials: "MN" },
  { name: "Kabir Khan", code: "B003", role: "Bartender", tables: "Bar, 7", tipsPaise: 125_000, status: "On floor", initials: "KK" },
  { name: "Sana Das", code: "B006", role: "Busser", tables: "All", tipsPaise: 68_000, status: "Break", initials: "SD" },
  { name: "Rohit Jain", code: "H002", role: "Host", tables: "Front", tipsPaise: 54_000, status: "On floor", initials: "RJ" },
];

export const recentTips: DemoRecentTip[] = [
  { id: "sample-table-1", table: "Table 1", time: "9:31 PM", amountPaise: 12_500, method: "Cash", split: "Neha 67% · Sana 33%" },
  { id: "sample-table-8", table: "Table 8", time: "9:18 PM", amountPaise: 18_000, method: "Digital", split: "Neha 50% · Rohit 50%" },
  { id: "sample-table-4", table: "Table 4", time: "8:56 PM", amountPaise: 8_500, method: "Digital", split: "Vikram 60% · Priya 40%" },
];

export function createManagerDemoData(): ManagerDashboardData {
  return {
    shift: { ...demoShift },
    tables: demoTables.map((table) => ({
      ...table,
      tipAllocations: table.tipAllocations.map((allocation) => ({
        ...allocation,
      })),
    })),
    employees: demoEmployees.map((employee) => ({ ...employee })),
    recentTips: recentTips.map((tip) => ({ ...tip })),
  };
}
