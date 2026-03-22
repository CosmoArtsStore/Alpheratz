import { CSSProperties } from "react";
import { DisplayPhotoItem } from "../types";
import { AnimatedFavoriteStar } from "./AnimatedFavoriteStar";
import { useDeferredImageSrc } from "../hooks/useDeferredImageSrc";

interface PhotoCardProps {
  data: DisplayPhotoItem[];
  onSelect: (item: DisplayPhotoItem, shiftKey: boolean) => void;
  onToggleSelect: (item: DisplayPhotoItem, shiftKey: boolean) => void;
  isSelected: (item: DisplayPhotoItem) => boolean;
  showTags: boolean;
  showSelectionToggle: boolean;
  columnCount: number;
  startIndex?: number;
  columnIndex: number;
  rowIndex: number;
  style: CSSProperties;
}

export const PhotoCard = ({
  data, onSelect, onToggleSelect, isSelected, showTags, showSelectionToggle, columnCount, startIndex = 0, columnIndex, rowIndex, style,
}: PhotoCardProps) => {
  const index = rowIndex * columnCount + columnIndex;
  const item = data[index - startIndex];
  const photo = item?.photo;
  const thumbImage = useDeferredImageSrc(photo?.grid_thumb_path, !!photo?.grid_thumb_path);

  if (!photo) return null;

  const selected = isSelected(item);

  return (
    <div
      style={style}
      className="photo-card-wrapper"
      onClick={(event) => onSelect(item, event.shiftKey)}
    >
      <div className={`photo-card ${selected ? "selected" : ""}`}>
        <div className="photo-thumb-container">
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
          {thumbImage.src
            ? <img src={thumbImage.src} alt={photo.photo_filename} className="photo-thumb" loading="lazy" decoding="async" draggable={false} onLoad={thumbImage.onLoad} onError={thumbImage.onError} />
            : <div className="photo-thumb-skeleton" />
          }
          {photo.is_favorite && (
            <span className="photo-favorite-corner" aria-hidden="true">
              <AnimatedFavoriteStar liked={true} className="favorite-star-corner" />
            </span>
          )}
          {!!item.groupCount && item.groupCount > 1 && (
            <span className="photo-group-count-badge" aria-hidden="true">
              {item.groupCount}枚
            </span>
          )}
        </div>
        <div className="photo-info">
          <div className="photo-meta-row">
            {photo.match_source === "stella_db" && <span className="photo-pill">DB</span>}
            {photo.match_source === "phash" && <span className="photo-pill">類似一致</span>}
            {photo.orientation && (
              <span className="photo-pill">{photo.orientation}</span>
            )}
          </div>
          <div className="photo-world">{photo.world_name || "ワールド不明"}</div>
          <div className="photo-date">{photo.timestamp}</div>
          {showTags && !!photo.tags?.length && (
            <div className="photo-tags-preview">
              {photo.tags.slice(0, 2).map((tag) => (
                <span key={tag} className="photo-tag-chip">{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
