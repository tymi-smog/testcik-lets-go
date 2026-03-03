import { Link } from 'react-router';
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardFooter } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Calendar, Clock, MapPin } from 'lucide-react';

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
  creator_username?: string | null;
  location?: string | null;
  image_url?: string | null;
  image?: string | null;
  ticket_price?: number | string | null;
  ticketTypes?: ApiTicketType[];
};

type EventsPageEvent = {
  id: string;
  title: string;
  category: string;
  date: string;
  createdAt: string;
  creatorUsername: string;
  location: string;
  image: string;
  ticketTypes: ApiTicketType[];
  ticketPrice: number | null;
};

const fallbackImage =
  'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=1080&q=80';

export function Events() {
  const [selectedCategory, setSelectedCategory] = useState('Wszystkie');
  const [events, setEvents] = useState<EventsPageEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadEvents = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/events');
        if (!response.ok) {
          throw new Error(`Nie udało się pobrać wydarzeń (${response.status})`);
        }

        const data = (await response.json()) as ApiEvent[];
        const mappedEvents: EventsPageEvent[] = data.map((event) => ({
          id: String(event.id),
          title: event.title,
          category: event.category || 'Inne',
          date: event.date,
          createdAt: event.created_at || event.date,
          creatorUsername: event.creator_username || 'Nieznany uzytkownik',
          location: event.location || 'Brak lokalizacji',
          image: event.image_url || event.image || fallbackImage,
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
          setError(err instanceof Error ? err.message : 'Wystąpił nieznany błąd');
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

  const categories = useMemo(() => {
    const unique = [...new Set(events.map((event) => event.category))];
    return ['Wszystkie', ...unique];
  }, [events]);

  useEffect(() => {
    if (!categories.includes(selectedCategory)) {
      setSelectedCategory('Wszystkie');
    }
  }, [categories, selectedCategory]);

  const filteredEvents =
    selectedCategory === 'Wszystkie'
      ? events
      : events.filter((event) => event.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#041f14] text-white py-16">
        <div className="container mx-auto px-4">
          <h1 className="text-5xl mb-4">Wszystkie wydarzenia</h1>
          <p className="text-xl opacity-90">Przeglądaj pełną listę i wybierz coś dla siebie.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(category)}
              className="whitespace-nowrap"
            >
              {category}
            </Button>
          ))}
        </div>

        {isLoading && (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">Ładowanie wydarzeń...</p>
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
              const createdDate = new Date(event.createdAt);
              const timeLabel = Number.isNaN(eventDate.getTime())
                ? 'Brak godziny'
                : eventDate.toLocaleTimeString('pl-PL', {
                    hour: '2-digit',
                    minute: '2-digit',
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
                      <span className="text-sm text-gray-600">Od {minTicketPrice ?? 0} zł</span>
                    </div>
                    <h3 className="text-xl mb-3">{event.title}</h3>
                    <p className="text-xs text-gray-500 mb-3">
                      Dodane przez {event.creatorUsername} dnia{" "}
                      {Number.isNaN(createdDate.getTime())
                        ? "brak daty"
                        : createdDate.toLocaleDateString("pl-PL")}
                    </p>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="size-4" />
                        {Number.isNaN(eventDate.getTime())
                          ? 'Brak daty'
                          : eventDate.toLocaleDateString('pl-PL', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
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
                      <Button className="w-full">Sprawdź więcej</Button>
                    </Link>
                  </CardFooter>
                </Card>
              );
            })}
        </div>

        {!isLoading && !error && filteredEvents.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">Brak wydarzeń w tej kategorii.</p>
          </div>
        )}
      </div>
    </div>
  );
}
