import { useSearchParams, useNavigate } from "react-router-dom";

export function ResetPassword() {
  const [password,setPassword] = useState("");
  const [params] = useSearchParams();
  const navigate = useNavigate();

  async function handleSubmit(e:any){
    e.preventDefault();

    await fetch("/api/reset-password",{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({
        token: params.get("token"),
        password
      })
    });

    navigate("/login");
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="password"
        placeholder="Nowe hasło"
        value={password}
        onChange={e=>setPassword(e.target.value)}
      />
      <button>Zapisz nowe hasło</button>
    </form>
  );
}
