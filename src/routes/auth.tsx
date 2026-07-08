import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { signUp, signIn } from "@/lib/auth.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — PróteseCrédito" },
      { name: "description", content: "Entre ou crie sua conta na PróteseCrédito para simular e solicitar financiamento de próteses ortopédicas." },
    ],
  }),
  component: AuthPage,
});

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

const registerSchema = z
  .object({
    fullName: z.string().min(2, "Nome completo obrigatório"),
    email: z.string().email("Email inválido"),
    document: z.string().min(11, "Documento inválido").max(18, "Documento inválido"),
    phone: z.string().min(10, "Telefone inválido").max(20, "Telefone inválido"),
    password: z.string().min(6, "Mínimo 6 caracteres"),
    confirmPassword: z.string().min(6, "Mínimo 6 caracteres"),
    role: z.enum(["patient", "clinic"]),
    clinicName: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Senhas não conferem",
    path: ["confirmPassword"],
  });

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

function AuthPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("login");

  const doSignUp = useServerFn(signUp);
  const doSignIn = useServerFn(signIn);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      document: "",
      phone: "",
      password: "",
      confirmPassword: "",
      role: "patient",
      clinicName: "",
    },
  });

  const selectedRole = registerForm.watch("role");

  async function onLogin(values: LoginForm) {
    setError(null);
    try {
      await doSignIn({ data: values });
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate({ to: "/dashboard", replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar");
    }
  }

  async function onRegister(values: RegisterForm) {
    setError(null);
    try {
      await doSignUp({
        data: {
          email: values.email,
          password: values.password,
          fullName: values.fullName,
          document: values.document,
          phone: values.phone,
          role: values.role,
          clinicName: values.clinicName,
        },
      });
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate({ to: "/dashboard", replace: true });
      } else {
        setActiveTab("login");
        setError("Conta criada. Faça login para continuar.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar conta");
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">PróteseCrédito</CardTitle>
            <CardDescription>Entre ou crie sua conta para continuar</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="register">Criar conta</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="seu@email.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="******" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <Button type="submit" className="w-full">
                      Entrar
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="register" className="space-y-4">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de conta</FormLabel>
                          <FormControl>
                            <select
                              {...field}
                              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
                            >
                              <option value="patient">Sou paciente</option>
                              <option value="clinic">Sou clínica</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {selectedRole === "clinic" && (
                      <FormField
                        control={registerForm.control}
                        name="clinicName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome da clínica</FormLabel>
                            <FormControl>
                              <Input placeholder="Clínica Exemplo" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={registerForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome completo</FormLabel>
                          <FormControl>
                            <Input placeholder="Seu nome" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="seu@email.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={registerForm.control}
                        name="document"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CPF/CNPJ</FormLabel>
                            <FormControl>
                              <Input placeholder="000.000.000-00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
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
                    </div>
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="******" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirmar senha</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="******" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <Button type="submit" className="w-full">
                      Criar conta
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
