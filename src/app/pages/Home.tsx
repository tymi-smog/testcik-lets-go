import { Link } from "react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardFooter } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Calendar, MapPin, Clock } from "lucide-react";

type ApiTicketType = {
  id: string | number;
  price: number | string;
};

type ApiEvent = {
  id: string | number;
  title: string;
  category?: string | null;
  date: string;
  created_at?: string | null;
  location?: string | null;
  image?: string | null;
  ticket_price?: number | string | null;
  ticketTypes?: ApiTicketType[];
};

type HomeEvent = {
  id: string;
  title: string;
  category: string;
  date: string;
  createdAt: number;
  location: string;
  image: string;
  ticketTypes: ApiTicketType[];
  ticketPrice: number | null;
};

const fallbackImage =
  "https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=1080&q=80";

export function Home() {
  const [selectedCategory, setSelectedCategory] = useState("Wszystkie");
  const [events, setEvents] = useState<HomeEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadEvents = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/events");
        if (!response.ok) {
          throw new Error(`Nie uda\u0142o si\u0119 pobra\u0107 wydarze\u0144 (${response.status})`);
        }

        const data = (await response.json()) as ApiEvent[];
        const mappedEvents: HomeEvent[] = data.map((event) => ({
          id: String(event.id),
          title: event.title,
          category: event.category || "Inne",
          date: event.date,
          createdAt: Date.parse(event.created_at || event.date || ""),
          location: event.location || "Brak lokalizacji",
          image: event.image || fallbackImage,
          ticketTypes: event.ticketTypes || [],
          ticketPrice:
            event.ticket_price === null || event.ticket_price === undefined
              ? null
              : Number(event.ticket_price),
        }));

        if (mounted) {
          setEvents(mappedEvents);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Wyst\u0105pi\u0142 nieznany b\u0142\u0105d");
          setEvents([]);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadEvents();

    return () => {
      mounted = false;
    };
  }, []);

  const latestEvents = useMemo(
    () =>
      [...events]
        .sort((a, b) => {
          const aDate = Number.isNaN(a.createdAt) ? 0 : a.createdAt;
          const bDate = Number.isNaN(b.createdAt) ? 0 : b.createdAt;
          return bDate - aDate;
        })
        .slice(0, 10),
    [events]
  );

  const categories = useMemo(() => {
    const unique = [...new Set(latestEvents.map((event) => event.category))];
    return ["Wszystkie", ...unique];
  }, [latestEvents]);

  useEffect(() => {
    if (!categories.includes(selectedCategory)) {
      setSelectedCategory("Wszystkie");
    }
  }, [categories, selectedCategory]);

  const filteredEvents =
    selectedCategory === "Wszystkie"
      ? latestEvents
      : latestEvents.filter((event) => event.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#041f14] text-white py-16">
        <div className="container mx-auto px-4">
          <h1 className="text-5xl mb-4">Najnowsze wydarzenia</h1>
          <p className="text-xl opacity-90">Zobacz 10 ostatnio dodanych wydarze\u0144.</p>
          <div className="mt-6">
            <Link to="/events">
              <Button variant="secondary">Przegl\u0105daj wszystkie wydarzenia</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              onClick={() => setSelectedCategory(category)}
              className="whitespace-nowrap"
            >
              {category}
            </Button>
          ))}
        </div>

        {isLoading && (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">\u0141adowanie wydarze\u0144...</p>
          </div>
        )}

        {!isLoading && error && (
          <div className="text-center py-16">
            <p className="text-red-600 text-lg">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {!isLoading &&
            !error &&
            filteredEvents.map((event) => {
              const minTicketPrice = event.ticketTypes.length
                ? Math.min(...event.ticketTypes.map((ticket) => Number(ticket.price)))
                : event.ticketPrice;

              const eventDate = new Date(event.date);
              const timeLabel = Number.isNaN(eventDate.getTime())
                ? "Brak godziny"
                : eventDate.toLocaleTimeString("pl-PL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

              return (
                <Card key={event.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-[16/9] overflow-hidden">
                    <img
                      src={event.image}
                      alt={event.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <Badge>{event.category}</Badge>
                      <span className="text-sm text-gray-600">Od {minTicketPrice ?? 0} z\u0142</span>
                    </div>
                    <h3 className="text-xl mb-3">{event.title}</h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="size-4" />
                        {Number.isNaN(eventDate.getTime())
                          ? "Brak daty"
                          : eventDate.toLocaleDateString("pl-PL", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="size-4" />
                        {timeLabel}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="size-4" />
                        {event.location}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="p-6 pt-0">
                    <Link to={`/event/${event.id}`} className="w-full">
                      <Button className="w-full">Sprawd\u017a wi\u0119cej</Button>
                    </Link>
                  </CardFooter>
                </Card>
              );
            })}
        </div>

        {!isLoading && !error && filteredEvents.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">Brak wydarze\u0144 w tej kategorii.</p>
          </div>
        )}
      </div>
    </div>
  );
}
