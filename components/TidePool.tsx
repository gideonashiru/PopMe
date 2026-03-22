import { useTidePool } from "@/hooks/use-tide-pool";
import { Task } from "@/types/task";
import { getBubbleSize } from "@/utils/bubble";
import React, { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import Animated, { SharedValue } from "react-native-reanimated";
import { FloatingBubble } from "./FloatingBubble";

export type TidePoolRef = {
  scrollToTop: () => void;
  scrollToBottom: () => void;
};

type TidePoolProps = {
  tasks: Task[];
  sortedTasks?: Task[];
  isSorted: boolean;
  selectedId: string | null;
  onSelectTask: (task: Task) => void;
  onNeedlePop: (task: Task) => void;
  needleMode: boolean;
  /** Shared value that receives live scroll Y for DepthIndicator. */
  scrollY: SharedValue<number>;
  /** Optional JS-thread callback for derived scroll calculations. */
  onScrollY?: (y: number) => void;
};

export const TidePool = forwardRef<TidePoolRef, TidePoolProps>(
  (
    {
      tasks,
      sortedTasks,
      isSorted,
      selectedId,
      onSelectTask,
      onNeedlePop,
      needleMode,
      scrollY,
      onScrollY,
    },
    ref,
  ) => {
    const { height: screenHeight } = useWindowDimensions();
    const scrollYRef = useRef(0);

    const { positions, canvasHeight, removeBody } = useTidePool(
      tasks,
      isSorted,
      scrollYRef,
    );
    const scrollRef = useRef<ScrollView>(null);

    useImperativeHandle(ref, () => ({
      scrollToTop: () => {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      },
      scrollToBottom: () => {
        scrollRef.current?.scrollTo({
          y: canvasHeight - screenHeight,
          animated: true,
        });
      },
    }));

    const arrangedPositions = useMemo(() => {
      if (!isSorted || !sortedTasks) return null;
      const map = new Map<string, number>();
      let currentY = 100;
      sortedTasks.forEach((t) => {
        map.set(t.id, currentY);
        currentY += getBubbleSize(t.priority) + 40;
      });
      return map;
    }, [isSorted, sortedTasks]);

    const handlePop = (task: Task) => {
      removeBody(task.id);
      onNeedlePop(task);
    };

    return (
      <Animated.ScrollView
        ref={scrollRef as any}
        horizontal={false}
        style={styles.container}
        contentContainerStyle={{ height: canvasHeight }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!needleMode}
        scrollEventThrottle={16}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          scrollY.value = y;
          scrollYRef.current = y;
          onScrollY?.(y);
        }}
        onContentSizeChange={(_, contentHeight) => {
          scrollRef.current?.scrollTo({
            y: contentHeight,
            animated: false,
          });
        }}
      >
        {tasks.map((task) => {
          const pos = positions.get(task.id);
          if (!pos) return null;

          return (
            <FloatingBubble
              key={task.id}
              task={task}
              x={pos.x}
              y={pos.y}
              selected={selectedId === task.id}
              isSorted={isSorted}
              arrangedY={arrangedPositions?.get(task.id) ?? 0}
              needleMode={needleMode}
              onPress={onSelectTask}
              onNeedlePop={needleMode ? () => handlePop(task) : undefined}
            />
          );
        })}
      </Animated.ScrollView>
    );
  },
);

TidePool.displayName = "TidePool";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
  },
});
