import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

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
  eventDate?: string | null;
  allowTicketReturns?: boolean;
};

const REFUND_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function canRefundTicket(ticket: TicketPurchase) {
  if (!ticket.allowTicketReturns || !ticket.eventDate) {
    return false;
  }

  const eventTime = Date.parse(ticket.eventDate);
  if (Number.isNaN(eventTime)) {
    return false;
  }

  return eventTime - Date.now() >= REFUND_WINDOW_MS;
}

export function MyTickets() {
  const { user, token, isLoading } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<TicketPurchase[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [error, setError] = useState("");
  const [refundingId, setRefundingId] = useState<number | null>(null);

  async function loadTickets(authToken: string) {
    try {
      setLoadingTickets(true);
      setError("");

      const response = await fetch("/api/my-tickets", {
        headers: {
          Authorization: `Bearer ${authToken}`,
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
  }

  useEffect(() => {
    if (isLoading) return;

    if (!user || !token) {
      navigate("/login");
      return;
    }

    loadTickets(token);
  }, [isLoading, user, token, navigate]);

  async function handleRefund(ticket: TicketPurchase) {
    if (!token) {
      navigate("/login");
      return;
    }

    const confirmed = window.confirm(
      `Czy na pewno chcesz zwrocic bilety na wydarzenie "${ticket.eventTitle}"?`
    );
    if (!confirmed) {
      return;
    }

    try {
      setRefundingId(ticket.id);

      const response = await fetch("/api/refund-ticket", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ purchaseId: ticket.id }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Nie udalo sie zwrocic biletow.");
      }

      await loadTickets(token);
      toast.success("Zwrot biletow zostal przyjety. Wyslalismy potwierdzenie e-mail.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Wystapil nieznany blad.";
      setError(message);
      toast.error(message);
    } finally {
      setRefundingId(null);
    }
  }

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
          {tickets.map((ticket) => {
            const isRefundAvailable = canRefundTicket(ticket);

            return (
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
                      {ticket.eventDate && (
                        <p className="text-sm text-gray-600">
                          Data wydarzenia:{" "}
                          {new Date(ticket.eventDate).toLocaleString("pl-PL", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      )}
                      <p className="text-sm text-gray-600">
                        {ticket.allowTicketReturns
                          ? isRefundAvailable
                            ? "Zwrot dostepny do 7 dni przed wydarzeniem."
                            : "Zwrot niedostepny, bo do wydarzenia zostalo mniej niz 7 dni."
                          : "Organizator nie udostepnil zwrotow dla tego wydarzenia."}
                      </p>
                    </div>

                    <div className="text-left md:text-right">
                      <p className="text-sm text-gray-600">{ticket.unitPrice.toFixed(2)} zl / szt.</p>
                      <p className="text-lg">{ticket.lineTotal.toFixed(2)} zl</p>
                      <div className="mt-2 flex flex-col gap-2 md:items-end">
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/event/${ticket.eventId}`}>Zobacz wydarzenie</Link>
                        </Button>
                        {ticket.allowTicketReturns && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={!isRefundAvailable || refundingId === ticket.id}
                            onClick={() => handleRefund(ticket)}
                          >
                            {refundingId === ticket.id ? "Zwrot..." : "Zwroc bilety"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
