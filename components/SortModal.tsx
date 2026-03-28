import { BlurView } from "expo-blur";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import { Colors, Radii, Spacing } from "@/constants/theme";
import { FilterBy } from "@/utils/bubbleLayout";

export type FilterModalProps = {
  visible: boolean;
  currentFilter: FilterBy;
  onSelect: (filter: FilterBy) => void;
  onClose: () => void;
};

export function FilterModal({
  visible,
  currentFilter,
  onSelect,
  onClose,  
}: FilterModalProps) {
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;

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

  const handleSelect = (filter: FilterBy) => {
    onSelect(filter);
    onClose();
  };

  function handleHideBubbles(currentFilter: string): void {
    throw new Error("Function not implemented.");
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <BlurView intensity={60} tint="light" style={styles.blur} />
        <View style={styles.stage}>
          <Animated.View
            style={[styles.card, { opacity, transform: [{ scale }] }]}
          >
            <View style={styles.header}>
              <Text style={styles.title}>Sort Bubbles</Text>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeText}>Close</Text>
              </Pressable>
            </View>

            <View style={styles.grid}>
              <View style={styles.gridRow}>
                <Pressable
                  onPress={() => handleSelect("default")}
                  style={[
                    styles.cell,
                    currentFilter === "default" && styles.cellActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.cellLabel,
                      currentFilter === "default" && styles.cellLabelActive,
                    ]}
                  >
                    Default
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => handleSelect("priority")}
                  style={[
                    styles.cell,
                    currentFilter === "priority" && styles.cellActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.cellLabel,
                      currentFilter === "priority" && styles.cellLabelActive,
                    ]}
                  >
                    Priority
                  </Text>
                </Pressable>
              </View>
              <View style={styles.gridRow}>
                <Pressable
                  onPress={() => handleSelect("energy")}
                  style={[
                    styles.cell,
                    currentFilter === "energy" && styles.cellActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.cellLabel,
                      currentFilter === "energy" && styles.cellLabelActive,
                    ]}
                  >
                    Energy
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => handleSelect("dueDate")}
                  style={[
                    styles.cell,
                    currentFilter === "dueDate" && styles.cellActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.cellLabel,
                      currentFilter === "dueDate" && styles.cellLabelActive,
                    ]}
                  >
                    Due Date
                  </Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(10, 16, 26, 0.45)",
    justifyContent: "center",
    padding: 20,
  },
  blur: {
    ...StyleSheet.absoluteFillObject,
  },
  stage: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 44,
    paddingTop: 70,
  },
  card: {
    backgroundColor: "#F9FBFF",
    borderRadius: 28,
    padding: 22,
    // iOS
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
    width: 320,
    overflow: "hidden",
    zIndex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1D2733",
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(29,39,51,0.08)",
  },
  closeText: {
    color: "#1D2733",
    fontSize: 12,
    fontWeight: "600",
  },
  grid: {
    gap: Spacing.sm,
  },
  gridRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: Radii.lg,
    backgroundColor: Colors.light.buttonBackground,
    borderWidth: 1,
    borderColor: "rgba(29, 39, 51, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  cellActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  cellLabel: {
    color: Colors.light.textDim,
    fontSize: 16,
    fontWeight: "600",
  },
  cellLabelActive: {
    color: Colors.light.white,
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
});
