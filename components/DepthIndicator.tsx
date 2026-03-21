import { Colors, Radii, Spacing } from "@/constants/theme";
import React from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useDerivedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type DepthIndicatorProps = {
  scrollY: SharedValue<number>;
  canvasHeight: number;
  screenHeight: number;
};

const PILL_HEIGHT = 24;
const BAR_WIDTH = 3;

export const DepthIndicator = ({
  scrollY,
  canvasHeight,
  screenHeight,
}: DepthIndicatorProps) => {
  const insets = useSafeAreaInsets();
  const barHeight = screenHeight - insets.top - insets.bottom - Spacing.xl * 2;
  const maxScroll = Math.max(canvasHeight - screenHeight, 1);

  // Derived indicator position: 0...(barHeight - PILL_HEIGHT)
  const pillTop = useDerivedValue(() => {
    const progress = Math.min(Math.max(scrollY.value / maxScroll, 0), 1);
    return progress * (barHeight - PILL_HEIGHT);
  });

  const pillStyle = useAnimatedStyle(() => ({
    top: pillTop.value,
  }));

  return (
    <View
      style={[
        styles.wrapper,
        { top: insets.top + Spacing.xl, bottom: insets.bottom + Spacing.xl },
      ]}
      pointerEvents="none"
    >
      <View style={[styles.track, { height: barHeight }]}>
        <Animated.View style={[styles.pill, pillStyle]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    right: 12,
    justifyContent: "flex-start",
    alignItems: "center",
    zIndex: 15,
  },
  track: {
    width: BAR_WIDTH,
    backgroundColor: Colors.light.buttonBackground,
    borderRadius: Radii.round,
    overflow: "hidden",
    position: "relative",
  },
  pill: {
    position: "absolute",
    left: 0,
    width: BAR_WIDTH,
    height: PILL_HEIGHT,
    backgroundColor: Colors.light.primary,
    borderRadius: Radii.round,
  },
});
