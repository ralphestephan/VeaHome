import React, { useRef, useCallback } from 'react';
import {
  TouchableOpacity,
  Animated,
  StyleProp,
  ViewStyle,
  TouchableOpacityProps,
} from 'react-native';
import { animations } from '../../constants/theme';

interface AnimatedPressableProps extends TouchableOpacityProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleValue?: number;
  disabled?: boolean;
}

/**
 * AnimatedPressable - A touchable component with scale animation on press
 * Provides smooth, subtle feedback for all interactive elements
 */
export default function AnimatedPressable({
  children,
  style,
  scaleValue = 0.97,
  disabled = false,
  onPressIn,
  onPressOut,
  ...props
}: AnimatedPressableProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(
    (e: any) => {
      Animated.spring(scaleAnim, {
        toValue: scaleValue,
        useNativeDriver: true,
        damping: animations.spring.damping,
        stiffness: animations.spring.stiffness,
      }).start();
      onPressIn?.(e);
    },
    [scaleAnim, scaleValue, onPressIn]
  );

  const handlePressOut = useCallback(
    (e: any) => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: animations.spring.damping,
        stiffness: animations.spring.stiffness,
      }).start();
      onPressOut?.(e);
    },
    [scaleAnim, onPressOut]
  );

  return (
    <TouchableOpacity
      activeOpacity={1}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...props}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [{ scale: scaleAnim }],
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}
