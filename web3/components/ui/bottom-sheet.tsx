"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  children: React.ReactNode;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  maxHeight?: number; // Max height in pixels (default: 40% of viewport)
  minHeight?: number; // Min height in pixels (default: 200px)
  className?: string;
}

const STORAGE_KEY = "dev-console-height";
const DEFAULT_HEIGHT = 300; // Default height in pixels
const MIN_HEIGHT = 200;
const MAX_HEIGHT_PERCENT = 0.4; // 40% of viewport

export function BottomSheet({
  children,
  isOpen,
  onOpenChange,
  maxHeight,
  minHeight = MIN_HEIGHT,
  className,
}: BottomSheetProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStartY, setDragStartY] = React.useState(0);
  const [dragStartHeight, setDragStartHeight] = React.useState(0);
  const sheetRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

  // Get saved height or use default
  const getSavedHeight = React.useCallback(() => {
    if (typeof window === "undefined") return DEFAULT_HEIGHT;
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_HEIGHT;
  }, []);

  const [height, setHeight] = React.useState(getSavedHeight);

  // Calculate max height
  const calculatedMaxHeight = React.useMemo(() => {
    if (maxHeight) return maxHeight;
    if (typeof window === "undefined") return DEFAULT_HEIGHT * 2;
    return Math.floor(window.innerHeight * MAX_HEIGHT_PERCENT);
  }, [maxHeight]);

  // Save height to localStorage
  const saveHeight = React.useCallback((newHeight: number) => {
    setHeight(newHeight);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, newHeight.toString());
    }
  }, []);

  // Initialize height from storage when component mounts
  React.useEffect(() => {
    if (isOpen) {
      setHeight(getSavedHeight());
    }
  }, [isOpen, getSavedHeight]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartY(e.clientY);
    if (sheetRef.current) {
      setDragStartHeight(sheetRef.current.offsetHeight);
    }
    e.preventDefault();
  };

  const handleMouseMove = React.useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !sheetRef.current) return;

      const deltaY = dragStartY - e.clientY; // Positive when dragging up
      const newHeight = Math.max(
        minHeight,
        Math.min(dragStartHeight + deltaY, calculatedMaxHeight)
      );

      sheetRef.current.style.height = `${newHeight}px`;
      saveHeight(newHeight);
    },
    [isDragging, dragStartY, dragStartHeight, minHeight, calculatedMaxHeight, saveHeight]
  );

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "none"; // Prevent text selection while dragging
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.userSelect = "";
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleToggle = () => {
    onOpenChange(!isOpen);
  };

  // Update height CSS variable when console height changes
  React.useEffect(() => {
    if (isOpen && sheetRef.current) {
      const updateHeight = () => {
        const currentHeight = sheetRef.current?.offsetHeight || height;
        document.documentElement.style.setProperty("--dev-console-height", `${currentHeight}px`);
      };
      updateHeight();
      // Update on resize
      window.addEventListener("resize", updateHeight);
      return () => window.removeEventListener("resize", updateHeight);
    } else {
      document.documentElement.style.setProperty("--dev-console-height", "0px");
    }
  }, [isOpen, height]);

  if (!isOpen) {
    return (
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-[10001] bg-card border-t border-border shadow-lg h-6 flex items-center justify-center cursor-pointer hover:bg-accent/30 transition-colors",
          className
        )}
        onClick={handleToggle}
      >
        <div className="w-8 h-0.5 bg-muted-foreground/40 rounded-full" />
      </div>
    );
  }

  return (
    <div
      ref={sheetRef}
      className={cn(
        "fixed bottom-0 left-0 right-0 z-[10001] bg-card border-t border-border shadow-lg flex flex-col",
        className
      )}
      style={{
        height: `${height}px`,
        maxHeight: `${calculatedMaxHeight}px`,
        minHeight: `${minHeight}px`,
      }}
    >
      {/* Drag Handle */}
      <div
        className="flex items-center justify-center h-6 cursor-grab active:cursor-grabbing border-b border-border select-none hover:bg-accent/30 transition-colors"
        onMouseDown={handleMouseDown}
      >
        <div className="w-8 h-0.5 bg-muted-foreground/40 rounded-full" />
      </div>

      {/* Content */}
      <div ref={contentRef} className="flex-1 overflow-hidden flex flex-col">
        {children}
      </div>
    </div>
  );
}

