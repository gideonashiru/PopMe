import { useTidePool } from "@/hooks/use-tide-pool";
import { Task } from "@/types/task";
import { getBubbleSize } from "@/utils/bubble";
import React, { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { FloatingBubble } from "./FloatingBubble";
import { FilterBy } from "@/utils/layout";
import { Colors, Radii, Spacing } from "@/constants/theme";
import Animated, { 
  SharedValue, 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  Easing 
} from "react-native-reanimated";
import { View, Text, Platform } from "react-native";
import { useEffect } from "react";

export type TidePoolRef = {
  scrollToTop: () => void;
  scrollToBottom: () => void;
};

type TidePoolProps = {
  tasks: Task[];
  sortedTasks?: Task[];
  isSorted: boolean;
  filterBy: FilterBy;
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
      filterBy,
      selectedId,
      onSelectTask,
      onNeedlePop,
      needleMode,
      scrollY,
      onScrollY,
    },
    ref,
  ) => {
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const scrollYRef = useRef(0);

    const { positions, canvasHeight, removeBody } = useTidePool(
      tasks,
      isSorted,
      scrollYRef,
      filterBy
    );
    const scrollRef = useRef<ScrollView>(null);

    // --- Zone Visuals ---
    const zonesVisible = filterBy !== 'default';
    const slideAnim = useSharedValue(-80);

    useEffect(() => {
      slideAnim.value = withTiming(zonesVisible ? 0 : -80, {
        duration: 280,
        easing: Easing.out(Easing.cubic),
      });
    }, [zonesVisible]);

    const animatedZoneStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: slideAnim.value }],
      opacity: withTiming(zonesVisible ? 1 : 0, { duration: 280 }),
    }));

    const zoneHeight = canvasHeight / 3;
    const zones = [
      { label: 'High: 4-5', top: 0, height: zoneHeight, color: 'rgba(255, 100, 80, 0.06)' },
      { label: 'Medium: 3', top: zoneHeight, height: zoneHeight, color: 'rgba(255, 200, 80, 0.06)' },
      { label: 'Low: 1-2', top: zoneHeight * 2, height: zoneHeight, color: 'rgba(100, 160, 255, 0.06)' },
    ];

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
      if (!isSorted || !tasks) return null;

      const zoneHeight = canvasHeight / 3;
      const getZoneTop = (task: Task) => {
        if (filterBy === 'priority') {
          if (task.priority >= 4) return 0;
          if (task.priority === 3) return zoneHeight;
          return zoneHeight * 2;
        } else if (filterBy === 'energy') {
          if (task.energy >= 4) return 0;
          if (task.energy === 3) return zoneHeight;
          return zoneHeight * 2;
        } else if (filterBy === 'dueDate') {
          if (!task.dueDate) return zoneHeight * 2;
          const now = new Date();
          const due = new Date(task.dueDate);
          const days = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
          if (days <= 1) return 0;
          if (days <= 7) return zoneHeight;
          return zoneHeight * 2;
        }
        return 0;
      };

      const map = new Map<string, {x: number, y: number}>();
      
      const topZone: Task[] = [];
      const midZone: Task[] = [];
      const botZone: Task[] = [];

      tasks.forEach(t => {
        const top = getZoneTop(t);
        if (top === 0) topZone.push(t);
        else if (top === zoneHeight) midZone.push(t);
        else botZone.push(t);
      });

      const cols = 3; 
      const colWidth = screenWidth / cols;

      const layoutZone = (zoneTasks: Task[], zoneTop: number) => {
        const startY = zoneTop + 30; // padding inside zone
        zoneTasks.forEach((task, index) => {
          const col = index % cols;
          const row = Math.floor(index / cols);
          
          const radius = getBubbleSize(task.priority) / 2;
          const x = (col * colWidth) + (colWidth / 2) - radius;
          const y = startY + (row * 105); // bubbles are ~100px normally
          
          map.set(task.id, { x, y });
        });
      };

      layoutZone(topZone, 0);
      layoutZone(midZone, zoneHeight);
      layoutZone(botZone, zoneHeight * 2);

      return map;
    }, [isSorted, filterBy, tasks, canvasHeight, screenWidth]);

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
        {/* Zone Backgrounds & Labels */}
        <Animated.View style={[StyleSheet.absoluteFill, animatedZoneStyle, { zIndex: 0 }]}>
          {zones.map((zone, i) => (
            <View 
              key={`zone-${i}`}
              style={{
                position: 'absolute',
                top: zone.top,
                left: 0,
                right: 0,
                height: zone.height,
                backgroundColor: zone.color,
              }}
            >
              <View style={styles.zoneLabelPill}>
                <Text style={styles.zoneLabelText}>{zone.label}</Text>
              </View>
            </View>
          ))}
        </Animated.View>

        <View style={{ flex: 1, zIndex: 1 }}>
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
              arrangedX={arrangedPositions?.get(task.id)?.x ?? 0}
              arrangedY={arrangedPositions?.get(task.id)?.y ?? 0}
              needleMode={needleMode}
              onPress={onSelectTask}
              onNeedlePop={needleMode ? () => handlePop(task) : undefined}
            />
          );
        })}
        </View>
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
  zoneLabelPill: {
    position: 'absolute',
    top: 4,
    left: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.round,
    ...Platform.select({
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      }
    })
  },
  zoneLabelText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.light.textDim,
  },
});
