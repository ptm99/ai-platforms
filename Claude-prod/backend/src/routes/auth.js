const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateToken } = require('../utils/jwt');
const { AppError } = require('../middleware/errorHandler');

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { username, password, email } = req.body;

    // Validation
    if (!username || !password) {
      throw new AppError(400, 'validation_error', 'Username and password are required');
    }

    if (username.length < 3) {
      throw new AppError(400, 'validation_error', 'Username must be at least 3 characters');
    }

    if (password.length < 6) {
      throw new AppError(400, 'validation_error', 'Password must be at least 6 characters');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Insert user
    const result = await pool.query(
      `INSERT INTO users (username, password_hash, email) 
       VALUES ($1, $2, $3) 
       RETURNING id, username, email, created_at`,
      [username, passwordHash, email]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = generateToken(user.id, user.username);

    res.status(201).json({
      user_id: user.id,
      username: user.username,
      email: user.email,
      token
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      throw new AppError(400, 'validation_error', 'Username and password are required');
    }

    // Get user
    const result = await pool.query(
      'SELECT id, username, password_hash, email FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      throw new AppError(401, 'invalid_credentials', 'Invalid username or password');
    }

    const user = result.rows[0];

    // Check password
    const isValid = await comparePassword(password, user.password_hash);
    if (!isValid) {
      throw new AppError(401, 'invalid_credentials', 'Invalid username or password');
    }

    // Generate JWT token
    const token = generateToken(user.id, user.username);

    res.json({
      user_id: user.id,
      username: user.username,
      email: user.email,
      token
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;