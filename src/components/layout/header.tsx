import { Link, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

export function Header() {
  const router = useRouter();
  const [user, setUser] = useState<null | { email?: string }>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ? { email: data.user.email } : null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ? { email: session.user.email } : null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.invalidate();
    router.navigate({ to: "/", replace: true });
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-foreground">
            Protese<span className="text-primary">Pay</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Home
          </Link>
          <Link to="/simular" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Simular
          </Link>
          <Link to="/como-funciona" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Como funciona
          </Link>
          <Link to="/clinicas-parceiras" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Clínicas parceiras
          </Link>
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          {user ? (
            <>
              <Link to="/dashboard">
                <Button variant="ghost" size="sm">
                  Meu painel
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Sair
              </Button>
            </>
          ) : (
            <Link to="/auth">
              <Button size="sm">Entrar</Button>
            </Link>
          )}
        </div>

        <button
          className="text-foreground md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-border px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-4">
            <Link to="/" className="text-sm font-medium text-muted-foreground" onClick={() => setMobileOpen(false)}>
              Home
            </Link>
            <Link to="/simular" className="text-sm font-medium text-muted-foreground" onClick={() => setMobileOpen(false)}>
              Simular
            </Link>
            <Link to="/como-funciona" className="text-sm font-medium text-muted-foreground" onClick={() => setMobileOpen(false)}>
              Como funciona
            </Link>
            <Link to="/clinicas-parceiras" className="text-sm font-medium text-muted-foreground" onClick={() => setMobileOpen(false)}>
              Clínicas parceiras
            </Link>
            {user ? (
              <>
                <Link to="/dashboard" className="text-sm font-medium text-primary" onClick={() => setMobileOpen(false)}>
                  Meu painel
                </Link>
                <button className="text-left text-sm font-medium text-muted-foreground" onClick={handleSignOut}>
                  Sair
                </button>
              </>
            ) : (
              <Link to="/auth" className="text-sm font-medium text-primary" onClick={() => setMobileOpen(false)}>
                Entrar
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
