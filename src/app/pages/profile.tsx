import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type User = {
  user_id: number;
  username: string;
  email: string;
  is_admin?: boolean;
};

export function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

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
      setUsername(payload.username);
      setEmail(payload.email);
    } catch (e) {
      console.error("JWT decode error");
    }
  }, []);

  async function handleSave() {
    const token = localStorage.getItem("token");
    if (!token) return;

    setLoading(true);

    try {
      const res = await fetch("/api/update-profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username, email }),
      });

      if (!res.ok) {
        alert("Błąd podczas zapisu");
      } else {
        alert("Zapisano zmiany ✅");
      }
    } catch (err) {
      console.error(err);
      alert("Błąd serwera");
    }

    setLoading(false);
  }

  return (
    <div className="max-w-3xl mx-auto py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Szczegóły konta</h1>

      <div className="border rounded-lg p-6 space-y-6">
        {/* Username */}
        <div>
          <p className="text-sm text-muted-foreground">
            Nazwa użytkownika
          </p>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border rounded-md p-2"
          />
        </div>

        {/* Email */}
        <div>
          <p className="text-sm text-muted-foreground">
            Email
          </p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-md p-2"
          />
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={loading}
          className="
            px-4 py-2 
            bg-black text-white 
            rounded-md 
            hover:bg-gray-800
            active:scale-95
            transition-all duration-200
            disabled:opacity-50
            disabled:cursor-not-allowed
          "
        >
          {loading ? "Zapisywanie..." : "Zapisz zmiany"}
        </button>

        {/* Divider */}
        <div className="pt-4 border-t">
          <button
            onClick={() => navigate("/forgot-password")}
            className="
              px-4 py-2 
              border rounded-md 
              hover:bg-gray-100 
              hover:shadow-sm
              active:scale-95
              transition-all duration-200
            "
          >
            Zmień hasło
          </button>
        </div>
      </div>
    </div>
  );
}
