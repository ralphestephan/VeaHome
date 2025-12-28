import { Request, Response } from 'express';
import { homeMembersRepository } from '../repositories/homeMembersRepository';
import { usersRepository } from '../repositories/usersRepository';
import bcrypt from 'bcryptjs';

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

    // TODO: Send email with invitation link
    // const inviteLink = `${process.env.APP_URL}/invite/${invitation.token}`;

    return res.status(201).json({
      ...invitation,
      message: 'Invitation created successfully'
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

    // Check if user is a member
    const isMember = await homeMembersRepository.isMember(homeId, userId);
    if (!isMember) {
      return res.status(403).json({ error: 'Not authorized' });
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

    await homeMembersRepository.removeMember(homeId, memberId);
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
