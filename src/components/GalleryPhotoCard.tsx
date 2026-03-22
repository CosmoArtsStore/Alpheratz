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
    const thumbImage = useDeferredImageSrc(photo.display_thumb_path, !!photo.display_thumb_path);
    const aspectRatio = photo.image_width && photo.image_height && photo.image_width > 0 && photo.image_height > 0
        ? `${photo.image_width} / ${photo.image_height}`
        : (photo.orientation === "portrait" ? "9 / 16" : "16 / 9");

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
                {thumbImage.src ? (
                    <img
                        src={thumbImage.src}
                        alt={photo.photo_filename}
                        className="gallery-photo-image"
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                        onLoad={thumbImage.onLoad}
                        onError={thumbImage.onError}
                    />
                ) : (
                    <div className="photo-thumb-skeleton" />
                )}
            </div>
        </div>
    );
};
