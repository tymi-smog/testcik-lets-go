import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { useCart } from "../context/CartContext";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Calendar, MapPin, Minus, Plus, ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";

type TicketType = {
  id: number;
  event_id: number;
  name: string;
  price: number;
  available: number;
  description?: string;
};

type EventType = {
  id: number;
  title: string;
  description: string;
  location: string;
  date: string;
  ticket_price: number;
  available_tickets: number;
  category: string;
  ticketTypes: TicketType[];
};

export function EventDetail() {
  const { id } = useParams();
  const { addToCart } = useCart();

  const [event, setEvent] = useState<EventType | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTickets, setSelectedTickets] = useState<Record<number, number>>({});

  useEffect(() => {
    fetch(`http://localhost:3000/api/events/${id}`)
      .then((res) => res.json())
      .then((data) => setEvent(data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="p-10">Ładowanie...</div>;
  }

  if (!event) {
    return <div className="p-10">Wydarzenie nie znalezione</div>;
  }

  const updateTicketQuantity = (ticketId: number, change: number) => {
    setSelectedTickets((prev) => {
      const current = prev[ticketId] || 0;
      const newValue = Math.max(0, Math.min(10, current + change));
      return { ...prev, [ticketId]: newValue };
    });
  };

  const handleAddToCart = () => {
    let itemsAdded = 0;

    Object.entries(selectedTickets).forEach(([ticketId, quantity]) => {
      const ticket = event.ticketTypes.find(
        (t) => t.id === Number(ticketId)
      );

      if (ticket && quantity > 0) {
        addToCart(
          {
            eventId: event.id,
            eventTitle: event.title,
            ticketTypeId: ticket.id,
            ticketTypeName: ticket.name,
            price: ticket.price,
          },
          quantity
        );
        itemsAdded += quantity;
      }
    });

    if (itemsAdded > 0) {
      toast.success(`Dodano ${itemsAdded} biletów do koszyka!`);
      setSelectedTickets({});
    }
  };

  const totalSelected = Object.values(selectedTickets).reduce(
    (sum, qty) => sum + qty,
    0
  );

  const totalPrice = Object.entries(selectedTickets).reduce(
    (sum, [ticketId, quantity]) => {
      const ticket = event.ticketTypes.find(
        (t) => t.id === Number(ticketId)
      );
      return sum + (ticket?.price || 0) * quantity;
    },
    0
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8">
        <Link to="/">
          <Button variant="outline">
            <ArrowLeft className="size-4 mr-2" />
            Wróć
          </Button>
        </Link>
      </div>

      <div className="container mx-auto px-4 grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <Badge>{event.category}</Badge>
              <CardTitle className="text-3xl">{event.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="size-5 text-blue-600" />
                {new Date(event.date).toLocaleDateString("pl-PL")}
              </div>

              <div className="flex items-center gap-3">
                <MapPin className="size-5 text-blue-600" />
                {event.location}
              </div>

              <p className="text-gray-700">{event.description}</p>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Wybierz bilety</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {event.ticketTypes.map((ticket) => (
                <div key={ticket.id} className="border p-4 rounded-lg">
                  <div className="flex justify-between">
                    <div>
                      <p>{ticket.name}</p>
                      <p className="text-sm text-gray-500">
                        {ticket.available} dostępne
                      </p>
                    </div>
                    <p>{ticket.price} zł</p>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateTicketQuantity(ticket.id, -1)}
                    >
                      <Minus className="size-4" />
                    </Button>

                    <span>{selectedTickets[ticket.id] || 0}</span>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateTicketQuantity(ticket.id, 1)}
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {totalSelected > 0 && (
                <div className="border-t pt-4">
                  <p>Łącznie: {totalSelected}</p>
                  <p className="text-lg font-semibold">
                    {totalPrice} zł
                  </p>
                </div>
              )}

              <Button
                className="w-full"
                onClick={handleAddToCart}
                disabled={totalSelected === 0}
              >
                <Check className="size-5 mr-2" />
                Dodaj do koszyka
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}