import sql from '../utils/db.js'
import jwt from 'jsonwebtoken';

const SECRET = 'dummysecret';

export const registerUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) 
      return res.status(400).json({ message: 'Username and password required' });

    // Check if user already exists
    const existingUsers = await sql`
      select id, username
      from app.users
      where username = ${username}
    `;

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Insert new user into database
    const insertedUsers = await sql`
      insert into app.users (username, password)
      values (${username}, ${password})
      returning id, username
    `;

    console.log(insertedUsers)
    const user = insertedUsers[0];

    // Generate JWT token
    const token = jwt.sign({ username: user.username, id: user.id }, SECRET, { expiresIn: '1h' });

    return res.status(201).json({ message: 'User registered successfully', token });
  } catch (err) {
    console.error('Error registering user:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) 
      return res.status(400).json({ message: 'Username and password required' });

    // Check if user exists and password matches
    const usersFound = await sql`
      select id, username
      from app.users
      where username = ${username} and password = ${password}
    `;

    if (usersFound.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = usersFound[0];

    // Generate JWT token
    const token = jwt.sign({ username: user.username, id: user.id }, SECRET, { expiresIn: '1h' });

    return res.status(200).json({ message: `Welcome, ${user.username}!`, token });
  } catch (err) {
    console.error('Error logging in user:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};