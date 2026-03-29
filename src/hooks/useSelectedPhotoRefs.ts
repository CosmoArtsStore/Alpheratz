import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { SelectedPhotoRef } from "../types";
import { ToastType } from "./useToasts";
import { DETACH_AUXILIARY_RUNTIME_DATA, DETACH_RUNTIME_DATA } from "../config/runtimeFlags";

export const useSelectedPhotoRefs = (
    photoPaths: string[],
    addToast?: (msg: string, type?: ToastType) => void,
) => {
    const [selectedPhotoRefs, setSelectedPhotoRefs] = useState<SelectedPhotoRef[]>([]);

    useEffect(() => {
        if (DETACH_RUNTIME_DATA || DETACH_AUXILIARY_RUNTIME_DATA) {
            setSelectedPhotoRefs([]);
            return;
        }
        if (photoPaths.length === 0) {
            setSelectedPhotoRefs([]);
            return;
        }

        let cancelled = false;

        const loadSelectedPhotoRefs = async () => {
            try {
                const refs = await invoke<SelectedPhotoRef[]>("get_selected_photo_refs_cmd", {
                    photoPaths,
                });

                if (!cancelled) {
                    setSelectedPhotoRefs(refs);
                }
            } catch (err) {
                if (!cancelled) {
                    addToast?.(`選択写真情報の取得に失敗しました: ${String(err)}`, "error");
                }
            }
        };

        void loadSelectedPhotoRefs();

        return () => {
            cancelled = true;
        };
    }, [addToast, photoPaths]);

    return {
        selectedPhotoRefs,
        setSelectedPhotoRefs,
    };
};
