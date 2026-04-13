import { useState } from 'react';
import type { AppSetting } from '../../features/settings/models/types';
import type { Photo } from '../../features/photo/models/types';
import type { ToastType } from '../../shared/hooks/useToasts';
import { tweetPhoto } from '../../features/photo/services/photoCommandsService';

interface UseTweetTemplatesOptions {
  tweetTemplates: string[];
  setTweetTemplates: React.Dispatch<React.SetStateAction<string[]>>;
  activeTweetTemplate: string;
  setActiveTweetTemplate: (template: string) => void;
  saveSetting: (overrides?: Partial<AppSetting>) => Promise<unknown>;
  addToast?: (msg: string, type?: ToastType) => void;
}

/**
 * Manages editable tweet templates and the active template selection.
 *
 * Templates are persisted through settings so tweet composition can stay customizable
 * without spreading template CRUD logic throughout the gallery screen.
 *
 * @param options Current template state, persistence callback, and optional toast helper.
 * @returns Panel state and handlers for adding, editing, selecting, deleting, and using templates.
 */
export const useTweetTemplates = ({
  tweetTemplates,
  setTweetTemplates,
  activeTweetTemplate,
  setActiveTweetTemplate,
  saveSetting,
  addToast,
}: UseTweetTemplatesOptions) => {
  const [isTweetTemplatePanelOpen, setIsTweetTemplatePanelOpen] = useState(false);
  const [tweetTemplateDraft, setTweetTemplateDraft] = useState('');
  const [editingTweetTemplate, setEditingTweetTemplate] = useState<string | null>(null);

  const handleAddTweetTemplate = async (template: string) => {
    const normalized = template.trim();
    if (!normalized) {
      addToast?.('ツイートテンプレートを入力してください。', 'error');
      return;
    }

    if (tweetTemplates.includes(normalized)) {
      addToast?.('同じテンプレートは登録済みです。', 'error');
      return;
    }

    const nextTemplates = [...tweetTemplates, normalized];
    try {
      await saveSetting({
        tweetTemplates: nextTemplates,
        activeTweetTemplate: activeTweetTemplate || normalized,
      });
      setTweetTemplates(nextTemplates);
      if (!activeTweetTemplate) {
        setActiveTweetTemplate(normalized);
      }
      addToast?.('ツイートテンプレートを登録しました。');
    } catch (err) {
      addToast?.(`ツイートテンプレートの保存に失敗しました: ${String(err)}`, 'error');
    }
  };

  const handleStartTweetTemplateEdit = (template: string) => {
    setEditingTweetTemplate(template);
    setTweetTemplateDraft(template);
  };

  const handleCancelTweetTemplateEdit = () => {
    setEditingTweetTemplate(null);
    setTweetTemplateDraft('');
  };

  const handleSaveTweetTemplate = async () => {
    const normalized = tweetTemplateDraft.trim();
    if (!normalized) {
      addToast?.('ツイートテンプレートを入力してください。', 'error');
      return;
    }

    if (!editingTweetTemplate) {
      await handleAddTweetTemplate(normalized);
      setTweetTemplateDraft('');
      return;
    }

    if (editingTweetTemplate !== normalized && tweetTemplates.includes(normalized)) {
      addToast?.('同じテンプレートは登録済みです。', 'error');
      return;
    }

    const nextTemplates = tweetTemplates.map((template) =>
      template === editingTweetTemplate ? normalized : template,
    );
    const nextActiveTemplate =
      activeTweetTemplate === editingTweetTemplate ? normalized : activeTweetTemplate;

    try {
      await saveSetting({
        tweetTemplates: nextTemplates,
        activeTweetTemplate: nextActiveTemplate,
      });
      setTweetTemplates(nextTemplates);
      setActiveTweetTemplate(nextActiveTemplate);
      setEditingTweetTemplate(null);
      setTweetTemplateDraft('');
      addToast?.('ツイートテンプレートを更新しました。');
    } catch (err) {
      addToast?.(`ツイートテンプレートの更新に失敗しました: ${String(err)}`, 'error');
    }
  };

  const handleSelectTweetTemplate = async (template: string) => {
    try {
      await saveSetting({
        activeTweetTemplate: template,
      });
      setActiveTweetTemplate(template);
      addToast?.('投稿テンプレートを切り替えました。');
    } catch (err) {
      addToast?.(`投稿テンプレートの切替に失敗しました: ${String(err)}`, 'error');
    }
  };

  const handleDeleteTweetTemplate = async (template: string) => {
    if (tweetTemplates.length <= 1) {
      addToast?.('ツイートテンプレートは1件以上必要です。', 'error');
      return;
    }

    const nextTemplates = tweetTemplates.filter((item) => item !== template);
    const nextActiveTemplate =
      activeTweetTemplate === template ? nextTemplates[0] : activeTweetTemplate;
    try {
      await saveSetting({
        tweetTemplates: nextTemplates,
        activeTweetTemplate: nextActiveTemplate,
      });
      setTweetTemplates(nextTemplates);
      setActiveTweetTemplate(nextActiveTemplate);
      if (editingTweetTemplate === template) {
        setEditingTweetTemplate(null);
        setTweetTemplateDraft('');
      }
      addToast?.('ツイートテンプレートを削除しました。');
    } catch (err) {
      addToast?.(`ツイートテンプレートの削除に失敗しました: ${String(err)}`, 'error');
    }
  };

  const handleTweetPhoto = async (photo: Photo) => {
    try {
      await tweetPhoto(photo, activeTweetTemplate || tweetTemplates[0] || '');
    } catch (err) {
      addToast?.(`投稿ページを開けませんでした: ${String(err)}`, 'error');
    }
  };

  return {
    isTweetTemplatePanelOpen,
    setIsTweetTemplatePanelOpen,
    tweetTemplateDraft,
    setTweetTemplateDraft,
    editingTweetTemplate,
    handleStartTweetTemplateEdit,
    handleCancelTweetTemplateEdit,
    handleSaveTweetTemplate,
    handleSelectTweetTemplate,
    handleDeleteTweetTemplate,
    handleTweetPhoto,
  };
};
