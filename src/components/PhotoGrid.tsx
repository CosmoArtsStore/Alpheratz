import { UIEvent, CSSProperties } from "react";
import { DisplayPhotoItem } from "../types";
import { PhotoCard } from "./PhotoCard";
import { GalleryPhotoCard } from "./GalleryPhotoCard";

interface PhotoGridCellProps {
    data: DisplayPhotoItem[];
    onSelect: (item: DisplayPhotoItem, shiftKey: boolean) => void;
    onToggleSelect: (item: DisplayPhotoItem, shiftKey: boolean) => void;
    isSelected: (item: DisplayPhotoItem) => boolean;
    showTags: boolean;
    showSelectionToggle: boolean;
    columnCount: number;
    startIndex?: number;
}

interface PhotoGridProps {
    photos: DisplayPhotoItem[];
    viewMode: "standard" | "gallery";
    scrollTop: number;
    columnCount: number;
    columnWidth: number;
    totalRows: number;
    ROW_HEIGHT: number;
    gridHeight: number;
    panelWidth: number;
    handleGridScroll: (e: UIEvent<HTMLDivElement>) => void;
    handleGridWheel: (e: React.WheelEvent<HTMLDivElement>) => void;
    onReachGridEnd?: () => void;
    cellProps: PhotoGridCellProps;
    onGridRef: (node: HTMLDivElement | null) => void;
    showBottomLoader?: boolean;
}

const GALLERY_COLUMN_GUTTER = 14;
const GALLERY_MIN_COLUMN_WIDTH = 248;

const VirtualMasonryGrid = ({
    photos,
    gridHeight,
    panelWidth,
    handleGridScroll,
    handleGridWheel,
    onReachGridEnd,
    cellProps,
    onGridRef,
    showBottomLoader,
}: {
    photos: DisplayPhotoItem[];
    gridHeight: number;
    panelWidth: number;
    handleGridScroll: (e: UIEvent<HTMLDivElement>) => void;
    handleGridWheel: (e: React.WheelEvent<HTMLDivElement>) => void;
    onReachGridEnd?: () => void;
    cellProps: PhotoGridCellProps;
    onGridRef: (node: HTMLDivElement | null) => void;
    showBottomLoader?: boolean;
}) => {
    const availableWidth = Math.max(0, panelWidth);
    const masonryColumnCount = Math.max(
        1,
        Math.floor((availableWidth + GALLERY_COLUMN_GUTTER) / (GALLERY_MIN_COLUMN_WIDTH + GALLERY_COLUMN_GUTTER)),
    );

    const handleMasonryScroll = (e: UIEvent<HTMLDivElement>) => {
        handleGridScroll(e);
        const remaining = e.currentTarget.scrollHeight - e.currentTarget.scrollTop - e.currentTarget.clientHeight;
        if (remaining <= 480) {
            onReachGridEnd?.();
        }
    };

    return (
        <div
            className="grid-scroll-wrapper gallery-mode-shell"
            onWheel={handleGridWheel}
            onScroll={handleMasonryScroll}
            ref={onGridRef}
            style={{ height: gridHeight, width: "100%" }}
        >
            <div
                className="gallery-grid"
                style={{
                    columnCount: masonryColumnCount,
                    columnGap: `${GALLERY_COLUMN_GUTTER}px`,
                }}
            >
                {photos.map((item) => (
                    <div
                        key={item.photo.photo_path}
                        className="gallery-photo-card-wrapper"
                    >
                        <GalleryPhotoCard
                            item={item}
                            onSelect={cellProps.onSelect}
                            onToggleSelect={cellProps.onToggleSelect}
                            selected={cellProps.isSelected(item)}
                            showSelectionToggle={cellProps.showSelectionToggle}
                        />
                    </div>
                ))}
            </div>
            {showBottomLoader && (
                <div className="gallery-load-more-indicator" aria-live="polite">
                    <div className="spinner" />
                    <span>読み込み中...</span>
                </div>
            )}
        </div>
    );
};

export const PhotoGrid = ({
    photos,
    viewMode,
    columnCount,
    columnWidth,
    totalRows,
    ROW_HEIGHT,
    gridHeight,
    panelWidth,
    handleGridScroll,
    handleGridWheel,
    onReachGridEnd,
    cellProps,
    onGridRef,
    showBottomLoader,
}: PhotoGridProps) => {
    if (viewMode === "gallery") {
        return (
            <VirtualMasonryGrid
                photos={photos}
                gridHeight={gridHeight}
                panelWidth={panelWidth}
                handleGridScroll={handleGridScroll}
                handleGridWheel={handleGridWheel}
                onReachGridEnd={onReachGridEnd}
                cellProps={cellProps}
                onGridRef={onGridRef}
                showBottomLoader={showBottomLoader}
            />
        );
    }

    return (
        <div
            className="grid-scroll-wrapper photo-grid-fixed-shell"
            onWheel={handleGridWheel}
            onScroll={handleGridScroll}
            ref={onGridRef}
            style={{ height: gridHeight, width: panelWidth }}
        >
            <div
                className="photo-grid-fixed"
                style={{
                    gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${Math.max(1, totalRows)}, ${ROW_HEIGHT}px)`,
                }}
            >
                {Array.from({ length: Math.max(1, columnCount * totalRows) }, (_, index) => {
                    const rowIndex = Math.floor(index / columnCount);
                    const columnIndex = index % columnCount;
                    return (
                        <PhotoCard
                            key={`grid-slot-${index}`}
                            data={photos}
                            onSelect={cellProps.onSelect}
                            onToggleSelect={cellProps.onToggleSelect}
                            isSelected={cellProps.isSelected}
                            showTags={cellProps.showTags}
                            showSelectionToggle={cellProps.showSelectionToggle}
                            columnCount={columnCount}
                            startIndex={0}
                            columnIndex={columnIndex}
                            rowIndex={rowIndex}
                            style={{ width: columnWidth, height: ROW_HEIGHT } as CSSProperties}
                        />
                    );
                })}
            </div>
        </div>
    );
};
