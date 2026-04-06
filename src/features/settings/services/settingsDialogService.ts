import { open } from '@tauri-apps/plugin-dialog';

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
