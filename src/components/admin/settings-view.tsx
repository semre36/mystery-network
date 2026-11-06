"use client";

import { useEffect, useState } from "react";
import { Sliders, Save, Check, AlertCircle, RefreshCw } from "lucide-react";

interface SettingItem {
  id: string;
  key: string;
  value: any;
  description: string | null;
  updatedAt: string;
}

export function AdminSettingsView() {
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      const json = await res.json();
      if (json.ok) {
        setSettings(json.data.settings);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleUpdate = async (key: string, valueStr: string) => {
    setSaving(true);
    setMsg(null);
    try {
      let parsedValue: any = valueStr;
      try {
        parsedValue = JSON.parse(valueStr);
      } catch {
        // use string if not valid JSON
      }

      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: parsedValue }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update setting");

      setMsg({ type: "success", text: `Setting '${key}' updated successfully.` });
      setEditingKey(null);
      fetchSettings();
    } catch (err: any) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-tight text-slate-100 flex items-center gap-2">
            <Sliders className="w-6 h-6 text-slate-400" />
            Platform Operational Settings
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Dynamic system configuration parameters, maintenance mode flags, and cooperative squad
            thresholds.
          </p>
        </div>
      </div>

      {msg && (
        <div
          className={`p-3 rounded-lg border text-xs font-mono flex items-center gap-2 ${
            msg.type === "success"
              ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
              : "bg-red-950/60 border-red-500/40 text-red-300"
          }`}
        >
          {msg.type === "success" ? (
            <Check className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          {msg.text}
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 font-mono text-sm">
            Retrieving system configurations...
          </div>
        ) : settings.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-mono text-sm">
            No dynamic settings configured in database.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {settings.map((s) => {
              const isEditing = editingKey === s.key;
              return (
                <div
                  key={s.id}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <span className="font-mono text-xs font-bold text-slate-200">{s.key}</span>
                    <p className="text-xs text-slate-400 font-sans">{s.description}</p>
                    <div className="text-[10px] font-mono text-slate-500">
                      Last updated: {new Date(s.updatedAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                        <button
                          onClick={() => handleUpdate(s.key, editValue)}
                          disabled={saving}
                          className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-medium disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingKey(null)}
                          className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <code className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400">
                          {typeof s.value === "object" ? JSON.stringify(s.value) : String(s.value)}
                        </code>
                        <button
                          onClick={() => {
                            setEditingKey(s.key);
                            setEditValue(
                              typeof s.value === "object"
                                ? JSON.stringify(s.value)
                                : String(s.value)
                            );
                          }}
                          className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium border border-slate-700"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
