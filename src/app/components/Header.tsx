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
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="container mx-auto flex items-center justify-between px-4 py-2">
        <Link to="/" className="flex items-center gap-2">
          <img src="/ikonasigmy.svg" alt="PanBilecik" className="h-10 w-10" />
          <span className="text-xl">PanBilecik</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link to="/events" className="transition-colors hover:text-blue-600">
            Wszystkie wydarzenia
          </Link>
          <Link to="/events-archive" className="transition-colors hover:text-blue-600">
            Archiwum wydarzeń
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
                <div className="mb-1 border-b px-3 py-2">
                  <p className="text-sm font-semibold">{user.username}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              )}

              {!isLoggedIn && (
                <>
                  <DropdownMenuItem asChild>
                    <Link to="/login">Logowanie</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/register">Rejestracja</Link>
                  </DropdownMenuItem>
                </>
              )}

              {isLoggedIn && (
                <>
                  <DropdownMenuItem asChild>
                    <Link to="/profile">Szczegóły konta</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/upcoming-events">Nadchodzące wydarzenia</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/my-events">Moje wydarzenia</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/my-tickets">Moje bilety</Link>
                  </DropdownMenuItem>
                  {user?.is_admin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin">Panel admina</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleLogout}>Wyloguj się</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Link to="/checkout">
            <Button variant="outline" className="relative">
              <ShoppingCart className="mr-2 size-5" />
              Koszyk
              {itemCount > 0 && (
                <Badge className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full p-0">
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
