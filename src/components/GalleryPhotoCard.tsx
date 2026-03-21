import { useEffect, useRef, useState } from "react";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { DisplayPhotoItem } from "../types";
import { useViewportPresence } from "../hooks/useViewportPresence";

interface GalleryPhotoCardProps {
    item: DisplayPhotoItem;
    onSelect: (item: DisplayPhotoItem, shiftKey: boolean) => void;
    onToggleSelect: (item: DisplayPhotoItem, shiftKey: boolean) => void;
    selected: boolean;
    showSelectionToggle: boolean;
}

export const GalleryPhotoCard = ({
    item,
    onSelect,
    onToggleSelect,
    selected,
    showSelectionToggle,
}: GalleryPhotoCardProps) => {
    const photo = item.photo;
    const [thumbUrl, setThumbUrl] = useState<string | null>(null);
    const cardRef = useRef<HTMLDivElement | null>(null);
    const shouldLoadThumb = useViewportPresence(cardRef, photo.photo_path, {
        rootMargin: "48px 0px",
        releaseDelayMs: 120,
    });

    useEffect(() => {
        if (!shouldLoadThumb) {
            setThumbUrl(null);
            return;
        }
        let isMounted = true;
        invoke<string>("create_display_thumbnail", { path: photo.photo_path, sourceSlot: photo.source_slot ?? 1 })
            .then((path) => {
                if (isMounted) {
                    setThumbUrl(convertFileSrc(path));
                }
            })
            .catch((err) => {
                console.warn(`サムネイル生成に失敗しました [${photo.photo_path}]`, err);
                if (isMounted) {
                    setThumbUrl(null);
                }
            });
        return () => {
            isMounted = false;
        };
    }, [shouldLoadThumb, photo.photo_path, photo.source_slot]);

    return (
        <div
            ref={cardRef}
            className={`gallery-photo-card ${selected ? "selected" : ""}`}
            onClick={(event) => onSelect(item, event.shiftKey)}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(item, event.shiftKey);
                }
            }}
            role="button"
            tabIndex={0}
        >
            <div className="gallery-photo-thumb">
                {showSelectionToggle && (
                    <button
                        className={`photo-select-toggle ${selected ? "selected" : ""}`}
                        onClick={(event) => {
                            event.stopPropagation();
                            onToggleSelect(item, event.shiftKey);
                        }}
                        aria-label={selected ? "選択解除" : "選択"}
                        type="button"
                    >
                        {selected ? "✓" : ""}
                    </button>
                )}
                {thumbUrl ? (
                    <img
                        src={thumbUrl}
                        alt={photo.photo_filename}
                        className="gallery-photo-image"
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                    />
                ) : (
                    <div className="photo-thumb-skeleton" />
                )}
            </div>
        </div>
    );
};
