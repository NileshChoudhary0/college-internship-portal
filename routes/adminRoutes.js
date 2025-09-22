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
      [full_name, phone,req.session.userId]
    );

    res.redirect('/profile');
  } catch (err) {
    console.error(err);
    res.redirect("/admins/profile/edit?error=Something+went+wrong");
  }
});

module.exports = router;
