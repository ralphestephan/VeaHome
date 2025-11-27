import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/database';
import { generateToken } from '../config/jwt';
import { successResponse, errorResponse } from '../utils/response';
import { AuthRequest } from '../types';

export async function register(req: Request, res: Response) {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return errorResponse(res, 'User already exists', 409);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const userResult = await query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, plan',
      [name, email, passwordHash]
    );

    const user = userResult.rows[0];

    // Create default home
    const homeResult = await query(
      'INSERT INTO homes (user_id, name) VALUES ($1, $2) RETURNING id, name',
      [user.id, 'My Home']
    );

    const home = homeResult.rows[0];

    // Create default rooms
    await query(
      `INSERT INTO rooms (home_id, name, temperature, humidity) VALUES 
       ($1, 'Living Room', 22.0, 45.0),
       ($1, 'Bedroom', 21.0, 50.0),
       ($1, 'Kitchen', 23.0, 55.0)`,
      [home.id]
    );

    // Generate token
    const token = generateToken({ userId: user.id, email: user.email });

    return successResponse(res, {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        homeId: home.id,
      },
      homes: [{ id: home.id, name: home.name }],
    }, 201);
  } catch (error: any) {
    console.error('Register error:', error);
    return errorResponse(res, error.message || 'Registration failed', 500);
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    // Find user
    const userResult = await query(
      'SELECT id, name, email, password_hash, plan FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return errorResponse(res, 'Invalid credentials', 401);
    }

    const user = userResult.rows[0];

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return errorResponse(res, 'Invalid credentials', 401);
    }

    // Get user's homes
    const homesResult = await query(
      'SELECT id, name FROM homes WHERE user_id = $1',
      [user.id]
    );

    const homes = homesResult.rows;

    // Generate token
    const token = generateToken({ userId: user.id, email: user.email });

    return successResponse(res, {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        homeId: homes[0]?.id || null,
      },
      homes: homes.map((h: any) => ({ id: h.id, name: h.name })),
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return errorResponse(res, error.message || 'Login failed', 500);
  }
}

export async function me(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;

    if (!userId) {
      return errorResponse(res, 'Unauthorized', 401);
    }

    // Get user
    const userResult = await query(
      'SELECT id, name, email, plan FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return errorResponse(res, 'User not found', 404);
    }

    const user = userResult.rows[0];

    // Get user's homes
    const homesResult = await query(
      'SELECT id, name FROM homes WHERE user_id = $1',
      [user.id]
    );

    return successResponse(res, {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        homeId: homesResult.rows[0]?.id || null,
      },
      homes: homesResult.rows.map((h: any) => ({ id: h.id, name: h.name })),
    });
  } catch (error: any) {
    console.error('Me error:', error);
    return errorResponse(res, error.message || 'Failed to get user', 500);
  }
}
