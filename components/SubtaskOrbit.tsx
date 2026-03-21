import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';

import { Subtask } from '@/types/task';

export const SubtaskOrbit = ({
  subtasks,
  parentSize,
  colors,
}: {
  subtasks: Subtask[];
  parentSize: number;
  colors: [string, string];
}) => {
  if (!subtasks.length) return null;

  const maxBubbles = Math.min(subtasks.length, 6);
  const radius = parentSize / 2 + 26;
  const bubbleSize = Math.max(32, Math.min(48, parentSize * 0.36));

  return (
    <View style={styles.container}>
      {subtasks.slice(0, maxBubbles).map((subtask, index) => {
        const angle = - (Math.PI * index) / maxBubbles - 3 / 4 * Math.PI ;
        const x = radius * Math.cos(angle) - bubbleSize / 2;
        const y = radius * Math.sin(angle) - bubbleSize / 2;
        const label = subtask.title.trim() || '...';

        return (
          <View
            key={subtask.id}
            style={[
              styles.bubble,
              {
                width: bubbleSize,
                height: bubbleSize,
                borderRadius: bubbleSize / 2,
                transform: [{ translateX: x }, { translateY: y }],
                opacity: subtask.completed ? 0.5 : 1,
              },
            ]}>
            <LinearGradient colors={colors} style={styles.gradient} />
            <View style={styles.gloss} />
            <Text numberOfLines={2} adjustsFontSizeToFit style={styles.text}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '50%',
    left: '50%',
  },
  bubble: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 8px rgba(29, 39, 51, 0.12)',
      },
      default: {
        shadowColor: 'rgb(29, 39, 51)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 4,
      },
    }),
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  gloss: {
    position: 'absolute',
    top: '12%',
    left: '18%',
    width: '50%',
    height: '32%',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    transform: [{ rotate: '-12deg' }],
  },
  text: {
    paddingHorizontal: 8,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '600',
    color: '#1D2733',
  },
});
