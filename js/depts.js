// Departments: staff are grouped by role (dev / acc / des). Each department can have a head
// ("trưởng phòng") picked from its members: the head costs DEPT.headSalary more, and the whole
// department earns DEPT.income more and slacks DEPT.slack less. The department screen shows each
// one's own stats (people, working now, today's KPI, income per second).
//
//   g.depts = { dev: employeeId, ... }     heads
//   g.today.dept = { dev: { sum, n }, ... } today's working share per department (sim.js)
export const DEPT = { headSalary: 1.3, income: 1.1, slack: 0.85 };

export const deptHead = (g, role) => {
  const id = g.depts && g.depts[role];
  return id === undefined ? null : g.staff.find((e) => e.id === id && e.role === role) || null;
};
export const isHead = (g, e) => !!g.depts && g.depts[e.role] === e.id;
/** Multipliers for an employee from their department (sim.js / payroll.js). */
export const deptIncome = (g, e) => (deptHead(g, e.role) ? DEPT.income : 1);
export const deptSlack = (g, e) => (deptHead(g, e.role) && !isHead(g, e) ? DEPT.slack : 1);
export const headSalary = (g, e) => (isHead(g, e) ? DEPT.headSalary : 1);

export function appoint(g, id) {
  const e = g.staff.find((x) => x.id === id);
  if (!e) return false;
  if (!g.depts) g.depts = {};
  g.depts[e.role] = e.id;
  e.motiv = Math.min(100, (e.motiv ?? 50) + 20);
  return true;
}
export function dismiss(g, role) { if (g.depts) delete g.depts[role]; }

/** Called every sim step: today's working share per department. */
export function trackDepts(g, dt) {
  const d = g.today.dept || (g.today.dept = {});
  const work = {}, all = {};
  for (const e of g.staff) { all[e.role] = (all[e.role] || 0) + 1; if (e.state === 'work' || e.state === 'hurt') work[e.role] = (work[e.role] || 0) + 1; }
  for (const r of Object.keys(all)) {
    const x = d[r] || (d[r] = { sum: 0, n: 0 });
    x.sum += ((work[r] || 0) / all[r]) * dt; x.n += dt;
  }
}
export const deptKpi = (g, role) => { const x = g.today.dept && g.today.dept[role]; return x && x.n ? Math.round((x.sum / x.n) * 100) : 100; };
