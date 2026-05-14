import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  format,
  startOfMonth,
  subMonths,
  isWithinInterval,
  endOfMonth,
  differenceInDays,
} from "date-fns";
import { Role } from "@prisma/client";

export const metadata = { title: "QAPI Analytics – Destiny Springs" };

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== Role.ADMIN && session.user.role !== Role.SUPERVISOR) {
    redirect("/dashboard");
  }

  let reports: Awaited<ReturnType<typeof prisma.incidentReport.findMany<{ include: { patient: true; srPackets: { select: { id: true } } } }>>> = [];
  try {
    reports = await prisma.incidentReport.findMany({
      include: { patient: true, srPackets: { select: { id: true } } },
      orderBy: { incidentDate: "desc" },
    });
  } catch {
    // DB not available (e.g. no connection string configured locally)
  }

  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const thisMonth = reports.filter((r) =>
    isWithinInterval(new Date(r.incidentDate), { start: thisMonthStart, end: thisMonthEnd })
  );
  const ytd = reports.filter((r) => new Date(r.incidentDate) >= yearStart);
  const pendingQM = reports.filter((r) => !r.qmSignature);
  const pendingSup = reports.filter((r) => !r.supervisorSignature);
  const withSR = reports.filter((r) => r.srPackets.length > 0);

  // Review completion rate
  const qmReviewedCount = reports.filter((r) => !!r.qmSignature).length;
  const supReviewedCount = reports.filter((r) => !!r.supervisorSignature).length;
  const qmRate = reports.length ? Math.round((qmReviewedCount / reports.length) * 100) : 0;
  const supRate = reports.length ? Math.round((supReviewedCount / reports.length) * 100) : 0;

  // Average days to QM review
  const reviewedWithDates = reports.filter((r) => r.qmSignature && r.reviewedByDate);
  const avgDaysToReview =
    reviewedWithDates.length
      ? Math.round(
          reviewedWithDates.reduce(
            (sum, r) => sum + differenceInDays(new Date(r.reviewedByDate!), new Date(r.incidentDate)),
            0
          ) / reviewedWithDates.length
        )
      : null;

  // Category breakdown
  const categoryCount: Record<string, number> = {};
  for (const r of reports) {
    for (const c of (r.categories as string[]) ?? []) {
      categoryCount[c] = (categoryCount[c] ?? 0) + 1;
    }
  }
  const topCategories = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]).slice(0, 12);

  // Unit breakdown
  const unitCount: Record<string, number> = {};
  for (const r of reports) {
    if (r.unit) unitCount[r.unit] = (unitCount[r.unit] ?? 0) + 1;
  }
  const unitBreakdown = Object.entries(unitCount).sort((a, b) => b[1] - a[1]);

  // Monthly trend — last 12 months
  const monthlyTrend = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(now, 11 - i);
    const start = startOfMonth(d);
    const end = endOfMonth(d);
    const total = reports.filter((r) =>
      isWithinInterval(new Date(r.incidentDate), { start, end })
    ).length;
    const reviewed = reports.filter(
      (r) =>
        isWithinInterval(new Date(r.incidentDate), { start, end }) && !!r.qmSignature
    ).length;
    return { label: format(d, "MMM"), shortYear: format(d, "yy"), total, reviewed };
  });

  // Level distribution
  const levelCount: Record<string, number> = {};
  for (const r of reports) {
    if (r.incidentLevel) levelCount[r.incidentLevel] = (levelCount[r.incidentLevel] ?? 0) + 1;
  }
  const levelColors: Record<string, string> = {
    I: "border-green-400 bg-green-50 text-green-700",
    II: "border-yellow-400 bg-yellow-50 text-yellow-700",
    III: "border-orange-400 bg-orange-50 text-orange-700",
    IV: "border-red-400 bg-red-50 text-red-700",
  };

  // Day of week breakdown
  const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dowCount = Array(7).fill(0);
  for (const r of reports) {
    dowCount[new Date(r.incidentDate).getDay()]++;
  }

  // Shift breakdown (based on incidentTime string "HH:MM")
  const shiftCount = { Day: 0, Evening: 0, Night: 0 };
  for (const r of reports) {
    if (r.incidentTime) {
      const hour = parseInt(r.incidentTime.split(":")[0] ?? "0", 10);
      if (hour >= 7 && hour < 15) shiftCount.Day++;
      else if (hour >= 15 && hour < 23) shiftCount.Evening++;
      else shiftCount.Night++;
    }
  }

  // Intervention usage
  const interventionKeys: { key: keyof typeof reports[0]; label: string }[] = [
    { key: "interventionPrnMed", label: "PRN Medication" },
    { key: "interventionOneToOne", label: "1:1 Observation" },
    { key: "interventionSAndR", label: "Seclusion / Restraint" },
    { key: "interventionFirstAid", label: "First Aid" },
    { key: "interventionXray", label: "X-Ray Ordered" },
    { key: "interventionUnitRestriction", label: "Unit Restriction" },
    { key: "interventionUnitChange", label: "Unit Change" },
    { key: "interventionRoomChange", label: "Room Change" },
    { key: "interventionTransferHosp", label: "Transfer to Hospital" },
    { key: "interventionAdminDischarge", label: "Admin / Discharge" },
    { key: "interventionTreatmentRefused", label: "Treatment Refused" },
    { key: "interventionLos", label: "LOS Impact" },
  ];
  const interventionCounts = interventionKeys.map(({ key, label }) => ({
    label,
    count: reports.filter((r) => {
      const v = r[key];
      return typeof v === "boolean" ? v : !!v;
    }).length,
  }));
  const activeInterventions = interventionCounts
    .filter((i) => i.count > 0)
    .sort((a, b) => b.count - a.count);

  // Reporter activity
  const reporterCount: Record<string, number> = {};
  for (const r of reports) {
    reporterCount[r.reporterName] = (reporterCount[r.reporterName] ?? 0) + 1;
  }
  const topReporters = Object.entries(reporterCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Repeat incidents by patient
  const patientCount: Record<string, { name: string; count: number; lastDate: Date }> = {};
  for (const r of reports) {
    if (!patientCount[r.patientId]) {
      patientCount[r.patientId] = { name: r.patient.fullName, count: 0, lastDate: new Date(r.incidentDate) };
    }
    patientCount[r.patientId].count++;
    const d = new Date(r.incidentDate);
    if (d > patientCount[r.patientId].lastDate) patientCount[r.patientId].lastDate = d;
  }
  const repeatPatients = Object.values(patientCount)
    .filter((p) => p.count > 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const maxMonthly = Math.max(...monthlyTrend.map((m) => m.total), 1);
  const maxCat = Math.max(...topCategories.map(([, v]) => v), 1);
  const maxUnit = Math.max(...unitBreakdown.map(([, v]) => v), 1);
  const maxDow = Math.max(...dowCount, 1);
  const maxIntervention = Math.max(...activeInterventions.map((i) => i.count), 1);
  const maxReporter = Math.max(...topReporters.map(([, v]) => v), 1);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">QAPI Analytics</h1>
        <p className="text-sm text-gray-500">
          Quality Assurance &amp; Performance Improvement — Incident Reporting &nbsp;·&nbsp;
          Generated {format(now, "MMMM d, yyyy")}
        </p>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="This Month" value={thisMonth.length} sub={format(now, "MMMM yyyy")} color="blue" />
        <StatCard label="Year to Date" value={ytd.length} sub={format(now, "yyyy")} color="indigo" />
        <StatCard label="Total on Record" value={reports.length} sub="all time" color="purple" />
        <StatCard label="S&R Linked" value={withSR.length} sub="incidents with S&R packet" color="rose" />
      </div>

      {/* Review Status Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="QM Review Rate" value={qmRate} sub={`${qmReviewedCount} of ${reports.length} signed`} color={qmRate === 100 ? "green" : "amber"} pct />
        <StatCard label="Supervisor Review Rate" value={supRate} sub={`${supReviewedCount} of ${reports.length} signed`} color={supRate === 100 ? "green" : "amber"} pct />
        <StatCard label="Pending QM Review" value={pendingQM.length} sub="no QM signature" color={pendingQM.length > 0 ? "amber" : "green"} />
        <StatCard label="Pending Sup Review" value={pendingSup.length} sub="no supervisor signature" color={pendingSup.length > 0 ? "amber" : "green"} />
      </div>

      {/* Avg time to review */}
      {avgDaysToReview !== null && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 flex items-center gap-4">
          <div className="text-4xl font-bold text-blue-700">{avgDaysToReview}</div>
          <div>
            <p className="font-semibold text-blue-900 text-sm">Avg. Days to QM Review</p>
            <p className="text-xs text-blue-600">From incident date to completed QM signature ({reviewedWithDates.length} reviewed incidents)</p>
          </div>
        </div>
      )}

      {/* 12-Month Trend */}
      <Section title="Incident Trend — Last 12 Months">
        <div className="flex items-end gap-1.5 h-44 pt-4 mt-2">
          {monthlyTrend.map(({ label, shortYear, total, reviewed }) => (
            <div key={`${label}${shortYear}`} className="flex-1 flex flex-col items-center gap-0.5">
              <span className="text-[10px] font-semibold text-gray-600">{total || ""}</span>
              <div className="w-full flex flex-col-reverse" style={{ height: `${(total / maxMonthly) * 130}px`, minHeight: total > 0 ? 4 : 0 }}>
                <div className="w-full rounded-t-sm bg-blue-500" style={{ height: `${(reviewed / Math.max(total, 1)) * 100}%` }} title={`${reviewed} reviewed`} />
                <div className="w-full bg-blue-200" style={{ height: `${((total - reviewed) / Math.max(total, 1)) * 100}%` }} title={`${total - reviewed} pending`} />
              </div>
              <span className="text-[10px] text-gray-400 leading-none">{label}</span>
              <span className="text-[9px] text-gray-300 leading-none">{shortYear}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" /> QM Reviewed</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-200 inline-block" /> Pending Review</span>
        </div>
      </Section>

      {/* Categories + Units */}
      <div className="grid md:grid-cols-2 gap-6">
        <Section title="Top Incident Categories">
          <div className="space-y-2 mt-2">
            {topCategories.length === 0 && <p className="text-sm text-gray-400 italic">No data yet.</p>}
            {topCategories.map(([cat, count]) => (
              <div key={cat}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-gray-700 truncate max-w-[70%]">{cat}</span>
                  <span className="font-semibold text-gray-800">{count}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100">
                  <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${(count / maxCat) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Incidents by Unit">
          <div className="space-y-2 mt-2">
            {unitBreakdown.length === 0 && <p className="text-sm text-gray-400 italic">No data yet.</p>}
            {unitBreakdown.map(([unit, count]) => (
              <div key={unit}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-gray-700">{unit}</span>
                  <span className="font-semibold text-gray-800">{count}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100">
                  <div className="h-2 rounded-full bg-purple-500" style={{ width: `${(count / maxUnit) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* Day of Week + Shift */}
      <div className="grid md:grid-cols-2 gap-6">
        <Section title="Incidents by Day of Week">
          <div className="flex items-end gap-2 h-32 mt-4">
            {DOW_LABELS.map((day, i) => (
              <div key={day} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] font-semibold text-gray-600">{dowCount[i] || ""}</span>
                <div
                  className="w-full rounded-t-sm bg-teal-500"
                  style={{ height: `${(dowCount[i] / maxDow) * 80}px`, minHeight: dowCount[i] > 0 ? 4 : 0 }}
                />
                <span className="text-[10px] text-gray-500">{day}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Incidents by Shift">
          <div className="space-y-3 mt-4">
            {(
              [
                { label: "Day (7a–3p)", count: shiftCount.Day, color: "bg-amber-400" },
                { label: "Evening (3p–11p)", count: shiftCount.Evening, color: "bg-orange-500" },
                { label: "Night (11p–7a)", count: shiftCount.Night, color: "bg-blue-800" },
              ] as { label: string; count: number; color: string }[]
            ).map(({ label, count, color }) => {
              const total = shiftCount.Day + shiftCount.Evening + shiftCount.Night;
              const pct = total ? Math.round((count / total) * 100) : 0;
              return (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-700 font-medium">{label}</span>
                    <span className="text-gray-600">{count} &nbsp;<span className="text-gray-400">({pct}%)</span></span>
                  </div>
                  <div className="h-3 rounded-full bg-gray-100">
                    <div className={`h-3 rounded-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      </div>

      {/* Intervention Usage */}
      {activeInterventions.length > 0 && (
        <Section title="Intervention / Treatment Usage">
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-2 mt-2">
            {activeInterventions.map(({ label, count }) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-gray-700">{label}</span>
                  <span className="font-semibold text-gray-800">{count}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-rose-500"
                    style={{ width: `${(count / maxIntervention) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Level Distribution */}
      {Object.keys(levelCount).length > 0 && (
        <Section title="Incident Level Distribution (QM Assigned)">
          <div className="flex gap-6 mt-3 flex-wrap">
            {["I", "II", "III", "IV"].map((lvl) =>
              levelCount[lvl] ? (
                <div key={lvl} className="flex flex-col items-center">
                  <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center ${levelColors[lvl]}`}>
                    <span className="text-xl font-bold">{levelCount[lvl]}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 font-medium">Level {lvl}</p>
                </div>
              ) : null
            )}
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full border-4 border-gray-300 bg-gray-50 flex items-center justify-center">
                <span className="text-xl font-bold text-gray-400">
                  {reports.length - Object.values(levelCount).reduce((a, b) => a + b, 0)}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Unassigned</p>
            </div>
          </div>
        </Section>
      )}

      {/* Reporter Activity + Repeat Patients */}
      <div className="grid md:grid-cols-2 gap-6">
        <Section title="Top Reporters">
          <div className="space-y-2 mt-2">
            {topReporters.length === 0 && <p className="text-sm text-gray-400 italic">No data yet.</p>}
            {topReporters.map(([name, count]) => (
              <div key={name}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-gray-700 truncate max-w-[70%]">{name}</span>
                  <span className="font-semibold text-gray-800">{count}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100">
                  <div className="h-2 rounded-full bg-cyan-500" style={{ width: `${(count / maxReporter) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Patients with Multiple Incidents">
          {repeatPatients.length === 0 ? (
            <p className="text-sm text-gray-400 italic mt-2">No patients with repeat incidents.</p>
          ) : (
            <table className="w-full text-sm mt-2">
              <thead className="text-xs text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="text-left py-1.5 font-medium">Patient</th>
                  <th className="text-right py-1.5 font-medium">Incidents</th>
                  <th className="text-right py-1.5 font-medium">Last</th>
                </tr>
              </thead>
              <tbody>
                {repeatPatients.map((p) => (
                  <tr key={p.name} className="border-b border-gray-50">
                    <td className="py-1.5 text-gray-800">{p.name}</td>
                    <td className="py-1.5 text-right font-bold text-red-600">{p.count}</td>
                    <td className="py-1.5 text-right text-gray-500 text-xs">{format(p.lastDate, "MM/dd/yy")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      </div>

      {/* Pending QM Review */}
      {pendingQM.length > 0 && (
        <Section title={`Pending QM Review (${pendingQM.length})`}>
          <PendingTable rows={pendingQM} />
        </Section>
      )}

      {/* Pending Supervisor Review */}
      {pendingSup.length > 0 && (
        <Section title={`Pending House Supervisor Review (${pendingSup.length})`}>
          <PendingTable rows={pendingSup} />
        </Section>
      )}
    </div>
  );
}

function PendingTable({ rows }: { rows: { id: string; incidentDate: Date; unit: string | null; reporterName: string; patient: { fullName: string } }[] }) {
  return (
    <table className="w-full text-sm mt-2">
      <thead className="text-xs text-gray-500 border-b border-gray-200">
        <tr>
          <th className="text-left py-2 font-medium">Date</th>
          <th className="text-left py-2 font-medium">Patient</th>
          <th className="text-left py-2 font-medium">Unit</th>
          <th className="text-left py-2 font-medium">Reporter</th>
          <th className="text-left py-2 font-medium" />
        </tr>
      </thead>
      <tbody>
        {rows.slice(0, 20).map((r) => (
          <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
            <td className="py-2">{format(new Date(r.incidentDate), "MM/dd/yyyy")}</td>
            <td className="py-2">{r.patient.fullName}</td>
            <td className="py-2">{r.unit}</td>
            <td className="py-2">{r.reporterName}</td>
            <td className="py-2">
              <Link href={`/dashboard/incidents/${r.id}`} className="text-blue-600 hover:underline text-xs font-medium">
                Review →
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
  pct,
}: {
  label: string;
  value: number;
  sub: string;
  color: "blue" | "indigo" | "purple" | "amber" | "green" | "rose";
  pct?: boolean;
}) {
  const palette: Record<string, string> = {
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    indigo: "bg-indigo-50 border-indigo-200 text-indigo-700",
    purple: "bg-purple-50 border-purple-200 text-purple-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    green: "bg-green-50 border-green-200 text-green-700",
    rose: "bg-rose-50 border-rose-200 text-rose-700",
  };
  return (
    <div className={`rounded-xl border p-4 ${palette[color]}`}>
      <p className="text-xs font-medium opacity-70 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}{pct ? "%" : ""}</p>
      <p className="text-xs opacity-60 mt-0.5">{sub}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-200 px-5 py-3">
        <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}
