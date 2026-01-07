import { Router } from 'express';
import {
  getHomeMembers,
  createInvitation,
  getPendingInvitations,
  getMyPendingInvitations,
  acceptInvitation,
  declineInvitation,
  cancelInvitation,
  removeMember,
  updateMember,
  createFamilyMember
} from '../controllers/homeMembers.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get all members of a home
router.get('/:homeId/members', getHomeMembers);

// Create invitation
router.post('/:homeId/invitations', createInvitation);

// Get pending invitations
router.get('/:homeId/invitations', getPendingInvitations);

// Get pending invitations for current user
router.get('/invitations/my', getMyPendingInvitations);

// Accept invitation
router.post('/invitations/:token/accept', acceptInvitation);

// Decline invitation
router.post('/invitations/:token/decline', declineInvitation);

// Cancel invitation
router.delete('/invitations/:invitationId', cancelInvitation);

// Update member
router.patch('/:homeId/members/:memberId', updateMember);

// Remove member
router.delete('/:homeId/members/:memberId', removeMember);

// Create family member (direct user creation)
router.post('/:homeId/family-members', createFamilyMember);

export default router;
