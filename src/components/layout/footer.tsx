import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="border-t border-border bg-secondary/50 py-12">
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <span className="text-xl font-bold tracking-tight text-foreground">
              Protese<span className="text-primary">Pay</span>
            </span>
            <p className="mt-2 text-sm text-muted-foreground">
              Financiamento acessível para próteses ortopédicas. Transformando saúde em realidade.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-foreground">Links</h4>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/simular" className="hover:text-foreground">
                  Simular crédito
                </Link>
              </li>
              <li>
                <Link to="/como-funciona" className="hover:text-foreground">
                  Como funciona
                </Link>
              </li>
              <li>
                <Link to="/clinicas-parceiras" className="hover:text-foreground">
                  Clínicas parceiras
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground">Contato</h4>
            <p className="mt-2 text-sm text-muted-foreground">contato@prostecredito.com.br</p>
            <p className="text-sm text-muted-foreground">0800 123 4567</p>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-8 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} ProtesePay. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
