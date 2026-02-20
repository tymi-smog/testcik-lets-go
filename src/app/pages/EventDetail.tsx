import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { events } from '../data/events';
import { useCart } from '../context/CartContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Calendar, MapPin, Clock, Minus, Plus, ArrowLeft, Check } from 'lucide-react';
import { toast } from 'sonner';

export function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const event = events.find((e) => e.id === id);

  const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>({});

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

  const updateTicketQuantity = (ticketId: string, change: number) => {
    setSelectedTickets((prev) => {
      const current = prev[ticketId] || 0;
      const newValue = Math.max(0, Math.min(10, current + change));
      if (newValue === 0) {
        const { [ticketId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [ticketId]: newValue };
    });
  };

  const handleAddToCart = () => {
    let itemsAdded = 0;
    Object.entries(selectedTickets).forEach(([ticketId, quantity]) => {
      const ticketType = event.ticketTypes.find((t) => t.id === ticketId);
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
      toast.success(`Added ${itemsAdded} ticket${itemsAdded > 1 ? 's' : ''} to cart!`);
      setSelectedTickets({});
    }
  };

  const totalSelected = Object.values(selectedTickets).reduce((sum, qty) => sum + qty, 0);
  const totalPrice = Object.entries(selectedTickets).reduce((sum, [ticketId, quantity]) => {
    const ticket = event.ticketTypes.find((t) => t.id === ticketId);
    return sum + (ticket?.price || 0) * quantity;
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50">
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
                    <p>
                      {new Date(event.Data).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="size-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Czas</p>
                    <p>{event.Godzina}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="size-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Miejsce</p>
                    <p>{event.Miejsce}</p>
                    <p className="text-sm text-gray-600">{event.Lokalizacja}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>O tym wydarzeniu</CardTitle>
              </CardHeader>
              <CardContent>
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
                        <p className="text-sm text-gray-600">
                          {ticket.available} Dostępne
                        </p>
                        {ticket.description && (
                          <p className="text-xs text-gray-500 mt-1">{ticket.description}</p>
                        )}
                      </div>
                      <p className="text-lg">${ticket.price}</p>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateTicketQuantity(ticket.id, -1)}
                          disabled={!selectedTickets[ticket.id]}
                        >
                          <Minus className="size-4" />
                        </Button>
                        <span className="w-8 text-center">
                          {selectedTickets[ticket.id] || 0}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateTicketQuantity(ticket.id, 1)}
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
                      <span>${totalPrice}</span>
                    </div>
                  </div>
                )}

                <Button
                  className="w-full"
                  size="lg"
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
    </div>
  );
}
