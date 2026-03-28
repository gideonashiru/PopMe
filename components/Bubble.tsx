import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  Platform,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { SubtaskOrbit } from '@/components/SubtaskOrbit';
import { Subtask } from '@/types/task';

export type BubbleProps = {
  title: string;
  size: number;
  colors: [string, string];
  energyLevel?: number; // 1–5, defaults to 3
  subtasks?: Subtask[];
  selected?: boolean;
  floating?: boolean;
  onPop?: () => void;
  onPress?: () => void;
  /** Needle mode pop — satisfying burst animation, then callback. */
  onNeedlePop?: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * Visual bubble component using Reanimated v4 for UI-thread animations.
 *
 * Animations:
 * - **Appear**: scale from 0.6 → 1 with spring
 * - **Float**: gentle vertical bob (±8px) using withRepeat
 * - **Pop**: shrink to 0.2 + fade out on long-press
 * - **Size change**: smooth transition when priority changes
 */
export const Bubble = ({
  title,
  size,
  colors,
  energyLevel = 3,
  subtasks = [],
  selected = false,
  floating = true,
  onPop,
  onPress,
  onNeedlePop,
  style,
}: BubbleProps) => {
  // --- Shared values (UI thread) ---
  const appearScale = useSharedValue(0.6);
  const floatY = useSharedValue(0);
  const animatedSize = useSharedValue(size);
  const popScale = useSharedValue(1);
  const popOpacity = useSharedValue(1);

  // Color state (kept on JS thread — color transitions are cosmetic)
  const [colorPair, setColorPair] = useState(() => ({
    from: colors as [string, string],
    to: colors as [string, string],
  }));
  const colorFadeProgress = useSharedValue(1);

  // --- Appear animation ---
  useEffect(() => {
    appearScale.value = 0.6;
    appearScale.value = withSpring(1, { damping: 12, stiffness: 90 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Float animation ---
  useEffect(() => {
    if (!floating) return;
    // Pulse duration inversely proportional to energy level (1 = 2200ms, 5 = 1000ms)
    // Plus a small random offset so they don't sync entirely
    const baseDuration = 2200 - (energyLevel - 1) * 300;
    const duration = baseDuration + Math.random() * 500;
    
    floatY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, // infinite
      true,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floating, energyLevel]);

  // --- Size animation (when priority changes) ---
  useEffect(() => {
    animatedSize.value = withTiming(size, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  // --- Color crossfade ---
  useEffect(() => {
    setColorPair((prev) => ({ from: prev.to, to: colors as [string, string] }));
    colorFadeProgress.value = 0;
    colorFadeProgress.value = withTiming(1, {
      duration: 240,
      easing: Easing.out(Easing.quad),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colors]);

  // --- Pop animation ---
  const handlePop = () => {
    if (!onPop) return;
    popScale.value = withTiming(
      0.2,
      { duration: 60, easing: Easing.in(Easing.quad) },
      (finished) => {
        // Reset values after the callback fires
        if (finished) {
          popScale.value = 1;
          popOpacity.value = 1;
        }
      },
    );
    popOpacity.value = withTiming(0, {
      duration: 60,
      easing: Easing.in(Easing.quad),
    });
    // Fire the callback after the animation duration
    setTimeout(() => onPop(), 70);
  };

  // --- Needle pop animation (satisfying burst) ---
  const handleNeedlePop = () => {
    if (!onNeedlePop) return;
    // Phase 1: scale up briefly (60ms)
    popScale.value = withTiming(
      1.15,
      { duration: 60, easing: Easing.out(Easing.quad) },
      (finished) => {
        if (!finished) return;
        // Phase 2: shrink to 0 (240ms)
        popScale.value = withTiming(0, {
          duration: 240,
          easing: Easing.in(Easing.back(1.5)),
        });
      },
    );
    // Opacity fades during phase 2
    setTimeout(() => {
      popOpacity.value = withTiming(0, {
        duration: 240,
        easing: Easing.in(Easing.quad),
      });
    }, 60);
    // Fire callback after total animation
    setTimeout(() => {
      onNeedlePop();
      // Reset in case the component is reused
      popScale.value = 1;
      popOpacity.value = 1;
    }, 310);
  };

  // --- Animated styles (run on UI thread) ---
  const bubbleAnimatedStyle = useAnimatedStyle(() => {
    const s = animatedSize.value;
    return {
      width: s,
      height: s,
      borderRadius: s / 2,
      transform: [
        { translateY: floatY.value },
        { scale: appearScale.value * popScale.value },
      ],
      opacity: popOpacity.value,
    };
  });

  const fromGradientStyle = useAnimatedStyle(() => ({
    opacity: 1 - colorFadeProgress.value,
  }));

  const toGradientStyle = useAnimatedStyle(() => ({
    opacity: colorFadeProgress.value,
  }));

  // Determine press handler: needle pop takes priority over normal press
  const handlePress = onNeedlePop ? handleNeedlePop : onPress;

  return (
    <Pressable onPress={handlePress} onLongPress={handlePop} delayLongPress={420} style={style}>
      <View style={styles.wrapper}>
        <SubtaskOrbit subtasks={subtasks} parentSize={size} colors={colors} />
        <Animated.View
          style={[
            styles.container,
            styles.shadow,
            {
              borderWidth: selected ? 2 : 1,
              borderColor: selected ? '#FFFFFF' : 'rgba(255,255,255,0.45)',
            },
            bubbleAnimatedStyle,
          ]}>
          <Animated.View style={[styles.gradient, fromGradientStyle]}>
            <LinearGradient colors={colorPair.from} style={styles.gradient} />
          </Animated.View>
          <Animated.View style={[styles.gradient, toGradientStyle]}>
            <LinearGradient colors={colorPair.to} style={styles.gradient} />
          </Animated.View>
          <View style={styles.gloss} />
          
          <Text numberOfLines={2} style={styles.label}>
            {title}
          </Text>

          {size >= 50 && (
            <View style={styles.energyDotsContainer}>
              {[1, 2, 3, 4, 5].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.energyDot,
                    i <= energyLevel ? styles.energyDotFilled : styles.energyDotEmpty,
                  ]}
                />
              ))}
            </View>
          )}
        </Animated.View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  shadow: {
    // iOS
    ...Platform.select({
      web: {
        boxShadow: '0px 8px 16px rgba(14, 26, 42, 0.28)',
      },
      default: {
        shadowColor: 'rgb(14, 26, 42)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.28,
        shadowRadius: 16,
        elevation: 8,
      },
    }),
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  gloss: {
    position: 'absolute',
    top: '10%',
    left: '15%',
    width: '55%',
    height: '35%',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    transform: [{ rotate: '-15deg' }],
  },
  label: {
    paddingHorizontal: 10,
    textAlign: 'center',
    color: '#1D2733',
    fontSize: 13,
    fontWeight: '600',
    userSelect: 'none',
  },
  energyDotsContainer: {
    position: 'absolute',
    bottom: '10%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
  },
  energyDot: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  energyDotFilled: {
    backgroundColor: 'rgba(255, 255, 255, 1)',
  },
  energyDotEmpty: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
});
