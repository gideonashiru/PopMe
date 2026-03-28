import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Task } from '@/types/task';
import { Bubble } from './Bubble';
import { getBubbleSize, getEnergyColors } from '@/utils/bubble';
import { BubbleSharedValues } from '@/hooks/use-bubble-layout';

type StaticBubbleProps = {
  task: Task;
  sharedValues: BubbleSharedValues;
  arrangedPos?: { x: number; y: number };
  selected: boolean;
  onPress: (task: Task) => void;
  onLongPressComplete: (task: Task) => void;
};

export const StaticBubble = ({
  task,
  sharedValues,
  selected,
  onPress,
  onLongPressComplete,
  arrangedPos,
}: StaticBubbleProps) => {
  const size = getBubbleSize(task.priority);
  const pressScale = useSharedValue(1);

  // Stable refs so gesture worklets always call the latest callback
  const onPressRef = useRef(onPress);
  const onLongPressCompleteRef = useRef(onLongPressComplete);
  const taskRef = useRef(task);

  useEffect(() => {
    onPressRef.current = onPress;
    onLongPressCompleteRef.current = onLongPressComplete;
    taskRef.current = task;
  });

  const callOnPress = () => onPressRef.current(taskRef.current);
  const callOnComplete = () => {
    console.log('[LongPress] callOnComplete fired for task:', taskRef.current.id);
    onLongPressCompleteRef.current(taskRef.current);
  };

  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      pressScale.value = withSpring(0.93, { damping: 14, stiffness: 200 });
    })
    .onEnd(() => {
      runOnJS(callOnPress)();
    })
    .onFinalize(() => {
      pressScale.value = withSpring(1, { damping: 14, stiffness: 200 });
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(1300)
    .onStart(() => {
      'worklet';
      console.log('[LongPress] onStart fired — 2s threshold reached');
      pressScale.value = withSpring(0.85, { damping: 14, stiffness: 200 });
      runOnJS(callOnComplete)();
    })
    .onFinalize(() => {
      pressScale.value = withSpring(1, { damping: 14, stiffness: 200 });
    });

  const composedGesture = Gesture.Exclusive(longPressGesture, tapGesture);

  // Shared values for the arranged (zone) position — animated via useEffect
  const arrangedX = useSharedValue(arrangedPos?.x ?? 0);
  const arrangedY = useSharedValue(arrangedPos?.y ?? 0);

  useEffect(() => {
    if (arrangedPos) {
      arrangedX.value = withSpring(arrangedPos.x, { damping: 18, stiffness: 120 });
      arrangedY.value = withSpring(arrangedPos.y, { damping: 18, stiffness: 120 });
    }
  }, [arrangedPos?.x, arrangedPos?.y]);

  const animatedStyle = useAnimatedStyle(() => {
    const currentX = arrangedPos ? arrangedX.value : sharedValues.x.value;
    const currentY = arrangedPos ? arrangedY.value : sharedValues.y.value;

    return {
      position: 'absolute',
      left: currentX - size / 2,
      top: currentY - size / 2,
      transform: [{ scale: sharedValues.scale.value * pressScale.value }],
    };
  });

  return (
    <Animated.View style={[{ width: size, height: size }, animatedStyle]}>
      <GestureDetector gesture={composedGesture}>
        <View collapsable={false}>
          <Bubble
            title={task.title}
            size={size}
            colors={getEnergyColors(task.energy)}
            energyLevel={task.energy}
            subtasks={task.subtasks}
            selected={selected}
            floating={true}
          />
        </View>
      </GestureDetector>
    </Animated.View>
  );
};
