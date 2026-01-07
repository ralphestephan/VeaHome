import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop, Path } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../constants/theme';

interface CircularThermostatProps {
    temperature: number;
    minTemp?: number;
    maxTemp?: number;
    mode: 'cool' | 'heat' | 'auto';
    radius?: number;
}

export default function CircularThermostat({
    temperature,
    minTemp = 16,
    maxTemp = 30,
    mode,
    radius = 120,
}: CircularThermostatProps) {
    const { colors } = useTheme();

    // Calculate stroke properties
    const strokeWidth = 24;
    const innerRadius = radius - strokeWidth / 2;
    const circumference = 2 * Math.PI * innerRadius;

    // Calculate progress
    // Map temperature to a percentage of the circle (0.75 of the circle, open at bottom)
    const range = maxTemp - minTemp;
    const progress = Math.min(Math.max((temperature - minTemp) / range, 0), 1);
    const arcLength = 0.75 * circumference;
    const dashOffset = circumference - (progress * arcLength);

    // Rotation to position the gap at the bottom
    const rotation = 135; // Start from bottom-left

    const getModeColor = () => {
        switch (mode) {
            case 'heat': return colors.destructive; // or neonPink
            case 'auto': return colors.success;
            case 'cool':
            default: return colors.neonBlue;
        }
    };

    const activeColor = getModeColor();

    return (
        <View style={[styles.container, { width: radius * 2, height: radius * 2 }]}>
            <Svg width={radius * 2} height={radius * 2} viewBox={`0 0 ${radius * 2} ${radius * 2}`}>
                <Defs>
                    <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0" stopColor={activeColor} stopOpacity="1" />
                        <Stop offset="1" stopColor={colors.primary} stopOpacity="1" />
                    </LinearGradient>
                </Defs>

                {/* Background Track */}
                <Circle
                    cx={radius}
                    cy={radius}
                    r={innerRadius}
                    stroke={colors.cardAlt}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${arcLength} ${circumference}`}
                    strokeLinecap="round"
                    rotation={rotation}
                    origin={`${radius}, ${radius}`}
                    fill="none"
                />

                {/* Active Progress */}
                <Circle
                    cx={radius}
                    cy={radius}
                    r={innerRadius}
                    stroke="url(#grad)"
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${arcLength} ${circumference}`}
                    strokeDashoffset={circumference - (progress * arcLength) - (circumference - arcLength)}
                    strokeLinecap="round"
                    rotation={rotation}
                    origin={`${radius}, ${radius}`}
                    fill="none"
                />

                {/* Inner Glow Circle */}
                <Circle
                    cx={radius}
                    cy={radius}
                    r={innerRadius - 20}
                    stroke={activeColor}
                    strokeWidth={1}
                    strokeOpacity={0.2}
                    fill="none"
                />
            </Svg>

            {/* Center Content */}
            <View style={styles.centerContent}>
                <Text style={[styles.temperature, { color: 'white' }]}>
                    {Math.round(temperature)}
                </Text>

                <View style={styles.rangeContainer}>
                    <Text style={styles.rangeText}>{minTemp}</Text>
                    <Text style={styles.rangeText}> - </Text>
                    <Text style={styles.rangeText}>{maxTemp}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    centerContent: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
    temperature: {
        fontSize: 64,
        fontWeight: 'bold',
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    rangeContainer: {
        flexDirection: 'row',
        marginTop: 4,
        opacity: 0.6,
    },
    rangeText: {
        color: 'white',
        fontSize: 14,
    }
});
