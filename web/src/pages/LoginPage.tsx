import { useState, type FormEvent } from "react";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card } from "../components/ui/Card";

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(email, password);
    } catch {
      setError("Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-sm" padding="lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-ghana-green">RSIMD-ITEMS</h1>
          <p className="text-sm text-gray-500 mt-1">OHCS Equipment Maintenance</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@ohcs.gov.gh"
            required
            autoComplete="email"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            required
            autoComplete="current-password"
          />

          {error && (
            <p className="text-sm text-ghana-red text-center">{error}</p>
          )}

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Sign In
          </Button>
        </form>
      </Card>
    </div>
  );
}
