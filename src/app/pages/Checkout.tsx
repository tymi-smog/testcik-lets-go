import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useCart } from "../context/CartContext";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Separator } from "../components/ui/separator";
import { Trash2, ShoppingCart, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";

export function Checkout() {
  const { items, removeFromCart, updateQuantity, getTotal, clearCart } = useCart();
  const { user, token, isLoading } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const serviceFee = Number((getTotal() * 0.05).toFixed(2));
  const grandTotal = Number((getTotal() + serviceFee).toFixed(2));

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      toast.error("Musisz być zalogowany, aby kupić bilety.");
      navigate("/login");
      return;
    }

    if (!user.is_verified) {
      toast.error("Zweryfikuj konto e-mail, aby kupować bilety.");
      navigate("/");
    }
  }, [isLoading, user, navigate]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!items.length) {
      toast.error("Koszyk jest pusty.");
      return;
    }

    if (!token) {
      toast.error("Brak sesji. Zaloguj się ponownie.");
      navigate("/login");
      return;
    }

    if (!user?.is_verified) {
      toast.error("Konto musi być zweryfikowane.");
      return;
    }

    try {
      setIsProcessing(true);

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email: user.email,
          cardNumber,
          expiry,
          cvv,
          items,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Nie udało się zrealizować płatności.");
      }

      toast.success("Zakup zakończony. Potwierdzenie wysłaliśmy na e-mail.");
      clearCart();
      navigate("/");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Wystąpił nieznany błąd.";
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100/80 flex items-center justify-center">
        <p className="text-gray-600">Ładowanie sesji...</p>
      </div>
    );
  }

  if (!user || !user.is_verified) {
    return (
      <div className="min-h-screen bg-slate-100/80 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl mb-2">Zakup niedostępny</h2>
          <p className="text-gray-600 mb-6">
            Tylko zalogowani i zweryfikowani użytkownicy mogą kupować bilety.
          </p>
          <Button onClick={() => navigate(user ? "/" : "/login")}>
            {user ? "Wróć na stronę główną" : "Przejdź do logowania"}
          </Button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-slate-100/80 flex items-center justify-center">
        <div className="text-center">
          <ShoppingCart className="size-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl mb-2">Twój koszyk jest pusty</h2>
          <p className="text-gray-600 mb-6">Przeglądaj wydarzenia i dodaj bilety do koszyka</p>
          <Button onClick={() => navigate("/events")}>Przeglądaj wydarzenia</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/80 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl mb-8">Koszyk</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Twoje bilety</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item) => (
                  <div
                    key={`${item.eventId}-${item.ticketTypeId}`}
                    className="flex gap-4 pb-4 border-b last:border-0"
                  >
                    <div className="flex-1">
                      <h3 className="mb-1">{item.eventTitle}</h3>
                      <p className="text-sm text-gray-600">{item.ticketTypeName}</p>
                      <p className="text-sm">{item.price} zł za sztukę</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 border rounded px-2">
                        <button
                          onClick={() =>
                            updateQuantity(item.eventId, item.ticketTypeId, item.quantity - 1)
                          }
                          className="py-1 px-2 hover:text-blue-600"
                        >
                          -
                        </button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() =>
                            updateQuantity(item.eventId, item.ticketTypeId, item.quantity + 1)
                          }
                          className="py-1 px-2 hover:text-blue-600"
                        >
                          +
                        </button>
                      </div>
                      <p className="w-24 text-right">{(item.price * item.quantity).toFixed(2)} zł</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromCart(item.eventId, item.ticketTypeId)}
                      >
                        <Trash2 className="size-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Informacje o płatności</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCheckout} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Imię</Label>
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Nazwisko</Label>
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email konta</Label>
                    <Input id="email" type="email" value={user.email} readOnly />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="cardNumber">Numer karty</Label>
                    <Input
                      id="cardNumber"
                      placeholder="1234 5678 9012 3456"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      required
                      maxLength={19}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expiry">Data ważności</Label>
                      <Input
                        id="expiry"
                        placeholder="MM/YY"
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvv">CVV</Label>
                      <Input
                        id="cvv"
                        placeholder="123"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value)}
                        required
                        maxLength={4}
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={isProcessing}>
                    <CreditCard className="size-5 mr-2" />
                    {isProcessing ? "Przetwarzanie..." : `Zapłać ${grandTotal.toFixed(2)} zł`}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Podsumowanie zamówienia</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={`${item.eventId}-${item.ticketTypeId}`}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-gray-600">
                        {item.quantity}x {item.ticketTypeName}
                      </span>
                      <span>{(item.price * item.quantity).toFixed(2)} zł</span>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Suma biletów</span>
                    <span>{getTotal().toFixed(2)} zł</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Opłata serwisowa</span>
                    <span>{serviceFee.toFixed(2)} zł</span>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between text-lg">
                  <span>Łącznie</span>
                  <span>{grandTotal.toFixed(2)} zł</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
