require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const createTable = require('./database/createTable');
const pool = require('./database/pool');
const path = require('path');
const app = express();
const PORT = process.env.MYSQLPORT|| 3000;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('./reminder/taskreminder');
const transporter = require('./mail/mailer');
const cors = require('cors');
const { text } = require('stream/consumers');

app.use(cors({
  origin: [
    'https://task-reminder-production-5ed8.up.railway.app',
    'http://localhost:3000',
    'http://127.0.0.1:5500'
  ],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(express.static('frontend'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.get('/script.js', async(req, res)=>{
  try{
    res.sendFile(path.join(__dirname, 'script.js'));
  }catch(err){
    console.error(err.message);
    }
});


app.post("/sign-up", async (req, res) => {
  const { signUp_email, signUp_username, signUp_password, signUp_major } = req.body;
  
  const checkCmd = `SELECT Password FROM Users WHERE Email=?`;
  const insertCmd = `INSERT INTO Users(Email, Username, Password, Major) VALUES (?,?,?,?);`;

  try {
    const email = signUp_email || null;
    const username = signUp_username || null;
    const password = signUp_password || null;
    const major = signUp_major || null;

    if (!email || !password || !username) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }
    const [rows] = await pool.query(checkCmd, [email]);
    if (rows.length > 0) {
      return res.status(409).json({ success: false, message: "User already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const value = [email, username, hashedPassword, major];
    const [insertedResults] = await pool.query(insertCmd, value);

    const userId = insertedResults.insertId;

    const AccessToken = jwt.sign(
      { id: userId, email: email },
      process.env.ACCESS_TOKEN_SECRET || process.env.Access_Control,
      { expiresIn: "15m" }
    );

    const RefreshToken = jwt.sign(
      { id: userId, email: email },
      process.env.REFRESH_TOKEN_SECRET || process.env.Refresh_Control,
      { expiresIn: "7d" }
    );

    try {
      console.log('About to send welcome email to:', email);
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Welcome to task reminder',
        text: `Hello ${username}, welcome to Task Reminder!\n\nYour account has been created successfully.\nYou can now create tasks and receive reminder emails before their execution time.\n\nThank you for using our application.`
      });
      console.log('welcome email sent.');
    } catch (emailError) {
      console.log('Email failed but signup succeeded:', emailError.message);
    }

    res.status(200).json({
      refreshToken: RefreshToken,
      accessToken: AccessToken,
      message: "Signed up and logged in successfully",
      success: true,
    });

  } catch (error) {
  console.error("Signup error FULL:", error);
  console.error("Signup error message:", error.message);
  console.error("Signup error stack:", error.stack);
  res.status(500).json({success: false, message: "Internal server error", errorDetail: error.message});
}
});

app.post('/sign-in', async(req, res)=>{
  const{signIn_email, signIn_password} = req.body;
  // console.log(req.body);
  const emailCheck = `SELECT * FROM Users
  WHERE Email = ?`;
  try{
    const [rows] =await pool.query(emailCheck, [signIn_email]);
    if(!rows || rows.length === 0){
      console.log(`there is no user with ${signIn_email}! please sign up first.`);
      return res.status(404).json({success: false, message: `there is no user with ${signIn_email}! please sign up first.`});
    }
    const user = rows[0];
    const match = await bcrypt.compare(signIn_password,user.Password);
    if(!match){
      console.log('Incorrect password!');
      res.status(401).json({success: false, correct: false, message:'You entered incorrect password, please try again later!'});
      return;
    }
    
    console.log('logged in successfully.');
    const accessToken = jwt.sign({
      id: user.User_id,         
      email: user.Email
    },
    process.env.ACCESS_TOKEN_SECRET,{
    expiresIn: '15m'
  });

    const refreshToken = jwt.sign({
      id: user.User_id,         
      email: user.Email
    },
    process.env.REFRESH_TOKEN_SECRET,{
    expiresIn: '7d'
  });
 
    res.status(200).json({correct: true, success: true, message:'logged in successfully.', accessToken, refreshToken});

  }catch(error){
    res.status(500).json({error: error.message});
    console.error('Error:', error.message);
  }
});

function authenticateToken(req, res, next){
  const authHeader = req.headers.authorization;

  if(!authHeader){
    return res.status(401).json({check: false, message: 'Token is required.'});
  }
  const token = authHeader.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
    if(err){
      console.log('Access token expired.');
      return res.status(403).json({correct: false, message:'Access token expired.'});
    }
    req.user = decoded;
    next();
  });
}

app.post('/add-task', authenticateToken, async(req, res)=>{
  const { task_name, category, task_type, description, reminder_time} = req.body;
  const userId = req.user.id;
  const insertTask = `INSERT INTO Tasks (User_id, Task_name, Category, Task_type, Description, Reminder_time)
  VALUES (?, ?, ?, ?, ?, ?)`;
  const insertedData = [userId, task_name, category, task_type, description, reminder_time];
  try{
    const [result] = await pool.query(insertTask, insertedData);
    res.status(201).json({success: true, message: 'task inserted successfully.'});
    console.log('task inserted successfully.');
  }catch(error){
    res.status(500).json({success: false, error: error.message});
    console.log('Error:', error.message);
  }

});


app.post('/refresh-token', (req, res)=>{
  const{refreshToken} = req.body;
  if(!refreshToken){
    return res.status(401).json({success: false, message: 'Refresh token required.'});
  }
  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded)=>{
    if (err) {
    console.log('Invalid refresh token.');
    return res.status(403).json({
      success: false,
      message: 'Invalid refresh token.'
    });
    }
    const newAccessToken = jwt.sign({
      id: decoded.id,
      email: decoded.email
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: '15m'
    });
    console.log('Access token refreshed successfully.');
    return res.status(200).json({success: true, accessToken: newAccessToken});
  });
});


app.get('/search-task/:searchType/:searchValue', authenticateToken, async(req, res)=>{
  const userId = req.user.id;
  const {searchType, searchValue} = req.params;
  const searchCmd = `SELECT * FROM Tasks WHERE User_id = ? AND ${searchType} LIKE ?`;
  try{
    const [rows] = await pool.query(searchCmd, [userId, `%${searchValue}%`]);
    if (!rows || rows.length === 0) {
      console.log('there is no matching tasks.');
    return res.status(404).json({success: false, message: 'there is no matching tasks.'});
    }
    console.log('tasks are found.');
    res.status(200).json({success: true, data: rows});
  }catch(error){
    console.log('Error:', error.message);
    res.status(500).json({error: error.message});
  }
});


app.listen(PORT, ()=>{
  createTable();
  console.log(`server is on port ${PORT}`);
});