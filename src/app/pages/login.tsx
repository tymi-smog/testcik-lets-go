import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Blad logowania");
        setLoading(false);
        return;
      }

      if (!data?.token || !data?.user) {
        alert("Nieprawidlowy format odpowiedzi logowania");
        setLoading(false);
        return;
      }

      login(data.token, data.user);
      navigate("/");
    } catch (err) {
      console.error(err);
      alert("Cos poszlo nie tak");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100/80">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md space-y-4 rounded-xl border border-slate-200 bg-white/90 p-8 shadow-md backdrop-blur-sm"
      >
        <h1 className="text-2xl font-semibold text-center">Logowanie</h1>

        <input
          type="email"
          placeholder="Email"
          className="w-full border rounded-lg p-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Haslo"
          className="w-full border rounded-lg p-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white rounded-lg p-2 hover:bg-gray-800 transition"
        >
          {loading ? "Logowanie..." : "Zaloguj sie"}
        </button>

        <div className="flex justify-between text-sm mt-3 text-gray-500">
          <Link to="/forgot-password" className="hover:underline">
            Zapomniales hasla?
          </Link>

          <Link to="/register" className="underline">
            Zarejestruj sie
          </Link>
        </div>
      </form>
    </div>
  );
}
