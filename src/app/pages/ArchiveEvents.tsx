import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, MapPin, Star } from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";

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
  city?: string | null;
  venue?: string | null;
  image_url?: string | null;
  image?: string | null;
  ticket_price?: number | string | null;
  ticketTypes?: ApiTicketType[];
};

type ArchiveEvent = {
  id: string;
  title: string;
  category: string;
  date: string;
  createdAt: string;
  creatorUsername: string;
  city: string;
  venue: string;
  image: string;
  ticketTypes: ApiTicketType[];
  ticketPrice: number | null;
};

type RatingSummary = {
  eventId: number;
  averageRating: number;
  ratingsCount: number;
};

type MyRating = {
  eventId: number;
  rating: number;
  reviewText: string;
  updatedAt: string;
};

type TicketPurchase = {
  eventId: number;
};

type SortOption =
  | "priceAsc"
  | "priceDesc"
  | "typeAsc"
  | "availableAsc"
  | "availableDesc"
  | "soldAsc"
  | "soldDesc"
  | "dateAsc"
  | "dateDesc"
  | "createdDesc";

const fallbackImage =
  "https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=1080&q=80";

const RATING_WINDOW_MS = 24 * 60 * 60 * 1000;

function getEventStats(event: ArchiveEvent) {
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

function canRateEvent(eventDate: string, hasPurchasedTicket: boolean) {
  if (!hasPurchasedTicket) {
    return false;
  }

  const eventTime = Date.parse(eventDate);
  if (Number.isNaN(eventTime)) {
    return false;
  }

  const now = Date.now();
  return now >= eventTime && now <= eventTime + RATING_WINDOW_MS;
}

export function ArchiveEvents() {
  const { user, token } = useAuth();
  const [events, setEvents] = useState<ArchiveEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("dateAsc");
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");
  const [availableFrom, setAvailableFrom] = useState("");
  const [availableTo, setAvailableTo] = useState("");
  const [soldFrom, setSoldFrom] = useState("");
  const [soldTo, setSoldTo] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Wszystkie");
  const [locationFilter, setLocationFilter] = useState("Wszystkie");
  const [ratingSummaries, setRatingSummaries] = useState<Record<number, RatingSummary>>({});
  const [myRatings, setMyRatings] = useState<Record<number, MyRating>>({});
  const [purchasedEventIds, setPurchasedEventIds] = useState<Set<number>>(new Set());
  const [ratingDrafts, setRatingDrafts] = useState<Record<number, { rating: number; reviewText: string }>>({});
  const [savingRatingFor, setSavingRatingFor] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadEvents = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch("/api/events");
        if (!response.ok) {
          throw new Error(`Nie udało się pobrać wydarzeń (${response.status})`);
        }
        const data = (await response.json()) as ApiEvent[];
        const mappedEvents: ArchiveEvent[] = data.map((event) => ({
          id: String(event.id),
          title: event.title,
          category: event.category || "Inne",
          date: event.date,
          createdAt: event.created_at || event.date,
          creatorUsername: event.creator_username || "Nieznany użytkownik",
          city: event.city || "",
          venue: event.venue || event.location || "Brak lokalizacji",
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
          setError(err instanceof Error ? err.message : "Wystąpił nieznany błąd");
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

  useEffect(() => {
    let mounted = true;

    const loadRatings = async () => {
      try {
        const response = await fetch("/api/event-ratings", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!response.ok) {
          throw new Error("Nie udało się pobrać ocen.");
        }

        const data = await response.json();
        if (!mounted) {
          return;
        }

        const summaryMap = new Map<number, RatingSummary>();
        for (const summary of Array.isArray(data?.summaries) ? data.summaries : []) {
          summaryMap.set(Number(summary.eventId), {
            eventId: Number(summary.eventId),
            averageRating: Number(summary.averageRating ?? 0),
            ratingsCount: Number(summary.ratingsCount ?? 0),
          });
        }
        setRatingSummaries(Object.fromEntries(summaryMap));

        const myRatingsMap = new Map<number, MyRating>();
        for (const item of Array.isArray(data?.myRatings) ? data.myRatings : []) {
          myRatingsMap.set(Number(item.eventId), {
            eventId: Number(item.eventId),
            rating: Number(item.rating),
            reviewText: String(item.reviewText ?? ""),
            updatedAt: String(item.updatedAt ?? ""),
          });
        }
        const normalizedMyRatings = Object.fromEntries(myRatingsMap);
        setMyRatings(normalizedMyRatings);

        setRatingDrafts((prev) => {
          const next = { ...prev };
          for (const item of myRatingsMap.values()) {
            next[item.eventId] = {
              rating: item.rating,
              reviewText: item.reviewText,
            };
          }
          return next;
        });
      } catch (err) {
        if (mounted) {
          console.error(err);
        }
      }
    };

    loadRatings();

    return () => {
      mounted = false;
    };
  }, [token]);

  useEffect(() => {
    if (!token || !user) {
      setPurchasedEventIds(new Set());
      return;
    }

    let mounted = true;
    const loadPurchases = async () => {
      try {
        const response = await fetch("/api/my-tickets", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Nie udało się pobrać zakupionych biletów.");
        }

        const data = await response.json();
        if (!mounted) {
          return;
        }

        const ids = new Set<number>();
        for (const item of Array.isArray(data?.items) ? (data.items as TicketPurchase[]) : []) {
          ids.add(Number(item.eventId));
        }
        setPurchasedEventIds(ids);
      } catch (err) {
        if (mounted) {
          console.error(err);
        }
      }
    };

    loadPurchases();
    return () => {
      mounted = false;
    };
  }, [token, user]);

  const categories = useMemo(() => {
    const now = Date.now();
    const archived = events.filter((event) => {
      const eventTime = Date.parse(event.date);
      return !Number.isNaN(eventTime) && eventTime < now;
    });
    const unique = [...new Set(archived.map((event) => event.category))];
    return ["Wszystkie", ...unique];
  }, [events]);

  const locations = useMemo(() => {
    const now = Date.now();
    const archived = events.filter((event) => {
      const eventTime = Date.parse(event.date);
      return !Number.isNaN(eventTime) && eventTime < now;
    });
    const unique = [...new Set(archived.map((event) => event.city || "Brak miasta").filter(Boolean))];
    return ["Wszystkie", ...unique];
  }, [events]);

  const processedEvents = useMemo(() => {
    const priceFromNumber = priceFrom === "" ? null : Number(priceFrom);
    const priceToNumber = priceTo === "" ? null : Number(priceTo);
    const availableFromNumber = availableFrom === "" ? null : Number(availableFrom);
    const availableToNumber = availableTo === "" ? null : Number(availableTo);
    const soldFromNumber = soldFrom === "" ? null : Number(soldFrom);
    const soldToNumber = soldTo === "" ? null : Number(soldTo);
    const now = Date.now();

    const filtered = events.filter((event) => {
      const eventTime = Date.parse(event.date);
      const isArchived = !Number.isNaN(eventTime) && eventTime < now;
      if (!isArchived) {
        return false;
      }
      const stats = getEventStats(event);
      const matchesCategory = categoryFilter === "Wszystkie" || event.category === categoryFilter;
      const matchesLocation = locationFilter === "Wszystkie" || (event.city || "Brak miasta") === locationFilter;
      const matchesPriceFrom = priceFromNumber === null || stats.minTicketPrice >= priceFromNumber;
      const matchesPriceTo = priceToNumber === null || stats.minTicketPrice <= priceToNumber;
      const matchesAvailableFrom =
        availableFromNumber === null || stats.totalTicketsCount >= availableFromNumber;
      const matchesAvailableTo =
        availableToNumber === null || stats.totalTicketsCount <= availableToNumber;
      const matchesSoldFrom = soldFromNumber === null || stats.totalSoldCount >= soldFromNumber;
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

      switch (sortBy) {
        case "priceAsc":
          return aStats.minTicketPrice - bStats.minTicketPrice;
        case "priceDesc":
          return bStats.minTicketPrice - aStats.minTicketPrice;
        case "typeAsc":
          return a.category.localeCompare(b.category, "pl");
        case "availableAsc":
          return aStats.totalTicketsCount - bStats.totalTicketsCount;
        case "availableDesc":
          return bStats.totalTicketsCount - aStats.totalTicketsCount;
        case "soldAsc":
          return aStats.totalSoldCount - bStats.totalSoldCount;
        case "soldDesc":
          return bStats.totalSoldCount - aStats.totalSoldCount;
        case "dateAsc":
          return Math.abs((Number.isNaN(aDate) ? 0 : aDate) - now) - Math.abs((Number.isNaN(bDate) ? 0 : bDate) - now);
        case "dateDesc":
          return Math.abs((Number.isNaN(bDate) ? 0 : bDate) - now) - Math.abs((Number.isNaN(aDate) ? 0 : aDate) - now);
        case "createdDesc":
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

  function setDraft(eventId: number, next: Partial<{ rating: number; reviewText: string }>) {
    setRatingDrafts((prev) => ({
      ...prev,
      [eventId]: {
        rating: next.rating ?? prev[eventId]?.rating ?? 0,
        reviewText: next.reviewText ?? prev[eventId]?.reviewText ?? "",
      },
    }));
  }

  async function handleSaveRating(event: ArchiveEvent) {
    if (!token) {
      toast.error("Zaloguj się, aby ocenić wydarzenie.");
      return;
    }

    const eventId = Number(event.id);
    const draft = ratingDrafts[eventId];

    if (!draft?.rating) {
      toast.error("Wybierz ocenę od 1 do 5.");
      return;
    }

    try {
      setSavingRatingFor(eventId);

      const response = await fetch("/api/event-ratings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          eventId,
          rating: draft.rating,
          reviewText: draft.reviewText,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Nie udało się zapisać oceny.");
      }

      const ratingsResponse = await fetch("/api/event-ratings", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const ratingsData = await ratingsResponse.json().catch(() => ({}));

      const summaryMap = new Map<number, RatingSummary>();
      for (const summary of Array.isArray(ratingsData?.summaries) ? ratingsData.summaries : []) {
        summaryMap.set(Number(summary.eventId), {
          eventId: Number(summary.eventId),
          averageRating: Number(summary.averageRating ?? 0),
          ratingsCount: Number(summary.ratingsCount ?? 0),
        });
      }
      setRatingSummaries(Object.fromEntries(summaryMap));

      const myRatingsMap = new Map<number, MyRating>();
      for (const item of Array.isArray(ratingsData?.myRatings) ? ratingsData.myRatings : []) {
        myRatingsMap.set(Number(item.eventId), {
          eventId: Number(item.eventId),
          rating: Number(item.rating),
          reviewText: String(item.reviewText ?? ""),
          updatedAt: String(item.updatedAt ?? ""),
        });
      }
      setMyRatings(Object.fromEntries(myRatingsMap));

      toast.success("Ocena została zapisana.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Wystąpił nieznany błąd.");
    } finally {
      setSavingRatingFor(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100/80">
      <div className="bg-[#041f14] text-white py-16">
        <div className="container mx-auto px-4">
          <h1 className="text-5xl mb-4">Archiwum wydarzeń</h1>
          <p className="text-xl opacity-90">Wydarzenia, które już się odbyły.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="border rounded-md px-3 py-2"
            >
              <option value="dateAsc">Data: od najbliższych</option>
              <option value="dateDesc">Data: od najdalszych w czasie</option>
              <option value="createdDesc">Ostatnio dodane</option>
              <option value="priceAsc">Cena biletu: rosnąco</option>
              <option value="priceDesc">Cena biletu: malejąco</option>
              <option value="typeAsc">Rodzaj: alfabetycznie</option>
              <option value="availableAsc">Dostępne bilety: rosnąco</option>
              <option value="availableDesc">Dostępne bilety: malejąco</option>
              <option value="soldAsc">Sprzedane bilety: rosnąco</option>
              <option value="soldDesc">Sprzedane bilety: malejąco</option>
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
              placeholder="Dostępne bilety od"
              value={availableFrom}
              onChange={(e) => setAvailableFrom(e.target.value)}
              className="border rounded-md px-3 py-2"
            />
            <input
              type="number"
              min="0"
              step="1"
              placeholder="Dostępne bilety do"
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
                setSortBy("dateAsc");
                setCategoryFilter("Wszystkie");
                setLocationFilter("Wszystkie");
                setPriceFrom("");
                setPriceTo("");
                setAvailableFrom("");
                setAvailableTo("");
                setSoldFrom("");
                setSoldTo("");
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
              const eventId = Number(event.id);
              const { minTicketPrice, totalTicketsCount, totalSoldCount } = getEventStats(event);
              const eventDate = new Date(event.date);
              const createdDate = new Date(event.createdAt);
              const timeLabel = Number.isNaN(eventDate.getTime())
                ? "Brak godziny"
                : eventDate.toLocaleTimeString("pl-PL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
              const ratingSummary = ratingSummaries[eventId];
              const myRating = myRatings[eventId];
              const hasPurchasedTicket = purchasedEventIds.has(eventId);
              const canRate = canRateEvent(event.date, hasPurchasedTicket);
              const draft = ratingDrafts[eventId] ?? {
                rating: myRating?.rating ?? 0,
                reviewText: myRating?.reviewText ?? "",
              };

              return (
                <Card key={event.id} className="overflow-hidden">
                  <div className="aspect-[16/9] overflow-hidden">
                    <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
                  </div>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-3 gap-3">
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

                    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      <div className="flex items-center gap-2">
                        <Star className="size-4 fill-amber-400 text-amber-500" />
                        <span>
                          {ratingSummary?.ratingsCount
                            ? `Średnia ocena: ${ratingSummary.averageRating.toFixed(2)} / 5 (${ratingSummary.ratingsCount} ocen)`
                            : "To wydarzenie nie ma jeszcze ocen."}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600 mb-4">
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
                        {event.city ? `${event.venue}, ${event.city}` : event.venue}
                      </div>
                    </div>

                    <div className="rounded-md border p-3 mb-4">
                      <p className="text-sm font-medium mb-2">Bilety i ceny</p>
                      <div className="space-y-1 text-sm">
                        {event.ticketTypes.length > 0 ? (
                          event.ticketTypes.map((ticket) => (
                            <div key={String(ticket.id)} className="flex justify-between gap-3">
                              <span>{ticket.name || "Bilet"}</span>
                              <span>{Number(ticket.price)} zł</span>
                            </div>
                          ))
                        ) : (
                          <div className="flex justify-between gap-3">
                            <span>Bilet</span>
                            <span>{event.ticketPrice ?? 0} zł</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-slate-900">Oceń wydarzenie</p>
                        <Link to={`/event/${event.id}`} className="text-sm text-blue-700 hover:underline">
                          Zobacz opinie
                        </Link>
                      </div>

                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setDraft(eventId, { rating: value })}
                            disabled={!canRate}
                            className="rounded-md p-1 transition disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Star
                              className={`size-5 ${
                                value <= draft.rating
                                  ? "fill-amber-400 text-amber-500"
                                  : "text-slate-300"
                              }`}
                            />
                          </button>
                        ))}
                      </div>

                      <textarea
                        value={draft.reviewText}
                        onChange={(e) => setDraft(eventId, { reviewText: e.target.value })}
                        disabled={!canRate}
                        placeholder={
                          canRate
                            ? "Dodaj krótką opinię, która będzie publicznie widoczna."
                            : hasPurchasedTicket
                              ? "Okno oceniania minęło. Ocenę można dodać tylko do 24h po zakończeniu wydarzenia."
                              : "Aby ocenić wydarzenie, musisz mieć kupiony bilet."
                        }
                        className="min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                      />

                      {myRating && (
                        <p className="text-xs text-slate-500">
                          Twoja ostatnia ocena: {myRating.rating}/5
                          {myRating.reviewText ? " z opinią" : ""}
                        </p>
                      )}

                      <Button
                        type="button"
                        onClick={() => handleSaveRating(event)}
                        disabled={!canRate || savingRatingFor === eventId}
                      >
                        {savingRatingFor === eventId ? "Zapisywanie..." : myRating ? "Zaktualizuj ocenę" : "Dodaj ocenę"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>

        {!isLoading && !error && processedEvents.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">Brak wydarzeń archiwalnych dla wybranych filtrów.</p>
          </div>
        )}
      </div>
    </div>
  );
}
