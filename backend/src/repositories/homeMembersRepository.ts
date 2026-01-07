import pool from '../config/database';
import crypto from 'crypto';

export interface HomeMember {
  id: string;
  homeId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  invitedBy?: string;
  joinedAt: Date;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export interface HomeInvitation {
  id: string;
  homeId: string;
  email: string;
  role: string;
  invitedBy: string;
  token: string;
  expiresAt: Date;
  acceptedAt?: Date;
  declinedAt?: Date;
  createdAt: Date;
}

export const homeMembersRepository = {
  // Get all members of a home
  async getHomeMembers(homeId: string): Promise<HomeMember[]> {
    const result = await pool.query(
      `SELECT hm.*, u.email, u.name 
       FROM home_members hm
       JOIN users u ON hm.user_id = u.id
       WHERE hm.home_id = $1
       ORDER BY hm.role DESC, hm.joined_at ASC`,
      [homeId]
    );
    return result.rows.map((row: any) => ({
      id: row.id,
      homeId: row.home_id,
      userId: row.user_id,
      role: row.role,
      invitedBy: row.invited_by,
      joinedAt: row.joined_at,
      user: {
        id: row.user_id,
        email: row.email,
        name: row.name
      }
    }));
  },

  // Check if user is member of home
  async isMember(homeId: string, userId: string): Promise<boolean> {
    const result = await pool.query(
      'SELECT 1 FROM home_members WHERE home_id = $1 AND user_id = $2',
      [homeId, userId]
    );
    return result.rows.length > 0;
  },

  // Get user's role in home
  async getMemberRole(homeId: string, userId: string): Promise<string | null> {
    const result = await pool.query(
      'SELECT role FROM home_members WHERE home_id = $1 AND user_id = $2',
      [homeId, userId]
    );
    return result.rows[0]?.role || null;
  },

  // Add member to home
  async addMember(
    homeId: string,
    userId: string,
    role: string = 'member',
    invitedBy?: string
  ): Promise<HomeMember> {
    const result = await pool.query(
      `INSERT INTO home_members (home_id, user_id, role, invited_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (home_id, user_id) DO UPDATE SET role = $3
       RETURNING *`,
      [homeId, userId, role, invitedBy]
    );
    return {
      id: result.rows[0].id,
      homeId: result.rows[0].home_id,
      userId: result.rows[0].user_id,
      role: result.rows[0].role,
      invitedBy: result.rows[0].invited_by,
      joinedAt: result.rows[0].joined_at
    };
  },

  // Update member role
  async updateMemberRole(homeId: string, userId: string, role: string): Promise<HomeMember> {
    const result = await pool.query(
      `UPDATE home_members 
       SET role = $3, updated_at = CURRENT_TIMESTAMP 
       WHERE home_id = $1 AND user_id = $2 
       RETURNING *`,
      [homeId, userId, role]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Member not found');
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      homeId: row.home_id,
      userId: row.user_id,
      role: row.role,
      invitedBy: row.invited_by,
      joinedAt: row.joined_at
    };
  },

  // Remove member from home
  async removeMember(homeId: string, userId: string): Promise<void> {
    await pool.query(
      'DELETE FROM home_members WHERE home_id = $1 AND user_id = $2',
      [homeId, userId]
    );
  },

  // Create invitation
  async createInvitation(
    homeId: string,
    email: string,
    invitedBy: string,
    role: string = 'member'
  ): Promise<HomeInvitation> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const result = await pool.query(
      `INSERT INTO home_invitations (home_id, email, role, invited_by, token, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [homeId, email, role, invitedBy, token, expiresAt]
    );

    return {
      id: result.rows[0].id,
      homeId: result.rows[0].home_id,
      email: result.rows[0].email,
      role: result.rows[0].role,
      invitedBy: result.rows[0].invited_by,
      token: result.rows[0].token,
      expiresAt: result.rows[0].expires_at,
      acceptedAt: result.rows[0].accepted_at,
      createdAt: result.rows[0].created_at
    };
  },

  // Get pending invitations for a home
  async getPendingInvitations(homeId: string): Promise<HomeInvitation[]> {
    const result = await pool.query(
      `SELECT * FROM home_invitations 
       WHERE home_id = $1 AND accepted_at IS NULL AND declined_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [homeId]
    );
    return result.rows.map((row: any) => ({
      id: row.id,
      homeId: row.home_id,
      email: row.email,
      role: row.role,
      invitedBy: row.invited_by,
      token: row.token,
      expiresAt: row.expires_at,
      acceptedAt: row.accepted_at,
      declinedAt: row.declined_at,
      createdAt: row.created_at
    }));
  },

  // Get pending invitations for a user (by email)
  async getPendingInvitationsForUser(email: string): Promise<HomeInvitation[]> {
    const result = await pool.query(
      `SELECT * FROM home_invitations 
       WHERE email = $1 AND accepted_at IS NULL AND declined_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [email]
    );
    return result.rows.map((row: any) => ({
      id: row.id,
      homeId: row.home_id,
      email: row.email,
      role: row.role,
      invitedBy: row.invited_by,
      token: row.token,
      expiresAt: row.expires_at,
      acceptedAt: row.accepted_at,
      declinedAt: row.declined_at,
      createdAt: row.created_at
    }));
  },

  // Get invitation by token
  async getInvitationByToken(token: string, includeDeclined: boolean = false): Promise<HomeInvitation | null> {
    const queryConditions = [`token = $1`, `expires_at > NOW()`];
    if (!includeDeclined) {
      queryConditions.push(`accepted_at IS NULL`);
      queryConditions.push(`declined_at IS NULL`);
    }
    const result = await pool.query(
      `SELECT * FROM home_invitations 
       WHERE ${queryConditions.join(' AND ')}`,
      [token]
    );
    
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      homeId: row.home_id,
      email: row.email,
      role: row.role,
      invitedBy: row.invited_by,
      token: row.token,
      expiresAt: row.expires_at,
      acceptedAt: row.accepted_at,
      declinedAt: row.declined_at,
      createdAt: row.created_at
    };
  },

  // Accept invitation
  async acceptInvitation(token: string, userId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get invitation
      const invResult = await client.query(
        'SELECT * FROM home_invitations WHERE token = $1 AND accepted_at IS NULL',
        [token]
      );

      if (invResult.rows.length === 0) {
        throw new Error('Invalid or expired invitation');
      }

      const invitation = invResult.rows[0];

      // Add user to home
      await client.query(
        `INSERT INTO home_members (home_id, user_id, role, invited_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (home_id, user_id) DO NOTHING`,
        [invitation.home_id, userId, invitation.role, invitation.invited_by]
      );

      // Mark invitation as accepted
      await client.query(
        'UPDATE home_invitations SET accepted_at = NOW() WHERE token = $1',
        [token]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Decline invitation
  async declineInvitation(token: string): Promise<void> {
    await pool.query(
      `UPDATE home_invitations SET declined_at = NOW() WHERE token = $1`,
      [token]
    );
  },

  // Cancel invitation (by inviter)
  async cancelInvitation(invitationId: string): Promise<void> {
    await pool.query('DELETE FROM home_invitations WHERE id = $1', [invitationId]);
  }
};
