import { Link } from "react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardFooter } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Calendar, MapPin } from "lucide-react";

const categories = [
  "Wszystkie",
  "Muzyka",
  "Sport",
  "Teatr",
  "Kabaret",
  "Festiwal",
  "Konferencja",
];

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

export function Home() {
  const [events, setEvents] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] =
    useState<string>("Wszystkie");

  useEffect(() => {
    fetch("/api/events")
      .then((res) => res.json())
      .then((data) => setEvents(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const filteredEvents =
    selectedCategory === "Wszystkie"
      ? events
      : events.filter((event) => event.category === selectedCategory);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Ładowanie wydarzeń...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#041f14] text-white py-16">
        <div className="container mx-auto px-4">
          <h1 className="text-5xl mb-4">
            Odkryj niesamowite wydarzenia
          </h1>
          <p className="text-xl opacity-90">
            Znajdź swoje wydarzenie i kup bilet już teraz!
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {categories.map((category) => (
            <Button
              key={category}
              variant={
                selectedCategory === category ? "default" : "outline"
              }
              onClick={() => setSelectedCategory(category)}
              className="whitespace-nowrap"
            >
              {category}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <Card
              key={event.id}
              className="hover:shadow-lg transition-shadow"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <Badge>{event.category}</Badge>
                  <span className="text-sm text-gray-600">
                    Od {event.ticket_price} zł
                  </span>
                </div>

                <h3 className="text-xl mb-3">{event.title}</h3>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4" />
                    {new Date(event.date).toLocaleDateString(
                      "pl-PL"
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="size-4" />
                    {event.location}
                  </div>

                  <div>
                    Dostępne bilety: {event.available_tickets}
                  </div>
                </div>
              </CardContent>

              <CardFooter className="p-6 pt-0">
                <Link
                  to={`/event/${event.id}`}
                  className="w-full"
                >
                  <Button className="w-full">
                    Sprawdź więcej
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>

        {filteredEvents.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">
              Brak wydarzeń w tej kategorii.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}