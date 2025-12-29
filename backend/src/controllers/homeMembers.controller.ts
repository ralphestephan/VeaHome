import { Request, Response } from 'express';
import { homeMembersRepository } from '../repositories/homeMembersRepository';
import { usersRepository } from '../repositories/usersRepository';
import bcrypt from 'bcryptjs';
import { getHomeById } from '../repositories/homesRepository';
import { getIO } from '../services/websocket.service';

// Get all members of a home
export const getHomeMembers = async (req: Request, res: Response) => {
  try {
    const { homeId } = req.params;
    const userId = (req as any).userId;

    // Check if user is a member of this home
    const isMember = await homeMembersRepository.isMember(homeId, userId);
    if (!isMember) {
      return res.status(403).json({ error: 'Not authorized to view members' });
    }

    const members = await homeMembersRepository.getHomeMembers(homeId);
    return res.json(members);
  } catch (error) {
    console.error('Error getting home members:', error);
    return res.status(500).json({ error: 'Failed to get home members' });
  }
};

// Create invitation
export const createInvitation = async (req: Request, res: Response) => {
  try {
    const { homeId } = req.params;
    const { email, role = 'member' } = req.body;
    const userId = (req as any).userId;

    // Check if user is owner or admin
    const userRole = await homeMembersRepository.getMemberRole(homeId, userId);
    if (userRole !== 'owner' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Only owners and admins can invite users' });
    }

    // Check if user already exists and is a member
    const existingUser = await usersRepository.findByEmail(email);
    const isExistingUser = !!existingUser;
    if (existingUser) {
      const isMember = await homeMembersRepository.isMember(homeId, existingUser.id);
      if (isMember) {
        return res.status(400).json({ error: 'User is already a member of this home' });
      }
    }

    const invitation = await homeMembersRepository.createInvitation(
      homeId,
      email,
      userId,
      role
    );

    // Generate invitation link
    const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'https://veahome.app';
    const inviteLink = `${appUrl}/invite/${invitation.token}`;

    // If user exists, send notification via WebSocket
    if (isExistingUser && existingUser) {
      const home = await getHomeById(homeId);
      const homeName = home?.name || 'a home';
      
      // Send WebSocket notification to the invited user
      const io = getIO();
      if (io) {
        io.to(`user:${existingUser.id}`).emit('home_invitation', {
          type: 'home_invitation',
          invitationId: invitation.id,
          invitationToken: invitation.token,
          homeId,
          homeName,
          role,
          message: `You've been invited to join ${homeName}. You now have access to this home.`,
          timestamp: new Date().toISOString(),
        });
      }
      
      console.log(`[Invitation] Notification sent to existing user ${email} (${existingUser.id}) for home ${homeId}`);
    } else {
      // New user - send email with invitation link
      // TODO: Send email with invitation link
      console.log(`[Invitation] New user ${email} invited. Should send email with link: ${inviteLink}`);
    }

    return res.status(201).json({
      ...invitation,
      inviteLink,
      existingUser: isExistingUser,
      message: isExistingUser 
        ? 'Invitation sent. User will be notified to switch homes.' 
        : 'Invitation created successfully'
    });
  } catch (error) {
    console.error('Error creating invitation:', error);
    return res.status(500).json({ error: 'Failed to create invitation' });
  }
};

// Get pending invitations
export const getPendingInvitations = async (req: Request, res: Response) => {
  try {
    const { homeId } = req.params;
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is a member
    const isMember = await homeMembersRepository.isMember(homeId, userId);
    if (!isMember) {
      // If user is not a member, check if they own the home (via homes table)
      const home = await getHomeById(homeId);
      if (!home || home.user_id !== userId) {
        return res.status(403).json({ error: 'Not authorized' });
      }
    }

    const invitations = await homeMembersRepository.getPendingInvitations(homeId);
    return res.json(invitations);
  } catch (error) {
    console.error('Error getting invitations:', error);
    return res.status(500).json({ error: 'Failed to get invitations' });
  }
};

// Accept invitation
export const acceptInvitation = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const userId = (req as any).userId;

    const invitation = await homeMembersRepository.getInvitationByToken(token);
    if (!invitation) {
      return res.status(404).json({ error: 'Invalid or expired invitation' });
    }

    // Check if user email matches invitation
    const user = await usersRepository.findById(userId);
    if (user?.email !== invitation.email) {
      return res.status(403).json({ error: 'This invitation is for a different email address' });
    }

    await homeMembersRepository.acceptInvitation(token, userId);
    return res.json({ message: 'Invitation accepted successfully', homeId: invitation.homeId });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return res.status(500).json({ error: 'Failed to accept invitation' });
  }
};

// Cancel invitation
export const cancelInvitation = async (req: Request, res: Response) => {
  try {
    const { invitationId } = req.params;
    const { homeId } = req.body;
    const userId = (req as any).userId;

    // Check if user is owner or admin
    const userRole = await homeMembersRepository.getMemberRole(homeId, userId);
    if (userRole !== 'owner' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Only owners and admins can cancel invitations' });
    }

    await homeMembersRepository.cancelInvitation(invitationId);
    return res.json({ message: 'Invitation cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling invitation:', error);
    return res.status(500).json({ error: 'Failed to cancel invitation' });
  }
};

// Remove member from home
export const removeMember = async (req: Request, res: Response) => {
  try {
    const { homeId, memberId } = req.params;
    const userId = (req as any).userId;

    // Check if user is owner or admin
    const userRole = await homeMembersRepository.getMemberRole(homeId, userId);
    if (userRole !== 'owner' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Only owners and admins can remove members' });
    }

    // Can't remove the owner
    const targetRole = await homeMembersRepository.getMemberRole(homeId, memberId);
    if (targetRole === 'owner') {
      return res.status(400).json({ error: 'Cannot remove the owner' });
    }

    // Get home and member info before removal for notification
    const home = await getHomeById(homeId);
    const homeName = home?.name || 'this home';

    await homeMembersRepository.removeMember(homeId, memberId);
    
    // Send notification to removed user via WebSocket
    const io = getIO();
    if (io) {
      io.to(`user:${memberId}`).emit('home_removed', {
        type: 'home_removed',
        homeId,
        homeName,
        message: `You've been removed from ${homeName}. You no longer have access to this home.`,
        timestamp: new Date().toISOString(),
      });
    }
    console.log(`[Member Removal] Notification sent to user ${memberId} about removal from home ${homeId}`);

    return res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Error removing member:', error);
    return res.status(500).json({ error: 'Failed to remove member' });
  }
};

// Update member (role, etc.)
export const updateMember = async (req: Request, res: Response) => {
  try {
    const { homeId, memberId } = req.params;
    const { role } = req.body;
    const userId = (req as any).userId;

    // Check if user is owner or admin
    const userRole = await homeMembersRepository.getMemberRole(homeId, userId);
    if (userRole !== 'owner' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Only owners and admins can update members' });
    }

    // Can't change owner role
    const targetRole = await homeMembersRepository.getMemberRole(homeId, memberId);
    if (targetRole === 'owner' && role !== 'owner') {
      return res.status(400).json({ error: 'Cannot change owner role' });
    }

    // Only owners can assign owner role
    if (role === 'owner' && userRole !== 'owner') {
      return res.status(403).json({ error: 'Only owners can assign owner role' });
    }

    // Validate role
    if (!['owner', 'admin', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be owner, admin, or member' });
    }

    await homeMembersRepository.updateMemberRole(homeId, memberId, role);
    return res.json({ message: 'Member updated successfully' });
  } catch (error: any) {
    console.error('Error updating member:', error);
    return res.status(500).json({ error: error.message || 'Failed to update member' });
  }
};

// Create family member (direct user creation)
export const createFamilyMember = async (req: Request, res: Response) => {
  try {
    const { homeId } = req.params;
    const { name, email, password, role = 'member' } = req.body;
    const userId = (req as any).userId;

    // Check if user is owner or admin
    const userRole = await homeMembersRepository.getMemberRole(homeId, userId);
    if (userRole !== 'owner' && userRole !== 'admin') {
      return res.status(403).json({ error: 'Only owners and admins can create family members' });
    }

    // Check if email already exists
    const existingUser = await usersRepository.findByEmail(email);
    if (existingUser) {
      // If user exists, just add them to the home
      const isMember = await homeMembersRepository.isMember(homeId, existingUser.id);
      if (isMember) {
        return res.status(400).json({ error: 'User is already a member of this home' });
      }
      
      await homeMembersRepository.addMember(homeId, existingUser.id, role, userId);
      return res.status(201).json({
        message: 'Existing user added to home',
        user: { id: existingUser.id, email: existingUser.email, name: existingUser.name }
      });
    }

    // Create new user
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await usersRepository.create({
      email,
      name,
      passwordHash: hashedPassword
    });

    // Add to home
    await homeMembersRepository.addMember(homeId, newUser.id, role, userId);

    return res.status(201).json({
      message: 'Family member created successfully',
      user: { id: newUser.id, email: newUser.email, name: newUser.name }
    });
  } catch (error) {
    console.error('Error creating family member:', error);
    return res.status(500).json({ error: 'Failed to create family member' });
  }
};
