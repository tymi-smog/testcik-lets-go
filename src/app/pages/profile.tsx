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

  return (
    <div className="max-w-3xl mx-auto py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Szczegóły konta</h1>

      <div className="border rounded-lg p-6 space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">
            Nazwa użytkownika
          </p>
          <p className="font-medium">
            {user?.username || "—"}
          </p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">
            Email
          </p>
          <p className="font-medium">
            {user?.email || "—"}
          </p>
        </div>

        <div className="pt-4 border-t">
      <button
        onClick={() => navigate("/forgot-password")}
        className="px-4 py-2 border rounded-md"
      >
        Zmień hasło
      </button>
        </div>
      </div>
    </div>
  );
}
