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
module.exports = router;
