import { CATEGORIES, CATEGORY_KEYS, hasSize } from '@resale/domain/item/categories';
import { CHANNEL_KEYS, CHANNELS } from '@resale/domain/item/channels';
import { CONDITION_KEYS, CONDITIONS } from '@resale/domain/item/condition';
import { MAX_TITLE_LENGTH } from '@resale/domain/item/item';
import type { StatusAction } from '@resale/domain/item/status';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Chips } from '../form/Chips';
import { ConfirmDialog } from '../form/ConfirmDialog';
import { Field, inputStyle, missingStyle } from '../form/Field';
import type { HistoryEntry } from './historyEntries';
import type { FormIssues, ItemForm } from './itemForm';
import { ItemHistory } from './ItemHistory';
import type { ItemChoices, ItemDetail } from './itemQueries';
import { STATUS_ACTION_LABELS } from './statusLabels';

export type ItemViewProps = {
  isNew: boolean;
  /** `null` while loading, and for a new item. */
  detail: ItemDetail | null;
  /** The suggestions; `null` until loaded. */
  choices: ItemChoices | null;
  /** `null` until the item has loaded. */
  form: ItemForm | null;
  issues: FormIssues;
  changed: boolean;
  loading: boolean;
  error: string | null;
  saving: boolean;
  saveError: string | null;
  /** The item changed since it was opened: offer to reload. */
  conflict: boolean;
  onChange: (form: ItemForm) => void;
  onSave: () => void;
  onReload: () => void;
  onBack: () => void;
  history: HistoryEntry[] | null;
  historyError: string | null;
  /** Why the status and copy buttons wait; `null` when they can be pressed. */
  waitReason: string | null;
  acting: boolean;
  actionError: string | null;
  onStatus: (action: StatusAction) => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

const STATUS_NAMES = { available: 'Available', sold: 'Sold', archived: 'Archived' } as const;

/** Up to six suggestions that start with what's typed, leaving out what's already there. */
const suggest = (options: readonly string[], typed: string, taken: readonly string[] = []) => {
  const start = typed.trim().toLowerCase();
  return options
    .filter(
      (option) =>
        option.toLowerCase().startsWith(start) &&
        option.toLowerCase() !== start &&
        !taken.some((other) => other.toLowerCase() === option.toLowerCase()),
    )
    .slice(0, 6);
};

/** One item: its form, its status buttons and its history. */
export function ItemView({
  isNew,
  detail,
  choices,
  form,
  issues,
  changed,
  loading,
  error,
  saving,
  saveError,
  conflict,
  onChange,
  onSave,
  onReload,
  onBack,
  history,
  historyError,
  waitReason,
  acting,
  actionError,
  onStatus,
  onDuplicate,
  onDelete,
}: ItemViewProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const set = (fields: Partial<ItemForm>) => {
    if (form !== null) onChange({ ...form, ...fields });
  };
  const addLabel = (label: string) => {
    if (form === null || label.trim() === '') return;
    set({ labels: [...form.labels, label.trim()] });
    setNewLabel('');
  };
  const canAct = !acting && waitReason === null;

  return (
    <View style={styles.screen}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" onPress={onBack} hitSlop={8}>
          <Text style={styles.link}>‹ Inventory</Text>
        </Pressable>
        {saving ? (
          <ActivityIndicator />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !changed }}
            disabled={!changed}
            style={[styles.save, !changed && styles.disabled]}
            onPress={onSave}
          >
            <Text style={styles.saveText}>Save</Text>
          </Pressable>
        )}
      </View>

      {error !== null ? (
        <View style={styles.centre} accessibilityRole="alert">
          <Text style={styles.errorText}>This item couldn’t load: {error}</Text>
          <Pressable accessibilityRole="button" onPress={onReload}>
            <Text style={styles.link}>Try again</Text>
          </Pressable>
        </View>
      ) : loading || form === null ? (
        <ActivityIndicator style={styles.centre} testID="item-loading" />
      ) : (
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <Text style={styles.heading} accessibilityRole="header">
            {isNew ? 'New item' : (detail?.item.title ?? '')}
          </Text>
          {detail !== null && (
            <Text style={styles.status}>
              {STATUS_NAMES[detail.item.status]}
              {detail.toCheck.length > 0 && ` · to list it, add: ${detail.toCheck.join(', ')}`}
            </Text>
          )}

          {saveError !== null && (
            <View style={styles.errorBox} accessibilityRole="alert">
              <Text style={styles.errorText}>Not saved. {saveError}</Text>
              {conflict && (
                <Pressable accessibilityRole="button" onPress={onReload}>
                  <Text style={styles.link}>Reload</Text>
                </Pressable>
              )}
            </View>
          )}

          <Field
            label="Title"
            error={issues.title}
            counter={{
              text: `${form.title.length}/${MAX_TITLE_LENGTH}`,
              over: form.title.length > MAX_TITLE_LENGTH,
            }}
          >
            <TextInput
              testID="title-input"
              style={[inputStyle, issues.title !== undefined && missingStyle]}
              value={form.title}
              onChangeText={(title) => set({ title })}
              placeholder="Brand, colour, material, what it is"
            />
          </Field>

          <Field label="Price (£)" error={issues.price}>
            <TextInput
              testID="price-input"
              style={[inputStyle, styles.short, issues.price !== undefined && missingStyle]}
              value={form.price}
              onChangeText={(price) => set({ price })}
              keyboardType="decimal-pad"
              placeholder="24.50"
            />
          </Field>

          <Field label="Category" error={issues.category}>
            <Chips
              testID="category"
              options={CATEGORY_KEYS.map((key) => ({ value: key, label: CATEGORIES[key] }))}
              selected={form.category === null ? [] : [form.category]}
              onPress={(category) =>
                // Accessories have no size: picking one clears it.
                set({ category, ...(hasSize(category) ? {} : { size: '' }) })
              }
            />
          </Field>

          {(form.category === null || hasSize(form.category)) && (
            <Field label="Size" error={issues.size} hint="As on the label, e.g. UK 12 or M">
              <TextInput
                testID="size-input"
                style={[inputStyle, styles.short]}
                value={form.size}
                onChangeText={(size) => set({ size })}
              />
            </Field>
          )}

          <Field label="Condition" error={issues.condition}>
            <Chips
              options={CONDITION_KEYS.map((key) => ({ value: key, label: CONDITIONS[key] }))}
              selected={form.condition === null ? [] : [form.condition]}
              onPress={(condition) => set({ condition })}
            />
          </Field>

          <Field label="Brand" error={issues.brand}>
            <TextInput
              testID="brand-input"
              style={inputStyle}
              value={form.brand}
              onChangeText={(brand) => set({ brand })}
              autoCorrect={false}
            />
            {form.brand.trim() !== '' && (
              <Chips
                options={suggest(choices?.brands ?? [], form.brand).map((brand) => ({
                  value: brand,
                  label: brand,
                }))}
                selected={[]}
                onPress={(brand) => set({ brand })}
              />
            )}
          </Field>

          <Field label="Labels" hint="Press a label to take it off">
            <Chips
              testID="labels"
              options={form.labels.map((label) => ({ value: label, label: `${label} ×` }))}
              selected={form.labels}
              onPress={(label) => set({ labels: form.labels.filter((other) => other !== label) })}
            />
            <TextInput
              testID="label-input"
              style={inputStyle}
              value={newLabel}
              onChangeText={setNewLabel}
              onSubmitEditing={() => addLabel(newLabel)}
              placeholder="Add a label"
              autoCorrect={false}
            />
            <Chips
              options={suggest(choices?.labels ?? [], newLabel, form.labels).map((label) => ({
                value: label,
                label: `+ ${label}`,
              }))}
              selected={[]}
              onPress={addLabel}
            />
          </Field>

          <Field label="Listed on" error={issues.channels}>
            <Chips
              testID="channels"
              options={CHANNEL_KEYS.map((key) => ({ value: key, label: CHANNELS[key] }))}
              selected={form.channels}
              onPress={(channel) =>
                set({
                  channels: form.channels.includes(channel)
                    ? form.channels.filter((other) => other !== channel)
                    : [...form.channels, channel],
                })
              }
            />
          </Field>

          <Field label="Description" error={issues.description}>
            <TextInput
              style={[inputStyle, styles.description]}
              value={form.description}
              onChangeText={(description) => set({ description })}
              multiline
            />
          </Field>

          {detail !== null && (
            <View style={styles.actions}>
              {waitReason !== null && <Text style={styles.hint}>{waitReason}</Text>}
              {actionError !== null && (
                <Text style={styles.errorText} accessibilityRole="alert">
                  {actionError}
                </Text>
              )}
              <View style={styles.buttons}>
                {detail.statusActions.map((action) => (
                  <Pressable
                    key={action}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !canAct }}
                    disabled={!canAct}
                    style={[styles.action, !canAct && styles.disabled]}
                    onPress={() => onStatus(action)}
                  >
                    <Text style={styles.actionText}>{STATUS_ACTION_LABELS[action]}</Text>
                  </Pressable>
                ))}
                <Pressable
                  accessibilityRole="button"
                  disabled={!canAct}
                  style={[styles.secondary, !canAct && styles.disabled]}
                  onPress={onDuplicate}
                >
                  <Text style={styles.link}>Duplicate</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={acting}
                  style={[styles.secondary, acting && styles.disabled]}
                  onPress={() => setConfirmingDelete(true)}
                >
                  <Text style={styles.danger}>Delete</Text>
                </Pressable>
              </View>
            </View>
          )}

          {!isNew && <ItemHistory entries={history} error={historyError} />}
        </ScrollView>
      )}
      <ConfirmDialog
        visible={confirmingDelete}
        title="Delete this item for good?"
        message={`${detail?.item.title ?? 'It'} goes with its history. This can’t be undone.`}
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={() => {
          setConfirmingDelete(false);
          onDelete();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  page: { padding: 16, gap: 18, maxWidth: 720, width: '100%', alignSelf: 'center' },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  heading: { fontSize: 22, fontWeight: '700' },
  status: { fontSize: 14, color: '#666', marginTop: -10 },
  save: { backgroundColor: '#222', borderRadius: 8, paddingHorizontal: 18, paddingVertical: 8 },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  disabled: { opacity: 0.4 },
  link: { color: '#2255aa', fontSize: 15 },
  danger: { color: '#b00020', fontSize: 15 },
  short: { maxWidth: 160 },
  description: { minHeight: 100, textAlignVertical: 'top' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#fde8eb',
  },
  errorText: { flex: 1, color: '#b00020', fontSize: 14 },
  hint: { fontSize: 13, color: '#666' },
  actions: {
    gap: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ddd',
  },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  action: { backgroundColor: '#222', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  actionText: { color: '#fff', fontSize: 14 },
  secondary: { paddingHorizontal: 8, paddingVertical: 8 },
});
