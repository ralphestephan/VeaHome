import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { generateToken } from '../config/jwt';
import { successResponse, errorResponse } from '../utils/response';
import { AuthRequest, Home, User } from '../types';
import { createUser, findUserByEmail, findUserById, updateUser } from '../repositories/usersRepository';
import { createHome as createHomeRecord, getHomesByUserId } from '../repositories/homesRepository';
import { createRoom as createRoomRecord } from '../repositories/roomsRepository';

const DEFAULT_ROOMS = [
  {
    name: 'Living Room',
    scene: 'Evening Relax',
    accentColor: '#C4B5F5',
    layoutPath: 'M 160 240 L 360 240 L 360 420 L 160 420 Z',
  },
  {
    name: 'Master Bedroom',
    scene: 'Sleep Mode',
    accentColor: '#FFA07A',
    layoutPath: 'M 180 60 L 320 60 L 320 180 L 180 180 Z',
  },
  {
    name: 'Kitchen',
    scene: 'Cooking',
    accentColor: '#FFE5B4',
    layoutPath: 'M 60 260 L 160 260 L 160 360 L 60 360 Z',
  },
];

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const sanitizeName = (name: string) => name.trim();

function mapHomesForResponse(homes: Home[]) {
  return homes.map((home) => ({ id: home.id, name: home.name }));
}

function buildUserPayload(user: User, homes: Home[]) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    plan: user.plan,
    homeId: homes[0]?.id || null,
  };
}

async function ensureDefaultRooms(homeId: string) {
  await Promise.all(
    DEFAULT_ROOMS.map((room) =>
      createRoomRecord({
        homeId,
        name: room.name,
        scene: room.scene,
        accentColor: room.accentColor,
        layoutPath: room.layoutPath,
      })
    )
  );
}

export async function register(req: Request, res: Response) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return errorResponse(res, 'Name, email, and password are required', 400);
    }

    const normalizedEmail = normalizeEmail(email);

    const existingUser = await findUserByEmail(normalizedEmail);
    if (existingUser) {
      return errorResponse(res, 'User already exists', 409);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser({
      name: sanitizeName(name),
      email: normalizedEmail,
      passwordHash,
    });

    const defaultHome = await createHomeRecord(user.id, `${user.name.split(' ')[0] || 'My'} Home`);
    await ensureDefaultRooms(defaultHome.id);

    const homes = await getHomesByUserId(user.id);
    const token = generateToken({ userId: user.id, email: user.email });

    return successResponse(
      res,
      {
        token,
        user: buildUserPayload(user, homes),
        homes: mapHomesForResponse(homes),
      },
      201
    );
  } catch (error: any) {
    console.error('Register error:', error);
    return errorResponse(res, error.message || 'Registration failed', 500);
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return errorResponse(res, 'Email and password are required', 400);
    }

    const user = await findUserByEmail(normalizeEmail(email));
    if (!user || !user.password_hash) {
      return errorResponse(res, 'Invalid credentials', 401);
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return errorResponse(res, 'Invalid credentials', 401);
    }

    const homes = await getHomesByUserId(user.id);
    const token = generateToken({ userId: user.id, email: user.email });

    return successResponse(res, {
      token,
      user: buildUserPayload(user, homes),
      homes: mapHomesForResponse(homes),
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

    const user = await findUserById(userId);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    const homes = await getHomesByUserId(user.id);

    return successResponse(res, {
      user: buildUserPayload(user, homes),
      homes: mapHomesForResponse(homes),
    });
  } catch (error: any) {
    console.error('Me error:', error);
    return errorResponse(res, error.message || 'Failed to get user', 500);
  }
}

export async function updateProfile(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;

    if (!userId) {
      return errorResponse(res, 'Unauthorized', 401);
    }

    const { name, email, currentPassword, newPassword } = req.body;

    const user = await findUserById(userId);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    const updates: { name?: string; email?: string; passwordHash?: string } = {};

    if (name !== undefined) {
      updates.name = sanitizeName(name);
    }

    if (email !== undefined) {
      const normalizedEmail = normalizeEmail(email);
      
      // Check if email is already taken by another user
      const existingUser = await findUserByEmail(normalizedEmail);
      if (existingUser && existingUser.id !== userId) {
        return errorResponse(res, 'Email already in use', 409);
      }
      
      updates.email = normalizedEmail;
    }

    // Handle password change
    if (newPassword) {
      if (!currentPassword) {
        return errorResponse(res, 'Current password is required to change password', 400);
      }

      if (!user.password_hash) {
        return errorResponse(res, 'User has no password set', 400);
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValidPassword) {
        return errorResponse(res, 'Current password is incorrect', 401);
      }

      if (newPassword.length < 6) {
        return errorResponse(res, 'New password must be at least 6 characters', 400);
      }

      updates.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    const updatedUser = await updateUser(userId, updates);
    const homes = await getHomesByUserId(updatedUser.id);

    return successResponse(res, {
      user: buildUserPayload(updatedUser, homes),
      homes: mapHomesForResponse(homes),
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    return errorResponse(res, error.message || 'Failed to update profile', 500);
  }
}
