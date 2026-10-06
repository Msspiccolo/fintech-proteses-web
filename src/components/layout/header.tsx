import { Link, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { Menu, X, Box, PlusCircle, Landmark } from "lucide-react";
import { getAuthenticatedUserRole } from "@/lib/auth-client";

let globalUserCache: { email?: string; role?: string } | null = null;
let globalUserLoaded = false;

export function Header() {
  const router = useRouter();
  const [user, setUser] = useState<null | { email?: string; role?: string }>(globalUserCache);
  const [isLoaded, setIsLoaded] = useState(globalUserLoaded);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const role = await getAuthenticatedUserRole();
        globalUserCache = { email: data.user.email, role };
      } else {
        globalUserCache = null;
      }
      globalUserLoaded = true;
      setUser(globalUserCache);
      setIsLoaded(true);
    }
    
    if (!globalUserLoaded) {
      loadUser();
    }

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const role = await getAuthenticatedUserRole();
        globalUserCache = { email: session.user.email, role };
      } else {
        globalUserCache = null;
      }
      globalUserLoaded = true;
      setUser(globalUserCache);
      setIsLoaded(true);
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
          <img src="/promobi-logo.png?v=2" alt="ProMobi" className="h-10 w-auto" />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Home
          </Link>
          
          {user?.role !== "clinic" && user?.role !== "admin" && user?.role !== "investor" && (
            <>
              <Link
                to="/simular"
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Simular
              </Link>
              <Link
                to="/como-funciona"
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Como funciona
              </Link>
              {user && (
                <Link
                  to="/clinicas-parceiras"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Clínicas parceiras
                </Link>
              )}
              <Link
                to="/produtos"
                className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <Box size={16} /> Catálogo
              </Link>
            </>
          )}

          {user?.role === "admin" && (
            <Link
              to="/admin/dashboard"
              className="text-sm font-medium text-primary hover:text-primary/80"
            >
              Painel Administrativo
            </Link>
          )}
          {user?.role === "clinic" && (
            <>
              <Link
                to="/clinica/produtos/cadastro"
                className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <PlusCircle size={16} /> Cadastro de produto
              </Link>
              <Link
                to="/clinica/produtos"
                className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <Box size={16} /> Catálogo de produto
              </Link>
              <Link
                to="/clinica/financeiro"
                className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <Landmark size={16} /> Meus Repasses
              </Link>
            </>
          )}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          {!isLoaded ? (
            <div className="h-9 w-20 animate-pulse bg-muted rounded-md"></div>
          ) : user ? (
            <>
              <Link to="/dashboard" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Meu painel
              </Link>
              <Link to="/perfil" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Meu perfil
              </Link>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Sair
              </Button>
            </>
          ) : (
            <Link to="/auth" className={buttonVariants({ size: "sm" })}>
              Entrar
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
            <Link
              to="/"
              className="text-sm font-medium text-muted-foreground"
              onClick={() => setMobileOpen(false)}
            >
              Home
            </Link>

            {user?.role !== "clinic" && user?.role !== "admin" && user?.role !== "investor" && (
              <>
                <Link
                  to="/simular"
                  className="text-sm font-medium text-muted-foreground"
                  onClick={() => setMobileOpen(false)}
                >
                  Simular
                </Link>
                <Link
                  to="/como-funciona"
                  className="text-sm font-medium text-muted-foreground"
                  onClick={() => setMobileOpen(false)}
                >
                  Como funciona?
                </Link>
                {user && (
                  <Link
                    to="/clinicas-parceiras"
                    className="text-sm font-medium text-muted-foreground"
                    onClick={() => setMobileOpen(false)}
                  >
                    Clínicas parceiras
                  </Link>
                )}
                <Link
                  to="/produtos"
                  className="text-sm font-medium text-muted-foreground flex items-center gap-2"
                  onClick={() => setMobileOpen(false)}
                >
                  <Box size={16} /> Catálogo
                </Link>
              </>
            )}

            {user?.role === "admin" && (
              <Link
                to="/admin/dashboard"
                className="text-sm font-medium text-primary"
                onClick={() => setMobileOpen(false)}
              >
                Painel Administrativo
              </Link>
            )}
            {user?.role === "clinic" && (
              <>
                <Link
                  to="/clinica/produtos/cadastro"
                  className="text-sm font-medium text-muted-foreground flex items-center gap-2"
                  onClick={() => setMobileOpen(false)}
                >
                  <PlusCircle size={16} /> Cadastro de produto
                </Link>
                <Link
                  to="/clinica/produtos"
                  className="text-sm font-medium text-muted-foreground flex items-center gap-2"
                  onClick={() => setMobileOpen(false)}
                >
                  <Box size={16} /> Catálogo de produto
                </Link>
                <Link
                  to="/clinica/financeiro"
                  className="text-sm font-medium text-muted-foreground flex items-center gap-2"
                  onClick={() => setMobileOpen(false)}
                >
                  <Landmark size={16} /> Meus Repasses
                </Link>
              </>
            )}
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-sm font-medium text-primary"
                  onClick={() => setMobileOpen(false)}
                >
                  Meu painel
                </Link>
                <Link
                  to="/perfil"
                  className="text-sm font-medium text-muted-foreground"
                  onClick={() => setMobileOpen(false)}
                >
                  Meu perfil
                </Link>
                <button
                  className="text-left text-sm font-medium text-muted-foreground"
                  onClick={handleSignOut}
                >
                  Sair
                </button>
              </>
            ) : !isLoaded ? (
              <div className="text-sm font-medium text-muted-foreground">Carregando...</div>
            ) : (
              <Link
                to="/auth"
                className="text-sm font-medium text-primary"
                onClick={() => setMobileOpen(false)}
              >
                Entrar
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
