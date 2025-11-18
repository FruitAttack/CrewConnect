import { supabase } from '../utils/supabase.js'
import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET || 'dummysecret'
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h'

// Warn if using default secret
if (SECRET === 'dummysecret') {
  console.warn('WARNING: Using default JWT secret. Set JWT_SECRET in .env file!')
}

export const registerUser = async (req, res) => {
  try {
    const { email, password, full_name, company_id } = req.body

    if (!email || !password)
      return res.status(400).json({ message: 'Email and password required' })

    // Create user using Supabase Admin API
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // skips sending email confirmation
      user_metadata: {
        full_name: full_name || null
      }
    })

    if (error) {
      console.error(error)
      return res.status(400).json({ message: error.message })
    }

    const user = data.user

    // Create user profile if company_id provided
    if (company_id) {
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          full_name: full_name || null,
          default_company_id: company_id,
          is_active: true
        })

      if (profileError) {
        console.error('Profile creation error:', profileError)
        // Continue anyway - profile can be created later
      }
    }

    // Generate your own JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      SECRET,
      { expiresIn: EXPIRES_IN }
    )

    return res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email
      },
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
      { expiresIn: EXPIRES_IN }
    )

    return res.status(200).json({
      message: `Welcome, ${user.email}!`,
      user: {
        id: user.id,
        email: user.email
      },
      token
    })
  } catch (err) {
    console.error('Login error:', err)
    return res.status(500).json({ message: 'Server error' })
  }
}

export const refreshToken = async (req, res) => {
  try {
    const { token } = req.body

    if (!token) {
      return res.status(400).json({ message: 'Token required' })
    }

    // Verify old token (allow expired tokens for refresh)
    let decoded
    try {
      decoded = jwt.verify(token, SECRET, { ignoreExpiration: true })
    } catch (err) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    // Generate new token
    const newToken = jwt.sign(
      { id: decoded.id, email: decoded.email },
      SECRET,
      { expiresIn: EXPIRES_IN }
    )

    return res.status(200).json({
      message: 'Token refreshed',
      token: newToken
    })
  } catch (err) {
    console.error('Refresh token error:', err)
    return res.status(500).json({ message: 'Server error' })
  }
}