import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Calendar, Edit3, Trash2, Flag, ShieldAlert } from "lucide-react";
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

export function AdminPanel() {
  const { user, token, isLoading } = useAuth();
  const [reports, setReports] = useState<EventReport[]>([]);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<number | null>(null);

  const isAdmin = user?.is_admin === true;

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
          fetch("/api/event-reports", {
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

        if (!mounted) {
          return;
        }

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

  const openReports = useMemo(
    () => reports.filter((report) => report.status === "open"),
    [reports]
  );

  async function handleDeleteEvent(eventId: number) {
    if (!token) {
      return;
    }

    const confirmed = window.confirm(
      "Czy na pewno chcesz usunąć to wydarzenie? Spowoduje to też usunięcie zgłoszeń, ocen i zakupów powiązanych z tym wydarzeniem."
    );
    if (!confirmed) {
      return;
    }

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
      setReports((prev) => prev.filter((report) => report.eventId !== eventId));
      setEvents((prev) => prev.filter((event) => Number(event.id) !== eventId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Wystąpił nieznany błąd.");
    } finally {
      setDeletingEventId(null);
    }
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
          Przeglądaj zgłoszenia użytkowników, sprawdzaj szczegóły wydarzeń i podejmuj działania bez
          wychodzenia z panelu.
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
                          {report.event?.title || `Usunięte wydarzenie #${report.eventId}`}
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
                      <p className="mt-1 text-sm text-slate-700">{report.details || "Brak dodatkowego opisu."}</p>
                    </div>
                    <div className="space-y-1 text-sm text-slate-600">
                      <p>
                        <span className="font-medium text-slate-800">Data wydarzenia:</span>{" "}
                        {report.event ? formatDate(report.event.date) : "Brak danych"}
                      </p>
                      <p>
                        <span className="font-medium text-slate-800">Lokalizacja:</span>{" "}
                        {report.event
                          ? report.event.city
                            ? `${report.event.venue || report.event.location}, ${report.event.city}`
                            : report.event.venue || report.event.location || "Brak lokalizacji"
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
          {loadingData && <p className="text-gray-500">Ładowanie wydarzeń...</p>}

          {!loadingData && events.length === 0 && (
            <Card>
              <CardContent className="p-6 text-gray-600">Brak wydarzeń do wyświetlenia.</CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {events.map((event) => (
              <Card key={event.id} className="border-slate-200">
                <CardContent className="space-y-3 p-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge>{event.category || "Inne"}</Badge>
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900">{event.title}</h2>
                    <p className="text-sm text-slate-500">
                      {event.creator_username || "Nieznany"} | {formatDate(event.date)}
                    </p>
                    <p className="text-sm text-slate-600">
                      {event.city ? `${event.venue || ""}, ${event.city}` : event.venue || "Brak lokalizacji"}
                    </p>
                  </div>

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
                      disabled={deletingEventId === Number(event.id)}
                      onClick={() => handleDeleteEvent(Number(event.id))}
                    >
                      <Trash2 className="mr-2 size-4" />
                      {deletingEventId === Number(event.id) ? "Usuwanie..." : "Usuń"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
