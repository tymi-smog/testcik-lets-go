import { Link } from 'react-router-dom';
import { useNavigate } from "react-router-dom";
import { ShoppingCart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useEffect, useState } from "react";
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
const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

useEffect(() => {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null;

  if (!token) return;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    setUser(payload);
  } catch (e) {
    console.error("JWT decode error");
  }
}, []);

const isLoggedIn = !!user;

function handleLogout() {
  localStorage.removeItem("token");
  setUser(null);       // odświeża navbar bez reload
  navigate("/login");  //  przekierowanie
}
  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src="/ikonasigmy.svg" alt= "PanBilecik" className="w-16 h-16" />
          <span className="text-2xl">PanBilecik</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link to="/events" className="hover:text-blue-600 transition-colors">
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
    {user && (
  <div className="px-3 py-2 border-b mb-1">
    <p className="text-sm font-semibold">{user.username}</p>
    <p className="text-xs text-muted-foreground">{user.email}</p>
  </div>
)}
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
