import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";

type TicketPurchase = {
  id: number;
  eventId: number;
  eventTitle: string;
  ticketTypeId: number;
  ticketTypeName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  purchasedAt: string;
};

export function MyTickets() {
  const { user, token, isLoading } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<TicketPurchase[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isLoading) return;

    if (!user || !token) {
      navigate("/login");
      return;
    }

    const loadTickets = async () => {
      try {
        setLoadingTickets(true);
        setError("");

        const response = await fetch("/api/my-tickets", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data?.error || "Nie udalo sie pobrac biletow.");
        }

        setTickets(Array.isArray(data?.items) ? data.items : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Wystapil nieznany blad.");
      } finally {
        setLoadingTickets(false);
      }
    };

    loadTickets();
  }, [isLoading, user, token, navigate]);

  if (isLoading || loadingTickets) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Ladowanie biletow...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-4xl mb-6">Moje bilety</h1>

        {error && (
          <Card className="mb-4">
            <CardContent className="pt-6 text-red-600">{error}</CardContent>
          </Card>
        )}

        {!error && tickets.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Brak zakupionych biletow</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Nie masz jeszcze zadnych zakupionych biletow.</p>
              <Button asChild>
                <Link to="/events">Przegladaj wydarzenia</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {tickets.map((ticket) => (
            <Card key={ticket.id}>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <h2 className="text-lg">{ticket.eventTitle}</h2>
                    <p className="text-sm text-gray-600">
                      {ticket.ticketTypeName} | Ilosc: {ticket.quantity}
                    </p>
                    <p className="text-sm text-gray-600">
                      Kupiono:{" "}
                      {new Date(ticket.purchasedAt).toLocaleString("pl-PL", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>

                  <div className="text-left md:text-right">
                    <p className="text-sm text-gray-600">{ticket.unitPrice.toFixed(2)} zl / szt.</p>
                    <p className="text-lg">{ticket.lineTotal.toFixed(2)} zl</p>
                    <Button asChild variant="outline" size="sm" className="mt-2">
                      <Link to={`/event/${ticket.eventId}`}>Zobacz wydarzenie</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
