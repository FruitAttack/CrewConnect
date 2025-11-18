import { supabase } from '../utils/supabase.js'
import jwt from 'jsonwebtoken'

const SECRET = 'dummysecret'

export const registerUser = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password)
      return res.status(400).json({ message: 'Email and password required' })

    // Create user using Supabase Admin API
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // skips sending email confirmation
    })

    if (error) {
      console.error(error)
      return res.status(400).json({ message: error.message })
    }

    const user = data.user

    // Generate your own JWT (optional but common)
    const token = jwt.sign(
      { id: user.id, email: user.email },
      SECRET,
      { expiresIn: '1h' }
    )

    return res.status(201).json({
      message: 'User registered successfully',
      user,
      token,
    })
  } catch (err) {
    console.error('Register error:', err)
    return res.status(500).json({ message: 'Server error' })
  }
}

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password)
      return res.status(400).json({ message: 'Email and password required' })

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error(error)
      return res.status(401).json({ message: 'Invalid login' })
    }

    const user = data.user

    const token = jwt.sign(
      { id: user.id, email: user.email },
      SECRET,
      { expiresIn: '1h' }
    )

    return res.status(200).json({
      message: `Welcome, ${user.email}!`,
      token,
      email
    })
  } catch (err) {
    console.error('Login error:', err)
    return res.status(500).json({ message: 'Server error' })
  }
}