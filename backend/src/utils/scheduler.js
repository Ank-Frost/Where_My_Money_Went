const cron = require('node-cron');
const { pool } = require('../config/db');
const { sendPushToUser, createNotification } = require('../controllers/notificationController');

function initScheduler() {
  // Daily at 9:00 AM - Check subscription reminders
  cron.schedule('0 9 * * *', async () => {
    console.log('⏰ Running subscription reminder check...');
    await checkSubscriptionReminders();
  });

  // 1st of each month at 8:00 AM - Budget setup reminder
  cron.schedule('0 8 1 * *', async () => {
    console.log('⏰ Running monthly budget reminder...');
    await sendMonthlyBudgetReminder();
  });

  console.log('✅ Scheduler initialized');
}

async function checkSubscriptionReminders() {
  try {
    const [users] = await pool.query('SELECT id FROM users');

    for (const user of users) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [subs] = await pool.query(
        'SELECT * FROM subscriptions WHERE user_id = ? AND is_active = TRUE',
        [user.id]
      );

      for (const sub of subs) {
        const billingDate = new Date(sub.next_billing_date);
        billingDate.setHours(0, 0, 0, 0);
        const daysUntil = Math.round((billingDate - today) / (1000 * 60 * 60 * 24));

        // Notify 5 days before
        if (daysUntil === 5) {
          const msg = `Your ${sub.name} subscription renews in 5 days (₹${sub.amount})`;
          await sendPushToUser(user.id, '📅 Subscription Reminder', msg);
          await createNotification(user.id, '📅 Subscription Reminder', msg, 'subscription', sub.id);
        }

        // Notify 3 days before (2 days after the 5-day notice)
        if (daysUntil === 3) {
          const msg = `${sub.name} subscription renews in 3 days - ₹${sub.amount} will be charged`;
          await sendPushToUser(user.id, '⏰ Subscription Reminder', msg);
          await createNotification(user.id, '⏰ Subscription Reminder', msg, 'subscription', sub.id);
        }

        // Notify 1 day before (last day reminder)
        if (daysUntil === 1) {
          const msg = `⚠️ LAST DAY: ${sub.name} renews TOMORROW for ₹${sub.amount}!`;
          await sendPushToUser(user.id, '🚨 Subscription Due Tomorrow', msg);
          await createNotification(user.id, '🚨 Subscription Due Tomorrow', msg, 'subscription', sub.id);
        }

        // On billing day
        if (daysUntil === 0) {
          const msg = `${sub.name} subscription renews TODAY for ₹${sub.amount}`;
          await sendPushToUser(user.id, '💳 Subscription Due Today', msg);
          await createNotification(user.id, '💳 Subscription Due Today', msg, 'subscription', sub.id);

          // Auto-advance next billing date
          const nextDate = new Date(billingDate);
          if (sub.billing_cycle === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
          else if (sub.billing_cycle === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
          else if (sub.billing_cycle === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);

          await pool.query(
            'UPDATE subscriptions SET next_billing_date = ? WHERE id = ?',
            [nextDate.toISOString().split('T')[0], sub.id]
          );
        }
      }
    }
  } catch (err) {
    console.error('Subscription reminder error:', err);
  }
}

async function sendMonthlyBudgetReminder() {
  try {
    const [users] = await pool.query('SELECT id FROM users');
    const now = new Date();
    const monthName = now.toLocaleString('default', { month: 'long' });
    const year = now.getFullYear();

    for (const user of users) {
      // Check if budget already set for this month
      const [budgets] = await pool.query(
        'SELECT id FROM budgets WHERE user_id = ? AND type = "monthly" AND month = ? AND year = ?',
        [user.id, now.getMonth() + 1, year]
      );

      if (!budgets.length) {
        const msg = `It's the start of ${monthName}! Don't forget to set your budget for this month.`;
        await sendPushToUser(user.id, '📊 Set Your Monthly Budget', msg);
        await createNotification(user.id, '📊 Set Your Monthly Budget', msg, 'budget_reminder', null);
      }
    }
  } catch (err) {
    console.error('Monthly budget reminder error:', err);
  }
}

module.exports = { initScheduler, checkSubscriptionReminders };
