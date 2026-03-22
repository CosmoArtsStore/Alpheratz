import { useMemo } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";

export const useDeferredImageSrc = (imagePath: string | null | undefined, shouldLoad: boolean) => {
    const src = useMemo(() => (
        shouldLoad && imagePath ? convertFileSrc(imagePath) : null
    ), [imagePath, shouldLoad]);

    return {
        src,
        onLoad: undefined,
        onError: undefined,
    };
};
