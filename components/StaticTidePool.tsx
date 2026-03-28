import { Colors } from "@/constants/theme";
import { useBubbleLayout } from "@/hooks/use-bubble-layout";
import { Task } from "@/types/task";
import { getBubbleSize } from "@/utils/bubble";
import { FilterBy } from "@/utils/bubbleLayout";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { StaticBubble } from "./StaticBubble";

export type StaticTidePoolHandle = {
  scrollToTop: () => void;
  scrollToBottom: () => void;
};

type StaticTidePoolProps = {
  tasks: Task[];
  sortedTasks?: Task[];
  filterBy: FilterBy;
  selectedTaskId: string | null;
  onTaskPress: (task: Task) => void;
  onTaskLongPressComplete: (task: Task) => void;
  scrollY: SharedValue<number>;
  onScrollY?: (y: number) => void;
};

export const StaticTidePool = forwardRef<
  StaticTidePoolHandle,
  StaticTidePoolProps
>(
  (
    {
      tasks,
      filterBy,
      selectedTaskId,
      onTaskPress,
      onTaskLongPressComplete,
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

    // We use defaultCanvasHeight (viewportHeight) for the packing algorithm so bubbles center visually.
    const defaultCanvasHeight = viewportHeight;

    const scrollRef = useRef<ScrollView>(null);

    const { layoutMap, layoutHeight: defaultScrollHeight } = useBubbleLayout(
      tasks,
      filterBy,
      canvasWidth,
      defaultCanvasHeight,
    );

    // --- Zone Visuals ---
    const zonesVisible = filterBy !== "default";
    const slideAnim = useSharedValue(-80);

    useEffect(() => {
      slideAnim.value = withTiming(zonesVisible ? 0 : -80, {
        duration: 280,
        easing: Easing.out(Easing.cubic),
      });
    }, [zonesVisible, slideAnim]);

    const animatedZoneStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: slideAnim.value }],
      opacity: withTiming(zonesVisible ? 1 : 0, { duration: 280 }),
    }));

    // --- Zone Layout (content-driven heights, tight uniform grid) ---
    const ZONE_PADDING_TOP = 36;
    const ZONE_PADDING_BOTTOM = 24;
    const MIN_CELL_GAP = 8; // px gap between bubble edges inside a cell

    type ZoneGeometry = { top: number; height: number };

    const zoneLayout = useMemo(() => {
      if (filterBy === 'default' || viewportWidth <= 0) {
        return { zoneGeometry: [] as ZoneGeometry[], positions: null, totalHeight: defaultCanvasHeight };
      }

      // --- 1. Bin tasks ---
      const bins: [Task[], Task[], Task[]] = [[], [], []];
      tasks.forEach(task => {
        let bin = 2;
        if (filterBy === 'priority') {
          // high = 4-5 (top), mid = 3, low = 1-2 (bottom)
          bin = task.priority >= 4 ? 0 : task.priority === 3 ? 1 : 2;
        } else if (filterBy === 'energy') {
          // reversed: low energy number = high effort = top zone
          bin = task.energy <= 2 ? 0 : task.energy === 3 ? 1 : 2;
        } else if (filterBy === 'dueDate') {
          // high = overdue or due ≤7 days, mid = ≤30 days, low = beyond / no date
          if (!task.dueDate) {
            bin = 2;
          } else {
            const days = (new Date(task.dueDate).getTime() - Date.now()) / 86400000;
            bin = days <= 7 ? 0 : days <= 30 ? 1 : 2;
          }
        }
        bins[bin].push(task);
      });

      // --- 2. Per-zone: compute cell size → columns → heights → positions ---
      const geometry: ZoneGeometry[] = [];
      const positions = new Map<string, { x: number; y: number }>();
      let cursor = 0;

      bins.forEach((zoneTasks, bi) => {
        if (zoneTasks.length === 0) {
          // Empty zone: minimal height so the label strip still shows
          geometry.push({ top: cursor, height: ZONE_PADDING_TOP + ZONE_PADDING_BOTTOM });
          cursor += ZONE_PADDING_TOP + ZONE_PADDING_BOTTOM;
          return;
        }

        // Cell size = largest diameter in this zone + gap on each side
        const maxDiameter = Math.max(...zoneTasks.map(t => getBubbleSize(t.priority)));
        const cellSize = maxDiameter + MIN_CELL_GAP * 2;

        // Columns: as many as fit in viewportWidth, minimum 1
        const cols = Math.max(1, Math.floor(viewportWidth / cellSize));
        const rows = Math.ceil(zoneTasks.length / cols);

        const zoneHeight = ZONE_PADDING_TOP + rows * cellSize + ZONE_PADDING_BOTTOM;
        geometry.push({ top: cursor, height: zoneHeight });

        // Position each bubble at the center of its cell
        zoneTasks.forEach((task, index) => {
          const col = index % cols;
          const row = Math.floor(index / cols);
          const x = col * cellSize + cellSize / 2;
          const y = cursor + ZONE_PADDING_TOP + row * cellSize + cellSize / 2;
          positions.set(task.id, { x, y });
        });

        cursor += zoneHeight;
      });

      const totalHeight = Math.max(cursor, viewportHeight);
      return { zoneGeometry: geometry, positions, totalHeight };
    }, [filterBy, tasks, viewportWidth, viewportHeight, defaultCanvasHeight]);

    const canvasHeight = zonesVisible ? zoneLayout.totalHeight : defaultScrollHeight;
    const arrangedPositions = zoneLayout.positions;

    const ZONE_DEFS = [
      { label: 'High: 4-5', color: 'rgba(30, 159, 159, 0.06)' },
      { label: 'Medium: 3', color: 'rgba(255, 200, 80, 0.06)' },
      { label: 'Low: 1-2', color: 'rgba(93, 106, 127, 0.06)' },
    ];
    const zones = ZONE_DEFS.map((def, i) => ({
      ...def,
      top: zoneLayout.zoneGeometry[i]?.top ?? 0,
      height: zoneLayout.zoneGeometry[i]?.height ?? 0,
    }));

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
          {/* Zone Backgrounds & Labels */}
          <Animated.View
            style={[StyleSheet.absoluteFill, animatedZoneStyle, { zIndex: 0 }]}
          >
            {zones.map((zone, i) => (
              <View
                key={`zone-${i}`}
                style={{
                  position: "absolute",
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
                    arrangedPos={
                      zonesVisible ? arrangedPositions?.get(task.id) : undefined
                    }
                    selected={selectedTaskId === task.id}
                    onPress={onTaskPress}
                    onLongPressComplete={onTaskLongPressComplete}
                  />
                );
              })}
          </View>
        </Animated.ScrollView>

        <View style={styles.depthTrack}>
          <Animated.View style={[styles.depthThumb, thumbStyle]} />
        </View>
      </View>
    );
  },
);

StaticTidePool.displayName = "StaticTidePool";

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  depthTrack: {
    position: "absolute",
    right: 12,
    top: "50%",
    marginTop: -50,
    width: 4,
    height: 100,
    backgroundColor: Colors.light.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  depthThumb: {
    width: 4,
    height: 32,
    backgroundColor: Colors.light.primary,
    borderRadius: 2,
  },
  zoneLabelPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.7)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 12,
    marginLeft: 12,
  },
  zoneLabelText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
  },
});
