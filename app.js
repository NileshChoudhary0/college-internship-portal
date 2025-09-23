const express = require("express");
const app = express();
const port = 5000;
const path = require("path");
const pool = require("./db");   // import db.js
const session = require('express-session');


// ---- Dummy pages (unchanged) ----
const students = [
  { id: 1, name: "Nisha", email: "nisha@example.com", course: "B.Tech", year: "3rd Year", applied: 2 },
  { id: 2, name: "Aman", email: "aman@example.com", course: "BBA", year: "2nd Year", applied: 1 }
];

app.use(express.static(path.join(__dirname, 'public')));


app.use(session({
  secret: 'nishaSecretKey',
  resave: false,
  saveUninitialized: true,
}));

app.use((req, res, next) => {
  res.locals.title = "College Internship Portal";
  res.locals.currentRoute = "/home";
  res.locals.session = req.session;
  next();
});

app.use((req, res, next) => {
  if (req.session.name) {
    const name = req.session.name;
    let initials = "";
    if (name) {
      let parts = name.trim().split(" ");
      initials = parts[0][0].toUpperCase();
      if (parts.length > 1) initials += parts[1][0].toUpperCase();
    }
    res.locals.userRole = req.session.role;
    res.locals.userInitials = initials;
  } else {
    res.locals.userRole = null;
    res.locals.userInitials = null;
  }
  next();
});


// ✅ Test DB connection (simple query instead of .connect())
pool.query("SELECT NOW()")
  .then(res => console.log("✅ Connected to PostgreSQL at:", res.rows[0].now))
  .catch(err => console.error("❌ Connection error", err.stack));

// set EJS as the view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// middleware to serve static files (CSS, JS, images from /public)
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// import routes
const authRoutes = require("./routes/authRoutes");
const studentRoutes = require("./routes/studentRoutes");
const companyRoutes = require("./routes/companyRoutes");
const adminRoutes = require("./routes/adminRoutes");

// use routes
app.use("/auth", authRoutes);
app.use("/students", studentRoutes);
app.use("/companies", companyRoutes);
app.use("/admins", adminRoutes);



// homepage
app.get("/home", (req, res) => {
  res.render("index", { title: 'Home Page', currentRoute: "/home" });
});

app.get("", (req, res) => {
  res.render("index", { title: 'Home Page', currentRoute: "/home" });
});

app.get("/dashboard", async (req, res) => {
  if (req.session.role == "student") {
    const alldata = await pool.query(`select student_id from students where user_id = $1`, [req.session.userId]);
    const stud_id = (alldata.rows[0]).student_id;
    const applicationsResult = await pool.query(
      `SELECT a.application_id, a.status,
          i.internship_id, i.title, i.description, i.duration, i.stipend,
          c.company_name, c.industry, c.location
   FROM applications a
   JOIN internships i ON a.internship_id = i.internship_id
   JOIN companies c ON i.company_id = c.company_id
   WHERE a.student_id = $1`,
      [stud_id]
    );

    const applicationdata = applicationsResult.rows;
    res.render("studentDashboard", { title: 'Dashboard', applications: applicationdata, currentRoute: "/dashboard" });
  }
  else if (req.session.role == "company") {
    const allData = await pool.query(`select company_id from companies where user_id = $1`, [Number(req.session.userId)]);
    const comp_id = (allData.rows[0]).company_id;

    const internshipData = await pool.query(`select * from internships where company_id = $1`, [Number(comp_id)]);

    res.render("companyDashboard", { title: 'Dashboard', data: internshipData.rows, currentRoute: "/dashboard", error: req.query.error, success: req.query.success });
  }
  else if (req.session.role == "admin") {
    res.render("adminDashboard", { title: 'Dashboard', students, currentRoute: "/dashboard" });
  } else {
    res.render("login", { title: 'Login', currentRoute: "/auth/login", error: null });
  }
});

app.get("/profile", async (req, res) => {
  if (req.session.role == "student") {
    try {
      const result = await pool.query(
        `SELECT s.*, u.email 
       FROM students s
       JOIN users u ON s.user_id = u.user_id
       WHERE s.user_id = $1`,
        [req.session.userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).send("Student not found");
      }

      res.render("studentProfile", { student: result.rows[0], title: "Profile" });
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  }
  else if (req.session.role == "company") {
  try {
      const result = await pool.query(
        `SELECT c.*, u.email 
       FROM companies c
       JOIN users u ON c.user_id = u.user_id
       WHERE c.user_id = $1`,
        [req.session.userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).send("Company not found");
      }

      res.render("CompanyProfile", { company: result.rows[0], title: "Profile" });
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  }
  else if (req.session.role == "admin") {
  try {
      const result = await pool.query(
        `SELECT a.*, u.email 
       FROM admins a
       JOIN users u ON a.user_id = u.user_id
       WHERE a.user_id = $1`,
        [req.session.userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).send("Admin not found");
      }

      res.render("AdminProfile", { admin: result.rows[0], title: "Profile" });
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }  } else {
    res.render("login", { title: 'Login', currentRoute: "/auth/login", error: null });
  }
});

// start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);

});
