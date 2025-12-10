"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface HighlightOverlayProps {
  targetId?: string;
  targetRef?: React.RefObject<HTMLElement | null>;
  isActive: boolean;
  tooltip?: string;
  position?: "top" | "bottom" | "left" | "right";
  onDismiss?: () => void;
}

export function HighlightOverlay({
  targetId,
  targetRef,
  isActive,
  tooltip,
  position = "bottom",
  onDismiss,
}: HighlightOverlayProps) {
  const [bounds, setBounds] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Auto-dismiss after 8 seconds if no manual dismiss
  useEffect(() => {
    if (isActive && tooltip && !dismissed) {
      const timer = setTimeout(() => {
        setDismissed(true);
        onDismiss?.();
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [isActive, tooltip, dismissed, onDismiss]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isActive) {
      setBounds(null);
      return;
    }

    const updateBounds = () => {
      let element: HTMLElement | null = null;

      if (targetRef?.current) {
        element = targetRef.current;
      } else if (targetId) {
        element = document.getElementById(targetId);
      }

      if (element) {
        const rect = element.getBoundingClientRect();
        setBounds(rect);
      }
    };

    updateBounds();
    window.addEventListener("resize", updateBounds);
    window.addEventListener("scroll", updateBounds, true);

    return () => {
      window.removeEventListener("resize", updateBounds);
      window.removeEventListener("scroll", updateBounds, true);
    };
  }, [isActive, targetId, targetRef]);

  if (!isActive || !bounds || !mounted || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const highlightStyle: React.CSSProperties = {
    position: "fixed",
    left: `${bounds.left}px`,
    top: `${bounds.top}px`,
    width: `${bounds.width}px`,
    height: `${bounds.height}px`,
    pointerEvents: "none",
    zIndex: 9998,
  };

  const getTooltipPosition = () => {
    const spacing = 8;
    switch (position) {
      case "top":
        return {
          bottom: `${bounds.height + spacing}px`,
          left: "50%",
          transform: "translateX(-50%)",
        };
      case "bottom":
        return {
          top: `${bounds.height + spacing}px`,
          left: "50%",
          transform: "translateX(-50%)",
        };
      case "left":
        return {
          right: `${bounds.width + spacing}px`,
          top: "50%",
          transform: "translateY(-50%)",
        };
      case "right":
        return {
          left: `${bounds.width + spacing}px`,
          top: "50%",
          transform: "translateY(-50%)",
        };
    }
  };

  return createPortal(
    <>
      {/* Subtle border highlight */}
      <div
        className="absolute border-2 border-primary/50 rounded-md"
        style={{
          ...highlightStyle,
          boxShadow: "0 0 0 2px oklch(0.5 0.2 150 / 0.3)", // Subtle green glow
        }}
      />

      {/* Tooltip - compact and subtle */}
      {tooltip && (
        <div
          className="absolute rounded-md px-3 py-2 shadow-lg z-[9999] pointer-events-auto isolate"
          style={{
            ...highlightStyle,
            ...getTooltipPosition(),
            width: "auto",
            height: "auto",
            minWidth: "auto",
            maxWidth: "250px",
            backgroundColor: "oklch(0.25 0.15 150 / 0.95)", // Brighter green-tinted dark background
            border: "1px solid oklch(0.5 0.2 150)", // Green border
            color: "oklch(0.95 0 0)", // Light text
            fontSize: "13px",
            fontWeight: "500",
            lineHeight: "1.4",
            whiteSpace: "nowrap",
            isolation: "isolate",
            overflow: "hidden",
            textOverflow: "ellipsis",
            contain: "layout style paint",
          }}
          role="tooltip"
          aria-label={tooltip}
        >
          <div
            className="flex items-center gap-2"
            style={{ isolation: "isolate", contain: "layout style paint" }}
          >
            <span
              style={{ isolation: "isolate", contain: "layout style paint" }}
            >
              {tooltip}
            </span>
            <button
              onClick={handleDismiss}
              className="text-current/70 hover:text-current ml-1 leading-none flex-shrink-0 w-4 h-4 flex items-center justify-center rounded hover:bg-current/10 transition-colors"
              title="Dismiss"
              style={{ fontSize: "16px", isolation: "isolate" }}
              aria-label="Dismiss tooltip"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}


