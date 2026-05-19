import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Calendar, Edit3, Flag, ShieldAlert, Trash2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

type AdminEvent = {
  id: string | number;
  title: string;
  category?: string | null;
  date: string;
  created_at?: string | null;
  creator_username?: string | null;
  city?: string | null;
  venue?: string | null;
};

type EventReport = {
  id: number;
  userId: number;
  eventId: number;
  reason: string;
  details: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  reporterUsername: string;
  event: {
    title: string;
    date: string;
    location: string;
    city: string;
    venue: string;
    createdAt: string;
  } | null;
};

const reasonLabels: Record<string, string> = {
  spam: "Spam",
  scam: "Oszustwo",
  inappropriate: "Nieodpowiednie",
  duplicate: "Duplikat",
  other: "Inne",
};

function formatDate(date: string) {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? "Brak daty"
    : parsed.toLocaleString("pl-PL", {
        dateStyle: "medium",
        timeStyle: "short",
      });
}

function formatLocation(city?: string | null, venue?: string | null) {
  if (city && venue) return `${venue}, ${city}`;
  return venue || city || "Brak lokalizacji";
}

export function AdminPanel() {
  const { user, token, isLoading } = useAuth();
  const [reports, setReports] = useState<EventReport[]>([]);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<number | null>(null);
  const [selectedEventIds, setSelectedEventIds] = useState<Set<number>>(new Set());
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkActionLoading, setBulkActionLoading] = useState<null | "delete" | "move">(null);

  const isAdmin = user?.is_admin === true;
  const categories = useMemo(() => {
    const unique = [...new Set(events.map((event) => event.category || "Inne"))].sort((a, b) =>
      a.localeCompare(b, "pl")
    );
    return unique.length > 0 ? unique : ["Inne"];
  }, [events]);

  const selectedEvents = useMemo(
    () => events.filter((event) => selectedEventIds.has(Number(event.id))),
    [events, selectedEventIds]
  );

  const openReports = useMemo(() => reports.filter((report) => report.status === "open"), [reports]);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      if (!token || !isAdmin) {
        setReports([]);
        setEvents([]);
        setLoadingData(false);
        return;
      }

      try {
        setLoadingData(true);
        setError(null);

        const [reportsResponse, eventsResponse] = await Promise.all([
          fetch("/api/events?reports=1", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch("/api/events"),
        ]);

        if (!reportsResponse.ok) {
          const payload = await reportsResponse.json().catch(() => ({}));
          throw new Error(payload?.error || "Nie udało się pobrać zgłoszeń.");
        }

        if (!eventsResponse.ok) {
          throw new Error("Nie udało się pobrać wydarzeń.");
        }

        const reportsData = await reportsResponse.json();
        const eventsData = await eventsResponse.json();

        if (!mounted) return;

        setReports(Array.isArray(reportsData?.items) ? reportsData.items : []);
        setEvents(Array.isArray(eventsData) ? eventsData : []);
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Wystąpił nieznany błąd.");
          setReports([]);
          setEvents([]);
        }
      } finally {
        if (mounted) {
          setLoadingData(false);
        }
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, [token, isAdmin]);

  async function handleDeleteEvent(eventId: number) {
    if (!token) return;

    const confirmed = window.confirm(
      "Czy na pewno chcesz usunąć to wydarzenie? Spowoduje to też usunięcie zgłoszeń, ocen i zakupów powiązanych z tym wydarzeniem."
    );
    if (!confirmed) return;

    try {
      setDeletingEventId(eventId);
      const response = await fetch(`/api/events?id=${eventId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Nie udało się usunąć wydarzenia.");
      }

      toast.success("Wydarzenie zostało usunięte.");
      setEvents((prev) => prev.filter((event) => Number(event.id) !== eventId));
      setReports((prev) => prev.filter((report) => report.eventId !== eventId));
      setSelectedEventIds((prev) => {
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Wystąpił nieznany błąd.");
    } finally {
      setDeletingEventId(null);
    }
  }

  async function handleBulkDelete() {
    if (!token || selectedEvents.length === 0) return;

    const confirmed = window.confirm(
      `Czy na pewno chcesz usunąć ${selectedEvents.length} wydarzeń?`
    );
    if (!confirmed) return;

    try {
      setBulkActionLoading("delete");
      const response = await fetch("/api/events?action=bulk-delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids: [...selectedEventIds] }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Nie udało się usunąć wydarzeń.");
      }

      toast.success("Wydarzenia zostały usunięte.");
      setEvents((prev) => prev.filter((event) => !selectedEventIds.has(Number(event.id))));
      setReports((prev) => prev.filter((report) => !selectedEventIds.has(report.eventId)));
      setSelectedEventIds(new Set());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Wystąpił nieznany błąd.");
    } finally {
      setBulkActionLoading(null);
    }
  }

  async function handleBulkMove() {
    if (!token || selectedEvents.length === 0) return;

    const category = bulkCategory.trim();
    if (!category) {
      toast.error("Wybierz kategorię docelową.");
      return;
    }

    try {
      setBulkActionLoading("move");
      const response = await fetch("/api/events?action=bulk-move-category", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids: [...selectedEventIds], category }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Nie udało się przenieść wydarzeń.");
      }

      toast.success("Wydarzenia zostały przeniesione do nowej kategorii.");
      setEvents((prev) =>
        prev.map((event) =>
          selectedEventIds.has(Number(event.id)) ? { ...event, category } : event
        )
      );
      setSelectedEventIds(new Set());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Wystąpił nieznany błąd.");
    } finally {
      setBulkActionLoading(null);
    }
  }

  function toggleSelected(eventId: number) {
    setSelectedEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  }

  function selectAllVisible() {
    setSelectedEventIds(new Set(events.map((event) => Number(event.id))));
  }

  function clearSelection() {
    setSelectedEventIds(new Set());
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-gray-500">Ładowanie panelu...</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="space-y-3 p-6">
            <div className="flex items-center gap-3 text-amber-900">
              <ShieldAlert className="size-5" />
              <h1 className="text-2xl font-semibold">Panel administratora</h1>
            </div>
            <p className="text-amber-800">
              Dostęp do tego widoku mają tylko zalogowani administratorzy.
            </p>
            {!user && (
              <Button asChild>
                <Link to="/login">Przejdź do logowania</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-900 p-8 text-white shadow-xl">
        <div className="flex items-center gap-3">
          <ShieldAlert className="size-8 text-emerald-300" />
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-emerald-200/80">Admin panel</p>
            <h1 className="text-4xl font-semibold">Panel administratora</h1>
          </div>
        </div>
        <p className="mt-4 max-w-3xl text-white/80">
          Przeglądaj zgłoszenia użytkowników, edytuj wydarzenia i wykonuj akcje zbiorcze bez
          opuszczania panelu.
        </p>
      </div>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="p-4 text-red-700">{error}</CardContent>
        </Card>
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-slate-500">Otwarte zgłoszenia</p>
              <p className="text-3xl font-semibold">{openReports.length}</p>
            </div>
            <Flag className="size-10 text-amber-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-slate-500">Wszystkie zgłoszenia</p>
              <p className="text-3xl font-semibold">{reports.length}</p>
            </div>
            <AlertTriangle className="size-10 text-rose-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-slate-500">Wydarzenia</p>
              <p className="text-3xl font-semibold">{events.length}</p>
            </div>
            <Calendar className="size-10 text-emerald-600" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="reports" className="space-y-6">
        <TabsList className="grid w-full max-w-xl grid-cols-2">
          <TabsTrigger value="reports">Zgłoszenia</TabsTrigger>
          <TabsTrigger value="events">Wydarzenia</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-4">
          {loadingData && <p className="text-gray-500">Ładowanie zgłoszeń...</p>}

          {!loadingData && reports.length === 0 && (
            <Card>
              <CardContent className="p-6 text-gray-600">Brak zgłoszeń do wyświetlenia.</CardContent>
            </Card>
          )}

          <div className="grid gap-4">
            {reports.map((report) => (
              <Card key={report.id} className="overflow-hidden border-slate-200">
                <CardContent className="space-y-4 p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-semibold text-slate-900">
                          {report.event?.title || `Wydarzenie #${report.eventId}`}
                        </h2>
                        <Badge variant={report.status === "open" ? "default" : "secondary"}>
                          {report.status === "open" ? "Otwarte" : report.status}
                        </Badge>
                        <Badge variant="outline">{reasonLabels[report.reason] || report.reason}</Badge>
                      </div>
                      <p className="text-sm text-slate-500">
                        Zgłoszone przez {report.reporterUsername} dnia {formatDate(report.createdAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/my-events?edit=${report.eventId}`}>
                          <Edit3 className="mr-2 size-4" />
                          Edytuj wydarzenie
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={deletingEventId === report.eventId}
                        onClick={() => handleDeleteEvent(report.eventId)}
                      >
                        <Trash2 className="mr-2 size-4" />
                        {deletingEventId === report.eventId ? "Usuwanie..." : "Usuń wydarzenie"}
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Szczegóły zgłoszenia</p>
                      <p className="mt-1 text-sm text-slate-700">
                        {report.details || "Brak dodatkowego opisu."}
                      </p>
                    </div>
                    <div className="space-y-1 text-sm text-slate-600">
                      <p>
                        <span className="font-medium text-slate-800">Data wydarzenia:</span>{" "}
                        {report.event ? formatDate(report.event.date) : "Brak danych"}
                      </p>
                      <p>
                        <span className="font-medium text-slate-800">Lokalizacja:</span>{" "}
                        {report.event
                          ? formatLocation(report.event.city, report.event.venue)
                          : "Brak danych"}
                      </p>
                      <p>
                        <span className="font-medium text-slate-800">Zgłoszenie zaktualizowano:</span>{" "}
                        {formatDate(report.updatedAt)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card className="border-slate-200">
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Akcje zbiorcze</h2>
                  <p className="text-sm text-slate-600">
                    Zaznacz wydarzenia i wykonaj operację na wielu pozycjach jednocześnie.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={selectAllVisible} disabled={events.length === 0}>
                    Zaznacz wszystko
                  </Button>
                  <Button type="button" variant="outline" onClick={clearSelection} disabled={selectedEventIds.size === 0}>
                    Wyczyść zaznaczenie
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-64 flex-1">
                  <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="bulkCategory">
                    Przenieś do kategorii
                  </label>
                  <select
                    id="bulkCategory"
                    value={bulkCategory}
                    onChange={(e) => setBulkCategory(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Wybierz kategorię</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  type="button"
                  onClick={handleBulkMove}
                  disabled={selectedEventIds.size === 0 || bulkActionLoading === "move"}
                >
                  {bulkActionLoading === "move" ? "Przenoszenie..." : "Przenieś zaznaczone"}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleBulkDelete}
                  disabled={selectedEventIds.size === 0 || bulkActionLoading === "delete"}
                >
                  {bulkActionLoading === "delete" ? "Usuwanie..." : "Usuń zaznaczone"}
                </Button>
              </div>

              <p className="text-sm text-slate-600">
                Zaznaczono: <span className="font-semibold">{selectedEventIds.size}</span>
              </p>
            </CardContent>
          </Card>

          {loadingData && <p className="text-gray-500">Ładowanie wydarzeń...</p>}

          {!loadingData && events.length === 0 && (
            <Card>
              <CardContent className="p-6 text-gray-600">Brak wydarzeń do wyświetlenia.</CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {events.map((event) => {
              const eventId = Number(event.id);
              const isSelected = selectedEventIds.has(eventId);

              return (
                <Card key={event.id} className={`border-slate-200 ${isSelected ? "ring-2 ring-emerald-500" : ""}`}>
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <label className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelected(eventId)}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge>{event.category || "Inne"}</Badge>
                          </div>
                          <h2 className="text-lg font-semibold text-slate-900">{event.title}</h2>
                        </div>
                      </label>
                    </div>

                    <p className="text-sm text-slate-500">
                      {event.creator_username || "Nieznany"} | {formatDate(event.date)}
                    </p>
                    <p className="text-sm text-slate-600">{formatLocation(event.city, event.venue)}</p>

                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/my-events?edit=${event.id}`}>
                          <Edit3 className="mr-2 size-4" />
                          Edytuj
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={deletingEventId === eventId}
                        onClick={() => handleDeleteEvent(eventId)}
                      >
                        <Trash2 className="mr-2 size-4" />
                        {deletingEventId === eventId ? "Usuwanie..." : "Usuń"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
