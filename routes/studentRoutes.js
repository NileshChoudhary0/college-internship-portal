const express = require("express");
const router = express.Router();
const pool = require("../db");

// ----------------------
// List all internships
// ----------------------
router.get("/internships", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).send("User not logged in");
  }

  try {
    // Get student_id
    const studentRes = await pool.query(
      `SELECT student_id FROM students WHERE user_id = $1`,
      [req.session.userId]
    );
    const student_id = studentRes.rows[0].student_id;

    // Get all internships
    const internshipsRes = await pool.query(
      `SELECT i.internship_id, i.title, i.description, i.stipend, i.duration, 
              c.company_name, c.industry, c.location
       FROM internships i
       JOIN companies c ON i.company_id = c.company_id`
    );
    const internships = internshipsRes.rows;

    // Get internships student has already applied to
    const appliedRes = await pool.query(
      `SELECT internship_id FROM applications WHERE student_id = $1`,
      [student_id]
    );
    const appliedIds = appliedRes.rows.map(a => a.internship_id);

    res.render("internshipsList", { 
      internships, 
      appliedIds, 
      title: "Available internships",
      currentRoute: "/students/internships",
      success: req.query.success, 
      error: req.query.error 
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// ----------------------
// View a single internship
// ----------------------
router.get("/internships/:id", async (req, res) => {
  if (!req.session.userId) return res.status(401).send("User not logged in");

  const internship_id = req.params.id;

  try {
    // Get student_id
    const studentRes = await pool.query(
      `SELECT student_id FROM students WHERE user_id = $1`,
      [req.session.userId]
    );
    const student_id = studentRes.rows[0].student_id;

    // Get internship details
    const internshipRes = await pool.query(
      `SELECT i.*, c.company_name, c.industry, c.location
       FROM internships i
       JOIN companies c ON i.company_id = c.company_id
       WHERE i.internship_id = $1`,
      [internship_id]
    );

    if (internshipRes.rows.length === 0) {
      return res.status(404).send("Internship not found");
    }
    const internship = internshipRes.rows[0];

    // Get internships student has applied to
    const appliedRes = await pool.query(
      `SELECT internship_id FROM applications WHERE student_id = $1`,
      [student_id]
    );
    const appliedIds = appliedRes.rows.map(a => a.internship_id);

    res.render("internshipView", { 
      internship, 
      appliedIds, 
      success: req.query.success, 
      error: req.query.error 
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// ----------------------
// Apply to internship
// ----------------------
router.post("/apply/:id", async (req, res) => {
  if (!req.session.userId) return res.status(401).send("Not logged in");

  const studentRes = await pool.query(
    `SELECT student_id FROM students WHERE user_id = $1`,
    [req.session.userId]
  );
  const student_id = studentRes.rows[0].student_id;
  const internship_id = req.params.id;

  try {
    // Prevent duplicate application
    const existing = await pool.query(
      `SELECT * FROM applications WHERE student_id=$1 AND internship_id=$2`,
      [student_id, internship_id]
    );

    if (existing.rows.length > 0) {
      return res.redirect(`/students/internships/${internship_id}?error=Already+applied`);
    }

    await pool.query(
      `INSERT INTO applications (student_id, internship_id, status) VALUES ($1, $2, 'pending')`,
      [student_id, internship_id]
    );

    res.redirect(`/students/internships/${internship_id}?success=Application+submitted`);

  } catch (err) {
    console.error(err);
    res.redirect(`/students/internships/${internship_id}?error=Something+went+wrong`);
  }
});

// studentRoutes.js

// GET: Show student profile
router.get("/profile", async (req, res) => {
  if (!req.session.userId) return res.redirect("/auth/login");

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
});

// GET route: Show edit profile form
router.get("/profile/edit", async (req, res) => {
  if (!req.session.userId) return res.redirect("/auth/login");

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

    res.render("studentProfileEdit", { student: result.rows[0], title: "Edit Profile" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

router.post("/profile/edit", async (req, res) => {
  if (!req.session.userId) return res.redirect("/auth/login");

  let {
    full_name,
    course,
    year,
    phone,
    address,
    dob,
    gender,
    tenth_percentage,
    twelfth_percentage,
    cgpa,
    skills,
    resume_url
  } = req.body;

  // Convert empty strings to null
  dob = dob || null;
  tenth_percentage = tenth_percentage || null;
  twelfth_percentage = twelfth_percentage || null;
  cgpa = cgpa || null;

  try {
    await pool.query(
      `UPDATE students
       SET full_name=$1, course=$2, year=$3, phone=$4, address=$5, dob=$6, gender=$7,
           tenth_percentage=$8, twelfth_percentage=$9, cgpa=$10, skills=$11, resume_url=$12
       WHERE user_id=$13`,
      [full_name, course, year, phone, address, dob, gender, tenth_percentage, twelfth_percentage, cgpa, skills, resume_url, req.session.userId]
    );

    res.redirect("/students/profile?success=Profile+updated");
  } catch (err) {
    console.error(err);
    res.redirect("/students/profile/edit?error=Something+went+wrong");
  }
});



module.exports = router;
