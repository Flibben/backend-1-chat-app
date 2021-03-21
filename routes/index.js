const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../config/auth');

//Welcome Page
router.get('/', (req, res) => {
  res.render('Welcome');
});

// Dasboard
router.get('/dashboard', ensureAuthenticated, (req, res) => {
  // console.log(req.user);
  res.render('dashboard', {
    name: req.user.name,
  });
});
module.exports = router;
