import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

type User = {
  userId: number;
  username: string;
  email: string;
  pending_email?: string | null;
  is_admin?: boolean;
};

export function Profile() {
  const { token, login } = useAuth();
  const [user, setUser] = useState<User | null>(null);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  const [loadingUsername, setLoadingUsername] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);

  const navigate = useNavigate();

  async function refreshUser(storedToken: string) {
    const response = await fetch("/api/me", {
      headers: {
        Authorization: `Bearer ${storedToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Nie udało się odświeżyć danych użytkownika");
    }

    const data = await response.json();
    if (data?.user) {
      setUser(data.user);
      setUsername(data.user.username ?? "");
      setEmail(data.user.email ?? "");
      login(storedToken, data.user);
    }
  }

  useEffect(() => {
    const storedToken = token ?? localStorage.getItem("token");
    if (!storedToken) {
      setUser(null);
      setUsername("");
      setEmail("");
      return;
    }

    refreshUser(storedToken).catch(() => {
      console.error("Nie udało się pobrać danych profilu");
    });
  }, [token]);

  async function updateUsername() {
    const storedToken = token ?? localStorage.getItem("token");
    if (!storedToken) return;

    setLoadingUsername(true);

    try {
      const response = await fetch("/api/update-profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${storedToken}`,
        },
        body: JSON.stringify({ username, email: user?.email }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        alert(data?.error ?? "Nie udało się zapisać nazwy użytkownika.");
        return;
      }

      await refreshUser(storedToken);
      alert(data?.message ?? "Nazwa użytkownika została zaktualizowana.");
    } catch {
      alert("Wystąpił błąd podczas aktualizacji nazwy użytkownika.");
    } finally {
      setLoadingUsername(false);
    }
  }

  async function updateEmail() {
    const storedToken = token ?? localStorage.getItem("token");
    if (!storedToken) return;

    setLoadingEmail(true);

    try {
      const response = await fetch("/api/update-profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${storedToken}`,
        },
        body: JSON.stringify({ username: user?.username, email }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        alert(data?.error ?? "Nie udało się zaktualizować adresu e-mail.");
        return;
      }

      await refreshUser(storedToken);
      alert(data?.message ?? "Wysłaliśmy e-mail potwierdzający zmianę.");
    } catch {
      alert("Wystąpił błąd podczas aktualizacji adresu e-mail.");
    } finally {
      setLoadingEmail(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 space-y-6">
      <div className="rounded-2xl border bg-gradient-to-r from-emerald-50 to-teal-50 p-6">
        <h1 className="text-3xl font-semibold text-gray-900">Szczegóły konta</h1>
        <p className="mt-2 text-sm text-gray-600">
          Zarządzaj nazwą użytkownika, adresem e-mail i ustawieniami bezpieczeństwa.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <section className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Nazwa użytkownika</h2>
            <p className="text-sm text-gray-500">Ta nazwa jest widoczna przy Twoich wydarzeniach.</p>
          </div>

          <label className="block text-sm font-medium text-gray-700" htmlFor="username">
            Aktualna nazwa
          </label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />

          <button
            onClick={updateUsername}
            disabled={loadingUsername}
            className="inline-flex items-center justify-center rounded-md bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingUsername ? "Zapisywanie..." : "Zapisz nazwę"}
          </button>
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Adres e-mail</h2>
            <p className="text-sm text-gray-500">Po zmianie wyślemy wiadomość z potwierdzeniem.</p>
          </div>

          <label className="block text-sm font-medium text-gray-700" htmlFor="email">
            Aktualny adres e-mail
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />

          {user?.pending_email && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Oczekuje na potwierdzenie: {user.pending_email}
            </p>
          )}

          <button
            onClick={updateEmail}
            disabled={loadingEmail}
            className="inline-flex items-center justify-center rounded-md bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingEmail ? "Wysyłanie..." : "Zmień e-mail"}
          </button>
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Bezpieczeństwo</h2>
              <p className="text-sm text-gray-500">W każdej chwili możesz ustawić nowe hasło.</p>
            </div>
            <button
              onClick={() => navigate("/forgot-password")}
              className="inline-flex items-center justify-center rounded-md border border-emerald-700 px-5 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
            >
              Zmień hasło
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
