import Slider from "@react-native-community/slider";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Colors, Radii, Spacing } from "@/constants/theme";
import { Bubble } from "@/components/Bubble";
import { Subtask, Task } from "@/types/task";
import { getBubbleSize, getEnergyColors } from "@/utils/bubble";
import { formatDate, toIsoDate } from "@/utils/date";

import DateTimePicker from "@react-native-community/datetimepicker";
import { Alert } from "react-native";

export type EditTaskModalProps = {
  visible: boolean;
  task: Task;
  onClose: () => void;
  onSave: (taskId: string, updates: Partial<Task>) => void;
  onComplete: (taskId: string) => void;
  onAddSubtask: (taskId: string, title: string) => void;
  onRemoveSubtask: (taskId: string, subtaskId: string) => void;
};

export const EditTaskModal = ({
  visible,
  task,
  onClose,
  onSave,
  onComplete,
  onAddSubtask,
  onRemoveSubtask,
}: EditTaskModalProps) => {
  const [draftTitle, setDraftTitle] = useState("");
  const [draftPriority, setDraftPriority] = useState(3);
  const [draftEnergy, setDraftEnergy] = useState(3);
  const [draftDueDate, setDraftDueDate] = useState<Date | null>(null);
  const [draftSubtasks, setDraftSubtasks] = useState<Subtask[]>([]);
  const [subtaskDraft, setSubtaskDraft] = useState("");
  const [showSubtaskPrompt, setShowSubtaskPrompt] = useState(false);
  const [showDatePrompt, setShowDatePrompt] = useState(false);
  const [dateDraft, setDateDraft] = useState("");

  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!task || !visible) return;
    setDraftTitle(task.title);
    setDraftPriority(task.priority);
    setDraftEnergy(task.energy);
    setDraftDueDate(task.dueDate ? new Date(task.dueDate) : null);
    setDraftSubtasks(task.subtasks);
    setSubtaskDraft("");
    setShowSubtaskPrompt(false);
    setShowDatePrompt(false);
    setDateDraft(task.dueDate ? task.dueDate.slice(0, 10) : "");
  }, [task?.id, visible]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      ]).start();
    } else {
      opacity.setValue(0);
      scale.setValue(0.85);
    }
  }, [opacity, scale, visible]);

  const previewSize = getBubbleSize(draftPriority) + 18;
  const previewColors = useMemo(
    () => getEnergyColors(draftEnergy),
    [draftEnergy],
  );

  const applyQuickDate = (daysFromNow: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    setDraftDueDate(date);
    setDateDraft(date.toISOString().slice(0, 10));
  };

  const applyTypedDate = () => {
    const trimmed = dateDraft.trim();
    if (!trimmed) {
      setDraftDueDate(null);
      setShowDatePrompt(false);
      return;
    }
    const parts = trimmed.split("-").map((part) => Number(part));
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return;
    const [year, month, day] = parts;
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) return;
    setDraftDueDate(date);
    setShowDatePrompt(false);
  };

  if (!task) return null;

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSave(task.id, {
      title: draftTitle.trim() || task.title,
      subtasks: draftSubtasks,
      priority: draftPriority,
      energy: draftEnergy,
      dueDate: draftDueDate ? toIsoDate(draftDueDate) : null,
    });
    onClose();
  };

  const handleDelete = () => {
    Alert.alert("Delete task bubble?", "This will remove the bubble permanently.", [
      { text: "No, Cancel", style: "cancel" },
      {
        text: "Yes, Delete",
        style: "destructive",
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          onComplete(task.id);
        },
      },
    ]);
  };

  const handleAddSubtask = () => {
    if (task.subtasks.length >= 6) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const title = subtaskDraft.trim() || `Subtask ${task.subtasks.length + 1}`;
    setDraftSubtasks([
      ...draftSubtasks,
      { id: `sub-${Date.now()}`, title: title, completed: false },
    ]);
    setSubtaskDraft("");
    setShowSubtaskPrompt(false);
  };

  const handleRemoveSubtask = (subtaskId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDraftSubtasks(draftSubtasks.filter((sub) => sub.id !== subtaskId));
  };

  const handleToggleSubtask = (subtaskId: string) => {
    setDraftSubtasks(
      draftSubtasks.map((sub) =>
        sub.id === subtaskId ? { ...sub, completed: !sub.completed } : sub,
      ),
    );
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const hasDate = draftDueDate !== null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <BlurView intensity={60} tint="light" style={styles.blur} />
        <View style={styles.stage}>
          <Animated.View
            style={[styles.previewDock, { opacity, transform: [{ scale }] }]}
          >
            <Bubble
              title={draftTitle || "Untitled"}
              size={previewSize}
              colors={previewColors}
              energyLevel={draftEnergy}
              subtasks={draftSubtasks}
              floating={false}
            />
            <Pressable
              style={styles.addSubtaskBubble}
              onPress={() => setShowSubtaskPrompt(true)}
            >
              <Text style={styles.addSubtaskText}>+</Text>
            </Pressable>
          </Animated.View>

          <Animated.View
            style={[styles.card, { opacity, transform: [{ scale }] }]}
          >
            <View style={styles.header}>
              <Text style={styles.title}>Edit Task</Text>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeText}>DISCARD CHANGES</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              indicatorStyle="black"
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              {/* ── Task Name Section ── */}
              <View style={styles.section}>
                <Text style={styles.sectionLegend}>Task name</Text>
                <TextInput
                  value={draftTitle}
                  onChangeText={setDraftTitle}
                  style={styles.input}
                  placeholder="Rename task"
                  placeholderTextColor={Colors.light.textDim}
                />
              </View>

              {/* ── Subtasks Section ── */}
              <View style={styles.section}>
                <Text style={styles.sectionLegend}>Subtasks</Text>

                {draftSubtasks.length === 0 && (
                  <Text style={styles.emptyPlaceholder}>No subtasks yet</Text>
                )}

                {draftSubtasks.slice(0, 6).map((subtask) => (
                  <View key={subtask.id} style={styles.row}>
                    {/* Checkbox toggle */}
                    <Pressable
                      onPress={() => handleToggleSubtask(subtask.id)}
                      style={[
                        styles.checkbox,
                        subtask.completed && styles.checkboxChecked,
                      ]}
                    >
                      {subtask.completed && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </Pressable>

                    <TextInput
                      value={subtask.title}
                      onChangeText={(input) =>
                        setDraftSubtasks(
                          draftSubtasks.map((sub) =>
                            sub.id === subtask.id
                              ? { ...subtask, title: input }
                              : sub,
                          ),
                        )
                      }
                      style={[
                        styles.subtaskInput,
                        subtask.completed && styles.subtaskCompleted,
                      ]}
                      placeholder="Rename subtask"
                      placeholderTextColor={Colors.light.textDim}
                    />
                    <Pressable
                      onPress={() => handleRemoveSubtask(subtask.id)}
                      style={styles.removeSubtaskButton}
                    >
                      <Text style={styles.removeSubtaskText}>Pop!</Text>
                    </Pressable>
                  </View>
                ))}
                {draftSubtasks.length < 6 && (
                  <TextInput
                    value={subtaskDraft}
                    onChangeText={setSubtaskDraft}
                    onSubmitEditing={handleAddSubtask}
                    style={styles.input}
                    placeholder="Add a subtask"
                    placeholderTextColor={Colors.light.textDim}
                  />
                )}
              </View>

              {/* ── Due Date Section ── */}
              <View style={styles.section}>
                <Text style={styles.sectionLegend}>Due date</Text>
                <Pressable
                  onPress={() => setShowDatePrompt(true)}
                  style={[
                    styles.dateButton,
                    hasDate && styles.dateButtonActive,
                  ]}
                >
                  <Text
                    style={[styles.dateText, hasDate && styles.dateTextActive]}
                  >
                    {hasDate ? "📅  " : ""}
                    {formatDate(draftDueDate?.toISOString() ?? null)}
                  </Text>
                </Pressable>
                <View style={styles.quickDatesRow}>
                  <Pressable
                    onPress={() => applyQuickDate(0)}
                    style={styles.quickDateChip}
                  >
                    <Text style={styles.quickDateText}>Today</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => applyQuickDate(1)}
                    style={styles.quickDateChip}
                  >
                    <Text style={styles.quickDateText}>Tomorrow</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => applyQuickDate(7)}
                    style={styles.quickDateChip}
                  >
                    <Text style={styles.quickDateText}>Next Week</Text>
                  </Pressable>
                  {hasDate && (
                    <Pressable
                      onPress={() => setDraftDueDate(null)}
                      style={styles.quickDateChipClear}
                    >
                      <Text style={styles.quickDateTextClear}>Clear</Text>
                    </Pressable>
                  )}
                </View>
              </View>

              {/* ── Priority Slider Section ── */}
              <View style={styles.section}>
                <View style={styles.sliderLabelRow}>
                  <Text
                    style={[
                      styles.sectionLegend,
                      { position: "relative", top: 0, left: 0 },
                    ]}
                  >
                    Priority
                  </Text>
                  <View style={styles.sliderBadge}>
                    <Text style={styles.sliderBadgeText}>{draftPriority}</Text>
                  </View>
                </View>
                <Slider
                  minimumValue={1}
                  maximumValue={5}
                  step={1}
                  value={draftPriority}
                  onValueChange={setDraftPriority}
                  minimumTrackTintColor="#1D2733"
                  maximumTrackTintColor="rgba(29,39,51,0.2)"
                  thumbTintColor="#1D2733"
                  style={styles.slider}
                />
                <Text style={styles.sliderCaption}>
                  Bigger bubble means higher priority.
                </Text>
              </View>

              {/* ── Energy Slider Section ── */}
              <View style={styles.section}>
                <View style={styles.sliderLabelRow}>
                  <Text
                    style={[
                      styles.sectionLegend,
                      { position: "relative", top: 0, left: 0 },
                    ]}
                  >
                    Energy
                  </Text>
                  <View
                    style={[
                      styles.sliderBadge,
                      { backgroundColor: "rgba(255,143,122,0.15)" },
                    ]}
                  >
                    <Text
                      style={[styles.sliderBadgeText, { color: "#FF8F7A" }]}
                    >
                      {draftEnergy}
                    </Text>
                  </View>
                </View>
                <Slider
                  minimumValue={1}
                  maximumValue={5}
                  step={1}
                  value={draftEnergy}
                  onValueChange={setDraftEnergy}
                  minimumTrackTintColor="#FF8F7A"
                  maximumTrackTintColor="rgba(29,39,51,0.2)"
                  thumbTintColor="#FF8F7A"
                  style={styles.slider}
                />
                <Text style={styles.sliderCaption}>
                  Warmer colors = less energy you need to do this task.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <Pressable onPress={handleDelete} style={styles.deleteButton}>
                <Text style={styles.deleteText}>Delete bubble</Text>
              </Pressable>
              <Pressable onPress={handleSave} style={styles.saveButton}>
                <Text style={styles.saveText}>Save changes</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>

        {showDatePrompt && (
          <Modal transparent animationType="fade">
            <View style={styles.pickerOverlay}>
              <View style={styles.pickerCard}>
                <Text style={styles.promptTitle}>Set due date</Text>

                <DateTimePicker
                  value={draftDueDate ?? tomorrow}
                  mode="date"
                  display="inline"
                  minimumDate={tomorrow}
                  onChange={(event, selectedDate) => {
                    if (event.type === "set" && selectedDate) {
                      setDraftDueDate(selectedDate);
                      if (Platform.OS === "android") setShowDatePrompt(false);
                    }
                  }}
                  themeVariant="light"
                  accentColor="#1D2733"
                  textColor="#1D2733"
                />

                {Platform.OS === "ios" && (
                  <View style={styles.datePromptActions}>
                    <Pressable
                      onPress={() => setShowDatePrompt(false)}
                      style={styles.promptCancel}
                    >
                      <Text style={styles.promptCancelText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setShowDatePrompt(false)}
                      style={styles.promptAdd}
                    >
                      <Text style={styles.promptAddText}>Set</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          </Modal>
        )}

        {showSubtaskPrompt && (
          <Modal transparent animationType="fade">
            <View style={styles.pickerOverlay}>
              <View style={styles.pickerCard}>
                <Text style={styles.promptTitle}>New subtask</Text>
                <TextInput
                  value={subtaskDraft}
                  onChangeText={setSubtaskDraft}
                  placeholder="Name your subtask"
                  placeholderTextColor={Colors.light.textDim}
                  style={styles.input}
                  autoFocus
                />
                <View style={styles.promptActions}>
                  <Pressable
                    onPress={() => setShowSubtaskPrompt(false)}
                    style={styles.promptCancel}
                  >
                    <Text style={styles.promptCancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleAddSubtask}
                    style={styles.promptAdd}
                  >
                    <Text style={styles.promptAddText}>Add</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
};

const SECTION_BORDER_COLOR = "rgba(29,39,51,0.10)";

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(10, 16, 26, 0.45)",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  blur: {
    ...StyleSheet.absoluteFillObject,
  },
  stage: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    height: "100%",
  },
  previewDock: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 80,
    marginBottom: 40,
    zIndex: 2,
  },
  card: {
    flexShrink: 1,
    backgroundColor: Colors.light.surface,
    borderRadius: Radii.xxxl,
    padding: Spacing.xxl,
    ...Platform.select({
      web: {
        boxShadow: "0px 12px 24px rgba(14, 26, 42, 0.25)",
      },
      default: {
        shadowColor: "rgb(14, 26, 42)",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
        elevation: 10,
      },
    }),
    width: "100%",
    maxWidth: 420,
    overflow: "hidden",
    zIndex: 1,
  },
  body: {
    flexShrink: 1,
  },
  bodyContent: {
    paddingBottom: Spacing.md,
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.light.primary,
  },
  closeButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radii.round,
    backgroundColor: Colors.light.buttonBackground,
  },
  closeText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.light.primary,
  },
  addSubtaskBubble: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 32,
    height: 32,
    borderRadius: Radii.round,
    backgroundColor: Colors.light.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  addSubtaskText: {
    color: Colors.light.white,
    fontSize: 20,
  },

  /* ── Section / Fieldset Legend ── */
  section: {
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderColor: SECTION_BORDER_COLOR,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    paddingTop: Spacing.lg,
    gap: Spacing.sm,
  },
  sectionLegend: {
    position: "absolute",
    top: -9,
    left: Spacing.md,
    paddingHorizontal: 6,
    backgroundColor: Colors.light.surface,
    fontSize: 11,
    fontWeight: "700",
    color: Colors.light.textDim,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },

  input: {
    borderRadius: Radii.lg,
    backgroundColor: Colors.light.background,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 14,
    color: Colors.light.primary,
  },

  /* ── Subtask rows ── */
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radii.lg,
    backgroundColor: Colors.light.background,
    paddingLeft: Spacing.sm,
    ...Platform.select({
      web: {
        boxShadow: "0px 8px 16px rgba(14, 26, 42, 0.2)",
      },
      default: {
        shadowColor: "rgb(14, 26, 42)",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 4,
      },
    }),
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.light.textDim,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  checkboxChecked: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  checkmark: {
    color: Colors.light.white,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 15,
  },
  subtaskInput: {
    flex: 1,
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
    fontSize: 14,
    color: Colors.light.primary,
  },
  subtaskCompleted: {
    textDecorationLine: "line-through",
    opacity: 0.45,
    color: Colors.light.textDim,
  },
  removeSubtaskButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radii.round,
    backgroundColor: Colors.light.buttonBackground,
    marginRight: Spacing.xs,
  },
  removeSubtaskText: {
    color: Colors.light.primary,
    fontSize: 12,
    fontWeight: "600",
  },
  emptyPlaceholder: {
    fontSize: 13,
    color: Colors.light.textDim,
    fontStyle: "italic",
    paddingVertical: Spacing.xs,
  },

  /* ── Due Date ── */
  dateButton: {
    borderRadius: Radii.lg,
    backgroundColor: Colors.light.buttonBackground,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  dateButtonActive: {
    backgroundColor: "rgba(29,39,51,0.12)",
  },
  dateText: {
    color: Colors.light.textDim,
    fontSize: 14,
  },
  dateTextActive: {
    color: Colors.light.primary,
    fontWeight: "600",
  },
  quickDatesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  quickDateChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radii.round,
    backgroundColor: Colors.light.buttonBackground,
  },
  quickDateText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.light.primary,
  },
  quickDateChipClear: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radii.round,
    backgroundColor: Colors.light.dangerBg,
  },
  quickDateTextClear: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.light.danger,
  },

  /* ── Sliders ── */
  sliderLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sliderBadge: {
    minWidth: 26,
    height: 26,
    borderRadius: Radii.round,
    backgroundColor: "rgba(29,39,51,0.08)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  sliderBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.light.primary,
  },
  slider: {
    width: "100%",
  },
  sliderCaption: {
    fontSize: 12,
    color: Colors.light.textDim,
    marginTop: Spacing.xs,
  },

  /* ── Footer ── */
  footer: {
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: SECTION_BORDER_COLOR,
    borderRadius: Radii.lg,
    marginTop: Spacing.xxl,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  deleteButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.lg,
    backgroundColor: Colors.light.dangerBg,
    alignItems: "center",
  },
  deleteText: {
    color: Colors.light.danger,
    fontWeight: "600",
    fontSize: 15,
  },
  saveButton: {
    flex: 1,
    paddingVertical: Spacing.lg,
    borderRadius: Radii.lg,
    backgroundColor: Colors.light.primary,
    alignItems: "center",
  },
  saveText: {
    color: Colors.light.white,
    fontWeight: "700",
    fontSize: 15,
  },

  /* ── Picker / Prompt Modals ── */
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(10, 16, 26, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xxl,
  },
  pickerCard: {
    width: "100%",
    maxWidth: 500,
    borderRadius: Radii.xl,
    backgroundColor: Colors.light.background,
    padding: Spacing.lg,
  },
  pickerClose: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    backgroundColor: Colors.light.primary,
    alignItems: "center",
  },
  pickerCloseText: {
    color: Colors.light.white,
    fontWeight: "600",
  },
  promptTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.light.primary,
    marginBottom: Spacing.sm,
  },
  promptActions: {
    marginTop: Spacing.md,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Spacing.sm,
  },
  datePromptActions: {
    marginTop: Spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  promptCancel: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.sm,
    backgroundColor: Colors.light.buttonBackground,
  },
  promptCancelText: {
    color: Colors.light.primary,
    fontWeight: "600",
  },
  promptAdd: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.sm,
    backgroundColor: Colors.light.primary,
  },
  promptAddText: {
    color: Colors.light.white,
    fontWeight: "600",
  },

  /* ── Legacy / unused but kept for safety ── */
  rowInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.primary,
    marginBottom: 4,
  },
  rowMeta: {
    fontSize: 12,
    color: Colors.light.textDim,
  },
  restoreButton: {
    marginRight: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    backgroundColor: Colors.light.buttonBackground,
  },
  restoreText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.light.primary,
  },
});
