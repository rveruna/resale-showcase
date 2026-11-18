// Fixture: every JSX binding below is safe and must NOT be reported by
// no-default-arg-event-handler.
import React from 'react';

type Submenu = 'main' | 'help';
type Pressable = { onPress?: () => void };

declare const Button: React.ComponentType<Pressable>;

function openSettings(submenu: Submenu = 'main') {
  void submenu;
}

function safeNoArg() {
  // No parameters at all — runtime extra args are ignored.
}

function safeRestOnly(...args: unknown[]) {
  void args;
}

function safeRequiredFirst(name: string) {
  // First param is required (not optional, no default). TS rejects binding
  // this directly to `() => void`, so the rule has no need to flag it.
  void name;
}

export function WrappedAtBindingSite() {
  return <Button onPress={() => openSettings()} />;
}

export function InlineArrow() {
  return (
    <Button
      onPress={() => {
        // explicit arrow at the binding site — event is discarded
      }}
    />
  );
}

export function NoArgFunction() {
  return <Button onPress={safeNoArg} />;
}

export function RestOnly() {
  return <Button onPress={safeRestOnly} />;
}

export function RequiredFirstParam() {
  // TS would error here at compile-time — not the rule's concern.
  // We include it to assert the rule does NOT pile on with a duplicate.
  // @ts-expect-error - required-arg handler bound to no-arg slot is a TS error
  return <Button onPress={safeRequiredFirst} />;
}
