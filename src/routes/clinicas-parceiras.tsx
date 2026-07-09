import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useServerFn } from "@tanstack/react-start";
import { registerClinic } from "@/lib/clinics.functions";
import { toast } from "sonner";
import { Building2, Users, TrendingUp, CheckCircle } from "lucide-react";

export const Route = createFileRoute("/clinicas-parceiras")({
  head: () => ({
    meta: [
      { title: "Clínicas Parceiras — ProtesePay" },
      { name: "description", content: "Cadastre sua clínica e ofereça financiamento de próteses ortopédicas para seus pacientes." },
      { property: "og:title", content: "Clínicas Parceiras — ProtesePay" },
      { property: "og:description", content: "Cadastre sua clínica e ofereça financiamento para seus pacientes." },
    ],
  }),
  component: ClinicasParceirasPage,
});

const registerSchema = z.object({
  name: z.string().min(2, "Nome da clínica é obrigatório"),
  legalName: z.string().optional(),
  document: z.string().min(14, "CNPJ inválido").max(18, "CNPJ inválido"),
  phone: z.string().min(10, "Telefone inválido").max(20, "Telefone inválido"),
  email: z.string().email("Email inválido"),
  city: z.string().min(2, "Cidade é obrigatória"),
  state: z.string().length(2, "UF inválida"),
});

type RegisterForm = z.infer<typeof registerSchema>;

function ClinicasParceirasPage() {
  const registerClinicFn = useServerFn(registerClinic);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      legalName: "",
      document: "",
      phone: "",
      email: "",
      city: "",
      state: "",
    },
  });

  async function onSubmit(values: RegisterForm) {
    try {
      await registerClinicFn({
        data: {
          name: values.name,
          legalName: values.legalName,
          document: values.document,
          phone: values.phone,
          email: values.email,
          city: values.city,
          state: values.state.toUpperCase(),
        },
      });
      setSubmitted(true);
      toast.success("Clínica cadastrada com sucesso!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao cadastrar clínica");
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 px-4 py-12 md:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground md:text-4xl">Seja uma clínica parceira</h1>
            <p className="mt-4 text-muted-foreground">
              Ofereça financiamento para próteses ortopédicas e aumente a conversão de tratamentos.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <Building2 className="mb-4 h-8 w-8 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Credibilidade</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Sua clínica passa a oferecer uma solução financeira completa e profissional.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Users className="mb-4 h-8 w-8 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Mais pacientes</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Pacientes que antes não tinham condições passam a realizar o tratamento.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <TrendingUp className="mb-4 h-8 w-8 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Recebimento garantido</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  A clínica recebe o valor do tratamento de forma rápida e segura.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mx-auto mt-12 max-w-xl rounded-xl border border-border bg-card p-6">
            {submitted ? (
              <div className="text-center">
                <CheckCircle className="mx-auto h-12 w-12 text-primary" />
                <h2 className="mt-4 text-xl font-semibold text-foreground">Cadastro recebido!</h2>
                <p className="mt-2 text-muted-foreground">
                  Nossa equipe vai analisar os dados da clínica e entrar em contato em breve.
                </p>
              </div>
            ) : (
              <>
                <h2 className="mb-6 text-xl font-semibold text-foreground">Cadastre sua clínica</h2>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome fantasia</FormLabel>
                          <FormControl>
                            <Input placeholder="Clínica Exemplo" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="legalName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Razão social</FormLabel>
                          <FormControl>
                            <Input placeholder="Clínica Exemplo Ltda" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="document"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CNPJ</FormLabel>
                          <FormControl>
                            <Input placeholder="00.000.000/0000-00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefone</FormLabel>
                            <FormControl>
                              <Input placeholder="(00) 00000-0000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="clinica@email.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cidade</FormLabel>
                            <FormControl>
                              <Input placeholder="São Paulo" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>UF</FormLabel>
                            <FormControl>
                              <Input placeholder="SP" maxLength={2} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      Enviar cadastro
                    </Button>
                    <p className="text-center text-sm text-muted-foreground">
                      Já tem conta?{" "}
                      <Link to="/auth" className="text-primary hover:underline">
                        Faça login
                      </Link>
                    </p>
                  </form>
                </Form>
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
