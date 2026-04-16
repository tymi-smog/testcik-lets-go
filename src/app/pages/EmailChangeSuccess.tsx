import { Link } from "react-router-dom";

export function EmailChangeSuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100/80 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white/95 p-8 text-center shadow-md backdrop-blur-sm">
        <h1 className="text-2xl font-semibold">E-mail został zmieniony</h1>
        <p className="mt-3 text-gray-600">
          Twój adres e-mail został pomyślnie potwierdzony i zaktualizowany.
        </p>
        <Link
          to="/login"
          className="mt-6 inline-flex w-full justify-center rounded-lg bg-black px-4 py-2 text-white transition hover:bg-gray-800"
        >
          Przejdź do logowania
        </Link>
      </div>
    </div>
  );
}
