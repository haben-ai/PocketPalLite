import React, {useEffect, useRef} from 'react';
import {Animated} from 'react-native';
import {colors} from '../theme';

/** A soft, restrained blinking cursor for the streaming assistant bubble. */
export function BlinkingCursor() {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.15,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{
        width: 8,
        height: 16,
        marginLeft: 2,
        borderRadius: 2,
        backgroundColor: colors.textPrimary,
        opacity,
      }}
    />
  );
}
