import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { useCart } from "../context/CartContext";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Calendar, MapPin, Clock, Minus, Plus, ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";

type ApiTicketType = {
  id: string | number;
  name: string;
  price: number | string;
  available: number | string;
  description?: string | null;
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
  description?: string | null;
  ticketTypes?: ApiTicketType[];
};

type EventTicket = {
  id: string;
  name: string;
  price: number;
  available: number;
  description?: string;
};

type EventDetailData = {
  id: string;
  title: string;
  category: string;
  date: string;
  createdAt: string;
  creatorUsername: string;
  city: string;
  venue: string;
  image: string;
  description: string;
  ticketTypes: EventTicket[];
};

const fallbackImage =
  "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1600&q=80";

export function EventDetail() {
  const { id } = useParams();
  const { addToCart } = useCart();

  const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>({});
  const [event, setEvent] = useState<EventDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadEvent = async () => {
      if (!id) {
        if (mounted) {
          setEvent(null);
          setError(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/events");
        if (!response.ok) {
          throw new Error(`Nie udało się pobrać wydarzeń (${response.status})`);
        }

        const events = (await response.json()) as ApiEvent[];
        const rawEvent = events.find((item) => String(item.id) === id);

        if (!rawEvent) {
          if (mounted) {
            setEvent(null);
          }
          return;
        }

        const mappedEvent: EventDetailData = {
          id: String(rawEvent.id),
          title: rawEvent.title,
          category: rawEvent.category || "Inne",
          date: rawEvent.date,
          createdAt: rawEvent.created_at || rawEvent.date,
          creatorUsername: rawEvent.creator_username || "Nieznany użytkownik",
          city: rawEvent.city || "",
          venue: rawEvent.venue || rawEvent.location || "Brak lokalizacji",
          image: rawEvent.image_url || rawEvent.image || fallbackImage,
          description: rawEvent.description || "Brak opisu wydarzenia.",
          ticketTypes: (rawEvent.ticketTypes || []).map((ticket) => ({
            id: String(ticket.id),
            name: ticket.name,
            price: Number(ticket.price),
            available: Number(ticket.available),
            description: ticket.description || undefined,
          })),
        };

        if (mounted) {
          setEvent(mappedEvent);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Wystąpił nieznany błąd");
          setEvent(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadEvent();

    return () => {
      mounted = false;
    };
  }, [id]);

  const updateTicketQuantity = (ticketId: string, change: number, maxAvailable: number) => {
    setSelectedTickets((prev) => {
      const current = prev[ticketId] || 0;
      const ticketLimit = Math.min(10, maxAvailable);
      const newValue = Math.max(0, Math.min(ticketLimit, current + change));

      if (newValue === 0) {
        const { [ticketId]: _, ...rest } = prev;
        return rest;
      }

      return { ...prev, [ticketId]: newValue };
    });
  };

  const handleAddToCart = () => {
    if (!event) {
      return;
    }

    let itemsAdded = 0;

    Object.entries(selectedTickets).forEach(([ticketId, quantity]) => {
      const ticketType = event.ticketTypes.find((ticket) => ticket.id === ticketId);
      if (ticketType && quantity > 0) {
        addToCart(
          {
            eventId: event.id,
            eventTitle: event.title,
            ticketTypeId: ticketType.id,
            ticketTypeName: ticketType.name,
            price: ticketType.price,
          },
          quantity
        );
        itemsAdded += quantity;
      }
    });

    if (itemsAdded > 0) {
      if (itemsAdded > 4) {
        toast.success(`Dodano ${itemsAdded} biletów do koszyka!`);
      } else if (itemsAdded > 1) {
        toast.success(`Dodano ${itemsAdded} bilety do koszyka!`);
      } else {
        toast.success(`Dodano ${itemsAdded} bilet do koszyka!`);
      }
      setSelectedTickets({});
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 text-lg">Ładowanie wydarzenia...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-4 text-red-600">{error}</p>
          <Link to="/">
            <Button>Wróć do wydarzeń</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-4">Wydarzenie nie znalezione</p>
          <Link to="/">
            <Button>Wróć do wydarzeń</Button>
          </Link>
        </div>
      </div>
    );
  }

  const totalSelected = Object.values(selectedTickets).reduce((sum, qty) => sum + qty, 0);
  const totalPrice = Object.entries(selectedTickets).reduce((sum, [ticketId, quantity]) => {
    const ticket = event.ticketTypes.find((t) => t.id === ticketId);
    return sum + (ticket?.price || 0) * quantity;
  }, 0);

  const eventDate = new Date(event.date);
  const isArchived = !Number.isNaN(eventDate.getTime()) && eventDate.getTime() < Date.now();
  const dateLabel = Number.isNaN(eventDate.getTime())
    ? "Brak daty"
    : eventDate.toLocaleDateString("pl-PL", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
  const timeLabel = Number.isNaN(eventDate.getTime())
    ? "Brak godziny"
    : eventDate.toLocaleTimeString("pl-PL", {
        hour: "2-digit",
        minute: "2-digit",
      });
  const createdDate = new Date(event.createdAt);
  const createdLabel = Number.isNaN(createdDate.getTime())
    ? "brak daty"
    : createdDate.toLocaleDateString("pl-PL");

  return (
    <div className="min-h-screen bg-slate-100/80">
      <div className="relative">
        <div className="h-96 overflow-hidden">
          <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 text-white p-8">
          <div className="container mx-auto">
            <Link to="/">
              <Button variant="ghost" className="text-white hover:text-white mb-4">
                <ArrowLeft className="size-4 mr-2" />
                Wróć do wydarzeń
              </Button>
            </Link>
            <Badge className="mb-3">{event.category}</Badge>
            <h1 className="text-5xl mb-4">{event.title}</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Szczegóły wydarzenia</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="size-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Data</p>
                    <p>{dateLabel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="size-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Czas</p>
                    <p>{timeLabel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="size-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Miejsce</p>
                    <p>{event.city ? `${event.venue}, ${event.city}` : event.venue}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>O tym wydarzeniu</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-3">
                  Dodane przez {event.creatorUsername} dnia {createdLabel}
                </p>
                <p className="text-gray-700 leading-relaxed">{event.description}</p>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Wybierz bilety</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {event.ticketTypes.map((ticket) => (
                  <div key={ticket.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p>{ticket.name}</p>
                        <p className="text-sm text-gray-600">{ticket.available} Dostępne</p>
                        {ticket.description && (
                          <p className="text-xs text-gray-500 mt-1">{ticket.description}</p>
                        )}
                      </div>
                      <p className="text-lg">{ticket.price} zł</p>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateTicketQuantity(ticket.id, -1, ticket.available)}
                          disabled={!selectedTickets[ticket.id] || isArchived}
                        >
                          <Minus className="size-4" />
                        </Button>
                        <span className="w-8 text-center">{selectedTickets[ticket.id] || 0}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateTicketQuantity(ticket.id, 1, ticket.available)}
                          disabled={
                            isArchived ||
                            (selectedTickets[ticket.id] || 0) >= Math.min(10, ticket.available)
                          }
                        >
                          <Plus className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {totalSelected > 0 && (
                  <div className="border-t pt-4 mt-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Łącznie biletów:</span>
                      <span>{totalSelected}</span>
                    </div>
                    <div className="flex justify-between text-lg">
                      <span>Łączna cena:</span>
                      <span>{totalPrice} zł</span>
                    </div>
                  </div>
                )}

                {isArchived && (
                  <p className="text-sm text-amber-700 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                    To wydarzenie jest w archiwum. Zakup biletów jest wyłączony.
                  </p>
                )}
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleAddToCart}
                  disabled={totalSelected === 0 || isArchived}
                >
                  <Check className="size-5 mr-2" />
                  Dodaj do koszyka
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

