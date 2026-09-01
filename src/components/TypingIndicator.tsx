import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet, View} from 'react-native';
import {colors} from '../theme';

const DOT_COUNT = 3;
const BOUNCE_HEIGHT = 5;
const DOT_DURATION = 360;
const STAGGER = 120;

/**
 * ChatGPT-style three-dot "typing" wave: each dot bounces up and down in
 * sequence, one stagger-delay behind the last, looping continuously while
 * the assistant is streaming a reply.
 */
export function TypingIndicator() {
  const values = useRef(
    Array.from({length: DOT_COUNT}, () => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    const loops = values.map((value, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * STAGGER),
          Animated.timing(value, {
            toValue: 1,
            duration: DOT_DURATION / 2,
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: DOT_DURATION / 2,
            useNativeDriver: true,
          }),
          Animated.delay((DOT_COUNT - 1 - i) * STAGGER),
        ]),
      ),
    );
    loops.forEach(loop => loop.start());
    return () => loops.forEach(loop => loop.stop());
  }, [values]);

  return (
    <View style={styles.row}>
      {values.map((value, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            {
              transform: [
                {
                  translateY: value.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -BOUNCE_HEIGHT],
                  }),
                },
              ],
              opacity: value.interpolate({
                inputRange: [0, 1],
                outputRange: [0.4, 1],
              }),
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center', gap: 4, height: 16},
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textPrimary,
  },
});
