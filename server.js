const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const bcrypt = require("bcrypt");
const sql = require("mssql/msnodesqlv8");

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

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
    const result = await pool
      .request()
      .input("identityID", sql.VarChar, identityID)
      .query(`
        SELECT * FROM Account WHERE identityID = @identityID
      `);

    if (result.recordset.length === 0) {
      return res.status(401).json({
        status: 401,
        message: "ไม่พบบัญชีผู้ใช้",
      });
    }

    const user = result.recordset[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        status: 401,
        message: "รหัสผ่านไม่ถูกต้อง",
      });
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
    res.status(500).json({
      status: 500,
      message: "Fail to login",
      error: err.message,
    });
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

    res.status(200).json({ message: "Appointment scheduled successfully" });
  } catch (err) {
    console.error("SQL Error:", err);
    res.status(500).json({ message: "Insert error", error: err.message });
  }
});

app.get("/appointToday", async (req, res) => {
  try {
    const pool = await sql.connect(dbconfig);
    const { appointID, phonenum, sex, appointmentdate } = req.body;

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

    res.status(200).json({ message: "Appointment scheduled successfully" });
  } catch (err) {
    console.error("SQL Error:", err);
    res.status(500).json({ message: "Insert error", error: err.message });
  }
});




app.listen(5000, () => console.log("Server running on port 5000"));
