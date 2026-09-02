import React, {useState} from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {colors, radius, spacing, typography} from '../theme';
import {AppSettings, MirostatMode} from '../storage/appSettings';
import {Slider} from './Slider';

function formatValue(value: number, decimals: number): string {
  return decimals === 0 ? String(Math.round(value)) : value.toFixed(decimals);
}

function SliderRow({
  label,
  description,
  value,
  min,
  max,
  step,
  decimals,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step: number;
  decimals: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowDescription}>{description}</Text>
      <View style={styles.sliderRow}>
        <View style={styles.sliderTrackWrap}>
          <Slider value={value} min={min} max={max} step={step} onValueChange={onChange} />
        </View>
        <View style={styles.valueBox}>
          <Text style={styles.valueBoxText}>{formatValue(value, decimals)}</Text>
        </View>
      </View>
    </View>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={[styles.row, styles.toggleRow]}>
      <View style={styles.toggleTextCol}>
        <Text style={styles.rowLabel}>{label}</Text>
        {description ? <Text style={styles.rowDescription}>{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{false: colors.surfaceContainerHigh, true: colors.accent}}
        thumbColor={colors.textPrimary}
      />
    </View>
  );
}

function SegmentedRow<T extends string | number>({
  label,
  description,
  options,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  options: {value: T; label: string}[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {description ? <Text style={styles.rowDescription}>{description}</Text> : null}
      <View style={styles.segmentedControl}>
        {options.map((opt, i) => (
          <TouchableOpacity
            key={String(opt.value)}
            style={[
              styles.segment,
              value === opt.value && styles.segmentActive,
              i > 0 && styles.segmentBorder,
            ]}
            onPress={() => onChange(opt.value)}>
            <Text
              style={[styles.segmentLabel, value === opt.value && styles.segmentLabelActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

/**
 * Full-screen "Chat Generation Settings" sheet. Every control here maps to
 * a real llama.cpp sampling param (see services/inferenceEngine.ts) -- this
 * is live generation configuration, not a cosmetic settings mockup.
 */
export function GenerationSettingsSheet({
  visible,
  settings,
  onClose,
  onSave,
  onResetToDefaults,
}: {
  visible: boolean;
  settings: AppSettings;
  onClose: () => void;
  onSave: (next: AppSettings) => void;
  onResetToDefaults: () => void;
}) {
  const [draft, setDraft] = useState<AppSettings>(settings);

  // Re-sync the draft whenever the sheet is (re)opened with fresh settings
  // (e.g. after a Reset), so edits never start from a stale snapshot.
  const [lastOpenedWith, setLastOpenedWith] = useState(settings);
  if (visible && lastOpenedWith !== settings) {
    setLastOpenedWith(settings);
    setDraft(settings);
  }

  const patch = (p: Partial<AppSettings>) => setDraft(prev => ({...prev, ...p}));

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={typography.heading}>Chat Generation Settings</Text>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Text style={styles.closeLabel}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.row}>
            <Text style={styles.rowLabel}>N Predict</Text>
            <Text style={styles.rowDescription}>
              Maximum number of tokens to generate. Set to Unlimited for no limit, or Custom to
              specify a value.
            </Text>
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[
                  styles.segment,
                  draft.nPredictMode === 'unlimited' && styles.segmentActive,
                ]}
                onPress={() => patch({nPredictMode: 'unlimited'})}>
                <Text
                  style={[
                    styles.segmentLabel,
                    draft.nPredictMode === 'unlimited' && styles.segmentLabelActive,
                  ]}>
                  Unlimited
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segment,
                  styles.segmentBorder,
                  draft.nPredictMode === 'custom' && styles.segmentActive,
                ]}
                onPress={() => patch({nPredictMode: 'custom'})}>
                <Text
                  style={[
                    styles.segmentLabel,
                    draft.nPredictMode === 'custom' && styles.segmentLabelActive,
                  ]}>
                  Custom
                </Text>
              </TouchableOpacity>
            </View>
            {draft.nPredictMode === 'custom' && (
              <TextInput
                value={String(draft.maxTokens)}
                onChangeText={t => {
                  const n = parseInt(t.replace(/[^0-9]/g, ''), 10);
                  patch({maxTokens: Number.isFinite(n) ? n : 0});
                }}
                keyboardType="number-pad"
                style={styles.textInput}
              />
            )}
          </View>

          <ToggleRow
            label="Include Thinking In Context"
            description="Include AI thinking/reasoning parts in the context sent to the model. Disabling this can save context space. It might impact performance."
            value={draft.includeThinkingInContext}
            onChange={v => patch({includeThinkingInContext: v})}
          />

          <SliderRow
            label="Temperature"
            description="Control creativity vs predictability. Higher values make responses more creative but less focused"
            value={draft.temperature}
            min={0}
            max={2}
            step={0.05}
            decimals={2}
            onChange={v => patch({temperature: v})}
          />
          <SliderRow
            label="Top K"
            description="Control creativity by limiting word choices to the K most likely options. Lower values make responses more focused"
            value={draft.topK}
            min={0}
            max={100}
            step={1}
            decimals={0}
            onChange={v => patch({topK: v})}
          />
          <SliderRow
            label="Top P"
            description="Balance creativity and coherence. Higher values (near 1.0) allow more creative but potentially less focused responses"
            value={draft.topP}
            min={0}
            max={1}
            step={0.01}
            decimals={2}
            onChange={v => patch({topP: v})}
          />
          <SliderRow
            label="Min P"
            description="The minimum probability for a token to be considered. Filter out unlikely words to reduce nonsensical or out-of-context responses"
            value={draft.minP}
            min={0}
            max={1}
            step={0.01}
            decimals={2}
            onChange={v => patch({minP: v})}
          />
          <SliderRow
            label="XTC Threshold"
            description="Set a minimum probability threshold for tokens to be removed via XTC sampler. (> 0.5 disables XTC)"
            value={draft.xtcThreshold}
            min={0}
            max={1}
            step={0.01}
            decimals={2}
            onChange={v => patch({xtcThreshold: v})}
          />
          <SliderRow
            label="XTC Probability"
            description="Set the chance for token removal via XTC sampler. 0 is disabled"
            value={draft.xtcProbability}
            min={0}
            max={1}
            step={0.01}
            decimals={2}
            onChange={v => patch({xtcProbability: v})}
          />
          <SliderRow
            label="Typical P"
            description="Enable locally typical sampling with parameter p. 1.0 is disabled"
            value={draft.typicalP}
            min={0}
            max={1}
            step={0.01}
            decimals={2}
            onChange={v => patch({typicalP: v})}
          />
          <SliderRow
            label="Penalty Last_N"
            description="How far back to check for repetition. Larger values help prevent long-term repetition"
            value={draft.penaltyLastN}
            min={0}
            max={256}
            step={1}
            decimals={0}
            onChange={v => patch({penaltyLastN: v})}
          />
          <SliderRow
            label="Penalty Repeat"
            description="Discourage word repetition. Higher values make responses use more diverse language"
            value={draft.penaltyRepeat}
            min={0}
            max={2}
            step={0.01}
            decimals={2}
            onChange={v => patch({penaltyRepeat: v})}
          />
          <SliderRow
            label="Penalty Freq"
            description="Penalize overused words. Higher values encourage using a broader vocabulary"
            value={draft.penaltyFreq}
            min={0}
            max={2}
            step={0.01}
            decimals={2}
            onChange={v => patch({penaltyFreq: v})}
          />
          <SliderRow
            label="Penalty Present"
            description="Reduce repetition of themes and ideas. Higher values encourage more diverse content"
            value={draft.penaltyPresent}
            min={0}
            max={2}
            step={0.01}
            decimals={2}
            onChange={v => patch({penaltyPresent: v})}
          />

          <SegmentedRow<MirostatMode>
            label="Mirostat"
            description="Enable advanced control over response creativity. Set to 1 or 2 (smoother) for smart, real-time adjustments to randomness and coherence."
            options={[
              {value: 0, label: 'Off'},
              {value: 1, label: 'v1'},
              {value: 2, label: 'v2'},
            ]}
            value={draft.mirostat}
            onChange={v => patch({mirostat: v})}
          />

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Seed</Text>
            <Text style={styles.rowDescription}>
              Set the random number generator seed. Useful for reproducible results
            </Text>
            <TextInput
              value={String(draft.seed)}
              onChangeText={t => {
                const n = parseInt(t.replace(/[^0-9-]/g, ''), 10);
                patch({seed: Number.isFinite(n) ? n : -1});
              }}
              keyboardType="numbers-and-punctuation"
              style={styles.textInput}
            />
          </View>

          <ToggleRow
            label="Jinja"
            description="Enable Jinja templating for chat formatting. When enabled, uses Jinja-based chat template processing for better compatibility with modern models."
            value={draft.jinja}
            onChange={v => patch({jinja: v})}
          />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            onPress={() => {
              onResetToDefaults();
            }}>
            <Text style={styles.resetLabel}>Reset to System Defaults</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={() => {
              onSave(draft);
              onClose();
            }}>
            <Text style={styles.saveLabel}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  closeLabel: {color: colors.textSecondary, fontSize: 20},
  content: {padding: spacing.md, paddingBottom: spacing.xl},
  row: {marginBottom: spacing.lg},
  rowLabel: {...typography.small, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5},
  rowDescription: {...typography.caption, marginTop: 4, marginBottom: spacing.sm, lineHeight: 18},
  sliderRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  sliderTrackWrap: {flex: 1},
  valueBox: {
    minWidth: 56,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  valueBoxText: {...typography.body},
  toggleRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  toggleTextCol: {flex: 1, marginRight: spacing.md},
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  segment: {flex: 1, paddingVertical: 10, alignItems: 'center'},
  segmentBorder: {borderLeftWidth: 1, borderLeftColor: colors.border},
  segmentActive: {backgroundColor: colors.surfaceContainerHigh},
  segmentLabel: {...typography.body, color: colors.textSecondary},
  segmentLabelActive: {color: colors.textPrimary, fontWeight: '700'},
  textInput: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resetLabel: {...typography.caption, color: colors.textSecondary},
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
  },
  saveLabel: {color: colors.onAccent, fontWeight: '700'},
});
