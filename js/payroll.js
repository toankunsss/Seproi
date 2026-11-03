// Monthly payroll: every PAYROLL.monthDays work days ("one month" in the game) the company pays
// its staff and the office rent at clock-out. It is the main money sink of the economy: every
// hire and every raise is an ongoing cost, so growing too fast can leave you unable to pay.
//
//   salary / day  = PAYROLL.daily[role] × skill × (1 + raiseStep × raise level) × day multiplier
//   rent / day    = PAYROLL.rent[office level]
//   pay day       = end of day N × monthDays → pays monthDays days of salaries + rent
//
// If the fund can't cover it, everything left is paid and the staff take the rest badly
// (motivation and stress hit, see unpaid*), which can end in strikes.
import { PAYROLL, TUNING } from './config.js';
import { skillMult } from './cv.js';

const dayMult = (g) => 1 + TUNING.dayMult * (g.day - 1);

/** Daily salary of employee e (rounded to 5 đ). */
export const salaryOf = (g, e) =>
  Math.round((PAYROLL.daily[e.role] * skillMult(e.cv) * (1 + PAYROLL.raiseStep * (e.wage || 0)) * dayMult(g)) / 5) * 5;

export const rentOf = (g) => PAYROLL.rent[g.officeLevel] || 0;

/** Days of this month employee e has worked so far (today included); new hires count from their first day. */
export function daysWorked(g, e) {
  const intoMonth = ((g.day - 1) % PAYROLL.monthDays) + 1;
  return e.hiredDay ? Math.max(1, Math.min(intoMonth, g.day - e.hiredDay + 1)) : intoMonth;
}

/** Severance when firing e: the salary for the days already worked this month. */
export const severanceOf = (g, e) => salaryOf(g, e) * daysWorked(g, e);

/** Days until the next pay day (0 = today, at clock-out). */
export const daysToPayday = (g) => (PAYROLL.monthDays - (g.day % PAYROLL.monthDays)) % PAYROLL.monthDays;
export const isPayday = (g) => daysToPayday(g) === 0;
const nextPayday = (g) => g.day + daysToPayday(g);
/** Month number of the current day (days 1..monthDays = month 1). */
export const monthOf = (g) => Math.ceil(g.day / PAYROLL.monthDays);

/** The bill for this month with today's staff (new hires pro rata): { salaries, rent, total }. */
export function monthBill(g) {
  const daysOf = (e) => (e.hiredDay ? Math.max(1, Math.min(PAYROLL.monthDays, nextPayday(g) - e.hiredDay + 1)) : PAYROLL.monthDays);
  const salaries = g.staff.reduce((s, e) => s + salaryOf(g, e) * daysOf(e), 0);
  const rent = rentOf(g) * PAYROLL.monthDays;
  return { salaries, rent, total: salaries + rent };
}

/** Pay day (called at clock-out). Returns { salaries, rent, total, paid, short }. */
export function payMonth(g) {
  const bill = monthBill(g);
  const paid = Math.min(Math.floor(g.money), bill.total);
  g.money -= paid;
  const short = bill.total - paid;
  if (short > 0) {
    for (const e of g.staff) {
      e.motiv = Math.max(0, (e.motiv ?? 50) + PAYROLL.unpaidMotiv);
      e.stress = Math.min(99, e.stress + PAYROLL.unpaidStress);
    }
    g.records.unpaidMonths = (g.records.unpaidMonths || 0) + 1;
  } else {
    g.records.paidMonths = (g.records.paidMonths || 0) + 1;
  }
  g.records.salariesPaid = (g.records.salariesPaid || 0) + paid;
  g.lastPayroll = { day: g.day, ...bill, paid, short };
  return g.lastPayroll;
}
