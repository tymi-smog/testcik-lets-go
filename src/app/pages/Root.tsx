import { Outlet } from 'react-router';
import { Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { CartProvider } from '../context/CartContext';
import { Toaster } from '../components/ui/sonner';
import { Button } from '../components/ui/button';
import { useAuth } from '../../context/AuthContext';

export function Root() {
  const { user, logout, isLoading } = useAuth();
  const isBanned = user?.is_banned === true;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Ładowanie aplikacji...</p>
      </div>
    );
  }

  return (
    <CartProvider>
      <div className="min-h-screen flex flex-col">
        {isBanned ? (
          <main className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-10">
            <div className="w-full max-w-2xl rounded-3xl border border-rose-200 bg-white p-8 shadow-sm">
              <p className="text-sm uppercase tracking-[0.2em] text-rose-600">Konto zablokowane</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900">Dostęp do konta został ograniczony</h1>
              <p className="mt-4 text-slate-600">
                To konto ma aktywny ban. Do czasu zakończenia blokady możesz tylko zobaczyć tę informację.
              </p>

              <div className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div>
                  <p className="text-sm text-slate-500">Ban do</p>
                  <p className="text-lg font-medium text-slate-900">
                    {user?.ban_until ? new Date(user.ban_until).toLocaleString("pl-PL", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }) : "Brak daty"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Opis bana</p>
                  <p className="text-lg font-medium text-slate-900">
                    {user?.ban_reason?.trim() ? user.ban_reason : "Brak opisu"}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={logout}
                >
                  Wyloguj się
                </Button>
                <Button asChild type="button">
                  <Link to="/login">Przejdź do logowania</Link>
                </Button>
              </div>
            </div>
          </main>
        ) : (
          <>
            <Header />
            <main className="flex-1">
              <Outlet />
            </main>
          </>
        )}
        <Toaster />
      </div>
    </CartProvider>
  );
}
