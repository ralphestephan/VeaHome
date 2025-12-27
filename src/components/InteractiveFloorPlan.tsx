import React, {
  useMemo,
  useRef,
  useState,
  useEffect,
  ReactNode,
  useImperativeHandle,
  forwardRef,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Alert,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  Modal,
  TextInput,
  Image,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, G, Text as SvgText, Circle } from 'react-native-svg';
import { Thermometer, Droplets, Lightbulb, Zap, Edit2, Save, X, Plus } from 'lucide-react-native';
import { colors as defaultColors, spacing, borderRadius, ThemeColors } from '../constants/theme';
import { roomsData, RoomData } from '../constants/rooms';
import { Room } from '../types';
import { useTheme } from '../context/ThemeContext';

export interface InteractiveFloorPlanHandle {
  enterEditMode: () => void;
  exitEditMode: () => void;
  toggleEditMode: () => void;
  saveLayout: () => void;
  openAddRoomModal: () => void;
  isEditMode: boolean;
}

interface InteractiveFloorPlanProps {
  onRoomSelect: (roomId: string) => void;
  selectedRoom?: string;
  rooms?: Room[]; // Real rooms from API (optional - falls back to roomsData)
  onLayoutUpdate?: (layout: any) => void; // Callback to save layout changes
  homeId?: string; // For saving layout to API
  onRoomCreate?: (room: Room) => void | Room | Promise<void | Room>;
  headerExtras?: ReactNode;
  showSelectedRoomInfo?: boolean;
  showToolbar?: boolean;
  onEditModeChange?: (isEditing: boolean) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SVG_WIDTH = 500;
const SVG_HEIGHT = 500;
const SCALE = (SCREEN_WIDTH - 48) / SVG_WIDTH;

const InteractiveFloorPlan = forwardRef<InteractiveFloorPlanHandle, InteractiveFloorPlanProps>(function InteractiveFloorPlan(
  {
    onRoomSelect,
    selectedRoom,
    rooms,
    onLayoutUpdate,
    homeId,
    onRoomCreate,
    headerExtras,
    showSelectedRoomInfo = true,
    showToolbar = true,
    onEditModeChange,
  },
  ref,
) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [roomPositions, setRoomPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [localRooms, setLocalRooms] = useState<Room[]>([]);
  const [roomVisuals, setRoomVisuals] = useState<Record<string, { path: string; color: string }>>(() => {
    const seed: Record<string, { path: string; color: string }> = {};
    Object.values(roomsData).forEach((room) => {
      seed[room.id] = { path: room.path, color: room.color };
    });
    return seed;
  });
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomImage, setNewRoomImage] = useState('');
  const [newRoomTemperature, setNewRoomTemperature] = useState('22');
  const [newRoomHumidity, setNewRoomHumidity] = useState('55');
  const [newRoomLights, setNewRoomLights] = useState('1');
  const [newRoomColor, setNewRoomColor] = useState(COLOR_PALETTE[0]);
  const draggingRoomId = useRef<string | null>(null);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  
  // Edit room modal state
  const [isEditRoomModalVisible, setIsEditRoomModalVisible] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editRoomName, setEditRoomName] = useState('');
  const [editRoomImage, setEditRoomImage] = useState('');
  const [editRoomColor, setEditRoomColor] = useState(COLOR_PALETTE[0]);

  useEffect(() => {
    if (!rooms || rooms.length === 0) {
      return;
    }
    setLocalRooms((prev) => prev.filter((local) => !rooms.find((remote) => remote.id === local.id)));
  }, [rooms]);

  const combinedRooms = useMemo(() => {
    const baseRooms = rooms || [];
    const extras = localRooms.filter((local) => !baseRooms.find((r) => r.id === local.id));
    return [...baseRooms, ...extras];
  }, [rooms, localRooms]);

  // Use real rooms if provided. If a `homeId` is provided we should NOT
  // fallback to the demo `roomsData` (that causes the default layout to
  // appear after a home is deleted). Only fallback to `roomsData` when no
  // `homeId` is supplied (for standalone/demo usage).
  const roomsToRender = combinedRooms.length > 0
    ? combinedRooms.map((room, index) => {
        const visual = roomVisuals[room.id] || {
          path: room.layoutPath || createDefaultRoomPath(index),
          color: room.accentColor || pickAccentColor(index),
        };
        return {
          id: room.id,
          name: room.name,
          color: visual.color,
          path: visual.path,
          temperature: room.temperature,
          humidity: room.humidity,
          lights: room.lights,
          power: room.power,
          scene: room.scene,
          sceneName: room.sceneName,
          image: room.image,
        } as RoomData;
      })
    : (homeId ? [] : Object.values(roomsData));

  useEffect(() => {
    if (combinedRooms.length === 0) return;
    setRoomVisuals((prev) => {
      const next = { ...prev };
      let changed = false;
      combinedRooms.forEach((room, index) => {
        if (!next[room.id]) {
          next[room.id] = {
            path: room.layoutPath || createDefaultRoomPath(index),
            color: room.accentColor || pickAccentColor(index),
          };
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [combinedRooms]);

  // Only create panResponder on mobile platforms to avoid web warnings
  const panResponder = useMemo(() => {
    if (Platform.OS === 'web') {
      return { panHandlers: {} };
    }
    return PanResponder.create({
      onStartShouldSetPanResponder: () => isEditMode,
      onMoveShouldSetPanResponder: () => isEditMode,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        // find closest room center and select it for dragging
        if (!isEditMode) return;
        const { locationX, locationY } = evt.nativeEvent;
        // pick currently hovered/selected or nearest
        const current = roomsToRender[0];
        // store start; actual room is set when user taps a room (below)
        dragStart.current = { x: locationX, y: locationY };
      },
      onPanResponderMove: (_evt, gesture: PanResponderGestureState) => {
        if (!isEditMode || !draggingRoomId.current) return;
        const id = draggingRoomId.current;
        const prev = roomPositions[id] || { x: 0, y: 0 };
        const next = { x: prev.x + gesture.dx / SCALE, y: prev.y + gesture.dy / SCALE };
        setRoomPositions((p) => ({ ...p, [id]: next }));
      },
      onPanResponderRelease: () => {
        draggingRoomId.current = null;
      },
    });
  }, [isEditMode, roomsToRender, roomPositions]);

  const renderRoom = (room: RoomData | any) => {
    const isSelected = selectedRoom === room.id;
    const isHovered = hoveredRoom === room.id;
    const fillColor = isSelected
      ? colors.primary
      : isHovered
      ? room.color + 'CC'
      : room.color;

    const offset = roomPositions[room.id] || { x: 0, y: 0 };
    const center = getPathCenter(room.path);

    // Find the full room object for editing
    const fullRoom = combinedRooms.find(r => r.id === room.id);

    return (
      <G
        key={room.id}
        transform={`translate(${offset.x}, ${offset.y})`}
        {...(isEditMode && Platform.OS !== 'web' ? panResponder.panHandlers : {})}
      >
        <Path
          d={room.path}
          fill={fillColor}
          stroke={isSelected ? colors.primary : '#ffffff'}
          strokeWidth={isSelected ? 3 : 1.5}
          opacity={isHovered || isSelected ? 1 : 0.85}
          onPress={() => {
            if (isEditMode && fullRoom) {
              // In edit mode, open edit modal
              openEditRoomModal(fullRoom);
            } else {
              onRoomSelect(room.id);
            }
          }}
          {...(Platform.OS !== 'web' && isEditMode ? {
            onLongPress: () => {
              // On mobile, long press in edit mode starts dragging
              draggingRoomId.current = room.id;
            },
          } : {})}
        />
        {/* Room Labels - positioned with small offset to ensure visibility inside room */}
        <SvgText
          x={center.x}
          y={center.y - 2}
          fill={isSelected ? 'white' : '#000000'}
          fontSize={11}
          fontWeight={700}
          textAnchor={'middle'}
          alignmentBaseline={'middle'}
          onPress={() => {
            if (isEditMode && fullRoom) {
              openEditRoomModal(fullRoom);
            } else {
              onRoomSelect(room.id);
            }
          }}
        >
          {room.name}
        </SvgText>
        {/* Edit indicator in edit mode */}
        {isEditMode && (
          <G onPress={() => fullRoom && openEditRoomModal(fullRoom)}>
            <Circle
              cx={center.x}
              cy={center.y + 12}
              r={10}
              fill="rgba(255,255,255,0.9)"
            />
            <SvgText
              x={center.x}
              y={center.y + 16}
              fill={colors.primary}
              fontSize={10}
              fontWeight={700}
              textAnchor={'middle'}
              alignmentBaseline={'middle'}
            >
              ✎
            </SvgText>
          </G>
        )}
      </G>
    );
  };

  const handleSaveLayout = async () => {
    if (onLayoutUpdate) {
      onLayoutUpdate(roomPositions);
      Alert.alert('Success', 'Floor plan layout saved');
    }
    setIsEditMode(false);
  };

  const handleCancelEdit = () => {
    setRoomPositions({});
    setIsEditMode(false);
  };

  const handleAddRoom = () => {
    setIsAddModalVisible(true);
  };

  const resetModalState = () => {
    setIsAddModalVisible(false);
    setNewRoomName('');
    setNewRoomImage('');
    setNewRoomTemperature('22');
    setNewRoomHumidity('55');
    setNewRoomLights('1');
    setNewRoomColor(COLOR_PALETTE[0]);
  };

  // Open edit room modal with room data populated
  const openEditRoomModal = (room: Room) => {
    setEditingRoom(room);
    setEditRoomName(room.name);
    setEditRoomImage(room.image || '');
    // Get current color from roomVisuals or use default
    const currentVisual = roomVisuals[room.id];
    setEditRoomColor(currentVisual?.color || COLOR_PALETTE[0]);
    setIsEditRoomModalVisible(true);
  };

  // Reset edit room modal state
  const resetEditModalState = () => {
    setIsEditRoomModalVisible(false);
    setEditingRoom(null);
    setEditRoomName('');
    setEditRoomImage('');
    setEditRoomColor(COLOR_PALETTE[0]);
  };

  // Handle saving room edits
  const handleSaveRoomEdit = () => {
    if (!editingRoom) return;
    
    const trimmedName = editRoomName.trim() || editingRoom.name;
    
    // Update local rooms if this was a locally created room
    setLocalRooms((prev) => 
      prev.map((r) => 
        r.id === editingRoom.id 
          ? { ...r, name: trimmedName, image: editRoomImage || r.image }
          : r
      )
    );
    
    // Update room visuals with new color
    setRoomVisuals((prev) => ({
      ...prev,
      [editingRoom.id]: {
        ...prev[editingRoom.id],
        color: editRoomColor,
      },
    }));
    
    // TODO: If there's an API update callback, call it here
    // For now, we save locally and let the layout save handle persistence
    
    resetEditModalState();
    Alert.alert('Room Updated', `${trimmedName} has been updated.`);
  };

  const handleCreateRoom = async () => {
    const trimmedName = newRoomName.trim() || `Room ${combinedRooms.length + 1}`;
    const tempId = `room_${Date.now()}`;
    const visualIndex = Object.keys(roomVisuals).length + 1;
    const chosenColor = newRoomColor || pickAccentColor(visualIndex);
    const visual = {
      color: chosenColor,
      path: createDefaultRoomPath(visualIndex),
    };

    const newRoom: Room = {
      id: tempId,
      name: trimmedName,
      temperature: Number(newRoomTemperature) || 22,
      humidity: Number(newRoomHumidity) || 55,
      lights: Number(newRoomLights) || 1,
      devices: [],
      scene: '', // Empty string - will be converted to null by backend
      power: '0.0kW',
      image: (newRoomImage || '').trim() || DEFAULT_ROOM_IMAGE,
      accentColor: visual.color,
      layoutPath: visual.path,
    };

    let roomToAdd: Room = newRoom;
    try {
      const maybeCreated = await onRoomCreate?.(newRoom);
      if (maybeCreated && typeof (maybeCreated as any).id === 'string') {
        roomToAdd = maybeCreated as Room;
      }
    } catch (error) {
      console.error('[FloorPlan] Unable to persist new room:', error);
    }

    setLocalRooms((prev) => [...prev, roomToAdd]);
    setRoomVisuals((prev) => ({ ...prev, [roomToAdd.id]: visual }));
    setRoomPositions((prev) => ({ ...prev, [roomToAdd.id]: { x: 0, y: 0 } }));
    resetModalState();
    Alert.alert('Room added', `${trimmedName} was added to your floor plan.`);
  };

  useImperativeHandle(
    ref,
    () => ({
      enterEditMode: () => setIsEditMode(true),
      exitEditMode: handleCancelEdit,
      toggleEditMode: () => setIsEditMode((prev) => !prev),
      saveLayout: handleSaveLayout,
      openAddRoomModal: handleAddRoom,
      isEditMode,
    }),
    [handleCancelEdit, handleSaveLayout, isEditMode],
  );

  useEffect(() => {
    onEditModeChange?.(isEditMode);
  }, [isEditMode, onEditModeChange]);

  return (
    <View style={styles.container}>
      {showToolbar && (
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Interactive Floor Plan</Text>
            <Text style={styles.subtitle}>
              {isEditMode ? 'Drag rooms to reposition' : 'Tap any room to view details'}
            </Text>
          </View>
          <View style={styles.headerActions}>
            {headerExtras ? (
              <View style={styles.headerExtras}>{headerExtras}</View>
            ) : null}
            <Pressable style={styles.addRoomButton} onPress={handleAddRoom}>
              <Plus size={14} color={colors.primary} />
              <Text style={styles.addRoomButtonText}>New Room</Text>
            </Pressable>
            {!isEditMode ? (
              <Pressable
                style={styles.editButton}
                onPress={() => setIsEditMode(true)}
              >
                <Edit2 size={16} color={colors.primary} />
                <Text style={styles.editButtonText}>Edit</Text>
              </Pressable>
            ) : (
              <View style={styles.editActions}>
                <Pressable
                  style={[styles.editButton, styles.cancelButton]}
                  onPress={handleCancelEdit}
                >
                  <X size={16} color={colors.destructive || '#ef4444'} />
                </Pressable>
                <Pressable
                  style={[styles.editButton, styles.saveButton]}
                  onPress={handleSaveLayout}
                >
                  <Save size={16} color="white" />
                  <Text style={[styles.editButtonText, styles.saveButtonText]}>Save</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      )}

      <View style={styles.floorPlanContainer}>
        {roomsToRender.length === 0 && homeId ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.lg, width: '100%' }}>
            <Text style={{ fontSize: 16, color: colors.mutedForeground, marginBottom: spacing.sm }}>
              No rooms yet
            </Text>
            <Text style={{ fontSize: 12, color: colors.mutedForeground, textAlign: 'center' }}>
              Create your first room to get started
            </Text>
          </View>
        ) : (
          <Svg
            width={SVG_WIDTH * SCALE}
            height={SVG_HEIGHT * SCALE}
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          >
            {/* Grid Background */}
            <Path
              d="M0,0 L500,0 L500,500 L0,500 Z"
              fill={colors.secondary}
              opacity={0.3}
            />

            {/* Render all rooms */}
            {roomsToRender.map(renderRoom)}
          </Svg>
        )}
      </View>

      {/* Selected Room Info */}
      {selectedRoom && showSelectedRoomInfo && (() => {
        const roomData = combinedRooms.find(r => r.id === selectedRoom) || roomsData[selectedRoom];
        if (!roomData) return null;
        const roomImage = roomData.image || roomsData[selectedRoom]?.image || DEFAULT_ROOM_IMAGE;
        const fallbackVisual = roomVisuals[selectedRoom];
        const accentColor = (roomData as Room)?.accentColor
          || fallbackVisual?.color
          || roomsData[selectedRoom]?.color
          || colors.primary;
        const colorLabel = typeof accentColor === 'string' ? accentColor.toUpperCase() : accentColor;
        const devicesCount = Array.isArray((roomData as Room)?.devices)
          ? (roomData as Room).devices.length
          : Number(roomData.devices) || 0;
        const metrics = [
          { id: 'temp', icon: Thermometer, label: 'Temperature', value: `${roomData.temperature ?? '--'}°C` },
          { id: 'humidity', icon: Droplets, label: 'Humidity', value: `${roomData.humidity ?? '--'}%` },
          { id: 'lights', icon: Lightbulb, label: 'Lighting', value: `${roomData.lights ?? 0} lights` },
          { id: 'power', icon: Zap, label: 'Consumption', value: roomData.power || roomsData[selectedRoom]?.power || '0kW' },
        ];

        return (
          <View style={styles.roomInfo}>
            <View style={styles.roomHero}>
              <Image source={{ uri: roomImage }} style={styles.roomHeroImage} resizeMode="cover" />
              <LinearGradient
                colors={[accentColor + 'AA', 'rgba(0,0,0,0.6)']}
                style={styles.roomHeroOverlay}
              />
              <View style={styles.roomHeroContent}>
                <View>
                  <Text style={styles.roomScene}>{roomData.sceneName || 'No Scene'}</Text>
                  <Text style={styles.roomName}>{roomData.name}</Text>
                </View>
                <View style={styles.roomColorTag}>
                  <View style={[styles.roomColorDot, { backgroundColor: accentColor }]} />
                  <Text style={styles.roomColorText}>{colorLabel}</Text>
                </View>
              </View>
            </View>
            <View style={styles.roomPreviewBody}>
              <View style={styles.roomMetricsGrid}>
                {metrics.map(({ id, icon: Icon, value, label }) => (
                  <View key={id} style={styles.metricCard}>
                    <Icon size={16} color={accentColor} />
                    <Text style={styles.metricValue}>{value}</Text>
                    <Text style={styles.metricLabel}>{label}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.roomFooter}>
                <View style={styles.deviceSummary}>
                  <Text style={styles.deviceSummaryLabel}>Devices ready</Text>
                  <Text style={styles.deviceSummaryValue}>{devicesCount}</Text>
                </View>
                <Pressable
                  style={styles.detailsButton}
                  onPress={() => onRoomSelect(selectedRoom)}
                >
                  <Text style={styles.detailsButtonText}>View Details</Text>
                </Pressable>
              </View>
            </View>
          </View>
        );
      })()}

      <Modal
        visible={isAddModalVisible}
        transparent
        animationType="slide"
        onRequestClose={resetModalState}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create Room</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Room name"
              placeholderTextColor={colors.mutedForeground}
              value={newRoomName}
              onChangeText={setNewRoomName}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Image URL (optional)"
              placeholderTextColor={colors.mutedForeground}
              value={newRoomImage}
              onChangeText={setNewRoomImage}
            />
            <View style={styles.modalRow}>
              <TextInput
                style={[styles.modalInput, styles.modalInputSmall]}
                placeholder="Temp °C"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                value={newRoomTemperature}
                onChangeText={setNewRoomTemperature}
              />
              <TextInput
                style={[styles.modalInput, styles.modalInputSmall]}
                placeholder="Humidity %"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                value={newRoomHumidity}
                onChangeText={setNewRoomHumidity}
              />
              <TextInput
                style={[styles.modalInput, styles.modalInputSmall]}
                placeholder="Lights"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                value={newRoomLights}
                onChangeText={setNewRoomLights}
              />
            </View>
            <Text style={styles.modalLabel}>Room color</Text>
            <View style={styles.colorOptionsRow}>
              {COLOR_PALETTE.map((color) => (
                <Pressable
                  key={color}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color },
                    newRoomColor === color && styles.colorSwatchSelected,
                  ]}
                  onPress={() => setNewRoomColor(color)}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${color} for room color`}
                >
                  {newRoomColor === color ? <View style={styles.colorSwatchIndicator} /> : null}
                </Pressable>
              ))}
            </View>
            <View style={styles.modalActions}>
              <Pressable style={styles.modalButtonSecondary} onPress={resetModalState}>
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalButtonPrimary} onPress={handleCreateRoom}>
                <Text style={styles.modalButtonPrimaryText}>Add Room</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Room Modal */}
      <Modal
        visible={isEditRoomModalVisible}
        transparent
        animationType="slide"
        onRequestClose={resetEditModalState}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Room</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Room name"
              placeholderTextColor={colors.mutedForeground}
              value={editRoomName}
              onChangeText={setEditRoomName}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Image URL (optional)"
              placeholderTextColor={colors.mutedForeground}
              value={editRoomImage}
              onChangeText={setEditRoomImage}
            />
            <Text style={styles.modalLabel}>Room color</Text>
            <View style={styles.colorOptionsRow}>
              {COLOR_PALETTE.map((color) => (
                <Pressable
                  key={color}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color },
                    editRoomColor === color && styles.colorSwatchSelected,
                  ]}
                  onPress={() => setEditRoomColor(color)}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${color} for room color`}
                >
                  {editRoomColor === color ? <View style={styles.colorSwatchIndicator} /> : null}
                </Pressable>
              ))}
            </View>
            <View style={styles.modalActions}>
              <Pressable style={styles.modalButtonSecondary} onPress={resetEditModalState}>
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalButtonPrimary} onPress={handleSaveRoomEdit}>
                <Text style={styles.modalButtonPrimaryText}>Save Changes</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
});

export default InteractiveFloorPlan;

// Helper function to get center of SVG path - calculates centroid of all path points
function getPathCenter(path: string): { x: number; y: number } {
  // Extract all coordinate pairs from the path
  const coordMatches = path.match(/[MLml]\s*(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/g);
  if (!coordMatches || coordMatches.length === 0) {
    // Fallback to simple number extraction
    const nums = path.match(/[0-9]+/g)?.map(Number);
    if (!nums || nums.length < 4) return { x: 0, y: 0 };
    const x = (nums[0] + nums[2]) / 2;
    const y = (nums[1] + nums[3]) / 2;
    return { x, y };
  }
  
  // Parse all x,y pairs and calculate bounding box center
  const points: { x: number; y: number }[] = [];
  coordMatches.forEach(match => {
    const nums = match.match(/-?\d+(?:\.\d+)?/g);
    if (nums && nums.length >= 2) {
      points.push({ x: parseFloat(nums[0]), y: parseFloat(nums[1]) });
    }
  });
  
  if (points.length === 0) return { x: 0, y: 0 };
  
  // Calculate bounding box center (more reliable than centroid for UI positioning)
  const minX = Math.min(...points.map(p => p.x));
  const maxX = Math.max(...points.map(p => p.x));
  const minY = Math.min(...points.map(p => p.y));
  const maxY = Math.max(...points.map(p => p.y));
  
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
}

const createStyles = (colors: ThemeColors = defaultColors) => StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  headerExtras: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginBottom: spacing.md,
  },
  floorPlanContainer: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.xxl,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primary,
    minWidth: 120,
    justifyContent: 'center',
  },
  editButtonText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  editActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  addRoomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.muted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    minWidth: 120,
    justifyContent: 'center',
  },
  addRoomButtonText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: colors.secondary,
    borderColor: colors.destructive || '#ef4444',
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    minWidth: 120,
    justifyContent: 'center',
  },
  saveButtonText: {
    color: 'white',
  },
  roomInfo: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.xl,
    marginTop: spacing.lg,
    overflow: 'hidden',
  },
  roomHero: {
    height: 200,
    overflow: 'hidden',
    backgroundColor: colors.muted,
  },
  roomHeroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  roomHeroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  roomHeroContent: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  roomName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  roomScene: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  roomColorTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  roomColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  roomColorText: {
    fontSize: 11,
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  roomPreviewBody: {
    padding: spacing.md,
    gap: spacing.md,
  },
  roomMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metricCard: {
    flexBasis: '48%',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    gap: 2,
    borderWidth: 1,
    borderColor: colors.muted,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.foreground,
  },
  metricLabel: {
    fontSize: 11,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  roomFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deviceSummary: {
    gap: 2,
  },
  deviceSummaryLabel: {
    fontSize: 11,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  deviceSummaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.foreground,
  },
  detailsButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  detailsButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground,
  },
  modalInput: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.foreground,
    borderWidth: 1,
    borderColor: colors.muted,
  },
  modalRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  colorOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  colorSwatchSelected: {
    borderColor: colors.foreground,
    shadowColor: colors.foreground,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  colorSwatchIndicator: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'white',
  },
  modalInputSmall: {
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  modalButtonSecondary: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonSecondaryText: {
    color: colors.foreground,
    fontWeight: '600',
  },
  modalButtonPrimary: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonPrimaryText: {
    color: 'white',
    fontWeight: '600',
  },
});

const DEFAULT_ROOM_IMAGE = 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=600';
const COLOR_PALETTE = ['#C4B5F5', '#FFA07A', '#FFCB8F', '#FFB6A0', '#FFB6D4', '#B8A9D8', '#FFE5B4'];

function pickAccentColor(index: number) {
  return COLOR_PALETTE[index % COLOR_PALETTE.length];
}

function createDefaultRoomPath(index: number) {
  const size = 80;
  const padding = 40;
  const columns = 3;
  const maxRows = Math.max(1, Math.floor((SVG_HEIGHT - padding * 2) / (size + padding)));
  const col = index % columns;
  const row = Math.floor(index / columns);
  const clampedRow = row % maxRows;
  const stackOffset = Math.floor(row / maxRows) * 12;
  const startX = padding + col * (size + padding);
  const startY = padding + clampedRow * (size + padding) + stackOffset;
  return `M ${startX} ${startY} L ${startX + size} ${startY} L ${startX + size} ${startY + size} L ${startX} ${startY + size} Z`;
}
