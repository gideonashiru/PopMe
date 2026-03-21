import React, { useState } from "react";
import { StyleSheet, View, Text } from "react-native";
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
import { Colors } from "@/constants/theme";
import { useWindowDimensions } from "react-native";

export type FloatingBubbleProps = {
  task: Task;
  x: SharedValue<number>;
  y: SharedValue<number>;
  selected: boolean;
  isSorted: boolean;
  arrangedY: number;
  needleMode: boolean;
  onPress: (task: Task) => void;
  onNeedlePop?: () => void;
  onPriorityChange: (taskId: string, newPriority: number) => void;
};

export const FloatingBubble = ({
  task,
  x,
  y,
  selected,
  isSorted,
  arrangedY,
  needleMode,
  onPress,
  onNeedlePop,
  onPriorityChange,
}: FloatingBubbleProps) => {
  const size = getBubbleSize(task.priority);
  const radius = size / 2;
  const { width } = useWindowDimensions();

  const [dragPriority, setDragPriority] = useState<number | null>(null);

  const dragGesture = Gesture.Pan()
    .minDistance(10)
    .onStart(() => {
      runOnJS(setDragPriority)(task.priority);
    })
    .onUpdate((event) => {
      const priorityDelta = Math.round(event.translationY / 40); // Wait! "Dragging UP (negative translationY) increases priority". High priority = 1. So dragging up (-Y) gets smaller priority!
      // If priority is 3, drag UP (-40) -> priorityDelta = -1. New prio = 3 - 1 = 2 (higher priority).
      // So event.translationY / 40 directly!
      const newPrio = Math.max(1, Math.min(5, task.priority + priorityDelta));
      runOnJS(setDragPriority)(newPrio);
    })
    .onEnd((event) => {
      const priorityDelta = Math.round(event.translationY / 40);
      const newPriority = Math.max(
        1,
        Math.min(5, task.priority + priorityDelta),
      );
      // runOnJS(setDragPriority)(null);
      setDragPriority(null);
      if (newPriority !== task.priority) {
        runOnJS(onPriorityChange)(task.id, newPriority);
      }
    })
    .enabled(!needleMode && !isSorted);

  const tapGesture = Gesture.Tap()
    .maxDuration(300)
    .onEnd(() => {
      runOnJS(onPress)(task);
    })
    .enabled(!onNeedlePop); // Fall through to standard Push during Needle Mode

  const composedGesture = Gesture.Exclusive(dragGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      position: "absolute",
      left: withSpring(isSorted ? width / 2 - radius : x.value - radius),
      top: withSpring(isSorted ? arrangedY : y.value - radius),
    };
  });

  return (
    <Animated.View style={animatedStyle}>
      <GestureDetector gesture={composedGesture}>
        <View collapsable={false}>
          {dragPriority !== null && (
            <View style={styles.priorityIndicator}>
              <Text style={styles.priorityText}>Priority {dragPriority}</Text>
            </View>
          )}
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

const styles = StyleSheet.create({
  priorityIndicator: {
    position: "absolute",
    top: -30,
    alignSelf: "center",
    backgroundColor: Colors.light.surface,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.light.text,
  },
});
