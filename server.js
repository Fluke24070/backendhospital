const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const bcrypt = require("bcrypt");
const sql = require("mssql/msnodesqlv8");

dotenv.config();
const app = express();


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const dbconfig = {
  server: "localhost",
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  driver: "msnodesqlv8",
  options: {
    trustServerCertificate: true,
    instanceName: process.env.DB_INSTANCE || "SQLEXPRESS",
  },
};


sql.connect(dbconfig)
  .then(() => console.log(" Connected to SQL Server"))
  .catch((err) => console.error(" Database connection failed:", err));


app.post("/register", async (req, res) => {
  try {
    const pool = await sql.connect(dbconfig);

    const {
      status,
      name,
      lastname,
      identityID,
      email,
      day,
      phonenum,
      sex,
      address,
      password,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool
      .request()
      .input("status", sql.VarChar, status)
      .input("name", sql.VarChar, name)
      .input("lastname", sql.VarChar, lastname)
      .input("identityID", sql.VarChar, identityID)
      .input("email", sql.VarChar, email)
      .input("day", sql.VarChar, day)
      .input("phonenum", sql.VarChar, phonenum)
      .input("sex", sql.VarChar, sex)
      .input("address", sql.VarChar, address)
      .input("password", sql.VarChar, hashedPassword)
      .query(`
        INSERT INTO Account (
          status, name, lastname, identityID, email, day, phonenum, sex, address, password
        )
        VALUES (
          @status, @name, @lastname, @identityID, @email, @day, @phonenum, @sex, @address, @password
        )
      `);

    res.status(200).json({ message: " Register success" });
  } catch (err) {
    console.error("SQL Error:", err);
    res.status(500).json({ message: " Insert error", error: err.message });
  }
});


app.post("/login", async (req, res) => {
  try {
    const pool = await sql.connect(dbconfig);
    const { identityID, password } = req.body;

    console.log("Login attempt:", identityID);

    const result = await pool
      .request()
      .input("identityID", sql.VarChar, identityID.trim())
      .query(`SELECT * FROM Account WHERE identityID = @identityID`);

    if (result.recordset.length === 0) {
      console.log("User not found for identityID:", identityID);
      return res.status(401).json({ status: 401, message: "ไม่พบบัญชีผู้ใช้" });
    }

    const user = result.recordset[0];
    console.log("User found:", user.identityID);

    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Password match:", isMatch);

    if (!isMatch) {
      return res.status(401).json({ status: 401, message: "รหัสผ่านไม่ถูกต้อง" });
    }

    res.status(200).json({
      status: 200,
      message: "Login success",
      user: {
        id: user.id,
        name: user.name,
        lastname: user.lastname,
        email: user.email,
        identityID: user.identityID,
      },
    });
  } catch (err) {
    console.error("SQL Error:", err);
    res.status(500).json({ status: 500, message: "Fail to login", error: err.message });
  }
});

// GET /treat/current?name=...
// app.js หรือ server.js
app.get("/treatBYname", async (req, res) => {
  try {
    const pool = await sql.connect(dbconfig);
    let { name } = req.query;

    if (!name) {
      return res.status(400).json({ status: 400, message: "Missing name" });
    }

    // Trim ช่องว่างด้านหน้าและหลัง
    name = name.trim();

    const result = await pool
      .request()
      .input("name", sql.NVarChar, name)
      .query(`
        SELECT name, sex, age, treat, med, price
        FROM Treat
        WHERE LTRIM(RTRIM(name)) = @name
        ORDER BY name
      `);

    if (result.recordset.length === 0) {
      return res.status(200).json({
        status: 200,
        message: "No treatment data found for this patient",
        data: [],
      });
    }

    res.status(200).json({
      status: 200,
      message: "Fetched treat data successfully",
      data: result.recordset,
    });
  } catch (err) {
    console.error("SQL Error:", err);
    res.status(500).json({ status: 500, message: "Failed to fetch treat data", error: err.message });
  }
});




app.post("/appointment", async (req, res) => {
  try {
    const pool = await sql.connect(dbconfig);
    const { appointID, phonenum, sex, appointmentdate } = req.body;

    if (!appointID || !phonenum || !sex || !appointmentdate) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const dateObj = new Date(appointmentdate);
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ message: "Invalid appointment date" });
    }

    await pool
      .request()
      .input("appointID", sql.VarChar, appointID)
      .input("phonenum", sql.VarChar, phonenum)
      .input("sex", sql.VarChar, sex)
      .input("appointmentdate", sql.DateTime, dateObj)
      .query(`
        INSERT INTO Appoint (appointID, phonenum, sex, appointmentdate)
        VALUES (@appointID, @phonenum, @sex, @appointmentdate)
      `);

    res.status(200).json({ message: " Appointment scheduled successfully" });
  } catch (err) {
    console.error("SQL Error:", err);
    res.status(500).json({ message: " Insert error", error: err.message });
  }
});


app.get("/appointments/today", async (req, res) => {
  try {
    const pool = await sql.connect(dbconfig);
    const result = await pool.request().query(`
      SELECT appointID, phonenum, sex, appointmentdate
      FROM Appoint
      WHERE CAST(appointmentdate AS DATE) = CAST(GETDATE() AS DATE)
      ORDER BY appointmentdate ASC
    `);

    res.status(200).json({
      status: 200,
      message: " Today's appointments fetched successfully",
      data: result.recordset,
    });
  } catch (err) {
    console.error("SQL Error:", err);
    res.status(500).json({
      status: 500,
      message: " Failed to fetch today's appointments",
      error: err.message,
    });
  }
});


app.post("/treat", async (req, res) => {
  try {
    console.log("REQ BODY:", req.body);
    const pool = await sql.connect(dbconfig);
    const { name, sex, age, treat, med, price } = req.body;

    if (!name || !sex || !age || !treat || !med || !price) {
      return res.status(400).json({
        status: 400,
        message: "กรุณากรอกข้อมูลให้ครบทุกช่อง",
      });
    }

    await pool
      .request()
      .input("name", sql.NVarChar, name)
      .input("sex", sql.NVarChar, sex)
      .input("age", sql.Int, age)
      .input("treat", sql.NVarChar, treat)
      .input("med", sql.NVarChar, med)
      .input("price", sql.Int, price) 
      .query(`
        INSERT INTO Treat (name, sex, age, treat, med, price)
        VALUES (@name, @sex, @age, @treat, @med, @price)
      `);

    res.status(200).json({
      status: 200,
      message: " เพิ่มข้อมูลการรักษาสำเร็จ",
    });
  } catch (err) {
    console.error("SQL Error:", err);
    res.status(500).json({
      status: 500,
      message: " เกิดข้อผิดพลาดขณะบันทึกข้อมูล",
      error: err.message,
    });
  }
});

app.get("/allappointments", async (req, res) => {
  try {
    const pool = await sql.connect(dbconfig);
    const result = await pool.request().query("SELECT * FROM Appoint");

    res.status(200).json({
      status: 200,
      message: "All appointments fetched successfully",
      data: result.recordset,
    });
  } catch (err) {
    console.error("SQL Error:", err);
    res.status(500).json({
      status: 500,
      message: "Failed to fetch appointments",
      error: err.message,
    });
  }
});



app.listen(5000, () => console.log("🚀 Server running on port 5000"));
