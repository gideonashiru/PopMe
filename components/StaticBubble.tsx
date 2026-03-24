import React from 'react';
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
  needleMode: boolean;
  selected: boolean;
  onPress: (task: Task) => void;
  onNeedlePop: (task: Task) => void;
};

export const StaticBubble = ({
  task,
  sharedValues,
  needleMode,
  selected,
  onPress,
  onNeedlePop,
}: StaticBubbleProps) => {
  const size = getBubbleSize(task.priority);
  const pressScale = useSharedValue(1);

  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      pressScale.value = withSpring(0.93, { damping: 14, stiffness: 200 });
    })
    .onFinalize(() => {
      pressScale.value = withSpring(1, { damping: 14, stiffness: 200 });
      if (needleMode) {
        runOnJS(onNeedlePop)(task);
      } else {
        runOnJS(onPress)(task);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      position: 'absolute',
      left: sharedValues.x.value - size / 2,
      top: sharedValues.y.value - size / 2,
      transform: [{ scale: sharedValues.scale.value * pressScale.value }],
    };
  });

  return (
    <Animated.View style={[{ width: size, height: size }, animatedStyle]}>
      <GestureDetector gesture={tapGesture}>
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
