import React, { forwardRef, useImperativeHandle, useRef, useState, useCallback } from 'react';
import { StyleSheet, View, LayoutChangeEvent } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { Task } from '@/types/task';
import { FilterBy } from '@/utils/layout';
import { useBubbleLayout } from '@/hooks/use-bubble-layout';
import { StaticBubble } from './StaticBubble';
import { Colors } from '@/constants/theme';


export type StaticTidePoolHandle = {
  scrollToTop: () => void;
  scrollToBottom: () => void;
};

type StaticTidePoolProps = {
  tasks: Task[];
  sortedTasks?: Task[]; // Optional pre-sorted tasks for layout optimization
  isSorted: boolean;
  filterBy: FilterBy;
  needleMode: boolean;
  selectedTaskId: string | null;
  onTaskPress: (task: Task) => void;
  onTaskNeedlePop: (task: Task) => void;
  scrollY: SharedValue<number>;
  onScrollY?: (y: number) => void;
};

export const StaticTidePool = forwardRef<StaticTidePoolHandle, StaticTidePoolProps>(
  (
    {
      tasks,
      isSorted,
      filterBy,
      needleMode,
      selectedTaskId,
      onTaskPress,
      onTaskNeedlePop,
      scrollY,
      onScrollY,
    },
    ref,
  ) => {
    const [viewport, setViewport] = useState({ width: 0, height: 0 });

    const handleLayout = useCallback((e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      if (width > 0 && height > 0) {
        setViewport({ width, height });
      }
    }, []);

    const viewportWidth = viewport.width;
    const viewportHeight = viewport.height;
    const canvasWidth = viewportWidth;
    const canvasHeight = Math.max(
      viewportHeight,
      viewportHeight + tasks.length * 30,
    );
    
    const scrollRef = useRef<ScrollView>(null);

    const layoutMap = useBubbleLayout(tasks, filterBy, canvasWidth, canvasHeight);

    useImperativeHandle(
      ref,
      () => ({
        scrollToTop: () => {
          scrollRef.current?.scrollTo({ y: 0, animated: true });
        },
        scrollToBottom: () => {
          const vh = viewportHeight;
          if (vh <= 0) return;
          scrollRef.current?.scrollTo({
            y: Math.max(0, canvasHeight - vh),
            animated: true,
          });
        },
      }),
      [canvasHeight, viewportHeight],
    );

    // Local Depth Indicator animated style port matching TidePool UI
    const thumbStyle = useAnimatedStyle(() => {
      const maxScroll = Math.max(1, canvasHeight - viewportHeight);
      let progress = scrollY.value / maxScroll;
      if (progress < 0) progress = 0;
      if (progress > 1) progress = 1;

      const trackHeight = 100;
      const thumbHeight = 32;
      const travel = trackHeight - thumbHeight;

      return {
        transform: [{ translateY: progress * travel }],
      };
    });

    return (
      <View style={styles.container} onLayout={handleLayout}>
        <Animated.ScrollView
          ref={scrollRef as any}
          contentContainerStyle={{ width: canvasWidth, height: canvasHeight }}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(e) => {
            const y = e.nativeEvent.contentOffset.y;
            scrollY.value = y;
            onScrollY?.(y);
          }}
        >
          {viewportWidth > 0 &&
            viewportHeight > 0 &&
            tasks.map((task) => {
            const sharedVals = layoutMap.get(task.id);
            if (!sharedVals) return null;

            return (
              <StaticBubble
                key={task.id}
                task={task}
                sharedValues={sharedVals}
                needleMode={needleMode}
                selected={selectedTaskId === task.id}
                onPress={onTaskPress}
                onNeedlePop={onTaskNeedlePop}
              />
            );
          })}
        </Animated.ScrollView>

        <View style={styles.depthTrack}>
          <Animated.View style={[styles.depthThumb, thumbStyle]} />
        </View>
      </View>
    );
  }
);

StaticTidePool.displayName = 'StaticTidePool';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  depthTrack: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -50,
    width: 4,
    height: 100,
    backgroundColor: Colors.light.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  depthThumb: {
    width: 4,
    height: 32,
    backgroundColor: Colors.light.primary,
    borderRadius: 2,
  },
});
