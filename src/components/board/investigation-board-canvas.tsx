"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Network,
  Plus,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Calendar,
  Lightbulb,
  FileText,
  UserCheck,
  StickyNote,
  ChevronLeft,
  Link2,
  Check,
  Loader2,
  Grid,
} from "lucide-react";
import {
  SafeInvestigationBoardDto,
  SafeBoardNodeDto,
  SafeBoardConnectionDto,
  SafeBoardViewportDto,
  BoardNodeType,
  BoardRelationshipType,
} from "@/modules/investigation-board/types/board.types";
import { BoardCard } from "./board-card";
import { ConnectionLine } from "./connection-line";
import { ConnectionDialog } from "./connection-dialog";
import { EvidenceDrawer } from "./evidence-drawer";
import { CharactersDrawer } from "./characters-drawer";
import { TimelineDrawer } from "./timeline-drawer";
import { TheoriesDrawer } from "./theories-drawer";

interface InvestigationBoardCanvasProps {
  initialBoard: SafeInvestigationBoardDto;
  caseTitle: string;
  caseCode: string;
}

export function InvestigationBoardCanvas({
  initialBoard,
  caseTitle,
  caseCode,
}: InvestigationBoardCanvasProps) {
  const [board, setBoard] = useState<SafeInvestigationBoardDto>(initialBoard);
  const [viewport, setViewport] = useState<SafeBoardViewportDto>(initialBoard.viewport);
  const [selectedNode, setSelectedNode] = useState<SafeBoardNodeDto | null>(null);
  const [connectSourceNode, setConnectSourceNode] = useState<SafeBoardNodeDto | null>(null);
  const [connectTargetNode, setConnectTargetNode] = useState<SafeBoardNodeDto | null>(null);
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);

  // Drawer toggles
  const [isEvidenceDrawerOpen, setIsEvidenceDrawerOpen] = useState(false);
  const [isCharactersDrawerOpen, setIsCharactersDrawerOpen] = useState(false);
  const [isTimelineDrawerOpen, setIsTimelineDrawerOpen] = useState(false);
  const [isTheoriesDrawerOpen, setIsTheoriesDrawerOpen] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"SAVED" | "SAVING" | "UNSAVED">("SAVED");

  // Dragging states
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Throttled persistence helper for node positions
  const pendingUpdatesRef = useRef<Record<string, { x: number; y: number }>>({});
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const persistNodePosition = useCallback(
    (nodeId: string, x: number, y: number) => {
      pendingUpdatesRef.current[nodeId] = { x, y };
      setSaveStatus("SAVING");

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        const updates = { ...pendingUpdatesRef.current };
        pendingUpdatesRef.current = {};

        for (const [nId, pos] of Object.entries(updates)) {
          try {
            await fetch(`/api/investigations/${board.investigationId}/board/nodes/${nId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ positionX: pos.x, positionY: pos.y }),
            });
          } catch {}
        }

        setSaveStatus("SAVED");
      }, 600);
    },
    [board.investigationId]
  );

  // Persist Viewport changes
  const persistViewport = useCallback(
    (newViewport: SafeBoardViewportDto) => {
      fetch(`/api/investigations/${board.investigationId}/board`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newViewport),
      }).catch(() => {});
    },
    [board.investigationId]
  );

  // Mouse handlers for Panning
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left-click
    setIsPanning(true);
    setPanStart({ x: e.clientX - viewport.panX, y: e.clientY - viewport.panY });
    setSelectedNode(null);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const newPanX = e.clientX - panStart.x;
      const newPanY = e.clientY - panStart.y;
      setViewport((prev) => ({ ...prev, panX: newPanX, panY: newPanY }));
      return;
    }

    if (draggingNodeId) {
      // Convert screen delta into canvas zoom space
      const newX = (e.clientX - viewport.panX) / viewport.zoom - dragOffset.x;
      const newY = (e.clientY - viewport.panY) / viewport.zoom - dragOffset.y;

      setBoard((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) =>
          n.id === draggingNodeId
            ? { ...n, positionX: Math.round(newX), positionY: Math.round(newY) }
            : n
        ),
      }));

      persistNodePosition(draggingNodeId, Math.round(newX), Math.round(newY));
    }
  };

  const handleCanvasMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      persistViewport(viewport);
    }
    if (draggingNodeId) {
      setDraggingNodeId(null);
    }
  };

  // Node Drag Start
  const handleNodeMouseDown = (e: React.MouseEvent, node: SafeBoardNodeDto) => {
    e.stopPropagation();

    // If connecting mode is active, clicking another node finishes the connection
    if (connectSourceNode && connectSourceNode.id !== node.id) {
      setConnectTargetNode(node);
      setIsConnectDialogOpen(true);
      return;
    }

    setDraggingNodeId(node.id);
    setSelectedNode(node);

    // Calculate click offset relative to node top-left in zoomed coordinates
    const mouseCanvasX = (e.clientX - viewport.panX) / viewport.zoom;
    const mouseCanvasY = (e.clientY - viewport.panY) / viewport.zoom;
    setDragOffset({
      x: mouseCanvasX - node.positionX,
      y: mouseCanvasY - node.positionY,
    });
  };

  // Zoom handlers
  const handleZoom = (delta: number) => {
    setViewport((prev) => {
      const newZoom = Math.min(Math.max(Number((prev.zoom + delta).toFixed(2)), 0.3), 2.5);
      const updated = { ...prev, zoom: newZoom };
      persistViewport(updated);
      return updated;
    });
  };

  const handleResetView = () => {
    const reset = { zoom: 1, panX: 0, panY: 0 };
    setViewport(reset);
    persistViewport(reset);
  };

  // Pin actions
  const handleAddNote = async () => {
    const canvasCenterX = Math.round((-viewport.panX + 400) / viewport.zoom);
    const canvasCenterY = Math.round((-viewport.panY + 300) / viewport.zoom);

    try {
      const res = await fetch(`/api/investigations/${board.investigationId}/board/nodes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeType: BoardNodeType.NOTE,
          title: "Investigative Memo",
          description: "Record observations, cipher hypotheses, or cross-checks...",
          positionX: canvasCenterX,
          positionY: canvasCenterY,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setBoard((prev) => ({ ...prev, nodes: [...prev.nodes, json.data.node] }));
        setSelectedNode(json.data.node);
      }
    } catch {}
  };

  const handlePinEvidence = async (clue: any) => {
    const canvasCenterX = Math.round((-viewport.panX + 350 + Math.random() * 60) / viewport.zoom);
    const canvasCenterY = Math.round((-viewport.panY + 250 + Math.random() * 60) / viewport.zoom);

    try {
      const res = await fetch(`/api/investigations/${board.investigationId}/board/nodes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeType: BoardNodeType.EVIDENCE,
          referencedEntityId: clue.id,
          title: clue.title,
          description: clue.description || clue.descriptionSnippet,
          positionX: canvasCenterX,
          positionY: canvasCenterY,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setBoard((prev) => ({ ...prev, nodes: [...prev.nodes, json.data.node] }));
        setIsEvidenceDrawerOpen(false);
      }
    } catch {}
  };

  const handlePinCharacter = async (char: any) => {
    const canvasCenterX = Math.round((-viewport.panX + 350 + Math.random() * 60) / viewport.zoom);
    const canvasCenterY = Math.round((-viewport.panY + 250 + Math.random() * 60) / viewport.zoom);

    try {
      const res = await fetch(`/api/investigations/${board.investigationId}/board/nodes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeType: BoardNodeType.CHARACTER,
          referencedEntityId: char.id,
          title: char.name,
          description: char.description,
          positionX: canvasCenterX,
          positionY: canvasCenterY,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setBoard((prev) => ({ ...prev, nodes: [...prev.nodes, json.data.node] }));
        setIsCharactersDrawerOpen(false);
      }
    } catch {}
  };

  const handleDeleteNode = async (nodeId: string) => {
    try {
      const res = await fetch(
        `/api/investigations/${board.investigationId}/board/nodes/${nodeId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setBoard((prev) => ({
          ...prev,
          nodes: prev.nodes.filter((n) => n.id !== nodeId),
          connections: prev.connections.filter(
            (c) => c.sourceNodeId !== nodeId && c.targetNodeId !== nodeId
          ),
        }));
        if (selectedNode?.id === nodeId) setSelectedNode(null);
        if (connectSourceNode?.id === nodeId) setConnectSourceNode(null);
      }
    } catch {}
  };

  const handleCreateConnection = async (data: {
    relationshipType: BoardRelationshipType;
    label?: string;
    description?: string;
  }) => {
    if (!connectSourceNode || !connectTargetNode) return;

    try {
      const res = await fetch(`/api/investigations/${board.investigationId}/board/connections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceNodeId: connectSourceNode.id,
          targetNodeId: connectTargetNode.id,
          relationshipType: data.relationshipType,
          label: data.label,
          description: data.description,
        }),
      });

      const json = await res.json();
      if (json.ok) {
        setBoard((prev) => ({
          ...prev,
          connections: [
            ...prev.connections.filter((c) => c.id !== json.data.connection.id),
            json.data.connection,
          ],
        }));
      }
    } catch {
    } finally {
      setConnectSourceNode(null);
      setConnectTargetNode(null);
      setIsConnectDialogOpen(false);
    }
  };

  const handleDeleteConnection = async (connectionId: string) => {
    try {
      const res = await fetch(
        `/api/investigations/${board.investigationId}/board/connections/${connectionId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setBoard((prev) => ({
          ...prev,
          connections: prev.connections.filter((c) => c.id !== connectionId),
        }));
      }
    } catch {}
  };

  // Node lookup map for rapid connection anchor lookups
  const nodesMap = new Map<string, SafeBoardNodeDto>();
  for (const n of board.nodes) {
    nodesMap.set(n.id, n);
  }

  return (
    <div className="relative w-full h-[calc(100vh-64px)] overflow-hidden bg-[#070b14] flex flex-col select-none">
      {/* Top Floating Control Bar */}
      <header className="absolute top-3 inset-x-3 z-30 flex items-center justify-between gap-3 pointer-events-none">
        {/* Left: Back & Case Metadata */}
        <div className="flex items-center gap-2 pointer-events-auto bg-[#0a1120]/90 backdrop-blur-md px-3 py-2 rounded-2xl border border-[#1d2a44] shadow-xl">
          <Link
            href={`/investigations/${board.investigationId}`}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            title="Return to Case Command Console"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div className="border-l border-white/10 pl-2">
            <div className="flex items-center gap-1.5">
              <Network className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-semibold text-slate-100 font-sans truncate max-w-[180px] sm:max-w-xs">
                {board.title}
              </span>
            </div>
            <span className="text-[10px] font-mono text-cyan-400/80 uppercase">
              {caseCode} • {board.nodes.length} Pins • {board.connections.length} Strings
            </span>
          </div>
        </div>

        {/* Center: Connect Mode Banner */}
        {connectSourceNode && (
          <div className="pointer-events-auto bg-red-950/90 border border-red-500/60 px-4 py-1.5 rounded-full shadow-lg text-xs font-mono text-red-200 flex items-center gap-2 animate-bounce">
            <Link2 className="w-3.5 h-3.5 text-red-400" />
            <span>Click destination pin to attach string</span>
            <button
              type="button"
              onClick={() => setConnectSourceNode(null)}
              className="text-white/60 hover:text-white ml-2 font-bold"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Right: Actions, Drawers & Save Status */}
        <div className="flex items-center gap-2 pointer-events-auto bg-[#0a1120]/90 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-[#1d2a44] shadow-xl">
          {/* Add Pin Tools */}
          <div className="flex items-center gap-1 border-r border-white/10 pr-2">
            <button
              type="button"
              title="Pin Evidence to Board"
              onClick={() => setIsEvidenceDrawerOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-700/50 text-cyan-300 text-xs font-mono flex items-center gap-1.5 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Evidence</span>
            </button>

            <button
              type="button"
              title="Pin Suspect/Witness to Board"
              onClick={() => setIsCharactersDrawerOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-amber-950/60 hover:bg-amber-900/60 border border-amber-700/50 text-amber-300 text-xs font-mono flex items-center gap-1.5 transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Persons</span>
            </button>

            <button
              type="button"
              title="Add Investigator Memo"
              onClick={handleAddNote}
              className="px-2.5 py-1.5 rounded-xl bg-yellow-950/60 hover:bg-yellow-900/60 border border-yellow-700/50 text-yellow-300 text-xs font-mono flex items-center gap-1.5 transition-colors"
            >
              <StickyNote className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Memo</span>
            </button>
          </div>

          {/* Timeline & Theories Drawers */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              title="Chronological Timeline"
              onClick={() => setIsTimelineDrawerOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-blue-950/60 hover:bg-blue-900/60 border border-blue-700/50 text-blue-300 text-xs font-mono flex items-center gap-1.5 transition-colors"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Timeline</span>
            </button>

            <button
              type="button"
              title="Hypotheses & Theories"
              onClick={() => setIsTheoriesDrawerOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-700/50 text-purple-300 text-xs font-mono flex items-center gap-1.5 transition-colors"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Theories</span>
            </button>
          </div>

          {/* Save Status indicator */}
          <div className="border-l border-white/10 pl-2 flex items-center gap-1.5 text-[10px] font-mono">
            {saveStatus === "SAVING" ? (
              <span className="text-amber-400 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Saving...
              </span>
            ) : (
              <span className="text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3" /> Synced
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Zoomable & Pannable Corkboard Canvas */}
      <div
        ref={canvasRef}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        className={`flex-1 relative cursor-grab active:cursor-grabbing overflow-hidden ${
          showGrid
            ? "bg-[radial-gradient(#152033_1px,transparent_1px)] [background-size:24px_24px]"
            : "bg-[#070b14]"
        }`}
      >
        {/* World container that gets transformed via Pan & Zoom */}
        <div
          style={{
            transform: `translate3d(${viewport.panX}px, ${viewport.panY}px, 0) scale(${viewport.zoom})`,
            transformOrigin: "0 0",
          }}
          className="absolute inset-0 pointer-events-none"
        >
          {/* SVG layer for connection lines (behind cards) */}
          <svg className="absolute inset-0 w-[50000px] h-[50000px] -top-[25000px] -left-[25000px] pointer-events-auto">
            {board.connections.map((c) => (
              <ConnectionLine
                key={c.id}
                connection={c}
                sourceNode={nodesMap.get(c.sourceNodeId)}
                targetNode={nodesMap.get(c.targetNodeId)}
                onDeleteConnection={handleDeleteConnection}
              />
            ))}
          </svg>

          {/* Draggable Cards Layer */}
          <div className="absolute inset-0 pointer-events-auto">
            {board.nodes.map((node) => (
              <BoardCard
                key={node.id}
                node={node}
                isSelected={selectedNode?.id === node.id}
                isConnectSource={connectSourceNode?.id === node.id}
                onSelect={(n) => setSelectedNode(n)}
                onStartConnect={(n) => setConnectSourceNode(n)}
                onDelete={handleDeleteNode}
                onMouseDown={handleNodeMouseDown}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Floating Canvas Controls (Zoom, Pan, Grid) */}
      <div className="absolute bottom-4 left-4 z-30 flex items-center gap-1.5 bg-[#0a1120]/90 backdrop-blur-md p-1.5 rounded-2xl border border-[#1d2a44] shadow-xl">
        <button
          type="button"
          title="Zoom in"
          onClick={() => handleZoom(0.15)}
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <span className="text-[11px] font-mono text-slate-400 px-1 min-w-[42px] text-center">
          {Math.round(viewport.zoom * 100)}%
        </span>
        <button
          type="button"
          title="Zoom out"
          onClick={() => handleZoom(-0.15)}
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="h-4 w-px bg-white/10 mx-0.5" />
        <button
          type="button"
          title="Reset Canvas View"
          onClick={handleResetView}
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          type="button"
          title="Toggle Canvas Grid"
          onClick={() => setShowGrid(!showGrid)}
          className={`p-2 rounded-xl transition-colors ${
            showGrid ? "text-cyan-400 bg-cyan-950/40" : "text-slate-400 hover:text-white"
          }`}
        >
          <Grid className="w-4 h-4" />
        </button>
      </div>

      {/* Connection Creation Dialog */}
      {connectSourceNode && connectTargetNode && (
        <ConnectionDialog
          sourceNode={connectSourceNode}
          targetNode={connectTargetNode}
          isOpen={isConnectDialogOpen}
          onClose={() => {
            setIsConnectDialogOpen(false);
            setConnectSourceNode(null);
            setConnectTargetNode(null);
          }}
          onConfirm={handleCreateConnection}
        />
      )}

      {/* Evidence Drawer */}
      <EvidenceDrawer
        investigationId={board.investigationId}
        isOpen={isEvidenceDrawerOpen}
        onClose={() => setIsEvidenceDrawerOpen(false)}
        onPinEvidence={handlePinEvidence}
      />

      {/* Persons of Interest Drawer */}
      <CharactersDrawer
        investigationId={board.investigationId}
        isOpen={isCharactersDrawerOpen}
        onClose={() => setIsCharactersDrawerOpen(false)}
        onPinCharacter={handlePinCharacter}
      />

      {/* Timeline Drawer */}
      <TimelineDrawer
        investigationId={board.investigationId}
        isOpen={isTimelineDrawerOpen}
        onClose={() => setIsTimelineDrawerOpen(false)}
      />

      {/* Theories Drawer */}
      <TheoriesDrawer
        investigationId={board.investigationId}
        isOpen={isTheoriesDrawerOpen}
        onClose={() => setIsTheoriesDrawerOpen(false)}
      />
    </div>
  );
}
