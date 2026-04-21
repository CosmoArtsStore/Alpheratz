import { useCallback, useEffect, useState } from 'react';

// Tracks gallery container size and derives grid dimensions from it.
export const useGalleryGridViewModel = (CARD_WIDTH: number) => {
  const [rightPanelNode, setRightPanelNode] = useState<HTMLDivElement | null>(null);
  const [gridWrapperNode, setGridWrapperNode] = useState<HTMLDivElement | null>(null);
  const [panelWidth, setPanelWidth] = useState(800);
  const [gridWrapperHeight, setGridWrapperHeight] = useState(600);

  const rightPanelRef = useCallback((node: HTMLDivElement | null) => {
    setRightPanelNode(node);
  }, []);

  const gridWrapperRef = useCallback((node: HTMLDivElement | null) => {
    setGridWrapperNode(node);
  }, []);

  useEffect(() => {
    if (!rightPanelNode) {
      return undefined;
    }

    setPanelWidth(rightPanelNode.getBoundingClientRect().width);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setPanelWidth(entry.contentRect.width);
      }
    });

    observer.observe(rightPanelNode);

    return () => {
      observer.disconnect();
    };
  }, [rightPanelNode]);

  useEffect(() => {
    if (!gridWrapperNode) {
      return undefined;
    }

    setGridWrapperHeight(gridWrapperNode.getBoundingClientRect().height);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setGridWrapperHeight(entry.contentRect.height);
      }
    });

    observer.observe(gridWrapperNode);

    return () => {
      observer.disconnect();
    };
  }, [gridWrapperNode]);

  const columnCount = Math.max(1, Math.floor(panelWidth / CARD_WIDTH));
  const gridHeight = Math.max(200, gridWrapperHeight);

  return { rightPanelRef, gridWrapperRef, panelWidth, gridHeight, columnCount };
};
