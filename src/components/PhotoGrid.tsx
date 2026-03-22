import { UIEvent, CSSProperties } from "react";
import { Grid as FixedSizeGrid } from "react-window";
import { useMasonry, usePositioner, useResizeObserver, type RenderComponentProps } from "masonic";
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

interface FixedSizeGridComponentProps {
    columnCount: number;
    columnWidth: number;
    rowCount: number;
    rowHeight: number;
    overscanRowCount?: number;
    overscanColumnCount?: number;
    cellComponent: typeof PhotoCard;
    cellProps: any;
    onScroll: (e: UIEvent<HTMLDivElement>) => void;
    outerRef: (node: HTMLDivElement | null) => void;
    style: CSSProperties;
    className: string;
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
    cellProps: PhotoGridCellProps;
    onGridRef: (node: HTMLDivElement | null) => void;
}

const FixedSizeGridComponent = FixedSizeGrid as unknown as React.ComponentType<FixedSizeGridComponentProps>;

const GALLERY_COLUMN_GUTTER = 14;
const GALLERY_MIN_COLUMN_WIDTH = 220;
const GALLERY_ITEM_HEIGHT_ESTIMATE = 260;

const GalleryMasonryItem = ({
    index,
    width,
    data,
    onSelect,
    onToggleSelect,
    isSelected,
    showSelectionToggle,
}: RenderComponentProps<DisplayPhotoItem> & {
    onSelect: (item: DisplayPhotoItem, shiftKey: boolean) => void;
    onToggleSelect: (item: DisplayPhotoItem, shiftKey: boolean) => void;
    isSelected: (item: DisplayPhotoItem) => boolean;
    showSelectionToggle: boolean;
}) => (
    <div
        className="gallery-photo-card-wrapper"
        style={{ width }}
        data-index={index}
    >
        <GalleryPhotoCard
            item={data}
            onSelect={onSelect}
            onToggleSelect={onToggleSelect}
            selected={isSelected(data)}
            showSelectionToggle={showSelectionToggle}
        />
    </div>
);

const VirtualMasonryGrid = ({
    photos,
    gridHeight,
    panelWidth,
    scrollTop,
    handleGridScroll,
    handleGridWheel,
    cellProps,
    onGridRef,
}: {
    photos: DisplayPhotoItem[];
    gridHeight: number;
    panelWidth: number;
    scrollTop: number;
    handleGridScroll: (e: UIEvent<HTMLDivElement>) => void;
    handleGridWheel: (e: React.WheelEvent<HTMLDivElement>) => void;
    cellProps: PhotoGridCellProps;
    onGridRef: (node: HTMLDivElement | null) => void;
}) => {
    const masonryColumnCount = Math.max(1, Math.floor((panelWidth + GALLERY_COLUMN_GUTTER) / (GALLERY_MIN_COLUMN_WIDTH + GALLERY_COLUMN_GUTTER)));
    const positioner = usePositioner({
        width: panelWidth,
        columnWidth: GALLERY_MIN_COLUMN_WIDTH,
        columnGutter: GALLERY_COLUMN_GUTTER,
        rowGutter: GALLERY_COLUMN_GUTTER,
        columnCount: masonryColumnCount,
    }, [panelWidth, masonryColumnCount, photos.length]);
    const resizeObserver = useResizeObserver(positioner);
    const masonry = useMasonry<DisplayPhotoItem>({
        items: photos,
        positioner,
        resizeObserver,
        height: gridHeight,
        scrollTop,
        itemHeightEstimate: GALLERY_ITEM_HEIGHT_ESTIMATE,
        overscanBy: 1,
        role: "grid",
        render: (renderProps) => (
            <GalleryMasonryItem
                {...renderProps}
                onSelect={cellProps.onSelect}
                onToggleSelect={cellProps.onToggleSelect}
                isSelected={cellProps.isSelected}
                showSelectionToggle={cellProps.showSelectionToggle}
            />
        ),
        itemKey: (item) => item.photo.photo_path,
    });

    return (
        <div
            className="grid-scroll-wrapper gallery-mode-shell"
            onWheel={handleGridWheel}
            onScroll={handleGridScroll}
            ref={onGridRef}
            style={{ height: gridHeight, width: panelWidth }}
        >
            {masonry}
        </div>
    );
};

export const PhotoGrid = ({
    photos,
    viewMode,
    scrollTop,
    columnCount,
    columnWidth,
    totalRows,
    ROW_HEIGHT,
    gridHeight,
    panelWidth,
    handleGridScroll,
    handleGridWheel,
    cellProps,
    onGridRef,
}: PhotoGridProps) => {
    if (viewMode === "gallery") {
        return (
            <VirtualMasonryGrid
                photos={photos}
                gridHeight={gridHeight}
                panelWidth={panelWidth}
                scrollTop={scrollTop}
                handleGridScroll={handleGridScroll}
                handleGridWheel={handleGridWheel}
                cellProps={cellProps}
                onGridRef={onGridRef}
            />
        );
    }

    return (
            <div className="grid-scroll-wrapper" onWheel={handleGridWheel}>
            {photos.length > 0 && (
                <>
                    <FixedSizeGridComponent
                        columnCount={columnCount}
                        columnWidth={columnWidth}
                        rowCount={totalRows}
                        rowHeight={ROW_HEIGHT}
                        overscanRowCount={0}
                        overscanColumnCount={0}
                        cellComponent={PhotoCard as any}
                        cellProps={cellProps}
                        onScroll={handleGridScroll}
                        outerRef={onGridRef}
                        style={{ height: gridHeight, width: panelWidth }}
                        className="photo-grid"
                    />
                </>
            )}
        </div>
    );
};
