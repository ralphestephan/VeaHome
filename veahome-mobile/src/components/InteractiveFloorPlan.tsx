import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert, PanResponder, GestureResponderEvent, PanResponderGestureState } from 'react-native';
import Svg, { Path, G, Text as SvgText } from 'react-native-svg';
import { Thermometer, Droplets, Lightbulb, Zap, Edit2, Save, X } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../constants/theme';
import { roomsData, RoomData } from '../constants/rooms';
import { Room } from '../types';

interface InteractiveFloorPlanProps {
  onRoomSelect: (roomId: string) => void;
  selectedRoom?: string;
  rooms?: Room[]; // Real rooms from API (optional - falls back to roomsData)
  onLayoutUpdate?: (layout: any) => void; // Callback to save layout changes
  homeId?: string; // For saving layout to API
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SVG_WIDTH = 500;
const SVG_HEIGHT = 500;
const SCALE = (SCREEN_WIDTH - 48) / SVG_WIDTH;

export default function InteractiveFloorPlan({
  onRoomSelect,
  selectedRoom,
  rooms,
  onLayoutUpdate,
  homeId,
}: InteractiveFloorPlanProps) {
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [roomPositions, setRoomPositions] = useState<Record<string, { x: number; y: number }>>({});
  const draggingRoomId = useRef<string | null>(null);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const panResponder = useMemo(() =>
    PanResponder.create({
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
    }),
  [isEditMode, roomsToRender, roomPositions]);

  // Use real rooms if provided, otherwise fallback to roomsData
  const roomsToRender = rooms && rooms.length > 0
    ? rooms.map(r => ({
        id: r.id,
        name: r.name,
        color: roomsData[r.id]?.color || colors.primary,
        path: roomsData[r.id]?.path || 'M 0 0 L 100 0 L 100 100 L 0 100 Z',
        temperature: r.temperature,
        humidity: r.humidity,
        lights: r.lights,
        power: r.power,
        scene: r.scene,
      }))
    : Object.values(roomsData);

  const renderRoom = (room: RoomData | any) => {
    const isSelected = selectedRoom === room.id;
    const isHovered = hoveredRoom === room.id;
    const fillColor = isSelected
      ? colors.primary
      : isHovered
      ? room.color + 'CC'
      : room.color;

    const offset = roomPositions[room.id] || { x: 0, y: 0 };

    return (
      <G
        key={room.id}
        transform={`translate(${offset.x}, ${offset.y})`}
        {...(isEditMode ? panResponder.panHandlers : {})}
      >
        <Path
          d={room.path}
          fill={fillColor}
          stroke={isSelected ? colors.primary : '#ffffff'}
          strokeWidth={isSelected ? 3 : 1.5}
          opacity={isHovered || isSelected ? 1 : 0.85}
          onPress={() => onRoomSelect(room.id)}
          onPressIn={() => { if (isEditMode) draggingRoomId.current = room.id; }}
        />
        {/* Room Labels */}
        <SvgText
          x={getPathCenter(room.path).x}
          y={getPathCenter(room.path).y}
          fill={isSelected ? 'white' : '#000000'}
          fontSize={12}
          fontWeight={600}
          textAnchor={'middle'}
          alignmentBaseline={'middle'}
        >
          {room.name}
        </SvgText>
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Interactive Floor Plan</Text>
          <Text style={styles.subtitle}>
            {isEditMode ? 'Drag rooms to reposition' : 'Tap any room to view details'}
          </Text>
        </View>
        {!isEditMode ? (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setIsEditMode(true)}
          >
            <Edit2 size={16} color={colors.primary} />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.editActions}>
            <TouchableOpacity
              style={[styles.editButton, styles.cancelButton]}
              onPress={handleCancelEdit}
            >
              <X size={16} color={colors.destructive || '#ef4444'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.editButton, styles.saveButton]}
              onPress={handleSaveLayout}
            >
              <Save size={16} color="white" />
              <Text style={[styles.editButtonText, styles.saveButtonText]}>Save</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.floorPlanContainer}>
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
      </View>

      {/* Selected Room Info */}
      {selectedRoom && (() => {
        const roomData = rooms?.find(r => r.id === selectedRoom) || roomsData[selectedRoom];
        if (!roomData) return null;
        return (
            <View style={styles.roomInfo}>
              <View style={styles.roomInfoHeader}>
                <View>
                  <Text style={styles.roomName}>
                    {roomData.name}
                  </Text>
                  <Text style={styles.roomScene}>
                    {roomData.scene || 'No scene'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.detailsButton}
                  onPress={() => onRoomSelect(selectedRoom)}
                >
                  <Text style={styles.detailsButtonText}>View Details</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.roomStats}>
                <View style={styles.statItem}>
                  <Thermometer
                    size={16}
                    color={colors.primary}
                  />
                  <Text style={styles.statText}>
                    {roomData.temperature}°C
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Droplets
                    size={16}
                    color={colors.primary}
                  />
                  <Text style={styles.statText}>
                    {roomData.humidity}%
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Lightbulb
                    size={16}
                    color={colors.primary}
                  />
                  <Text style={styles.statText}>
                    {roomData.lights || 0} lights
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Zap
                    size={16}
                    color={colors.primary}
                  />
                  <Text style={styles.statText}>
                    {roomData.power || '0kW'}
                  </Text>
                </View>
              </View>
            </View>
        );
      })()}
    </View>
  );
}

// Helper function to get center of SVG path
function getPathCenter(path: string): { x: number; y: number } {
  const matches = path.match(/[0-9]+/g);
  if (!matches || matches.length < 4) return { x: 0, y: 0 };
  
  const nums = matches.map(Number);
  const x = (nums[0] + nums[2]) / 2;
  const y = (nums[1] + nums[3]) / 2;
  return { x, y };
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
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
    alignItems: 'center',
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
  },
  editButtonText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelButton: {
    backgroundColor: colors.secondary,
    borderColor: colors.destructive || '#ef4444',
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  saveButtonText: {
    color: 'white',
  },
  roomInfo: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  roomInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  roomName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground,
  },
  roomScene: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 2,
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
  roomStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.muted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  statText: {
    fontSize: 11,
    color: colors.foreground,
  },
});
