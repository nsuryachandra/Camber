const db = require('./backend/db/pool');

async function checkTriggers() {
  try {
    const [triggers] = await db.pool.query("SHOW TRIGGERS WHERE `Table` = 'rentals'");
    console.log('Rentals triggers in DB:', triggers.map(t => ({ Trigger: t.Trigger, Event: t.Event, Timing: t.Timing })));
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

checkTriggers();
