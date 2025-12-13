import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { colors, borderRadius, spacing } from '../constants/theme';

export type ToastType = 'success' | 'error' | 'info';

type ToastOptions = {
  type?: ToastType;
  duration?: number;
};

type ToastRecord = {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
};

type ToastContextValue = {
  showToast: (message: string, options?: ToastOptions) => void;
};

const ToastContext = createContext<ToastContextValue>({
  showToast: () => undefined,
});

const typeStyles: Record<ToastType, { bg: string; text: string }> = {
  success: { bg: '#1f5d48', text: '#c6ffe2' },
  error: { bg: '#5d1f2a', text: '#ffd6da' },
  info: { bg: '#1c2f57', text: '#d2e1ff' },
};

export const ToastProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [queue, setQueue] = useState<ToastRecord[]>([]);

  const removeToast = useCallback((id: string) => {
    setQueue((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, options?: ToastOptions) => {
    setQueue((prev) => {
      const next: ToastRecord = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        message,
        type: options?.type || 'info',
        duration: Math.max(2000, options?.duration || 3500),
      };
      return [...prev, next];
    });
  }, []);

  const contextValue = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <View pointerEvents="none" style={styles.toastContainer}>
        {queue.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onHide={() => removeToast(toast.id)} />
        ))}
      </View>
    </ToastContext.Provider>
  );
};

type ToastItemProps = {
  toast: ToastRecord;
  onHide: () => void;
};

const ToastItem: React.FC<ToastItemProps> = ({ toast, onHide }) => {
  const translateY = useRef(new Animated.Value(32)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 16,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) onHide();
      });
    }, toast.duration);

    return () => clearTimeout(timeout);
  }, [toast.duration, onHide, opacity, translateY]);

  const palette = typeStyles[toast.type];

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: palette.bg,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <Text style={[styles.toastText, { color: palette.text }]}>{toast.message}</Text>
    </Animated.View>
  );
};

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
    gap: spacing.sm,
  },
  toast: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  toastText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
