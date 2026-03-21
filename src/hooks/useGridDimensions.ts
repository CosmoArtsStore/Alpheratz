import { useState, useCallback, useEffect } from "react";

export const useGridDimensions = (CARD_WIDTH: number) => {
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
        const rpObs = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setPanelWidth(entry.contentRect.width);
            }
        });
        const gwObs = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setGridWrapperHeight(entry.contentRect.height);
            }
        });
        if (rightPanelNode) {
            rpObs.observe(rightPanelNode);
            setPanelWidth(rightPanelNode.getBoundingClientRect().width);
        }
        if (gridWrapperNode) {
            gwObs.observe(gridWrapperNode);
            setGridWrapperHeight(gridWrapperNode.getBoundingClientRect().height);
        }
        return () => { rpObs.disconnect(); gwObs.disconnect(); };
    }, [gridWrapperNode, rightPanelNode]);

    const columnCount = Math.max(1, Math.floor(panelWidth / CARD_WIDTH));
    const gridHeight = Math.max(200, gridWrapperHeight);

    return { rightPanelRef, gridWrapperRef, panelWidth, gridHeight, columnCount };
};
