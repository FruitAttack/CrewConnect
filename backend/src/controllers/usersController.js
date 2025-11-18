import sql from '../utils/db.js';

export function createUser(req, res) {
  res.status(201).json({ message: "You successfully created a user!" });
}

export async function getUser(req, res) {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const users = await sql`
      select id, email
      from app.users
      where email = ${email}
    `;

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(users[0]);

  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ message: "Server error" });
  }
}

export async function getAllUsers(req, res) {
  try {
    const users = await sql`
      select id, email
      from app.users
    `;

    res.status(200).json(users);

  } catch (err) {
    console.error("Error fetching all users:", err);
    res.status(500).json({ message: "Server error" });
  }
}

export function updateUser(req, res) {
  res.status(200).json({ message: "You successfully updated a user!" });
}

export function deleteUser(req, res) {
  res.status(200).json({ message: "You successfully deleted a user!" });
}
