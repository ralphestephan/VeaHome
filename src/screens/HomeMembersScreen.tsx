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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserPlus, X, Mail, Send, Trash2, Users, Check } from 'lucide-react-native';
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
  const [inviting, setInviting] = useState(false);

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

      await api.createInvitation(homeId, inviteEmail);
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
                {!isOwner && !isCurrentUser && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveMember(member.userId, member.user.name || member.user.email)}
                  >
                    <Trash2 size={18} color={colors.destructive} />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
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
    removeButton: {
      padding: spacing.sm,
    },
  });
