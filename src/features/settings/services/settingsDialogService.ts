import { open } from '@tauri-apps/plugin-dialog';

/**
 * Opens a native directory picker for settings flows.
 *
 * @param title Optional dialog title that explains why a folder is being selected.
 * @returns The selected directory path, or `null` when the dialog is canceled.
 */
export const selectDirectory = async (title?: string) => {
  const selected = await open({
    directory: true,
    multiple: false,
    title,
  });

  if (!selected || Array.isArray(selected)) {
    return null;
  }

  return selected;
};
