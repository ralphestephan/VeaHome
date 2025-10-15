import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Svg, { Path, G, Text as SvgText } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../constants/theme';
import { roomsData, RoomData } from '../constants/rooms';

interface InteractiveFloorPlanProps {
  onRoomSelect: (roomId: string) => void;
  selectedRoom?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SVG_WIDTH = 500;
const SVG_HEIGHT = 500;
const SCALE = (SCREEN_WIDTH - 48) / SVG_WIDTH;

export default function InteractiveFloorPlan({
  onRoomSelect,
  selectedRoom,
}: InteractiveFloorPlanProps) {
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);

  const renderRoom = (room: RoomData) => {
    const isSelected = selectedRoom === room.id;
    const isHovered = hoveredRoom === room.id;
    const fillColor = isSelected
      ? colors.primary
      : isHovered
      ? room.color + 'CC'
      : room.color;

    return (
      <G key={room.id}>
        <Path
          d={room.path}
          fill={fillColor}
          stroke={isSelected ? colors.primary : '#ffffff'}
          strokeWidth={isSelected ? 3 : 1.5}
          opacity={isHovered || isSelected ? 1 : 0.85}
          onPress={() => onRoomSelect(room.id)}
        />
        {/* Room Labels */}
        <SvgText
          x={getPathCenter(room.path).x}
          y={getPathCenter(room.path).y}
          fill={isSelected ? 'white' : '#000000'}
          fontSize=\"12\"
          fontWeight=\"600\"
          textAnchor=\"middle\"
          alignmentBaseline=\"middle\"
        >
          {room.name}
        </SvgText>
      </G>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Interactive Floor Plan</Text>
      <Text style={styles.subtitle}>Tap any room to view details</Text>

      <View style={styles.floorPlanContainer}>
        <Svg
          width={SVG_WIDTH * SCALE}
          height={SVG_HEIGHT * SCALE}
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        >
          {/* Grid Background */}
          <Path
            d=\"M0,0 L500,0 L500,500 L0,500 Z\"
            fill={colors.secondary}
            opacity={0.3}
          />

          {/* Render all rooms */}
          {Object.values(roomsData).map(renderRoom)}
        </Svg>
      </View>

      {/* Selected Room Info */}
      {selectedRoom && roomsData[selectedRoom] && (
        <View style={styles.roomInfo}>
          <View style={styles.roomInfoHeader}>
            <View>
              <Text style={styles.roomName}>
                {roomsData[selectedRoom].name}
              </Text>
              <Text style={styles.roomScene}>
                {roomsData[selectedRoom].scene}
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
              <MaterialCommunityIcons
                name=\"thermometer\"
                size={16}
                color={colors.primary}
              />
              <Text style={styles.statText}>
                {roomsData[selectedRoom].temperature}°C
              </Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons
                name=\"water-percent\"
                size={16}
                color={colors.primary}
              />
              <Text style={styles.statText}>
                {roomsData[selectedRoom].humidity}%
              </Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons
                name=\"lightbulb\"
                size={16}
                color={colors.primary}
              />
              <Text style={styles.statText}>
                {roomsData[selectedRoom].lights} lights
              </Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons
                name=\"lightning-bolt\"
                size={16}
                color={colors.primary}
              />
              <Text style={styles.statText}>
                {roomsData[selectedRoom].power}
              </Text>
            </View>
          </View>
        </View>
      )}
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
