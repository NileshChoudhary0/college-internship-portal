const express = require("express");
const router = express.Router();
const pool = require("../db");

router.get('/userList', async (req, res) => {
  if (req.session.role == "admin") {
    try {
      const result = await pool.query(`SELECT 
    u.user_id,
    u.email,
    u.role,
    u.is_active,
    COALESCE(s.full_name, c.company_name, a.full_name) AS name
FROM users u
LEFT JOIN students s ON u.user_id = s.user_id
LEFT JOIN companies c ON u.user_id = c.user_id
LEFT JOIN admins a ON u.user_id = a.user_id 
order by role;
`);
      res.render("userList", { title: 'User List', data: result.rows, currentRoute: "/admins/userList" });

    } catch (err) {
      console.error("DB ERROR:", err.stack);
      res.status(500).send("Error loading data: " + err.message);
    }
  }
  else {
    res.render("unauthorize", { title: 'Unauthorize', currentRoute: "/admins/userList" });

  }
});

router.get("/profile/edit", async (req, res) => {
  if (!req.session.userId) return res.redirect("/auth/login");

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

    res.render("adminProfileEdit", { admin: result.rows[0], title: "Edit Profile" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

router.post("/profile/edit", async (req, res) => {
  if (!req.session.userId) return res.redirect("/auth/login");

  let {
    full_name, phone
  } = req.body;


  try {
    await pool.query(
      `UPDATE admins
       SET full_name=$1, phone=$2
       WHERE user_id=$3`,
      [full_name, phone, req.session.userId]
    );

    res.redirect('/profile');
  } catch (err) {
    console.error(err);
    res.redirect("/admins/profile/edit?error=Something+went+wrong");
  }
});

// Toggle ban/unban user
router.post("/users/:id/toggle-ban", async (req, res) => {
  const userId = req.params.id;

  try {
    const result = await pool.query(
      "UPDATE users SET is_active = NOT is_active WHERE user_id = $1 RETURNING *",
      [userId]
    );

    res.redirect("/admins/userList"); // after action, reload list
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating user status");
  }
});

router.get("/internships",async(req,res) =>{
  if(req.session.role != "admin"){
    return res.render('unauthorize',{title:"Unauthorize",currentRoute:"/admins/internships"});
  }
   try {
    const result = await pool.query(`
      SELECT i.*, c.company_name, c.industry, c.location
      FROM internships i
      JOIN companies c ON i.company_id = c.company_id
      ORDER BY i.posted_on DESC
    `);

    res.render('adminInternships', { title: 'All Internships', data: result.rows, currentRoute: '/admins/internships' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching internships');
  }
});

// Delete internship
router.post('/internships/:id/delete', async (req, res) => {
  if (req.session.role !== 'admin') {
    return res.render('unauthorize', { title: 'Unauthorized' });
  }

  const internshipId = req.params.id;

  try {
    await pool.query('DELETE FROM internships WHERE internship_id = $1', [internshipId]);
    res.redirect('/admins/internships'); // reload page after deletion
  } catch (err) {
    console.error(err);
    res.status(500).send('Error deleting internship');
  }
});


// View all student applications
router.get('/applications', async (req, res) => {
  if (!req.session.userId || req.session.role !== 'admin') {
    return res.render('unauthorize', { title: 'Unauthorized' });
  }

  try {
    const result = await pool.query(`
      SELECT a.application_id, a.status, 
             s.full_name, s.course, s.year,
             i.title AS internship_title,
             c.company_name
      FROM applications a
      JOIN students s ON a.student_id = s.student_id
      JOIN internships i ON a.internship_id = i.internship_id
      JOIN companies c ON i.company_id = c.company_id
      ORDER BY a.application_id DESC
    `);

    res.render('adminApplications', { title: 'Student Applications', data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching applications');
  }
});


module.exports = router;
