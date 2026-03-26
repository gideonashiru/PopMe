import React from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  SharedValue,
  withSpring,
  runOnJS,
} from "react-native-reanimated";

import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Task } from "@/types/task";
import { Bubble } from "./Bubble";
import { getBubbleSize, getEnergyColors } from "@/utils/bubble";
import { useWindowDimensions } from "react-native";

export type FloatingBubbleProps = {
  task: Task;
  x: SharedValue<number>;
  y: SharedValue<number>;
  selected: boolean;
  isSorted: boolean;
  arrangedX: number;
  arrangedY: number;
  needleMode: boolean;
  onPress: (task: Task) => void;
  onNeedlePop?: () => void;
};

export const FloatingBubble = ({
  task,
  x,
  y,
  selected,
  isSorted,
  arrangedX,
  arrangedY,
  needleMode,
  onPress,
  onNeedlePop,
}: FloatingBubbleProps) => {
  const size = getBubbleSize(task.priority);
  const radius = size / 2;
  const { width } = useWindowDimensions();

  const tapGesture = Gesture.Tap()
    .maxDuration(300)
    .onEnd(() => {
      runOnJS(onPress)(task);
    })
    .enabled(!onNeedlePop); // Fall through to Bubble's Pressable in needle mode

  const animatedStyle = useAnimatedStyle(() => {
    return {
      position: "absolute",
      // left: withSpring(isSorted ? width / 2 - radius : x.value - radius),
      left: withSpring(isSorted ? arrangedX : x.value - radius),
      top: withSpring(isSorted ? arrangedY : y.value - radius),
    };
  });

  return (
    <Animated.View style={animatedStyle}>
      <GestureDetector gesture={tapGesture}>
        <View collapsable={false}>
          <Bubble
            title={task.title}
            size={size}
            colors={getEnergyColors(task.energy)}
            energyLevel={task.energy}
            subtasks={task.subtasks}
            selected={selected}
            onNeedlePop={onNeedlePop}
          />
        </View>
      </GestureDetector>
    </Animated.View>
  );
};

const styles = StyleSheet.create({});
