// Economy check: a "good player" bot plays the real simulation (js/sim.js, no rendering) and
// prints the day each upgrade gets bought, with and without rewarded ads (3 runs each).
//
//   node serve.cjs &                       (game on :5566)
//   node tools/balance/econ.cjs [days]     (default 30)
//
// The bot whips slackers after 1.2 s, uses coffee when ready, always takes a project and buys
// as soon as it can afford: hire → room upgrade → new room → whip → assistant → coffee → furniture.
// It watches every room at once, so multi-room days are an upper bound for a real player.
// "ads" = x2 end-of-day revenue and x2 project money every time.
const { chromium } = require('playwright');

(async () => {
  const b = await chromium.launch();
  const pg = await (await b.newContext()).newPage();
  await pg.goto('http://localhost:5566/?shell=mobile&title=0'); await pg.waitForTimeout(500);
  const runs = [];
  for (const ads of [false, true]) for (let seed = 0; seed < 3; seed++) {
    runs.push(await pg.evaluate(async ({ ads, days }) => {
      const C = await import('/js/config.js');
      const st = await import('/js/state.js'), sim = await import('/js/sim.js'), cv = await import('/js/cv.js'), pr = await import('/js/projects.js'), staff = await import('/js/staff.js'), pay = await import('/js/payroll.js'), rm = await import('/js/rooms.js');
      const g = st.newGame(); g.mode = 'office';
      cv.refillCandidates(g); pr.refreshOffers(g, true);
      const log = [];
      const reserve = () => (pay.daysToPayday(g) <= 1 ? pay.monthBill(g).total : 0); // a sensible boss saves for payday
      const buy = (what, cost) => { if (g.money - cost < reserve()) return false; g.money -= cost; log.push({ day: g.day, t: Math.round(g.dayTime), what, cost }); return true; };
      let dayEnded = false, react = {};
      const onEvent = (type, e) => {
        if (type === 'dayEnd') dayEnded = true;
        if (type === 'projectDone') { pr.finish(g, e); while (g.projects.reward) pr.collect(g, ads ? 2 : 1); }
        if (type === 'assistant') sim.whipEmployee(g, e, { auto: true });
      };
      const dayStats = [];
      while (g.day <= days) {
        const dt = 0.1;
        sim.update(g, dt, onEvent);
        // player: whips slackers after 1.2s reaction
        for (const e of g.staff) if (e.state === 'slack' && e.t > 1.2) sim.whipEmployee(g, e);
        if (g.coffeeLevel >= 0 && g.coffeeCd <= 0) sim.useCoffee(g);
        g.rooms.forEach((room, r) => { if (!room.project && room.offers.length) pr.acceptOffer(g, r, 0); });
        // shopping (every second): hire > office > whip > assistant > coffee > decor
        if (Math.floor(g.dayTime * 10) % 10 === 0) {
          const into = rm.freeRoom(g);
          if (into >= 0 && g.candidates.length) {
            let bi = 0; g.candidates.forEach((c, i) => { if (cv.hirePrice(g, c) < cv.hirePrice(g, g.candidates[bi])) bi = i; });
            const c = g.candidates[bi];
            if (buy('hire#' + (g.staff.length + 1), cv.hirePrice(g, c))) { g.staff.push(st.makeEmployee(staff.nextStaffId(g), c, { room: into })); g.candidates.splice(bi, 1); pr.refreshOffers(g); }
          }
          g.rooms.forEach((room, r) => {
            const u = rm.upgradeOf(g, r);
            if (u && g.lifetimeEarnings >= u.unlockRevenue && buy(`room${r + 1}-lv${u.level}`, u.cost)) { room.level = u.level; rm.syncOffice(g); }
          });
          const nr = rm.nextRoom(g);
          if (nr && g.lifetimeEarnings >= nr.unlockRevenue && buy('build-room' + (nr.index + 1), nr.cost)) { g.rooms.push(rm.freshRoom(0)); rm.syncOffice(g); }
          const nw = C.WHIPS[g.whipLevel + 1];
          if (nw && !nw.premium && buy('whip' + (g.whipLevel + 1), nw.cost)) g.whipLevel++;
          const na = C.ASSISTANT[g.assistantLevel + 1];
          if (na && buy('assist' + (g.assistantLevel + 1), na.cost)) { g.assistantLevel++; g.assistantCd = 1; }
          const nc = C.COFFEE[g.coffeeLevel + 1];
          if (nc && buy('coffee' + (g.coffeeLevel + 1), nc.cost)) { g.coffeeLevel++; g.coffeeCd = 0; }
          for (const d of C.DECOR_ITEMS) if (!g.decor.includes(d.id) && g.officeLevel >= d.level && buy('decor:' + d.id, d.cost)) g.decor.push(d.id);
        }
        if (dayEnded) {
          dayEnded = false;
          const rev = Math.round(g.today.revenue);
          if (ads) { const b = sim.dayAdBonus(g); g.money += b; g.lifetimeEarnings += b; }
          let paid = 0, short = 0; if (pay.isPayday(g)) { const r = pay.payMonth(g); paid = r.paid; short = r.short; }
          dayStats.push({ day: g.day, rev, money: Math.round(g.money), staff: g.staff.length, paid, short });
          for (const r of pr.overdueRooms(g)) pr.fail(g, r);
          g.day++; g.dayTime = 0; g.today = st.freshDay();
          cv.refillCandidates(g); pr.refreshOffers(g, true);
          for (const e of g.staff) { e.energy = 100; e.stress = Math.max(0, e.stress - 50); e.state = 'work'; e.slack = null; e.t = 0; }
        }
      }
      return { ads, log, dayStats };
    }, { ads, days: Number(process.argv[2]) || 30 }));
  }
  const fs = require('fs'); if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify(runs));
  // summary: day of first purchase of each item, median over seeds
  for (const ads of [false, true]) {
    const rs = runs.filter((r) => r.ads === ads);
    const items = [...new Set(rs.flatMap((r) => r.log.map((l) => l.what)))];
    const order = (w) => rs[0].log.findIndex((l) => l.what === w);
    items.sort((a, b) => (order(a) < 0 ? 1e9 : order(a)) - (order(b) < 0 ? 1e9 : order(b)));
    console.log(`\n=== ${ads ? 'WITH ads (x2 day + x2 projects)' : 'NO ads'} — day bought (3 runs)`);
    console.log(items.map((w) => `${w}: ${rs.map((r) => (r.log.find((l) => l.what === w) || { day: '-' }).day).join('/')}`).join('\n'));
    console.log('revenue/day:', rs[0].dayStats.map((d) => d.rev).join(' '));
    console.log('payroll (paid/short):', rs[0].dayStats.filter((d) => d.paid || d.short).map((d) => 'd' + d.day + ' ' + d.paid + (d.short ? '/SHORT ' + d.short : '')).join(' · '));
  }
  await b.close();
})();
