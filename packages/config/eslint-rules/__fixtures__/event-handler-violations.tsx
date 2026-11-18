// Fixture: every JSX binding below should be reported by
// no-default-arg-event-handler. Lint of this directory is disabled in
// eslint.config.js so the buggy patterns survive `pnpm lint` and can be
// exercised by the rule's unit test instead.
import React from 'react';

type Submenu = 'main' | 'help';
type Pressable = { onPress?: () => void };
type SettingsScreenProps = { onSubmenuChange: (s: Submenu) => void };

declare const Button: React.ComponentType<Pressable>;
declare const SettingsScreen: React.ComponentType<SettingsScreenProps>;

function openSettings(submenu: Submenu = 'main') {
  void submenu;
}

function openSettingsOptional(submenu?: Submenu) {
  void submenu;
}

const handlers = {
  openSettings(submenu?: Submenu) {
    void submenu;
  },
};

export function DefaultArgBoundDirectly() {
  return <Button onPress={openSettings} />;
}

export function OptionalParamBoundDirectly() {
  return <Button onPress={openSettingsOptional} />;
}

export function MemberHandlerBoundDirectly() {
  return <Button onPress={handlers.openSettings} />;
}

export function SubmenuPropBoundDirectly() {
  return <SettingsScreen onSubmenuChange={openSettings} />;
}
