import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

type DeferredImageFallback = {
    originalPath?: string | null;
    sourceSlot?: number | null;
};

export const useDeferredImageSrc = (
    imagePath: string | null | undefined,
    shouldLoad: boolean,
    fallback?: DeferredImageFallback,
) => {
    const [src, setSrc] = useState<string | null>(null);
    const objectUrlRef = useRef<string | null>(null);

    useEffect(() => {
        let disposed = false;

        const releaseObjectUrl = () => {
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
                objectUrlRef.current = null;
            }
        };

        if (!shouldLoad || !imagePath) {
            releaseObjectUrl();
            setSrc(null);
            return undefined;
        }

        void (async () => {
            try {
                let bytes: number[];
                try {
                    bytes = await invoke<number[]>("read_thumbnail_bytes_cmd", { path: imagePath });
                } catch (readError) {
                    if (!fallback?.originalPath || !fallback.sourceSlot) {
                        throw readError;
                    }
                    bytes = await invoke<number[]>("ensure_browse_thumbnail_bytes_cmd", {
                        path: fallback.originalPath,
                        sourceSlot: fallback.sourceSlot,
                    });
                }
                if (disposed) {
                    return;
                }

                releaseObjectUrl();
                const objectUrl = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "image/jpeg" }));
                objectUrlRef.current = objectUrl;
                setSrc(objectUrl);
            } catch (error) {
                if (!disposed) {
                    console.warn("thumbnail read failed", imagePath, error);
                    releaseObjectUrl();
                    setSrc(null);
                }
            }
        })();

        return () => {
            disposed = true;
            releaseObjectUrl();
            setSrc(null);
        };
    }, [fallback?.originalPath, fallback?.sourceSlot, imagePath, shouldLoad]);

    return {
        src,
        onLoad: undefined,
        onError: undefined,
    };
};
