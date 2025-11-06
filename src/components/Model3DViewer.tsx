import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors, spacing, borderRadius } from '../constants/theme';

interface Model3DViewerProps {
  modelUrl: string;
  onError?: (error: string) => void;
}

export default function Model3DViewer({ modelUrl, onError }: Model3DViewerProps) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const handleLoadEnd = () => {
    setLoading(false);
  };

  const handleError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    const errorMsg = nativeEvent?.description || 'Failed to load 3D model';
    setError(errorMsg);
    setLoading(false);
    onError?.(errorMsg);
  };

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load 3D model</Text>
          <Text style={styles.errorDetails}>{error}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading 3D model...</Text>
        </View>
      )}
      <WebView
        source={{ uri: modelUrl }}
        style={styles.webview}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    zIndex: 1,
    gap: spacing.md,
  },
  loadingText: {
    color: colors.mutedForeground,
    fontSize: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  errorText: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorDetails: {
    color: colors.mutedForeground,
    fontSize: 12,
    textAlign: 'center',
  },
});



