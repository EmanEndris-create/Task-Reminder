const pool = require('./pool');
async function createTable() {
  const userTable = `CREATE TABLE IF NOT EXISTS Users(
  User_id INT PRIMARY KEY AUTO_INCREMENT,
  Email VARCHAR(255) NOT NULL UNIQUE,
  Username VARCHAR(50) NOT NULL,
  Password VARCHAR(255) NOT NULL,
  Major VARCHAR(100),
  Created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`;

  const taskTable = `CREATE TABLE IF NOT EXISTS Tasks(
  Id INT AUTO_INCREMENT PRIMARY KEY,
  User_id INT NOT NULL,
  Task_name VARCHAR(255) NOT NULL,
  Category VARCHAR(100),
  Task_type VARCHAR(100),
  Description TEXT,
  Created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  Reminder_time DATETIME,
  reminder_1day_sent BOOLEAN DEFAULT FALSE,
  reminder_1hour_sent BOOLEAN DEFAULT FALSE,
  reminder_10min_sent BOOLEAN DEFAULT FALSE,
  Status ENUM('pending','completed') DEFAULT 'pending',
  FOREIGN KEY (User_id) REFERENCES Users(User_id) ON DELETE CASCADE
  )`;
try{
  console.log('connecting to the database...');
  await pool.query(userTable);
  await pool.query(taskTable);
  console.log('Table created successfully.');
}catch(error){
  console.error('Error has occurred: ', error);
  
}
}
module.exports = createTable;