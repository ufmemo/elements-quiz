import { useCallback, useEffect, useState } from "react";
import { load, persist, type Save } from "./save";

/**
 * The one binding between React and storage.
 *
 * Persisting in an effect keyed on `save` is what makes "every answer is
 * committed the moment it's submitted" true — which in turn is what lets the
 * session exit instantly with no "are you sure?" dialog. Confirmation dialogs
 * exist to protect unsaved work; there isn't any.
 */
export function useSave() {
  const [save, setSave] = useState<Save>(() => load());

  useEffect(() => {
    persist(save);
  }, [save]);

  const update = useCallback((fn: (s: Save) => Save) => {
    setSave((prev) => fn(prev));
  }, []);

  return { save, update };
}
