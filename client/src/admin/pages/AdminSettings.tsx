import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminApiFetch } from "../api";

export default function AdminSettings() {
  const [cancellationWindowMinutes, setCancellationWindowMinutes] = useState<number>(60);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    adminApiFetch<{ cancellationWindowMinutes: number }>("/api/admin/settings").then((r) => {
      if (r.ok && typeof r.data?.cancellationWindowMinutes === "number") {
        setCancellationWindowMinutes(r.data.cancellationWindowMinutes);
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    const value = Math.round(Number(cancellationWindowMinutes));
    if (!Number.isFinite(value) || value < 0 || value > 1440) {
      setError("Enter a number between 0 and 1440");
      return;
    }
    setError(null);
    setMessage(null);
    setSaving(true);
    const res = await adminApiFetch<{ cancellationWindowMinutes: number }>("/api/admin/settings", {
      method: "PATCH",
      body: JSON.stringify({ cancellationWindowMinutes: value }),
    });
    setSaving(false);
    if (res.ok) {
      setCancellationWindowMinutes(res.data.cancellationWindowMinutes);
      setMessage("Settings saved.");
    } else {
      setError(res.message);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-2 text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <div className="max-w-md space-y-4">
        <div className="space-y-2">
          <Label htmlFor="cancellation-window">Cancellation window (minutes)</Label>
          <Input
            id="cancellation-window"
            type="number"
            min={0}
            max={1440}
            value={cancellationWindowMinutes}
            onChange={(e) => setCancellationWindowMinutes(parseInt(e.target.value, 10) || 0)}
          />
          <p className="text-xs text-muted-foreground">
            Members cannot cancel a booking within this many minutes before the class start time. (0–1440, e.g. 60 = 1 hour.)
          </p>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {message && <p className="text-sm text-green-600 dark:text-green-400">{message}</p>}
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
