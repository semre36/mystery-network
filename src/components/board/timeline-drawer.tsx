"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Calendar, Plus, X, Trash2, Clock, Loader2, AlertCircle } from "lucide-react";
import {
  SafeTimelineEventDto,
  TimePrecision,
} from "@/modules/investigation-board/types/board.types";

interface TimelineDrawerProps {
  investigationId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function TimelineDrawer({ investigationId, isOpen, onClose }: TimelineDrawerProps) {
  const [events, setEvents] = useState<SafeTimelineEventDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [timePrecision, setTimePrecision] = useState<TimePrecision>(TimePrecision.EXACT);
  const [rawTimeLabel, setRawTimeLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(() => {
    fetch(`/api/investigations/${investigationId}/timeline`)
      .then((res) => res.json())
      .then((json) => {
        if (json.ok) {
          setEvents(json.data.events || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [investigationId]);

  useEffect(() => {
    if (isOpen) {
      fetchEvents();
    }
  }, [isOpen, fetchEvents]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const payload: any = {
        title: title.trim(),
        description: description.trim(),
        timePrecision,
      };

      if (eventTime) {
        payload.eventTime = new Date(eventTime).toISOString();
      }
      if (rawTimeLabel.trim()) {
        payload.rawTimeLabel = rawTimeLabel.trim();
      }

      const res = await fetch(`/api/investigations/${investigationId}/timeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to add timeline event");
      }

      setEvents((prev) => [...prev, json.data.event]);
      setTitle("");
      setDescription("");
      setEventTime("");
      setRawTimeLabel("");
      setIsCreating(false);
    } catch (err: any) {
      setError(err.message || "Failed to record event");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    try {
      const res = await fetch(`/api/investigations/${investigationId}/timeline/${eventId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setEvents((prev) => prev.filter((e) => e.id !== eventId));
      }
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-80 sm:w-[480px] bg-[#090f1a] border-l border-[#1a253c] shadow-2xl flex flex-col animate-slideInRight">
      {/* Header */}
      <div className="p-4 border-b border-[#18233a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-slate-100 font-sans">
            Chronological Investigation Timeline
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Action Bar */}
      <div className="p-3 border-b border-[#141c2e] flex items-center justify-between">
        <span className="text-[11px] font-mono text-slate-400">
          Recorded Events: {events.length}
        </span>
        <button
          type="button"
          onClick={() => setIsCreating(!isCreating)}
          className="px-3 py-1.5 rounded-lg bg-blue-950/80 hover:bg-blue-900 border border-blue-700/50 text-blue-300 text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isCreating ? "Cancel" : "Add Event"}</span>
        </button>
      </div>

      {/* Creation form */}
      {isCreating && (
        <form
          onSubmit={handleCreate}
          className="p-4 border-b border-[#141c2e] bg-[#0c1424] space-y-3"
        >
          <div className="text-xs font-semibold text-blue-300 font-sans">New Timeline Point</div>

          {error && (
            <div className="p-2 rounded bg-rose-950/50 border border-rose-800 text-[11px] text-rose-300 flex items-center gap-1.5 font-mono">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
              Event Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Server room breach detected"
              className="w-full px-3 py-1.5 rounded-lg bg-[#080d17] border border-[#19243b] text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-sans"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                Precision
              </label>
              <select
                value={timePrecision}
                onChange={(e) => setTimePrecision(e.target.value as TimePrecision)}
                className="w-full px-2 py-1.5 rounded-lg bg-[#080d17] border border-[#19243b] text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-sans"
              >
                <option value={TimePrecision.EXACT}>Exact Timestamp</option>
                <option value={TimePrecision.APPROXIMATE}>Approximate</option>
                <option value={TimePrecision.DATE_ONLY}>Date Only</option>
                <option value={TimePrecision.UNKNOWN}>Unknown / Estimated</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                Estimated / Raw Label
              </label>
              <input
                type="text"
                value={rawTimeLabel}
                onChange={(e) => setRawTimeLabel(e.target.value)}
                placeholder="e.g. Around 23:45 CET"
                className="w-full px-3 py-1.5 rounded-lg bg-[#080d17] border border-[#19243b] text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-sans"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
              Exact Date / Time (Optional)
            </label>
            <input
              type="datetime-local"
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-[#080d17] border border-[#19243b] text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
              Event Details *
            </label>
            <textarea
              required
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Factual findings or operative timeline hypotheses..."
              className="w-full px-3 py-1.5 rounded-lg bg-[#080d17] border border-[#19243b] text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-sans resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-semibold transition-colors disabled:opacity-50"
          >
            {submitting ? "Recording..." : "Record Timeline Point"}
          </button>
        </form>
      )}

      {/* Events timeline sequence */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            <span className="text-xs font-mono">Aligning timeline intervals...</span>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 text-slate-500 font-mono text-xs">
            No chronological events recorded yet. Click &quot;Add Event&quot; to establish key
            timeline marks.
          </div>
        ) : (
          <div className="relative pl-6 border-l-2 border-blue-900/60 space-y-6">
            {events.map((e) => (
              <div key={e.id} className="relative group">
                {/* Timeline Marker Dot */}
                <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-[#090f1a] shadow-sm shadow-blue-500/50" />

                <div className="p-3.5 rounded-xl bg-[#0c1424] border border-[#19243b] hover:border-blue-500/40 transition-all space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-950/80 border border-blue-700/60 text-blue-300">
                          {e.rawTimeLabel ||
                            (e.eventTime
                              ? new Date(e.eventTime).toLocaleString()
                              : e.timePrecision)}
                        </span>
                        <span className="text-[9px] font-mono text-slate-500 uppercase">
                          [{e.timePrecision}]
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-100 font-sans mt-1.5">
                        {e.title}
                      </h4>
                    </div>

                    <button
                      type="button"
                      title="Delete event"
                      onClick={() => handleDelete(e.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                    {e.description}
                  </p>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[9px] font-mono text-slate-500">
                    <span>Logged by {e.createdByCodename}</span>
                    <span>{new Date(e.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
