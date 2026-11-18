import { useLocalSearchParams, useNavigation, usePreventRemove, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ConfirmDialog } from '../form/ConfirmDialog';
import { useItem } from './useItem';
import { ItemView } from './ItemView';

type NavigationAction = Parameters<
  NonNullable<Parameters<typeof usePreventRemove>[1]>
>[0]['data']['action'];

/**
 * One item: `/items/<id>`, opened from the list. `/items/new` is the empty
 * form; its first Save creates the item and the route takes its id.
 */
export function ItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const editor = useItem(id, {
    onCreated: (createdId) => router.setParams({ id: createdId }),
    onDuplicated: (copyId) => router.push({ pathname: '/items/[id]', params: { id: copyId } }),
    onDeleted: back,
  });
  // Where she was going when the unsaved changes stopped her.
  const [leaving, setLeaving] = useState<NavigationAction | null>(null);
  // Where she's going once the changes are saved or dropped.
  const [going, setGoing] = useState<NavigationAction | null>(null);

  // Leaving mustn't lose unsaved changes without asking.
  usePreventRemove(editor.changed && !editor.saving, ({ data }) => setLeaving(data.action));

  // Leaves only after a render without changes: until then the guard above
  // would stop the same action again and ask again.
  useEffect(() => {
    if (going === null || editor.changed) return;
    setGoing(null);
    navigation.dispatch(going);
  }, [going, editor.changed, navigation]);

  return (
    <>
      <ItemView
        isNew={editor.isNew}
        detail={editor.detail}
        choices={editor.choices}
        form={editor.form}
        issues={editor.issues}
        changed={editor.changed}
        loading={editor.loading}
        error={editor.error}
        saving={editor.saving}
        saveError={editor.saveError}
        conflict={editor.conflict}
        onChange={editor.change}
        onSave={() => editor.save()}
        onReload={editor.reload}
        onBack={back}
        history={editor.history}
        historyError={editor.historyError}
        waitReason={editor.waitReason}
        acting={editor.acting}
        actionError={editor.actionError}
        onStatus={editor.changeStatus}
        onDuplicate={editor.duplicate}
        onDelete={editor.remove}
      />
      <ConfirmDialog
        visible={leaving !== null}
        title="Save your changes?"
        message="The details you changed aren’t saved yet."
        confirmLabel="Save"
        onCancel={() => setLeaving(null)}
        other={{
          label: 'Discard',
          onPress: () => {
            editor.discard();
            setGoing(leaving);
            setLeaving(null);
          },
        }}
        onConfirm={() => {
          const action = leaving;
          setLeaving(null);
          editor.save(() => setGoing(action));
        }}
      />
    </>
  );
}
