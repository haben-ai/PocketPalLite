import React, {useRef} from 'react';
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import {colors, elevation, radius, spacing} from '../theme';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

export function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const bg =
    variant === 'primary'
      ? colors.accent
      : variant === 'danger'
      ? colors.danger
      : colors.surfaceContainerHigh;
  const textColor = variant === 'secondary' ? colors.textPrimary : colors.onAccent;

  const animateTo = (toValue: number) =>
    Animated.spring(scale, {
      toValue,
      speed: 40,
      bounciness: 6,
      useNativeDriver: true,
    }).start();

  return (
    <TouchableOpacity
      disabled={disabled || loading}
      onPress={onPress}
      onPressIn={() => animateTo(0.97)}
      onPressOut={() => animateTo(1)}
      activeOpacity={0.9}>
      <Animated.View
        style={[
          styles.button,
          variant === 'primary' && elevation.level1,
          {backgroundColor: bg, opacity: disabled ? 0.5 : 1, transform: [{scale}]},
          style,
        ]}>
        {loading ? (
          <ActivityIndicator color={textColor} size="small" />
        ) : (
          <Text style={[styles.label, {color: textColor}]}>{label}</Text>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {fontSize: 15, fontWeight: '700'},
});
