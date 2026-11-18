import test from 'node:test';
import assert from 'node:assert/strict';
import {monthDays,shiftMonth,eventsOnDay,validMonth,currentMonth} from '../web/src/lib/calendar.js';
test('calendar starts on Monday and includes leap day',()=>{
  const days=monthDays('2024-02');
  assert.equal(days.length,42);
  assert.equal(days[0],'2024-01-29');
  assert.ok(days.includes('2024-02-29'));
  assert.equal(new Set(days).size,42);
});
test('month navigation crosses year boundaries',()=>{
  assert.equal(shiftMonth('2026-12',1),'2027-01');
  assert.equal(shiftMonth('2026-01',-1),'2025-12');
  assert.equal(validMonth('invalid'),currentMonth());
});
test('multi-day events include both boundaries and exclude outside days',()=>{
  const event={id:1,start_date:'2026-12-30',end_date:'2027-01-02'};
  assert.deepEqual(eventsOnDay([event],'2026-12-29'),[]);
  assert.deepEqual(eventsOnDay([event],'2026-12-30'),[event]);
  assert.deepEqual(eventsOnDay([event],'2027-01-02'),[event]);
  assert.deepEqual(eventsOnDay([event],'2027-01-03'),[]);
});
