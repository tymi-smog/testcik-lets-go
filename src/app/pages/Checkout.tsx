import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useCart } from '../context/CartContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { Trash2, ShoppingCart, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

export function Checkout() {
  const { items, removeFromCart, updateQuantity, getTotal, clearCart } = useCart();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    // Simulate payment processing
    setTimeout(() => {
      toast.success('Złożono zamówienie. Bilety zostaną wysłane na twój adres email.');
      clearCart();
      setIsProcessing(false);
      navigate('/');
    }, 2000);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ShoppingCart className="size-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl mb-2">Twój koszyk jest pusty</h2>
          <p className="text-gray-600 mb-6">Przeglądaj wydarzenia i dodaj bilety do koszyka</p>
          <Button onClick={() => navigate('/')}>Przeglądaj wydarzenia</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
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
                  <div key={`${item.eventId}-${item.ticketTypeId}`} className="flex gap-4 pb-4 border-b last:border-0">
                    <div className="flex-1">
                      <h3 className="mb-1">{item.eventTitle}</h3>
                      <p className="text-sm text-gray-600">{item.ticketTypeName}</p>
                      <p className="text-sm">{item.price}zł każdy</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 border rounded px-2">
                        <button
                          onClick={() => updateQuantity(item.eventId, item.ticketTypeId, item.quantity - 1)}
                          className="py-1 px-2 hover:text-blue-600"
                        >
                          −
                        </button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.eventId, item.ticketTypeId, item.quantity + 1)}
                          className="py-1 px-2 hover:text-blue-600"
                        >
                          +
                        </button>
                      </div>
                      <p className="w-20 text-right">{item.price * item.quantity}zł</p>
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
                      <Input id="firstName" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Nazwisko</Label>
                      <Input id="lastName" required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" required />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="cardNumber">Numer karty</Label>
                    <Input
                      id="cardNumber"
                      placeholder="1234 5678 9012 3456"
                      required
                      maxLength={19}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expiry">Data ważności</Label>
                      <Input id="expiry" placeholder="MM/YY" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvv">CVV</Label>
                      <Input id="cvv" placeholder="123" required maxLength={3} />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={isProcessing}>
                    <CreditCard className="size-5 mr-2" />
                    {isProcessing ? 'Procesowanie...' : `Zapłać ${(getTotal() * 1.05).toFixed(2)} zł`
}

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
                      <span>{item.price * item.quantity}zł</span>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Łączna kwota</span>
                    <span>{getTotal()}zł</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Opłata serwisowa</span>
                    <span>{(getTotal() * 0.05).toFixed(2)}zł</span>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between text-lg">
                  <span>Łącznie</span>
                  <span>{(getTotal() * 1.05).toFixed(2)}zł</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
