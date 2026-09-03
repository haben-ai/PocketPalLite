import React, {useEffect, useRef} from 'react';
import {Animated} from 'react-native';

/**
 * Fades + scales its child in the moment device analysis finishes and a
 * result first becomes available, instead of the card just popping in --
 * `revealKey` should change (e.g. to the recommended model's id) whenever a
 * fresh result should replay the animation, such as after re-analyzing.
 */
export function AnalysisRevealCard({
  children,
  revealKey,
}: {
  children: React.ReactNode;
  revealKey: string;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    Animated.spring(progress, {
      toValue: 1,
      friction: 7,
      tension: 60,
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealKey]);

  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [
          {
            scale: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0.92, 1],
            }),
          },
          {
            translateY: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [12, 0],
            }),
          },
        ],
      }}>
      {children}
    </Animated.View>
  );
}
