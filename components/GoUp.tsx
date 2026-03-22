import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronUp } from 'lucide-react-native';
import { Colors } from '@/constants/theme';

export type GoUpProps = {
  onScrollToTop: () => void;
  bottomOffset?: number;
};

export const GoUp = ({ onScrollToTop, bottomOffset }: GoUpProps) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { bottom: bottomOffset ?? (insets.bottom + 90) }]}>
      <Pressable style={styles.primaryButton} onPress={onScrollToTop}>
        <ChevronUp size={24} color={Colors.light.white} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 12,
    alignItems: 'center',
    zIndex: 50,
  },
  primaryButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    // shadow
    ...Platform.select({
      web: { boxShadow: '0px 8px 16px rgba(14, 26, 42, 0.4)' },
      default: {
        shadowColor: 'rgb(29, 39, 51)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 8,
      },
    }),
  },
});
