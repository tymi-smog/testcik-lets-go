import { Link } from 'react-router';
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardFooter } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Calendar, Clock, MapPin } from 'lucide-react';

type ApiTicketType = {
  id: string | number;
  name?: string;
  price: number | string;
  available?: number | string;
  sold?: number | string | null;
  initial_available?: number | string | null;
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

type SortOption =
  | 'priceAsc'
  | 'priceDesc'
  | 'typeAsc'
  | 'availableAsc'
  | 'availableDesc'
  | 'soldAsc'
  | 'soldDesc'
  | 'dateAsc'
  | 'dateDesc'
  | 'createdDesc';

function getEventStats(event: EventsPageEvent) {
  const minTicketPrice = event.ticketTypes.length
    ? Math.min(...event.ticketTypes.map((ticket) => Number(ticket.price)))
    : event.ticketPrice ?? 0;

  const totalTicketsCount = event.ticketTypes.reduce((sum, ticket) => {
    const available = Number(ticket.available ?? 0);
    return sum + (Number.isFinite(available) ? available : 0);
  }, 0);

  const totalSoldCount = event.ticketTypes.reduce((sum, ticket) => {
    const sold = Number(ticket.sold);
    if (Number.isFinite(sold) && sold >= 0) {
      return sum + sold;
    }
    const initialAvailable = Number(ticket.initial_available);
    const available = Number(ticket.available ?? 0);
    if (Number.isFinite(initialAvailable) && Number.isFinite(available)) {
      return sum + Math.max(initialAvailable - available, 0);
    }
    return sum;
  }, 0);

  return {
    minTicketPrice: Number.isFinite(minTicketPrice) ? minTicketPrice : 0,
    totalTicketsCount,
    totalSoldCount,
  };
}

export function Events() {
  const [events, setEvents] = useState<EventsPageEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('dateAsc');
  const [priceFrom, setPriceFrom] = useState('');
  const [priceTo, setPriceTo] = useState('');
  const [availableFrom, setAvailableFrom] = useState('');
  const [availableTo, setAvailableTo] = useState('');
  const [soldFrom, setSoldFrom] = useState('');
  const [soldTo, setSoldTo] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Wszystkie');
  const [locationFilter, setLocationFilter] = useState('Wszystkie');

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

  const locations = useMemo(() => {
    const unique = [...new Set(events.map((event) => event.location).filter(Boolean))];
    return ['Wszystkie', ...unique];
  }, [events]);

  useEffect(() => {
    if (!categories.includes(categoryFilter)) {
      setCategoryFilter('Wszystkie');
    }
  }, [categories, categoryFilter]);

  useEffect(() => {
    if (!locations.includes(locationFilter)) {
      setLocationFilter('Wszystkie');
    }
  }, [locations, locationFilter]);

  const processedEvents = useMemo(() => {
    const priceFromNumber = priceFrom === '' ? null : Number(priceFrom);
    const priceToNumber = priceTo === '' ? null : Number(priceTo);
    const availableFromNumber = availableFrom === '' ? null : Number(availableFrom);
    const availableToNumber = availableTo === '' ? null : Number(availableTo);
    const soldFromNumber = soldFrom === '' ? null : Number(soldFrom);
    const soldToNumber = soldTo === '' ? null : Number(soldTo);

    const filtered = events.filter((event) => {
      const stats = getEventStats(event);
      const matchesCategory =
        categoryFilter === 'Wszystkie' || event.category === categoryFilter;
      const matchesLocation =
        locationFilter === 'Wszystkie' || event.location === locationFilter;
      const matchesPriceFrom =
        priceFromNumber === null || stats.minTicketPrice >= priceFromNumber;
      const matchesPriceTo = priceToNumber === null || stats.minTicketPrice <= priceToNumber;
      const matchesAvailableFrom =
        availableFromNumber === null || stats.totalTicketsCount >= availableFromNumber;
      const matchesAvailableTo =
        availableToNumber === null || stats.totalTicketsCount <= availableToNumber;
      const matchesSoldFrom =
        soldFromNumber === null || stats.totalSoldCount >= soldFromNumber;
      const matchesSoldTo = soldToNumber === null || stats.totalSoldCount <= soldToNumber;

      return (
        matchesCategory &&
        matchesLocation &&
        matchesPriceFrom &&
        matchesPriceTo &&
        matchesAvailableFrom &&
        matchesAvailableTo &&
        matchesSoldFrom &&
        matchesSoldTo
      );
    });

    return [...filtered].sort((a, b) => {
      const aStats = getEventStats(a);
      const bStats = getEventStats(b);
      const aDate = Date.parse(a.date);
      const bDate = Date.parse(b.date);
      const aCreated = Date.parse(a.createdAt);
      const bCreated = Date.parse(b.createdAt);
      const now = Date.now();

      switch (sortBy) {
        case 'priceAsc':
          return aStats.minTicketPrice - bStats.minTicketPrice;
        case 'priceDesc':
          return bStats.minTicketPrice - aStats.minTicketPrice;
        case 'typeAsc':
          return a.category.localeCompare(b.category, 'pl');
        case 'availableAsc':
          return aStats.totalTicketsCount - bStats.totalTicketsCount;
        case 'availableDesc':
          return bStats.totalTicketsCount - aStats.totalTicketsCount;
        case 'soldAsc':
          return aStats.totalSoldCount - bStats.totalSoldCount;
        case 'soldDesc':
          return bStats.totalSoldCount - aStats.totalSoldCount;
        case 'dateAsc':
          return Math.abs((Number.isNaN(aDate) ? 0 : aDate) - now) - Math.abs((Number.isNaN(bDate) ? 0 : bDate) - now);
        case 'dateDesc':
          return Math.abs((Number.isNaN(bDate) ? 0 : bDate) - now) - Math.abs((Number.isNaN(aDate) ? 0 : aDate) - now);
        case 'createdDesc':
          return (Number.isNaN(bCreated) ? 0 : bCreated) - (Number.isNaN(aCreated) ? 0 : aCreated);
        default:
          return 0;
      }
    });
  }, [
    events,
    sortBy,
    categoryFilter,
    locationFilter,
    priceFrom,
    priceTo,
    availableFrom,
    availableTo,
    soldFrom,
    soldTo,
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#041f14] text-white py-16">
        <div className="container mx-auto px-4">
          <h1 className="text-5xl mb-4">Wszystkie wydarzenia</h1>
          <p className="text-xl opacity-90">Przeglądaj pełną listę i wybierz coś dla siebie.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 rounded-lg border bg-white p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="border rounded-md px-3 py-2"
            >
              <option value="dateAsc">Data: od najblizszych</option>
              <option value="dateDesc">Data: od najdalszych w czasie</option>
              <option value="createdDesc">Ostatnio dodane</option>
              <option value="priceAsc">Cena biletu: rosnaco</option>
              <option value="priceDesc">Cena biletu: malejaco</option>
              <option value="typeAsc">Rodzaj: alfabetycznie</option>
              <option value="availableAsc">Dostepne bilety: rosnaco</option>
              <option value="availableDesc">Dostepne bilety: malejaco</option>
              <option value="soldAsc">Sprzedane bilety: rosnaco</option>
              <option value="soldDesc">Sprzedane bilety: malejaco</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border rounded-md px-3 py-2"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="border rounded-md px-3 py-2"
            >
              {locations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Cena od"
              value={priceFrom}
              onChange={(e) => setPriceFrom(e.target.value)}
              className="border rounded-md px-3 py-2"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Cena do"
              value={priceTo}
              onChange={(e) => setPriceTo(e.target.value)}
              className="border rounded-md px-3 py-2"
            />
            <input
              type="number"
              min="0"
              step="1"
              placeholder="Dostepne bilety od"
              value={availableFrom}
              onChange={(e) => setAvailableFrom(e.target.value)}
              className="border rounded-md px-3 py-2"
            />
            <input
              type="number"
              min="0"
              step="1"
              placeholder="Dostepne bilety do"
              value={availableTo}
              onChange={(e) => setAvailableTo(e.target.value)}
              className="border rounded-md px-3 py-2"
            />
            <input
              type="number"
              min="0"
              step="1"
              placeholder="Sprzedane bilety od"
              value={soldFrom}
              onChange={(e) => setSoldFrom(e.target.value)}
              className="border rounded-md px-3 py-2"
            />
            <input
              type="number"
              min="0"
              step="1"
              placeholder="Sprzedane bilety do"
              value={soldTo}
              onChange={(e) => setSoldTo(e.target.value)}
              className="border rounded-md px-3 py-2"
            />
            <Button
              variant="outline"
              onClick={() => {
                setSortBy('dateAsc');
                setCategoryFilter('Wszystkie');
                setLocationFilter('Wszystkie');
                setPriceFrom('');
                setPriceTo('');
                setAvailableFrom('');
                setAvailableTo('');
                setSoldFrom('');
                setSoldTo('');
              }}
            >
              Wyczyść filtry
            </Button>
          </div>
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
            processedEvents.map((event) => {
              const { minTicketPrice, totalTicketsCount, totalSoldCount } = getEventStats(event);

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
                      <span className="text-sm text-gray-600">
                        Od {minTicketPrice} zł | Łącznie biletów: {totalTicketsCount} | Sprzedane: {totalSoldCount}
                      </span>
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

        {!isLoading && !error && processedEvents.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">Brak wydarzeń dla wybranych filtrow.</p>
          </div>
        )}
      </div>
    </div>
  );
}
