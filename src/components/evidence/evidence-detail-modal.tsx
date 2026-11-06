"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  FileText,
  Camera,
  Headphones,
  Microscope,
  Key,
  FolderOpen,
  Lock,
  Share2,
  Globe,
  Clock,
  Download,
  AlertCircle,
  Loader2,
  ShieldAlert,
  Layers,
} from "lucide-react";
import { ClueType, AssetType } from "@prisma/client";
import type {
  SafeEvidenceDetailDto,
  SafeEvidenceNoteDto,
  SafeEvidenceShareInfoDto,
} from "@/modules/evidence/types/evidence.types";
import { EvidenceNotesEditor } from "./evidence-notes-editor";
import { EvidenceShareDialog } from "./evidence-share-dialog";

interface EvidenceDetailModalProps {
  investigationId: string;
  evidenceId: string | null;
  onClose: () => void;
  onEvidenceUpdated?: () => void;
}

const TYPE_ICONS: Record<ClueType, React.ElementType> = {
  DOCUMENT: FileText,
  PHOTOGRAPH: Camera,
  AUDIO_LOG: Headphones,
  FORENSIC_ITEM: Microscope,
  CIPHER_FRAGMENT: Key,
  TESTIMONY: FolderOpen,
};

const CLASSIFICATION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  TOP_SECRET: { bg: "bg-rose-950/70", text: "text-rose-400", border: "border-rose-700/60" },
  SECRET: { bg: "bg-amber-950/70", text: "text-amber-400", border: "border-amber-700/60" },
  CONFIDENTIAL: { bg: "bg-yellow-950/70", text: "text-yellow-400", border: "border-yellow-700/60" },
  RESTRICTED: { bg: "bg-cyan-950/70", text: "text-cyan-300", border: "border-cyan-700/60" },
  PUBLIC: { bg: "bg-slate-900/70", text: "text-slate-300", border: "border-slate-700/60" },
};

export const EvidenceDetailModal: React.FC<EvidenceDetailModalProps> = ({
  investigationId,
  evidenceId,
  onClose,
  onEvidenceUpdated,
}) => {
  const [detail, setDetail] = useState<SafeEvidenceDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"CONTENT" | "ASSETS" | "NOTES" | "SHARE">("CONTENT");

  useEffect(() => {
    if (!evidenceId) return;

    let isMounted = true;

    fetch(`/api/investigations/${investigationId}/evidence/${evidenceId}`)
      .then(async (res) => {
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || "Failed to load evidence details.");
        }
        return res.json();
      })
      .then((json) => {
        if (isMounted) {
          setDetail(json.data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [investigationId, evidenceId]);

  if (!evidenceId) return null;

  const IconComponent = detail ? TYPE_ICONS[detail.clueType] || FileText : FileText;
  const classConfig = detail
    ? CLASSIFICATION_COLORS[detail.classification] || CLASSIFICATION_COLORS.RESTRICTED
    : CLASSIFICATION_COLORS.RESTRICTED;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative flex flex-col w-full max-w-3xl max-h-[90vh] rounded-xl border border-slate-800 bg-[#070b14] text-slate-100 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Banner */}
        <div className="flex items-center justify-between border-b border-slate-800/80 bg-[#0c1222] px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="rounded border border-slate-700 bg-slate-800 p-2 text-cyan-400">
              <IconComponent className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase border ${classConfig.bg} ${classConfig.text} ${classConfig.border}`}
                >
                  {detail ? detail.classification : "CLASSIFIED"}
                </span>
                <span className="font-mono text-xs text-slate-400 font-semibold">
                  {detail ? detail.clueCode : "EVID-..."}
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-100 line-clamp-1 mt-0.5">
                {detail ? detail.title : "Classified Evidence"}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-500 mb-3" />
            <p className="text-xs font-mono">Decrypting classified intelligence dossier...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <div className="inline-flex rounded-full bg-rose-950/50 p-3 text-rose-400 mb-3 border border-rose-800/50">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-rose-300 mb-1">Access Restricted</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">{error}</p>
            <button
              onClick={onClose}
              className="rounded bg-slate-800 px-4 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
            >
              Return to Vault
            </button>
          </div>
        ) : detail ? (
          <>
            {/* Meta Strip */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/60 bg-[#090f1d] px-5 py-2 text-xs text-slate-400">
              <div className="flex items-center gap-4">
                {detail.chapterTitle && (
                  <span className="flex items-center gap-1.5 font-mono text-slate-300">
                    <Layers className="h-3.5 w-3.5 text-cyan-400" />
                    {detail.chapterTitle}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-500" />
                  {new Date(detail.discoveredAt).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {detail.accessType === "ASSIGNED" && (
                  <span className="inline-flex items-center gap-1 rounded bg-cyan-950/40 px-2 py-0.5 text-[11px] text-cyan-300 border border-cyan-800/40 font-mono">
                    <Lock className="h-3 w-3" /> Assigned
                  </span>
                )}
                {detail.accessType === "SHARED" && (
                  <span className="inline-flex items-center gap-1 rounded bg-purple-950/50 px-2 py-0.5 text-[11px] text-purple-300 border border-purple-800/50 font-mono">
                    <Share2 className="h-3 w-3" /> Shared
                  </span>
                )}
                {detail.accessType === "INVESTIGATION_WIDE" && (
                  <span className="inline-flex items-center gap-1 rounded bg-blue-950/40 px-2 py-0.5 text-[11px] text-blue-300 border border-blue-800/40 font-mono">
                    <Globe className="h-3 w-3" /> Global
                  </span>
                )}
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800 px-5 pt-3">
              <button
                onClick={() => setActiveTab("CONTENT")}
                className={`pb-2.5 text-xs font-semibold tracking-wider transition-all border-b-2 ${
                  activeTab === "CONTENT"
                    ? "border-cyan-400 text-cyan-300"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Intelligence Dossier
              </button>

              {detail.assets.length > 0 && (
                <button
                  onClick={() => setActiveTab("ASSETS")}
                  className={`flex items-center gap-1.5 pb-2.5 text-xs font-semibold tracking-wider transition-all border-b-2 ${
                    activeTab === "ASSETS"
                      ? "border-cyan-400 text-cyan-300"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span>Attachments</span>
                  <span className="rounded-full bg-slate-800 px-1.5 py-0.2 text-[10px] font-mono">
                    {detail.assets.length}
                  </span>
                </button>
              )}

              <button
                onClick={() => setActiveTab("NOTES")}
                className={`flex items-center gap-1.5 pb-2.5 text-xs font-semibold tracking-wider transition-all border-b-2 ${
                  activeTab === "NOTES"
                    ? "border-amber-400 text-amber-300"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>Field Notes</span>
                {detail.myNote && <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>}
              </button>

              {detail.isShareable && (
                <button
                  onClick={() => setActiveTab("SHARE")}
                  className={`flex items-center gap-1.5 pb-2.5 text-xs font-semibold tracking-wider transition-all border-b-2 ${
                    activeTab === "SHARE"
                      ? "border-purple-400 text-purple-300"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span>Share Intel</span>
                  {detail.shares.length > 0 && (
                    <span className="rounded-full bg-purple-950 px-1.5 py-0.2 text-[10px] text-purple-300 font-mono border border-purple-800/40">
                      {detail.shares.length}
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Tab Panes */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {activeTab === "CONTENT" && (
                <div className="space-y-4">
                  {/* Summary Briefing */}
                  <div>
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      Tactical Summary
                    </h4>
                    <p className="text-xs text-slate-200 leading-relaxed bg-[#0b101d] p-3 rounded-lg border border-slate-800/80">
                      {detail.description}
                    </p>
                  </div>

                  {/* Formatted Content Viewer */}
                  <div>
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                      Declassified Telemetry & Verbatim Data
                    </h4>
                    <div className="rounded-lg border border-slate-800/90 bg-[#060a12] p-4 font-mono text-xs leading-relaxed text-slate-300">
                      {typeof detail.content === "object" && detail.content !== null ? (
                        <div className="space-y-2">
                          {Object.entries(detail.content).map(([k, v]) => (
                            <div key={k} className="border-b border-slate-800/40 pb-1.5">
                              <span className="text-cyan-400 font-semibold uppercase text-[11px]">
                                {k.replace(/([A-Z])/g, "_$1").toUpperCase()}:
                              </span>{" "}
                              <span className="text-slate-200 font-sans">
                                {typeof v === "object" ? JSON.stringify(v, null, 2) : String(v)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <pre className="whitespace-pre-wrap">{String(detail.content)}</pre>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "ASSETS" && (
                <div className="space-y-3">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Forensic Assets & Evidence Files
                  </h4>
                  {detail.assets.map((asset) => (
                    <div
                      key={asset.id}
                      className="flex items-center justify-between rounded-lg border border-slate-800 bg-[#0b101d] p-3.5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded bg-slate-800 p-2 text-cyan-400">
                          {asset.assetType === AssetType.IMAGE && <Camera className="h-4 w-4" />}
                          {asset.assetType === AssetType.AUDIO && (
                            <Headphones className="h-4 w-4" />
                          )}
                          {asset.assetType === AssetType.PDF && <FileText className="h-4 w-4" />}
                          {asset.assetType !== AssetType.IMAGE &&
                            asset.assetType !== AssetType.AUDIO &&
                            asset.assetType !== AssetType.PDF && <Microscope className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-200 font-mono">
                            {asset.fileName}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {asset.mimeType} • {(asset.fileSizeBytes / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>

                      <span className="rounded border border-slate-700 bg-slate-800/60 px-2 py-1 text-[10px] font-mono text-slate-400">
                        Secure Storage Verified
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "NOTES" && (
                <EvidenceNotesEditor
                  investigationId={investigationId}
                  evidenceId={detail.id}
                  initialNote={detail.myNote}
                  onNoteSaved={(updatedNote: SafeEvidenceNoteDto) => {
                    setDetail((prev) => (prev ? { ...prev, myNote: updatedNote } : null));
                    if (onEvidenceUpdated) onEvidenceUpdated();
                  }}
                />
              )}

              {activeTab === "SHARE" && (
                <EvidenceShareDialog
                  investigationId={investigationId}
                  evidenceId={detail.id}
                  evidenceTitle={detail.title}
                  clueCode={detail.clueCode}
                  eligibleRecipients={detail.eligibleRecipients}
                  existingShares={detail.shares}
                  onShared={(newShare: SafeEvidenceShareInfoDto) => {
                    setDetail((prev) =>
                      prev ? { ...prev, shares: [newShare, ...prev.shares] } : null
                    );
                    if (onEvidenceUpdated) onEvidenceUpdated();
                  }}
                />
              )}
            </div>
          </>
        ) : null}

        {/* Modal Footer */}
        <div className="border-t border-slate-800/80 bg-[#090f1d] px-5 py-3 flex items-center justify-between text-xs text-slate-500">
          <span className="font-mono text-[11px]">MYSTERY NETWORK // ARCHIVE SECURE</span>
          <button
            onClick={onClose}
            className="rounded border border-slate-700 bg-slate-800 px-3.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700 cursor-pointer"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};
