import React, {useRef} from 'react';
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import {elevation, radius, spacing} from '../theme';
import {useTheme} from '../theme/ThemeContext';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  /** Renders in place of the text label when given -- `label` is still
   * required and used as the accessibility label for screen readers, since
   * an icon alone conveys nothing to them. Receives the same color the
   * text label would have used, so it stays legible across variants. */
  icon?: (color: string) => React.ReactNode;
  /** Overrides the label's font -- e.g. onboarding's Nunito Sans, which
   * every other call site leaves unset and keeps the app's default. */
  labelStyle?: TextStyle;
};

export function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
  icon,
  labelStyle,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const {colors} = useTheme();
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
      activeOpacity={0.9}
      accessibilityLabel={icon ? label : undefined}>
      <Animated.View
        style={[
          styles.button,
          variant === 'primary' && elevation.level1,
          {backgroundColor: bg, opacity: disabled ? 0.5 : 1, transform: [{scale}]},
          style,
        ]}>
        {loading ? (
          <ActivityIndicator color={textColor} size="small" />
        ) : icon ? (
          icon(textColor)
        ) : (
          <Text style={[styles.label, {color: textColor}, labelStyle]}>{label}</Text>
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
