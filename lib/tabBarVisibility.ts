import { useSyncExternalStore } from 'react';

let tabBarHidden = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

/** Hide/show the floating tab dock (e.g. while assistant covers the app). */
export function setTabBarHidden(hidden: boolean) {
  if (tabBarHidden === hidden) return;
  tabBarHidden = hidden;
  emit();
}

export function getTabBarHidden() {
  return tabBarHidden;
}

export function useTabBarHidden() {
  return useSyncExternalStore(
    (onStoreChange) => {
      listeners.add(onStoreChange);
      return () => {
        listeners.delete(onStoreChange);
      };
    },
    getTabBarHidden,
    () => false,
  );
}
