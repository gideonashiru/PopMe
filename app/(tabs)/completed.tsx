import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCompleted } from '@/store/completed-context';
import { useTasks } from '@/store/tasks-context';
import { CompletedTask } from '@/types/task';
import { formatDate } from '@/utils/date';

export default function CompletedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { completedTasks, reinflateTask, clearAll } = useCompleted();
  const { addTask } = useTasks();

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleReinflate = (id: string) => {
    const task = reinflateTask(id);
    if (!task) return;
    addTask(task.title, {
      priority: task.priority,
      energy: task.energy,
      dueDate: task.dueDate,
      subtasks: task.subtasks,
      status: 'active',
      position: task.originalPosition,
    });
  };

  const handleClearAll = () => {
    clearAll();
    setShowClearConfirm(false);
  };

  const renderCard = ({ item }: { item: CompletedTask }) => (
    <View style={styles.card}>
      <View style={styles.cardBubble}>
        <View style={styles.cardBubbleInner} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.cardMeta}>
          Completed on {formatDate(item.completedAt)}
          {item.subtasks.length > 0 && ` · ${item.subtasks.length} subtask${item.subtasks.length > 1 ? 's' : ''}`}
        </Text>
      </View>
      <Pressable
        onPress={() => handleReinflate(item.id)}
        style={styles.reinflateButton}>
        <Text style={styles.reinflateText}>Reinflate</Text>
      </Pressable>
    </View>
  );

  return (
    <LinearGradient
      colors={['#F9FBFF', '#DDEBFF']}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Completed</Text>
        {completedTasks.length > 0 && (
          <Pressable
            onPress={() => setShowClearConfirm(true)}
            style={styles.clearButton}>
            <Text style={styles.clearText}>Clear All</Text>
          </Pressable>
        )}
      </View>

      {/* List */}
      {completedTasks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No completed tasks yet.</Text>
          <Text style={styles.emptyHint}>
            Use the pin icon on the Home screen to pop tasks here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={completedTasks}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Clear All Confirmation */}
      <Modal
        transparent
        visible={showClearConfirm}
        animationType="fade"
        onRequestClose={() => setShowClearConfirm(false)}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>
              Delete all completed tasks?
            </Text>
            <Text style={styles.confirmSubtitle}>
              This action cannot be undone.
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                onPress={() => setShowClearConfirm(false)}
                style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleClearAll} style={styles.deleteBtn}>
                <Text style={styles.deleteText}>Delete All</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
    marginBottom: 12,
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(29, 39, 51, 0.08)',
  },
  backText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1D2733',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1D2733',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 115, 115, 0.15)',
  },
  clearText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B24040',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7C93',
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 13,
    color: '#9BAAB8',
    textAlign: 'center',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    gap: 12,
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 10px rgba(14, 26, 42, 0.1)',
      },
      default: {
        shadowColor: 'rgb(14, 26, 42)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 4,
      },
    }),
    opacity: 0.7,
  },
  cardBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBubbleInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#CBD5E1',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
  },
  cardMeta: {
    fontSize: 11,
    color: '#9BAAB8',
    marginTop: 2,
  },
  reinflateButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#0a7ea4',
  },
  reinflateText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 16, 26, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 22,
    ...Platform.select({
      web: {
        boxShadow: '0px 8px 16px rgba(14, 26, 42, 0.2)',
      },
      default: {
        shadowColor: 'rgb(14, 26, 42)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 8,
      },
    }),
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1D2733',
    marginBottom: 6,
  },
  confirmSubtitle: {
    fontSize: 13,
    color: '#6B7C93',
    marginBottom: 18,
  },
  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(29,39,51,0.08)',
  },
  cancelText: {
    color: '#1D2733',
    fontWeight: '600',
  },
  deleteBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#E53E3E',
  },
  deleteText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
