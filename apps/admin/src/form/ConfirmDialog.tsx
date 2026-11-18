import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

export type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  /** The button that goes ahead, e.g. "Delete". */
  confirmLabel: string;
  /** Red, for what can't be undone. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** A third choice between Cancel and the main button, e.g. "Discard" beside "Save". */
  other?: { label: string; onPress: () => void };
  /**
   * Drawn over its parent rather than as its own sheet: inside another
   * `Modal`, closing both at once leaves iOS on a black screen.
   */
  inline?: boolean;
};

/**
 * Asks before going ahead, on phone and web alike: React Native's `Alert`
 * does nothing on web.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  destructive = false,
  onConfirm,
  onCancel,
  other,
  inline = false,
}: ConfirmDialogProps) {
  const dialog = (
    <View style={[styles.backdrop, inline && styles.inline]}>
      <View style={styles.card} accessibilityRole="alert">
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.buttons}>
          <Pressable accessibilityRole="button" style={styles.button} onPress={onCancel}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
          {other !== undefined && (
            <Pressable
              testID="confirm-dialog-other"
              accessibilityRole="button"
              style={styles.button}
              onPress={other.onPress}
            >
              <Text style={styles.other}>{other.label}</Text>
            </Pressable>
          )}
          <Pressable
            testID="confirm-dialog-confirm"
            accessibilityRole="button"
            style={[styles.button, destructive ? styles.destructive : styles.confirm]}
            onPress={onConfirm}
          >
            <Text style={styles.confirmText}>{confirmLabel}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
  if (inline) return visible ? dialog : null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      {dialog}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  inline: { ...StyleSheet.absoluteFill, zIndex: 10 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 20, gap: 12, maxWidth: 420 },
  title: { fontSize: 17, fontWeight: '600' },
  message: { fontSize: 15, color: '#333', lineHeight: 21 },
  buttons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
  button: { minHeight: 44, borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  cancel: { color: '#2255aa', fontSize: 15 },
  other: { color: '#b00020', fontSize: 15 },
  confirm: { backgroundColor: '#222' },
  destructive: { backgroundColor: '#b00020' },
  confirmText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
