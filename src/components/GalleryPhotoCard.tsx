import { DisplayPhotoItem } from "../types";
import { useDeferredImageSrc } from "../hooks/useDeferredImageSrc";

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
    const aspectRatio = photo.image_width && photo.image_height && photo.image_width > 0 && photo.image_height > 0
        ? `${photo.image_width} / ${photo.image_height}`
        : "16 / 9";
    const { src } = useDeferredImageSrc(
        photo.display_thumb_path ?? photo.grid_thumb_path,
        true,
        {
            originalPath: photo.resolved_photo_path,
            sourceSlot: photo.source_slot,
        },
    );

    return (
        <div
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
            <div className="gallery-photo-thumb" style={{ aspectRatio }}>
                {src && (
                    <img
                        className="gallery-photo-image"
                        src={src}
                        alt=""
                        draggable={false}
                        loading="lazy"
                    />
                )}
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
                {!src && <div className="photo-thumb-skeleton" />}
            </div>
        </div>
    );
};
