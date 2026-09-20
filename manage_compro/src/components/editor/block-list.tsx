"use client";

import type { Block } from "@/types/content";
import { blockMeta } from "@/lib/block-meta";
import { useState } from "react";

interface BlockListProps {
  blocks: Block[];
  onReorder: (blocks: Block[]) => void;
  onDelete: (index: number) => void;
  onEdit: (index: number) => void;
}

export function BlockList({ blocks, onReorder, onDelete, onEdit }: BlockListProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const newBlocks = [...blocks];
    const [removed] = newBlocks.splice(draggedIndex, 1);
    newBlocks.splice(index, 0, removed);
    onReorder(newBlocks);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <ol style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {blocks.map((block, index) => {
        const meta = blockMeta[block.type];
        const isDragging = draggedIndex === index;
        return (
          <li
            key={`${block.type}-${index}`}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.75rem",
              background: isDragging ? "rgba(36,108,255,0.1)" : "var(--surface-light)",
              border: `1px solid ${isDragging ? "var(--blue)" : "var(--line)"}`,
              borderRadius: "0.35rem",
              opacity: isDragging ? 0.7 : 1,
              cursor: "grab",
              transition: "all 0.2s",
            }}
          >
            <span style={{ fontSize: "1.5rem" }}>{meta?.icon || "📦"}</span>
            <span style={{ flex: 1, fontWeight: 500 }}>{meta?.label || block.type}</span>
            <button
              type="button"
              onClick={() => onEdit(index)}
              style={{ background: "var(--accent)", color: "white", border: "none", borderRadius: "0.3rem", padding: "0.4rem 0.75rem", cursor: "pointer", fontSize: "0.75rem" }}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onDelete(index)}
              style={{ background: "var(--orange)", color: "white", border: "none", borderRadius: "0.3rem", padding: "0.4rem 0.75rem", cursor: "pointer", fontSize: "0.75rem" }}
            >
              Delete
            </button>
          </li>
        );
      })}
    </ol>
  );
}