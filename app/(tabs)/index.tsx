import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSharedValue } from "react-native-reanimated";

import { DepthIndicator } from "@/components/DepthIndicator";
import { EditTaskModal } from "@/components/EditTaskModal";
import { FABCluster } from "@/components/FABCluster";
import {
  FilterModal,
  SortDirectionValue,
  SortKeys,
  SortKeyValue,
} from "@/components/FilterModal";
import { TidePool, TidePoolRef } from "@/components/TidePool";
import { Colors, Radii, Spacing } from "@/constants/theme";
import { useCompleted } from "@/store/completed-context";
import { useTasks } from "@/store/tasks-context";
import { SortKey, sortTasks } from "@/utils/layout";
import { getBubbleSize } from "@/utils/bubble";
import { AudioLines, ListFilter, Pin } from "lucide-react-native";
import { Alert } from "react-native";
import { TabBarHeightContext } from "./_layout";
import { GoUp } from "@/components/GoUp";

/** Map SortKeys enum values to sortTasks key names. */
const SORT_KEY_MAP: Record<string, SortKey | null> = {
  [SortKeys.NONE]: null,
  [SortKeys.DATE]: "dueDate",
  [SortKeys.PRIORITY]: "priority",
  [SortKeys.ENERGY]: "energy",
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const router = useRouter();
  const {
    tasks,
    isLoaded,
    addTask,
    updateTask,
    updateTaskPosition,
    removeTask,
    markTaskStatus,
    addSubtask,
    removeSubtask,
  } = useTasks();
  const { completeTask } = useCompleted();

  const tabBarHeight = React.useContext(TabBarHeightContext);

  // --- UI state ---
  const [inputValue, setInputValue] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const addInputRef = useRef<TextInput>(null);
  const confirmOpacity = useRef(new Animated.Value(0)).current;
  const [showConfirm, setShowConfirm] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [sortKey, setSortKey] = useState<SortKeyValue>(SortKeys.NONE);
  const [sortDirection, setSortDirection] = useState<SortDirectionValue | 0>(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [needleMode, setNeedleMode] = useState(false);

  // Scroll state — shared value so DepthIndicator/SurfaceIndicator run on UI thread
  const scrollY = useSharedValue(0);
  const tidePoolRef = useRef<TidePoolRef>(null);

  // Count of tasks above viewport (updated on JS thread via scroll handler)
  const [tasksAbove, setTasksAbove] = useState(0);

  const isSorted = sortKey !== SortKeys.NONE;

  const activeTasks = useMemo(
    () => tasks.filter((t) => t.status === "active"),
    [tasks],
  );

  const sortedTasks = useMemo(() => {
    const key = SORT_KEY_MAP[sortKey];
    if (!key) return activeTasks;
    return sortTasks(activeTasks, key, sortDirection === 1);
  }, [activeTasks, sortKey, sortDirection]);

  const editingTask = useMemo(
    () => tasks.find((t) => t.id === editingId) ?? null,
    [editingId, tasks],
  );

  // --- Handlers ---
  const handleAddTask = () => {
    if (!inputValue.trim()) return;
    addTask(inputValue.trim());
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInputValue("");
    // Clear sort when adding a new task
    setSortKey(SortKeys.NONE);
    setSortDirection(0);

    // Show inline confirmation that fades out
    setShowConfirm(true);
    confirmOpacity.setValue(1);
    Animated.timing(confirmOpacity, {
      toValue: 0,
      duration: 800,
      delay: 1000,
      useNativeDriver: true,
    }).start(() => setShowConfirm(false));

    // Re-focus the input for rapid entry
    setTimeout(() => addInputRef.current?.focus(), 80);

    // Let the physics world mount the new body, then scroll down to show it
    setTimeout(() => {
      tidePoolRef.current?.scrollToBottom();
    }, 50);
  };

  const handleSort = (key: SortKeyValue, direction: SortDirectionValue | 0) => {
    setSortKey(key);
    setSortDirection(direction);
  };

  const handleClearSort = () => {
    setSortKey(SortKeys.NONE);
    setSortDirection(0);
  };

  // --- Render ---
  if (!isLoaded) {
    return (
      <LinearGradient
        colors={["#F9FBFF", "#DDEBFF"]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.container}
      />
    );
  }

  return (
    <LinearGradient
      colors={["#F9FBFF", "#DDEBFF"]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.container}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>PopMe</Text>
      </View>

      {/* Top Action Pill */}
      <View style={[styles.topActionPill, { top: insets.top + 6 }]}>
        {/* Needle mode toggle */}
        <Pressable
          onPress={() => setNeedleMode((prev) => !prev)}
          style={[styles.cornerButton, needleMode && styles.needleActive]}
        >
          <Pin size={16} color={needleMode ? "#FFFFFF" : "#1D2733"} />
        </Pressable>
        {/* Sort */}
        <Pressable
          onPress={() => setShowFilterModal(true)}
          style={[styles.cornerButton, isSorted && styles.cornerButtonActive]}
        >
          <Text
            style={[styles.cornerText, isSorted && styles.cornerTextActive]}
          >
            {/* {isSorted ? "Sorted ✓" : "Sort"} */}
            <ListFilter size={16} color={isSorted ? "#FFFFFF" : "#1D2733"} />
          </Text>
        </Pressable>

        {isSorted && (
          <Pressable onPress={handleClearSort} style={styles.cornerButton}>
            <Text style={styles.cornerText}>Clear</Text>
          </Pressable>
        )}
      </View>

      {/* Canvas */}
      <View
        style={[
          styles.canvasContainer,
          { marginBottom: Math.max(tabBarHeight + 10, 20) },
        ]}
      >
        <View style={styles.glowBlob} />
        <View style={styles.glowBlobAlt} />

        <TidePool
          ref={tidePoolRef}
          tasks={activeTasks}
          sortedTasks={isSorted ? sortedTasks : undefined}
          isSorted={isSorted}
          selectedId={selectedId}
          needleMode={needleMode}
          scrollY={scrollY}
          onScrollY={(y) => {
            // Proportional estimate: how many tasks are likely above the viewport.
            // Bubbles cluster near the top (ceiling) so scrolling down = fewer above.
            const maxScroll = Math.max(screenHeight * 2.5 - screenHeight, 1);
            const fraction = Math.min(y / maxScroll, 1);
            const count = Math.round(fraction * activeTasks.length);
            setTasksAbove(count);
          }}
          onSelectTask={(task) => {
            setSelectedId(task.id);
            setEditingId(task.id);
          }}
          onNeedlePop={(task) => {
            completeTask(task);
            removeTask(task.id);
          }}
        />

        {activeTasks.length === 0 && (
          <Text
            style={[
              styles.emptyText,
              {
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: [{ translateX: -120 }, { translateY: -10 }],
              },
            ]}
          >
            Add your first Bubble task with the + icon.
          </Text>
        )}
      </View>

      {/* Depth indicator — always visible, right edge */}
      <DepthIndicator
        scrollY={scrollY}
        canvasHeight={screenHeight * 1.8}
        screenHeight={screenHeight}
      />

      {tasksAbove > 0 && (
        <GoUp 
          onScrollToTop={() => tidePoolRef.current?.scrollToTop()}
          bottomOffset={Math.max(tabBarHeight + 20, insets.bottom + 90) + 76}
        />
      )}

      <FABCluster
        onAddTask={() => setShowAddModal(true)}
        bottomOffset={Math.max(tabBarHeight + 20, insets.bottom + 90) }
      />

      {/* Add task modal */}
      <Modal transparent visible={showAddModal} animationType="fade">
        <View style={styles.addOverlay}>
          <View style={styles.addCard}>
            <Text style={styles.addTitle}>New task</Text>
            <View style={styles.addInputRow}>
              <TextInput
                ref={addInputRef}
                value={inputValue}
                onChangeText={setInputValue}
                onSubmitEditing={handleAddTask}
                placeholder="Name your task"
                placeholderTextColor="rgba(29,39,51,0.4)"
                style={[styles.addInput, { flex: 1 }]}
                autoFocus
                returnKeyType="done"
              />
              <Pressable
                style={styles.voiceButton}
                onPress={() =>
                  Alert.alert(
                    "Voice Input",
                    "Voice to text task capture - coming soon.",
                    [{ text: "Got it", style: "cancel" }],
                  )
                }
              >
                <AudioLines size={20} color={Colors.light.white} />
              </Pressable>
            </View>
            {showConfirm && (
              <Animated.Text
                style={[styles.confirmText, { opacity: confirmOpacity }]}
              >
                Task added! ✓
              </Animated.Text>
            )}
            <View style={styles.addActions}>
              <Pressable
                onPress={() => setShowAddModal(false)}
                style={styles.addCancel}
              >
                <Text style={styles.addCancelText}>Done</Text>
              </Pressable>
              <Pressable onPress={handleAddTask} style={styles.addConfirm}>
                <Text style={styles.addConfirmText}>Add</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit task modal */}
      {editingTask && (
        <EditTaskModal
          visible={true}
          task={editingTask}
          onClose={() => setEditingId(null)}
          onSave={(taskId, updates) => updateTask(taskId, updates)}
          onComplete={(taskId) => {
            markTaskStatus(taskId, "completed");
            setEditingId(null);
          }}
          onAddSubtask={addSubtask}
          onRemoveSubtask={removeSubtask}
        />
      )}

      {/* Sort/Arrange modal */}
      {showFilterModal && (
        <FilterModal
          visible={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          onSave={handleSort}
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    paddingHorizontal: 22,
    justifyContent: "space-between",
    zIndex: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1D2733",
  },
  topActionPill: {
    position: "absolute",
    right: Spacing.lg,
    flexDirection: "row",
    gap: Spacing.sm,
    backgroundColor: Colors.light.surface,
    borderRadius: Radii.round,
    padding: Spacing.xs,
    zIndex: 20,
    ...Platform.select({
      web: { boxShadow: "0px 8px 24px rgba(14, 26, 42, 0.12)" },
      default: {
        shadowColor: "rgb(14, 26, 42)",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
        elevation: 10,
      },
    }),
  },
  cornerButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: "center",
    alignSelf: "flex-end",
  },
  cornerButtonActive: {
    backgroundColor: Colors.light.primary,
  },
  needleActive: {
    backgroundColor: "#0a7ea4",
    ...Platform.select({
      web: {
        boxShadow: "0px 0px 10px rgba(10, 126, 164, 0.5)",
      },
      default: {
        shadowColor: "#0a7ea4",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 6,
      },
    }),
  },
  cornerText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1D2733",
    letterSpacing: 0.6,
  },
  cornerTextActive: {
    color: "#FFFFFF",
  },
  canvasContainer: {
    flex: 1,
    marginHorizontal: 8,
    marginTop: 8,
    marginBottom: 100,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.45)",
    overflow: "hidden",
  },
  glowBlob: {
    position: "absolute",
    top: 30,
    left: 10,
    width: 180,
    height: 180,
    borderRadius: 120,
    backgroundColor: "rgba(255, 199, 173, 0.35)",
    opacity: 0.7,
    zIndex: 0,
  },
  glowBlobAlt: {
    position: "absolute",
    bottom: 20,
    right: -10,
    width: 220,
    height: 220,
    borderRadius: 120,
    backgroundColor: "rgba(153, 210, 255, 0.3)",
    zIndex: 0,
  },
  emptyText: {
    color: "#6B7C93",
    fontSize: 14,
    width: 240,
    textAlign: "center",
  },
  addOverlay: {
    flex: 1,
    backgroundColor: "rgba(10, 16, 26, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  addCard: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    padding: 18,
    // iOS
    ...Platform.select({
      web: {
        boxShadow: "0px 8px 16px rgba(14, 26, 42, 0.2)",
      },
      default: {
        shadowColor: "rgb(14, 26, 42)",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 8,
      },
    }),
  },
  addTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1D2733",
    marginBottom: 10,
  },
  addInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  addInput: {
    borderRadius: 14,
    backgroundColor: "rgba(29,39,51,0.06)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1D2733",
  },
  voiceButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.primary,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      web: { boxShadow: "0px 4px 12px rgba(14, 26, 42, 0.3)" },
      default: {
        shadowColor: "rgb(29, 39, 51)",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
      },
    }),
  },
  addActions: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  addCancel: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "rgba(29,39,51,0.08)",
  },
  addCancelText: {
    color: "#1D2733",
    fontWeight: "600",
  },
  addConfirm: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#1D2733",
  },
  addConfirmText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  confirmText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0a7ea4",
    marginTop: 8,
    textAlign: "center",
  },
  surfacePill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.light.buttonBackground,
    borderRadius: Radii.round,
  },
  surfacePillText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.light.primary,
  },
});
