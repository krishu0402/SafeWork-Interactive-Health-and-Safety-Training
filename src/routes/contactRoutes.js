const express = require('express');
const router = express.Router();
const { run } = require('../config/database');

router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body || {};
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email and message are required.' });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    await run(`CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT,
      message TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);
    await run('INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)', [name.trim(), email.trim(), (subject || '').trim(), message.trim()]);
    res.status(201).json({ message: 'Your message has been received. The SafeWork team will follow up through the email you provided.' });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ error: 'We could not save your message. Please try again.' });
  }
});

module.exports = router;
