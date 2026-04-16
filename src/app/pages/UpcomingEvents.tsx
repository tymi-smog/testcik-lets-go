import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, Clock, MapPin, Ticket } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";

type TicketPurchase = {
  id: number;
  eventId: number;
  eventTitle: string;
  quantity: number;
  purchasedAt: string;
};

type ApiEvent = {
  id: string | number;
  title: string;
  category?: string | null;
  date: string;
  created_at?: string | null;
  creator_username?: string | null;
  location?: string | null;
  city?: string | null;
  venue?: string | null;
  image_url?: string | null;
  image?: string | null;
};

type UpcomingEvent = {
  id: string;
  title: string;
  category: string;
  date: string;
  city: string;
  venue: string;
  image: string;
  ownedTickets: number;
};

const fallbackImage =
  "https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=1080&q=80";

export function UpcomingEvents() {
  const { user, token, isLoading } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!user || !token) {
      navigate("/login");
      return;
    }

    let mounted = true;

    const loadUpcomingEvents = async () => {
      try {
        setLoadingEvents(true);
        setError("");

        const [ticketsResponse, eventsResponse] = await Promise.all([
          fetch("/api/my-tickets", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch("/api/events"),
        ]);

        const ticketsData = await ticketsResponse.json().catch(() => ({}));
        const eventsData = await eventsResponse.json().catch(() => ([]));

        if (!ticketsResponse.ok) {
          throw new Error(ticketsData?.error || "Nie udało się pobrać biletów.");
        }

        if (!eventsResponse.ok) {
          throw new Error("Nie udało się pobrać wydarzeń.");
        }

        const purchases = Array.isArray(ticketsData?.items)
          ? (ticketsData.items as TicketPurchase[])
          : [];
        const apiEvents = Array.isArray(eventsData) ? (eventsData as ApiEvent[]) : [];

        const purchasesByEvent = purchases.reduce<Map<number, { quantity: number; lastPurchasedAt: string }>>(
          (map, purchase) => {
            const current = map.get(Number(purchase.eventId));
            const nextPurchasedAt =
              current && Date.parse(current.lastPurchasedAt) > Date.parse(purchase.purchasedAt)
                ? current.lastPurchasedAt
                : purchase.purchasedAt;

            map.set(Number(purchase.eventId), {
              quantity: (current?.quantity ?? 0) + Number(purchase.quantity ?? 0),
              lastPurchasedAt: nextPurchasedAt,
            });

            return map;
          },
          new Map()
        );

        const now = Date.now();
        const mappedEvents = apiEvents
          .filter((event) => purchasesByEvent.has(Number(event.id)))
          .map((event) => {
            const purchase = purchasesByEvent.get(Number(event.id));
            return {
              id: String(event.id),
              title: event.title,
              category: event.category || "Inne",
              date: event.date,
              city: event.city || "",
              venue: event.venue || event.location || "Brak lokalizacji",
              image: event.image_url || event.image || fallbackImage,
              ownedTickets: purchase?.quantity ?? 0,
            };
          })
          .filter((event) => {
            const eventTime = Date.parse(event.date);
            return !Number.isNaN(eventTime) && eventTime >= now;
          })
          .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));

        if (mounted) {
          setEvents(mappedEvents);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Wystąpił nieznany błąd.");
          setEvents([]);
        }
      } finally {
        if (mounted) {
          setLoadingEvents(false);
        }
      }
    };

    loadUpcomingEvents();

    return () => {
      mounted = false;
    };
  }, [isLoading, navigate, token, user]);

  const totalOwnedTickets = useMemo(
    () => events.reduce((sum, event) => sum + event.ownedTickets, 0),
    [events]
  );

  if (isLoading || loadingEvents) {
    return (
      <div className="min-h-screen bg-slate-100/80 flex items-center justify-center">
        <p className="text-gray-600">Ładowanie nadchodzących wydarzeń...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-100/80 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col gap-3 mb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl">Nadchodzące wydarzenia</h1>
            <p className="text-gray-600 mt-2">
              Tutaj widzisz przyszłe wydarzenia, na które masz już kupione bilety.
            </p>
          </div>

          <div className="flex gap-3 flex-wrap">
            <Badge variant="secondary" className="px-3 py-1 text-sm">
              Wydarzenia: {events.length}
            </Badge>
            <Badge variant="secondary" className="px-3 py-1 text-sm">
              Bilety: {totalOwnedTickets}
            </Badge>
          </div>
        </div>

        {error && (
          <Card className="mb-4">
            <CardContent className="pt-6 text-red-600">{error}</CardContent>
          </Card>
        )}

        {!error && events.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-2xl mb-2">Brak nadchodzących wydarzeń</h2>
              <p className="text-gray-600 mb-6">
                Nie masz jeszcze biletów na przyszłe wydarzenia albo wszystkie Twoje wydarzenia już się odbyły.
              </p>
              <Button asChild>
                <Link to="/events">Przeglądaj wydarzenia</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
            <Card key={event.id} className="overflow-hidden border-slate-200 bg-white/88 shadow-sm backdrop-blur-sm">
              <img src={event.image} alt={event.title} className="h-48 w-full object-cover" />
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h2 className="text-xl font-semibold">{event.title}</h2>
                    <p className="text-sm text-gray-600">{event.category}</p>
                  </div>
                  <Badge>{event.ownedTickets} szt.</Badge>
                </div>

                <div className="space-y-2 text-sm text-gray-700 mb-5">
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4" />
                    <span>
                      {new Date(event.date).toLocaleDateString("pl-PL", {
                        dateStyle: "long",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="size-4" />
                    <span>
                      {new Date(event.date).toLocaleTimeString("pl-PL", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="size-4" />
                    <span>{event.city ? `${event.venue}, ${event.city}` : event.venue}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Ticket className="size-4" />
                    <span>Masz kupione: {event.ownedTickets} biletów</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button asChild className="flex-1">
                    <Link to={`/event/${event.id}`}>Zobacz wydarzenie</Link>
                  </Button>
                  <Button asChild variant="outline" className="flex-1">
                    <Link to="/my-tickets">Moje bilety</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
