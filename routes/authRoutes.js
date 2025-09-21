const express = require("express");
const router = express.Router();
const pool = require("../db");

// login page
router.get("/login", (req, res) => {
  res.render("login", { title: 'Login', currentRoute: "/auth/login", error: null }); // views/login.ejs (we’ll create later)
});


// register page
router.get("/students/register", (req, res) => {
  res.render("studentRegister", { title: 'Student Register', currentRoute: "/auth/students/register" }); // views/register.ejs
});

router.get("/companies/register", (req, res) => {
  res.render("companyRegister", { title: 'Company Register', currentRoute: "/auth/companies/register" }); // views/register.ejs
});

router.get('/logout', (req, res) => {
  // Destroy session
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
      return res.send("Error logging out");
    }
    // Redirect to login or home page
    res.redirect('/auth/login');
  });
});

router.post("/students/register", async (req, res) => {
  try {
    const { email, password, course } = req.body;
    // accept either "full_name" or "name" from the form
    const full_name = req.body.full_name || req.body.name;
    const year = req.body.year ? parseInt(req.body.year, 10) : null;

    // Basic validation
    if (!email || !password || !full_name) {
      return res.status(400).send("Please fill all required fields (email, password, full name).");
    }

    // Check duplicates
    const exists = await pool.query(
      "SELECT 1 FROM users WHERE email = $1",
      [email]
    );
    if (exists.rows.length > 0) {
      return res.status(400).send("Email already exists. Please choose another.");
    }

    // Insert into users
    const userResult = await pool.query(
      "INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING user_id",
      [email, password, "student"]
    );
    const userId = userResult.rows[0].user_id;

    // Insert into students (DB column is full_name)
    await pool.query(
      "INSERT INTO students (user_id, full_name, course, year) VALUES ($1, $2, $3, $4)",
      [userId, full_name, course || null, year]
    );

    // Success response (pick one)
    // return res.redirect("/students/dashboard");
    return res.send("✅ Student registered successfully!");
  } catch (err) {
    console.error("❌ Registration Error:", err);
    if (err.code === "23505") {
      return res.status(400).send("Duplicate email. Try a different one.");
    }
    return res.status(500).send("Error registering student: " + err.message);
  }
});

router.post("/companies/register", async (req, res) => {
  try {
    const { email, password, industry, location } = req.body;
    // accept either "full_name" or "name" from the form
    const full_name = req.body.full_name || req.body.name;

    // Basic validation
    if (!email || !password || !full_name) {
      return res.status(400).send("Please fill all required fields (email, password, company name).");
    }

    // Check duplicates
    const exists = await pool.query(
      "SELECT 1 FROM users WHERE email = $1",
      [email]
    );
    if (exists.rows.length > 0) {
      return res.status(400).send("Email already exists. Please choose another.");
    }

    // Insert into users
    const userResult = await pool.query(
      "INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING user_id",
      [email, password, "company"]
    );
    const userId = userResult.rows[0].user_id;

    // Insert into students (DB column is full_name)
    await pool.query(
      "INSERT INTO companies (user_id,company_name,industry,location) VALUES ($1, $2, $3, $4)",
      [userId, full_name, industry, location]
    );

    // Success response (pick one)
    // return res.redirect("/students/dashboard");
    return res.send("✅ Company registered successfully!");
  } catch (err) {
    console.error("❌ Registration Error:", err);
    if (err.code === "23505") {
      return res.status(400).send("Duplicate email. Try a different one.");
    }
    return res.status(500).send("Error registering company: " + err.message);
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    // const result = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    const result = await pool.query(`SELECT 
    u.user_id,
    u.email,
    u.role,
    u.password,
    COALESCE(s.full_name, c.company_name, a.full_name) AS name
FROM users u
LEFT JOIN students s ON u.user_id = s.user_id
LEFT JOIN companies c ON u.user_id = c.user_id
LEFT JOIN admins a ON u.user_id = a.user_id 
WHERE email=$1;
`, [email]);

    if (result.rows.length === 0) {
      return res.render('login', { error: 'User not found' });
    }

    const user = result.rows[0];


    const match = password == user.password;
    if (!match) {
      return res.render('login', { error: 'Incorrect password' });
    }

    req.session.userId = user.user_id;
    req.session.role = user.role;
    req.session.email = user.email;
    req.session.name = user.name;

    res.redirect('/dashboard');

  } catch (err) {
    console.error(err);
    res.render('login', { error: 'Something went wrong. Try again.' });
  }
});
module.exports = router;
