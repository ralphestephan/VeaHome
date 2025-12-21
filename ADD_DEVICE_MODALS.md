# Add Device Modals Fix

## Changes needed in DevicesScreen.tsx:

1. Change the add button `onPress` to:
```tsx
onPress={() => setShowAddModal(true)}
```

2. Add these modals before the closing `</View>` and `</SafeAreaView>`:

```tsx
      {/* Add Device Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAddModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Device</Text>
            
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                setShowAddModal(false);
                setShowVealiveModal(true);
              }}
            >
              <Ionicons name="hardware-chip" size={24} color={colors.primary} />
              <View style={styles.modalOptionText}>
                <Text style={styles.modalOptionTitle}>Vealive Device</Text>
                <Text style={styles.modalOptionSubtitle}>AirGuard, VeaHub, VeaRelay</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                setShowAddModal(false);
                Toast.show({
                  type: 'info',
                  text1: 'Coming Soon',
                  text2: 'Tuya & eWeLink integration coming soon'
                });
              }}
            >
              <Ionicons name="cloud" size={24} color={colors.mutedForeground} />
              <View style={styles.modalOptionText}>
                <Text style={[styles.modalOptionTitle, { color: colors.mutedForeground }]}>Tuya / eWeLink Device</Text>
                <Text style={styles.modalOptionSubtitle}>Coming soon</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowAddModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Vealive Device Type Modal */}
      <Modal
        visible={showVealiveModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowVealiveModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowVealiveModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Vealive Device</Text>
            
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                setShowVealiveModal(false);
                navigation.navigate('DeviceProvisioning', { deviceType: 'AirGuard' });
              }}
            >
              <Ionicons name="cloud-outline" size={24} color={colors.primary} />
              <View style={styles.modalOptionText}>
                <Text style={styles.modalOptionTitle}>AirGuard</Text>
                <Text style={styles.modalOptionSubtitle}>Air quality monitor</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                setShowVealiveModal(false);
                Toast.show({
                  type: 'info',
                  text1: 'Coming Soon',
                  text2: 'VeaHub will be available soon'
                });
              }}
            >
              <Ionicons name="radio" size={24} color={colors.mutedForeground} />
              <View style={styles.modalOptionText}>
                <Text style={[styles.modalOptionTitle, { color: colors.mutedForeground }]}>VeaHub</Text>
                <Text style={styles.modalOptionSubtitle}>Coming soon</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                setShowVealiveModal(false);
                Toast.show({
                  type: 'info',
                  text1: 'Coming Soon',
                  text2: 'VeaRelay will be available soon'
                });
              }}
            >
              <Ionicons name="power" size={24} color={colors.mutedForeground} />
              <View style={styles.modalOptionText}>
                <Text style={[styles.modalOptionTitle, { color: colors.mutedForeground }]}>VeaRelay</Text>
                <Text style={styles.modalOptionSubtitle}>Coming soon</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowVealiveModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
```

3. Add these styles to the StyleSheet:

```tsx
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    paddingBottom: spacing.xl + 20,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  modalOptionText: {
    flex: 1,
  },
  modalOptionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 2,
  },
  modalOptionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
  },
  modalCancel: {
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  modalCancelText: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: '600',
  },
```
