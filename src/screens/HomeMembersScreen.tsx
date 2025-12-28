import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Share,
  Platform,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserPlus, X, Mail, Send, Trash2, Users, Check, Edit, Share2, Link as LinkIcon } from 'lucide-react-native';
import { spacing, borderRadius, fontSize } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getApiClient, HomeMembersApi } from '../services/api';
import { useNavigation } from '@react-navigation/native';

interface Member {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  createdAt: string;
}

export default function HomeMembersScreen() {
  const { token, currentHomeId, user } = useAuth();
  const navigation = useNavigation();
  const { colors, gradients, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors, gradients, shadows), [colors, gradients, shadows]);

  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviting, setInviting] = useState(false);
  const [rolePickerVisible, setRolePickerVisible] = useState(false);
  const [shareLinkVisible, setShareLinkVisible] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [generatingLink, setGeneratingLink] = useState(false);

  const homeId = currentHomeId || user?.homeId || '';

  useEffect(() => {
    loadData();
  }, [homeId]);

  const loadData = async () => {
    if (!homeId) return;
    
    try {
      setLoading(true);
      const client = getApiClient(async () => token);
      const api = HomeMembersApi(client);

      const [membersRes, invitationsRes] = await Promise.all([
        api.getMembers(homeId),
        api.getPendingInvitations(homeId),
      ]);

      setMembers(membersRes.data || []);
      setInvitations(invitationsRes.data || []);
    } catch (error: any) {
      console.error('Error loading members:', error);
      Alert.alert('Error', 'Failed to load home members');
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(inviteEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      setInviting(true);
      const client = getApiClient(async () => token);
      const api = HomeMembersApi(client);

      await api.createInvitation(homeId, inviteEmail, inviteRole);
      Alert.alert('Success', `Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      loadData();
    } catch (error: any) {
      console.error('Error sending invite:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleCancelInvite = async (invitationId: string, email: string) => {
    Alert.alert(
      'Cancel Invitation',
      `Cancel invitation to ${email}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              const client = getApiClient(async () => token);
              const api = HomeMembersApi(client);
              await api.cancelInvitation(invitationId, homeId);
              loadData();
            } catch (error: any) {
              console.error('Error cancelling invite:', error);
              Alert.alert('Error', 'Failed to cancel invitation');
            }
          },
        },
      ]
    );
  };

  const handleGenerateShareLink = async () => {
    if (!homeId) {
      Alert.alert('Error', 'Home ID is required');
      return;
    }

    try {
      setGeneratingLink(true);
      const client = getApiClient(async () => token);
      const api = HomeMembersApi(client);
      
      // Create a public invitation link (use a placeholder email for share links)
      // The backend will return the inviteLink in the response
      const placeholderEmail = `share-${Date.now()}@veahome.app`;
      const response = await api.createInvitation(homeId, placeholderEmail, inviteRole);
      
      // Extract token and inviteLink from response
      const invitation = response.data?.data || response.data;
      const token = invitation?.token;
      const inviteLink = invitation?.inviteLink;
      
      if (!token) {
        Alert.alert('Error', 'Failed to generate share link');
        return;
      }

      // Generate shareable URL - use inviteLink from backend if available, otherwise construct it
      let shareUrl = inviteLink;
      if (!shareUrl) {
        // Fallback: construct URL (in production, this should come from backend)
        shareUrl = `https://veahome.app/invite/${token}`;
      }
      
      setShareLink(shareUrl);
      setShareLinkVisible(true);
    } catch (error: any) {
      console.error('Error generating share link:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to generate share link');
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleCopyShareLink = async () => {
    if (!shareLink) return;
    
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(shareLink);
      } else {
        Clipboard.setString(shareLink);
      }
      Alert.alert('Success', 'Link copied to clipboard!');
      setShareLinkVisible(false);
    } catch (error) {
      console.error('Clipboard error:', error);
      // Fallback: show the link so user can manually copy
      Alert.alert('Copy Link', shareLink, [
        { text: 'OK' }
      ]);
    }
  };

  const handleShareLink = async () => {
    if (!shareLink) return;
    
    try {
      const result = await Share.share({
        message: `Join my smart home! Use this link: ${shareLink}`,
        url: shareLink,
        title: 'Invite to VeaHome',
      });
      
      if (result.action === Share.sharedAction) {
        setShareLinkVisible(false);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to share link');
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    Alert.alert(
      'Remove Member',
      `Remove ${memberName} from this home? They will lose access to all devices and data.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const client = getApiClient(async () => token);
              const api = HomeMembersApi(client);
              await api.removeMember(homeId, memberId);
              loadData();
            } catch (error: any) {
              console.error('Error removing member:', error);
              Alert.alert('Error', error.response?.data?.error || 'Failed to remove member');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <X size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.title}>Home Members</Text>
          <Text style={styles.subtitle}>Manage access to your home</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Invite Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <UserPlus size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Invite New Member</Text>
          </View>
          
          {/* Share Link Button */}
          <TouchableOpacity
            style={styles.shareLinkButton}
            onPress={handleGenerateShareLink}
            disabled={generatingLink}
          >
            {generatingLink ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Share2 size={18} color={colors.primary} />
                <Text style={styles.shareLinkButtonText}>Share Invitation Link</Text>
                <LinkIcon size={16} color={colors.mutedForeground} />
              </>
            )}
          </TouchableOpacity>

          <View style={styles.inviteCard}>
            <View style={styles.inputContainer}>
              <Mail size={20} color={colors.mutedForeground} />
              <TextInput
                style={styles.input}
                placeholder="Enter email address"
                placeholderTextColor={colors.mutedForeground}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!inviting}
              />
            </View>
            <TouchableOpacity
              style={styles.roleSelectorButton}
              onPress={() => setRolePickerVisible(true)}
            >
              <Text style={styles.roleSelectorText}>
                Role: {inviteRole === 'owner' ? 'Owner' : inviteRole === 'admin' ? 'Admin' : 'Member'}
              </Text>
              <X size={16} color={colors.mutedForeground} style={{ transform: [{ rotate: '45deg' }] }} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.inviteButton, inviting && styles.inviteButtonDisabled]}
              onPress={handleSendInvite}
              disabled={inviting}
            >
              {inviting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Send size={18} color="white" />
                  <Text style={styles.inviteButtonText}>Send Invite</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Mail size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Pending Invitations</Text>
            </View>
            {invitations.map((invitation) => (
              <View key={invitation.id} style={styles.memberCard}>
                <View style={styles.memberIcon}>
                  <Mail size={20} color={colors.mutedForeground} />
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{invitation.email}</Text>
                  <Text style={styles.memberRole}>Pending • {invitation.role}</Text>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleCancelInvite(invitation.id, invitation.email)}
                >
                  <X size={18} color={colors.destructive} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Current Members */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Users size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Current Members ({members.length})</Text>
          </View>
          {members.map((member) => {
            const isOwner = member.role === 'owner';
            const isCurrentUser = member.userId === user?.id;

            return (
              <View key={member.id} style={styles.memberCard}>
                <View style={[styles.memberIcon, isOwner && styles.ownerIcon]}>
                  <Users size={20} color={isOwner ? 'white' : colors.primary} />
                </View>
                <View style={styles.memberInfo}>
                  <View style={styles.memberNameRow}>
                    <Text style={styles.memberName}>
                      {member.user.name || member.user.email}
                    </Text>
                    {isCurrentUser && (
                      <View style={styles.youBadge}>
                        <Text style={styles.youBadgeText}>You</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.memberEmail}>{member.user.email}</Text>
                  <Text style={styles.memberRole}>{member.role}</Text>
                </View>
                <View style={styles.memberActions}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => navigation.navigate('MemberEdit', { memberId: member.userId, homeId })}
                  >
                    <Edit size={18} color={colors.primary} />
                  </TouchableOpacity>
                  {!isOwner && !isCurrentUser && (
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemoveMember(member.userId, member.user.name || member.user.email)}
                    >
                      <Trash2 size={18} color={colors.destructive} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Role Picker Modal */}
      <Modal
        visible={rolePickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRolePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Role</Text>
              <TouchableOpacity onPress={() => setRolePickerVisible(false)} style={styles.modalCloseButton}>
                <X size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.roleOption, inviteRole === 'owner' && styles.roleOptionSelected]}
              onPress={() => {
                setInviteRole('owner');
                setRolePickerVisible(false);
              }}
            >
              <Text style={[styles.roleOptionText, inviteRole === 'owner' && styles.roleOptionTextSelected]}>
                Owner - Full access to everything
              </Text>
              {inviteRole === 'owner' && <Check size={20} color={colors.primary} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleOption, inviteRole === 'admin' && styles.roleOptionSelected]}
              onPress={() => {
                setInviteRole('admin');
                setRolePickerVisible(false);
              }}
            >
              <Text style={[styles.roleOptionText, inviteRole === 'admin' && styles.roleOptionTextSelected]}>
                Admin - Can manage members and devices
              </Text>
              {inviteRole === 'admin' && <Check size={20} color={colors.primary} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleOption, inviteRole === 'member' && styles.roleOptionSelected]}
              onPress={() => {
                setInviteRole('member');
                setRolePickerVisible(false);
              }}
            >
              <Text style={[styles.roleOptionText, inviteRole === 'member' && styles.roleOptionTextSelected]}>
                Member - Can control devices and scenes
              </Text>
              {inviteRole === 'member' && <Check size={20} color={colors.primary} />}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Share Link Modal */}
      <Modal
        visible={shareLinkVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setShareLinkVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Share Invitation Link</Text>
              <TouchableOpacity onPress={() => setShareLinkVisible(false)} style={styles.modalCloseButton}>
                <X size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <View style={styles.shareLinkContent}>
              <Text style={styles.shareLinkDescription}>
                Share this link with anyone to invite them to your home. They can use it to join even if they don't have an account yet.
              </Text>
              <View style={styles.shareLinkBox}>
                <Text style={styles.shareLinkText} selectable>
                  {shareLink}
                </Text>
              </View>
              <View style={styles.shareLinkActions}>
                <TouchableOpacity
                  style={[styles.shareLinkActionButton, styles.copyButton]}
                  onPress={handleCopyShareLink}
                >
                  <LinkIcon size={18} color="#fff" />
                  <Text style={styles.shareLinkActionText}>Copy Link</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.shareLinkActionButton, styles.shareButton]}
                  onPress={handleShareLink}
                >
                  <Share2 size={18} color="#fff" />
                  <Text style={styles.shareLinkActionText}>Share</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, gradients: any, shadows: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      marginRight: spacing.md,
      padding: spacing.xs,
    },
    headerTitle: {
      flex: 1,
    },
    title: {
      fontSize: fontSize['2xl'],
      fontWeight: '700',
      color: 'white',
      marginBottom: 4,
    },
    subtitle: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
    },
    scrollContent: {
      padding: spacing.lg,
    },
    section: {
      marginBottom: spacing.xl,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
      gap: spacing.sm,
    },
    sectionTitle: {
      fontSize: fontSize.lg,
      fontWeight: '600',
      color: 'white',
    },
    inviteCard: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      ...shadows.medium,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.md,
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    input: {
      flex: 1,
      paddingVertical: spacing.md,
      fontSize: fontSize.base,
      color: 'white',
    },
    inviteButton: {
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
      borderRadius: borderRadius.md,
      gap: spacing.sm,
    },
    inviteButtonDisabled: {
      opacity: 0.5,
    },
    inviteButtonText: {
      color: 'white',
      fontSize: fontSize.base,
      fontWeight: '600',
    },
    memberCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
      ...shadows.small,
    },
    memberIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    ownerIcon: {
      backgroundColor: colors.primary,
    },
    memberInfo: {
      flex: 1,
    },
    memberNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: 2,
    },
    memberName: {
      fontSize: fontSize.base,
      fontWeight: '600',
      color: 'white',
    },
    memberEmail: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
      marginBottom: 2,
    },
    memberRole: {
      fontSize: fontSize.xs,
      color: colors.mutedForeground,
      textTransform: 'capitalize',
    },
    youBadge: {
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
      borderRadius: borderRadius.sm,
    },
    youBadgeText: {
      fontSize: fontSize.xs,
      color: 'white',
      fontWeight: '600',
    },
    memberActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    editButton: {
      padding: spacing.sm,
    },
    removeButton: {
      padding: spacing.sm,
    },
    roleSelectorButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.background,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    roleSelectorText: {
      fontSize: fontSize.md,
      color: colors.foreground,
      fontWeight: '500',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.background,
      borderTopLeftRadius: borderRadius.xxl,
      borderTopRightRadius: borderRadius.xxl,
      paddingBottom: spacing.xl,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: fontSize.xl,
      fontWeight: '700',
      color: colors.foreground,
    },
    modalCloseButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    roleOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    roleOptionSelected: {
      backgroundColor: colors.primary + '10',
    },
    roleOptionText: {
      fontSize: fontSize.md,
      color: colors.foreground,
    },
    roleOptionTextSelected: {
      color: colors.primary,
      fontWeight: '600',
    },
    shareLinkButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'dashed',
    },
    shareLinkButtonText: {
      fontSize: fontSize.md,
      color: colors.primary,
      fontWeight: '600',
      flex: 1,
    },
    shareLinkContent: {
      padding: spacing.lg,
    },
    shareLinkDescription: {
      fontSize: fontSize.sm,
      color: colors.mutedForeground,
      marginBottom: spacing.lg,
      lineHeight: fontSize.sm * 1.5,
    },
    shareLinkBox: {
      backgroundColor: colors.background,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.lg,
    },
    shareLinkText: {
      fontSize: fontSize.sm,
      color: colors.foreground,
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    shareLinkActions: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    shareLinkActionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: borderRadius.md,
    },
    copyButton: {
      backgroundColor: colors.primary,
    },
    shareButton: {
      backgroundColor: colors.secondary,
    },
    shareLinkActionText: {
      fontSize: fontSize.md,
      color: '#fff',
      fontWeight: '600',
    },
  });
