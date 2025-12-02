import jwt from 'jsonwebtoken';
import { supabase } from '../utils/supabase.js';

const SECRET = process.env.JWT_SECRET || 'dummysecret';

/**
 * Verify JWT token and attach user to request
 */
export const authenticate = async (req, res, next) => {
  console.log('=== AUTH MIDDLEWARE ===');
  console.log('Authorization header:', req.headers.authorization);
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, SECRET);
      console.log('Decoded token:', decoded);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired' });
      }
      return res.status(401).json({ message: 'Invalid token' });
    }

    console.log('Querying user with ID:', decoded.id);

    // Get user from database (simplified - no join)
    const { data: user, error } = await supabase
      .schema('app')
      .from('users')
      .select('*')
      .eq('id', decoded.sub)
      .eq('is_active', true)
      .single();

    console.log('Query result - user:', user);
    console.log('Query result - error:', error);

    if (error || !user) {
      console.log('User lookup failed!');
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      default_company_id: user.default_company_id,
      can_view_rates: user.can_view_rates,
      roles: [] // Empty for now - can add role lookup separately if needed
    };

    console.log('req.user set:', req.user);
    next();

  } catch (err) {
    console.error('Authentication error:', err);
    return res.status(500).json({ message: 'Authentication failed' });
  }
};

/**
 * Check if user has required role for a specific company
 */
export const requireRole = (allowedRoles, checkCompanyId = true) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      // Get company_id from query params, body, or params
      const companyId = req.query.company_id || req.body.company_id || req.params.company_id;

      if (checkCompanyId && !companyId) {
        return res.status(400).json({ message: 'company_id is required' });
      }

      // Check if user has any of the allowed roles for this company
      const hasRole = req.user.roles.some(userRole => 
        allowedRoles.includes(userRole.role_key) && 
        (!checkCompanyId || userRole.company_id === companyId)
      );

      if (!hasRole) {
        return res.status(403).json({ 
          message: 'Insufficient permissions',
          required_roles: allowedRoles
        });
      }

      // Attach company_id to request for convenience
      if (companyId) {
        req.company_id = companyId;
      }

      next();
    } catch (err) {
      console.error('Role check error:', err);
      return res.status(500).json({ message: 'Authorization failed' });
    }
  };
};

/**
 * Require admin role
 */
export const requireAdmin = requireRole(['admin']);

/**
 * Require admin or supervisor role
 */
export const requireAdminOrSupervisor = requireRole(['admin', 'supervisor']);

/**
 * Require admin, supervisor, or foreman role
 */
export const requireManagement = requireRole(['admin', 'supervisor', 'foreman']);

/**
 * Check if user owns the resource or is admin
 */
export const requireOwnerOrAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Get resource owner ID from params or body
    const resourceUserId = req.params.id || req.params.user_id || req.body.user_id;

    // Check if user is admin for any company
    const isAdmin = req.user.roles.some(role => role.role_key === 'admin');

    // Allow if user owns resource or is admin
    if (req.user.id === resourceUserId || isAdmin) {
      return next();
    }

    return res.status(403).json({ 
      message: 'You can only access your own resources' 
    });
  } catch (err) {
    console.error('Owner check error:', err);
    return res.status(500).json({ message: 'Authorization failed' });
  }
};

/**
 * Rate limiting store (in-memory, use Redis in production)
 */
const rateLimitStore = new Map();

/**
 * Simple rate limiter middleware
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} windowMs - Time window in milliseconds
 */
export const rateLimit = (maxRequests = 100, windowMs = 60000) => {
  return (req, res, next) => {
    const identifier = req.user?.id || req.ip;
    const key = `${identifier}:${req.path}`;
    const now = Date.now();

    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);
    
    if (!entry || now > entry.resetTime) {
      // Create new entry or reset expired one
      entry = {
        count: 0,
        resetTime: now + windowMs
      };
    }

    entry.count++;
    rateLimitStore.set(key, entry);

    // Clean up old entries periodically
    if (Math.random() < 0.01) { // 1% chance to clean up
      const cutoff = now - windowMs;
      for (const [k, v] of rateLimitStore.entries()) {
        if (v.resetTime < cutoff) {
          rateLimitStore.delete(k);
        }
      }
    }

    // Check if limit exceeded
    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      res.set('Retry-After', retryAfter);
      return res.status(429).json({ 
        message: 'Too many requests',
        retry_after_seconds: retryAfter
      });
    }

    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': maxRequests,
      'X-RateLimit-Remaining': maxRequests - entry.count,
      'X-RateLimit-Reset': new Date(entry.resetTime).toISOString()
    });

    next();
  };
};

/**
 * Validate geofence for clock in/out
 */
export const validateGeofence = async (req, res, next) => {
  try {
    const { project_id, latitude, longitude } = req.body;

    // Skip if no location provided
    if (!latitude || !longitude) {
      return next();
    }

    // Get project geofence settings
    const { data: project, error } = await supabase
      .from('projects')
      .select('lat, lng, geofence_m')
      .eq('id', project_id)
      .single();

    if (error || !project) {
      return res.status(400).json({ message: 'Invalid project' });
    }

    // Skip if project has no geofence
    if (!project.lat || !project.lng || !project.geofence_m) {
      return next();
    }

    // Calculate distance using Haversine formula
    const R = 6371000; // Earth's radius in meters
    const lat1 = project.lat * Math.PI / 180;
    const lat2 = latitude * Math.PI / 180;
    const deltaLat = (latitude - project.lat) * Math.PI / 180;
    const deltaLng = (longitude - project.lng) * Math.PI / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    // Check if within geofence
    if (distance > project.geofence_m) {
      return res.status(403).json({
        message: 'Outside project geofence',
        distance_meters: Math.round(distance),
        allowed_radius_meters: project.geofence_m
      });
    }

    next();
  } catch (err) {
    console.error('Geofence validation error:', err);
    // Don't block request on geofence error, just log it
    next();
  }
};

/**
 * Sanitize user input to prevent injection attacks
 */
export const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        // Remove null bytes
        obj[key] = obj[key].replace(/\0/g, '');
        // Trim whitespace
        obj[key] = obj[key].trim();
      } else if (typeof obj[key] === 'object') {
        sanitize(obj[key]);
      }
    }
    return obj;
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);

  next();
};
