const cron = require('node-cron');
const pool = require('../database/pool');
const transporter = require('../mail/mailer');

cron.schedule("* * * * *", async () => {
  console.log("Checking reminders...");

  try {
    const [tasks] = await pool.query(`
      SELECT Tasks.*, Users.Email 
      FROM Tasks
      JOIN Users ON Tasks.User_id = Users.User_id
      WHERE Tasks.Reminder_time IS NOT NULL
    `);

    const now = new Date();

      for (let task of tasks) {
        if (!task.Reminder_time) continue;

      const reminderTime = new Date(task.Reminder_time);
      const diff = reminderTime - now;

      const oneDay = 24 * 60 * 60 * 1000;
      const oneHour = 60 * 60 * 1000;
      const tenMin = 10 * 60 * 1000;

  // 1-DAY REMINDER
      // Trigger if we are within 1 day of the deadline AND it hasn't been sent yet
      if (diff <= oneDay && diff > 0 && !task.reminder_1day_sent) {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: task.Email,
          subject: "Task Reminder - 1 Day Left",
          text: `Your task "${task.Task_name}" is due tomorrow.`
        });

        console.log(`1-day reminder sent for task ${task.Id}`);
        await pool.query(
          "UPDATE Tasks SET reminder_1day_sent = TRUE WHERE Id = ?",
          [task.Id]
        );
      }

      // 1-HOUR REMINDER
      if (diff <= oneHour && diff > 0 && !task.reminder_1hour_sent) {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: task.Email,
          subject: "Task Reminder - 1 Hour Left",
          text: `Your task "${task.Task_name}" is due in 1 hour.`
        });

        console.log(`1-hour reminder sent for task ${task.Id}`);
        await pool.query(
          "UPDATE Tasks SET reminder_1hour_sent = TRUE WHERE Id = ?",
          [task.Id]
        );
      }

      // 10-MINUTE REMINDER
      if (diff <= tenMin && diff > 0 && !task.reminder_10min_sent) {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: task.Email,
          subject: "Task Reminder - 10 Minutes Left",
          text: `Your task "${task.Task_name}" is due in 10 minutes.`
        });

        console.log(`10-min reminder sent for task ${task.Id}`);
        await pool.query(
          "UPDATE Tasks SET reminder_10min_sent = TRUE WHERE Id = ?",
          [task.Id]
        );
      }
    }
  } catch (error) {
    console.error('Could not send reminder:', error.message);
  }
});

module.exports = {};