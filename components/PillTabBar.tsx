import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ClipboardCheck, House, Settings2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Radii, Spacing } from '@/constants/theme';

export type PillTabBarProps = {
  activeTab: 'index' | 'completed' | 'settings';
  onTabPress: (tab: 'index' | 'completed' | 'settings') => void;
  onLayout?: (height: number) => void;
};

export const PillTabBar = ({ activeTab, onTabPress, onLayout }: PillTabBarProps) => {
  const insets = useSafeAreaInsets();
  
  // Safe area bottom or minimum padding
  const bottomPadding = Math.max(insets.bottom, Spacing.md);

  return (
    <View 
      style={[styles.wrapper, { paddingBottom: bottomPadding }]}
      onLayout={(e) => {
        // Report total height including padding to consumers
        onLayout?.(e.nativeEvent.layout.height);
      }}
      pointerEvents="box-none"
    >
      <View style={styles.container}>
        <TabItem 
          tab="index" 
          active={activeTab === 'index'} 
          onPress={() => {
            if (activeTab !== 'index') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onTabPress('index');
            }
          }}
        />
        <TabItem 
          tab="completed" 
          active={activeTab === 'completed'} 
          onPress={() => {
            if (activeTab !== 'completed') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onTabPress('completed');
            }
          }}
        />
        <TabItem 
          tab="settings" 
          active={activeTab === 'settings'} 
          onPress={() => {
            if (activeTab !== 'settings') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onTabPress('settings');
            }
          }}
        />
      </View>
    </View>
  );
};

const TabItem = ({ tab, active, onPress }: { tab: 'index' | 'completed' | 'settings', active: boolean, onPress: () => void }) => {
  const Icon = tab === 'index' ? House : tab === 'completed' ? ClipboardCheck : tab === 'settings' ? Settings2 : House;
  
  const animatedBgStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(active ? 1 : 0, { duration: 250 }),
      transform: [
        { scale: withTiming(active ? 1 : 0.85, { duration: 250 }) }
      ],
    };
  });

  return (
    <Pressable style={styles.tabItem} onPress={onPress}>
      <Animated.View style={[styles.activeBg, animatedBgStyle]} />
      <Icon 
        size={24} 
        color={active ? Colors.light.white : Colors.light.textDim} 
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    zIndex: 100,
  },
  container: {
    flexDirection: 'row',
    height: 64,
    borderRadius: Radii.round,
    backgroundColor: Colors.light.surface,
    padding: Spacing.xs,
    // shadow
    ...Platform.select({
      web: { boxShadow: '0px 8px 24px rgba(14, 26, 42, 0.12)' },
      default: {
        shadowColor: 'rgb(14, 26, 42)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
        elevation: 10,
      },
    }),
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.light.primary,
    borderRadius: Radii.round,
  },
});
