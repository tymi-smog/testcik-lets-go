import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, User } from "lucide-react";
import { useCart } from "../context/CartContext";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { useAuth } from "../../context/AuthContext";

export function Header() {
  const { getItemCount } = useCart();
  const { user, logout } = useAuth();
  const itemCount = getItemCount();
  const navigate = useNavigate();
  const isLoggedIn = !!user;

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src="/ikonasigmy.svg" alt="PanBilecik" className="w-10 h-10" />
          <span className="text-xl">PanBilecik</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link to="/events" className="hover:text-blue-600 transition-colors">
            Wszystkie wydarzenia
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
                    <Link to="/profile">Szczegółly</Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link to="/my-events">Moje wydarzenia</Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={handleLogout}>Wyloguj się</DropdownMenuItem>
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
