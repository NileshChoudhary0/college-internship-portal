const express = require("express");
const router = express.Router();
const pool = require("./../db");   // import db.js

const internships = [
  {
    internship_id: 1,
    title: "Full Stack Developer Intern",
    description: "Work with Node.js, Express, and MongoDB to build scalable applications.",
    stipend: "8000",
    duration: "3 months",
    company: "TechVision Pvt Ltd"
  }
];

router.post('/internships/add', async (req, res) => {
  const userId = Number(req.session.userId);
  // console.log("userId:" + userId);
  const { title, description, stipend, duration,internship_type, internship_timing,location, skills_required ,experience_required} = req.body;
  const allData = await pool.query(`select company_id from companies where user_id = $1`, [userId]);
  const company_id = (allData.rows[0]).company_id;

  try {


    const result = await pool.query(`INSERT into internships(company_id,title,description,stipend,duration,internship_type, internship_timing,location, skills_required,experience_required ) VALUES ($1, $2, $3,$4,$5, $6, $7, $8, $9,$10)`,
      [company_id, title, description, stipend, duration,internship_type, internship_timing,location, skills_required,experience_required]);

    const internshipData = await pool.query(`select * from internships where company_id = $1`, [Number(company_id)]);
    res.redirect("/dashboard?success=Successfully+created+internship.");

    // res.render("companyDashboard", { title: 'Dashboard', data: internshipData.rows, currentRoute: "/dashboard", error: null, success: "Successfully created internship." });

  } catch (err) {
    console.error(err);
    const internshipData = await pool.query(`select * from internships where company_id = $1`, [Number(company_id)]);
    res.redirect("/dashboard?error=Something+went+wrong.+Try+again.");

    // res.render("companyDashboard", { title: 'Dashboard', data: internshipData.rows, currentRoute: "/dashboard", error: 'Something went wrong. Try again.', success: null });

  }
});

router.post('/internships/delete/:id', async (req, res) => {
  const internship_id = req.params.id;
  const allData = await pool.query(`select company_id from companies where user_id = $1`, [req.session.userId]);
  const company_id = (allData.rows[0]).company_id;

  try {
    await pool.query(`delete from internships where internship_id = $1 and company_id = $2`, [internship_id, company_id]);

    const internshipData = await pool.query(`select * from internships where company_id = $1`, [company_id]);
    res.redirect("/dashboard?success=Successfully+deleted+internship.");

    // res.render("companyDashboard", { title: 'Dashboard', data: internshipData.rows, currentRoute: "/dashboard", error: null, success: "Successfully deleted internship." });

  } catch (err) {
    console.error(err);
    const internshipData = await pool.query(`select * from internships where company_id = $1`, [company_id]);
    res.redirect("/dashboard?error=Something+went+wrong.+Try+again.");

    // res.render("companyDashboard", { title: 'Dashboard', data: internshipData.rows, currentRoute: "/dashboard", error: 'Something went wrong. Try again.', success: null });

  }
});

router.post('/internships/edit/:id', async (req, res) => {
  const { title, description, stipend, duration,internship_type, internship_timing,location, skills_required,experience_required } = req.body;
  const internship_id = req.params.id;
  const allData = await pool.query(`select company_id from companies where user_id = $1`, [req.session.userId]);
  const company_id = (allData.rows[0]).company_id;

  try {
    await pool.query(`update internships set title=$1,description=$2,stipend=$3,duration=$4,internship_type=$5, internship_timing=$6,
           location=$7, skills_required=$8, experience_required=$9
       WHERE internship_id=$10 AND company_id=$11`, [title, description, stipend, duration,internship_type, internship_timing,location, skills_required,experience_required, internship_id, company_id]);

    const internshipData = await pool.query(`select * from internships where company_id = $1`, [company_id]);
    res.redirect("/dashboard?success=Successfully+updated+internship.");

    // res.render("companyDashboard", { title: 'Dashboard', data: internshipData.rows, currentRoute: "/dashboard", error: null, success: "Successfully updated internship." });

  } catch (err) {
    console.error(err);
    const internshipData = await pool.query(`select * from internships where company_id = $1`, [company_id]);
    res.redirect("/dashboard?error=Something+went+wrong.+Try+again.");

    // res.render("companyDashboard", { title: 'Dashboard', data: internshipData.rows, currentRoute: "/dashboard", error: 'Something went wrong. Try again.', success: null });

  }
});

// View applications for company's internships
router.get("/internships/:id/applications", async (req, res) => {
  try {
    const internship_id = req.params.id;
    const allData = await pool.query(
      `SELECT company_id FROM companies WHERE user_id = $1`,
      [req.session.userId]
    );

    if (!allData.rows[0]) {
      return res.status(400).send("Company not found for this user");
    }
    const company_id = (allData.rows[0]).company_id;

    if (!company_id) {
      return res.redirect("/login");
    }

    const result = await pool.query(
      `SELECT a.application_id, a.status, s.full_name, s.course, s.year, i.title,i.internship_id
       FROM applications a
       JOIN students s ON a.student_id = s.student_id
       JOIN internships i ON a.internship_id = i.internship_id
       WHERE i.company_id = $1 AND i.internship_id = $2
       ORDER BY a.application_id DESC`,
      [company_id, internship_id]
    );

    res.render("companyApplications", {
      title: " View Applications", currentRoute: "companies/applications", applications: result.rows, success: req.query.success
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading applications");
  }
});

// Update application status (accept / reject)
router.post("/applications/:id/update", async (req, res) => {
  try {
    const application_id = req.params.id;
    const { status, internship_id } = req.body;

    await pool.query(
      "UPDATE applications SET status = $1 WHERE application_id = $2",
      [status, application_id]
    );
    res.redirect(`/companies/internships/${internship_id}/applications?success=Application+${status}`);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating application status");
  }
});


module.exports = router;
