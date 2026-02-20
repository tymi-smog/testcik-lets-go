import { Link } from 'react-router-dom';
import { ShoppingCart, Ticket } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { User } from "lucide-react";


export function Header() {
  const { getItemCount } = useCart();
  const itemCount = getItemCount();
  const token =
  typeof window !== "undefined"
    ? localStorage.getItem("token")
    : null;


const isLoggedIn = !!token;

function handleLogout() {
  localStorage.removeItem("token");
  window.location.reload();
}
  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Ticket className="size-8 text-blue-600" />
          <span className="text-2xl">TicketKurwaHub</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link to="/" className="hover:text-blue-600 transition-colors">
            Wydarzenia
          </Link>
          <Link to="/checkout" className="hover:text-blue-600 transition-colors">
            Płatność
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline" size="icon">
      <User className="size-5" />
    </Button>
  </DropdownMenuTrigger>

  <DropdownMenuContent align="end">
    {!isLoggedIn && (
      <>
        <DropdownMenuItem asChild>
          <Link to="/login">Login</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/register">Rejestracja</Link>
        </DropdownMenuItem>
      </>
    )}

    {isLoggedIn && (
      <>
        <DropdownMenuItem asChild>
          <Link to="/profile">Szczegóły</Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link to="/tickets">Moje bilety</Link>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleLogout}>
          Wyloguj się
        </DropdownMenuItem>
      </>
    )}
  </DropdownMenuContent>
</DropdownMenu>

          


  <Link to="/checkout">
    <Button variant="outline" className="relative">
      <ShoppingCart className="size-5 mr-2" />
      Koszyk
      {itemCount > 0 && (
        <Badge className="absolute -top-2 -right-2 size-6 flex items-center justify-center p-0 rounded-full">
          {itemCount}
        </Badge>
      )}
    </Button>
  </Link>

        </div>
      </div>
    </header>
  );
}
