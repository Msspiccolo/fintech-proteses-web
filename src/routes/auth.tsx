import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { lovable } from "@/integrations/lovable";
import { signUpWithPassword, signInWithPassword, resetPasswordForEmail } from "@/lib/auth-client";
import { Chrome, User, Building2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { tipo?: "clinica" } =>
    search["tipo"] === "clinica" ? { tipo: "clinica" } : {},
  head: () => ({
    meta: [
      { title: "Entrar — PrótesePay" },
      {
        name: "description",
        content:
          "Entre ou crie sua conta na PrótesePay para simular e solicitar financiamento de próteses ortopédicas.",
      },
    ],
  }),
  component: AuthPage,
});

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

const resetSchema = z.object({
  email: z.string().email("Email inválido"),
});

const registerSchema = z
  .object({
    fullName: z.string().min(2, "Nome completo obrigatório"),
    email: z.string().email("Email inválido"),
    document: z.string().min(11, "Documento inválido").max(18, "Documento inválido"),
    phone: z.string().min(10, "Telefone inválido").max(20, "Telefone inválido"),
    zipCode: z.string().min(8, "CEP inválido").max(9, "CEP inválido"),
    address: z.string().min(3, "Logradouro obrigatório"),
    city: z.string().min(2, "Cidade obrigatória"),
    state: z.string().length(2, "UF deve ter 2 letras"),
    password: z.string().min(6, "Mínimo 6 caracteres"),
    confirmPassword: z.string().min(6, "Mínimo 6 caracteres"),
    role: z.enum(["patient", "clinic"]),
    clinicName: z.string().optional(),
    zipCode: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Senhas não conferem",
    path: ["confirmPassword"],
  });

type LoginForm = z.infer<typeof loginSchema>;
type ResetForm = z.infer<typeof resetSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

function AuthPage() {
  const navigate = useNavigate();
  const { tipo } = Route.useSearch();
  const [mode, setMode] = useState<"login" | "register" | "forgot_password">(
    tipo === "clinica" ? "register" : "login",
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const resetForm = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: "" },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      document: "",
      phone: "",
      zipCode: "",
      address: "",
      city: "",
      state: "",
      password: "",
      confirmPassword: "",
      role: tipo === "clinica" ? "clinic" : "patient",
      clinicName: "",
      zipCode: "",
      address: "",
      city: "",
    },
  });

  const [selectedRole, setSelectedRole] = useState<"patient" | "clinic">(
    tipo === "clinica" ? "clinic" : "patient",
  );

  async function onGoogleSignIn() {
    setError(null);
    try {
      if (mode === "register") {
        localStorage.setItem("oauth_signup_role", selectedRole);
      }
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });

      if (result.error) {
        setError(
          result.error instanceof Error ? result.error.message : "Erro ao entrar com Google",
        );
        return;
      }

      if (result.redirected) {
        return;
      }

      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar com Google");
    }
  }

  async function onLogin(values: LoginForm) {
    setError(null);
    try {
      await signInWithPassword(values.email, values.password);
      const { redirectUserByRole, getAuthenticatedUserRole } = await import("@/lib/auth-client");

      const role = await getAuthenticatedUserRole();
      redirectUserByRole(role, navigate);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar");
    }
  }

  async function onResetPassword(values: ResetForm) {
    setError(null);
    setSuccess(null);
    try {
      await resetPasswordForEmail(values.email);
      setSuccess("Enviamos um link de recuperação para o seu email.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao solicitar recuperação");
    }
  }

  async function onRegister(values: RegisterForm) {
    console.log("[Auth] Registering with values:", values);
    setError(null);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("oauth_signup_role", values.role);
        if (values.role === "clinic") {
          localStorage.setItem("user_role_hint", "clinic");
        }
      }
      const { needsEmailConfirmation } = await signUpWithPassword({
        email: values.email,
        password: values.password,
        fullName: values.fullName,
        document: values.document,
        phone: values.phone,
        zipCode: values.zipCode,
        address: values.address,
        city: values.city,
        state: values.state,
        role: values.role,
        clinicName: values.clinicName,
        zipCode: values.zipCode,
        address: values.address,
        city: values.city,
      });
      if (needsEmailConfirmation) {
        setMode("login");
        setError("Conta criada. Confirme seu email e faça login para continuar.");
      } else {
        const { redirectUserByRole } = await import("@/lib/auth-client");
        redirectUserByRole(values.role, navigate);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar conta");
    }
  }

  const onRegisterError = (errors: Record<string, any>) => {
    console.warn("[Auth] Register validation errors:", errors);
    const firstKey = Object.keys(errors)[0];
    const firstError = errors[firstKey];
    if (firstError?.message) {
      toast.error(firstError.message);
    } else {
      toast.error("Preencha todos os campos obrigatórios para continuar.");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">PrótesePay</CardTitle>
            <CardDescription>Entre ou crie sua conta para continuar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
              <Button
                type="button"
                variant={mode === "login" ? "default" : "ghost"}
                size="sm"
                onClick={() => setMode("login")}
              >
                Entrar
              </Button>
              <Button
                type="button"
                variant={mode === "register" ? "default" : "ghost"}
                size="sm"
                onClick={() => setMode("register")}
              >
                Criar conta
              </Button>
            </div>

            {mode === "login" ? (
              <div className="mt-4 space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={onGoogleSignIn}
                >
                  <Chrome size={18} /> Entrar com Google
                </Button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">ou email</span>
                  </div>
                </div>
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
                          <div className="flex items-center justify-between">
                            <FormLabel>Senha</FormLabel>
                            <Button
                              type="button"
                              variant="link"
                              className="px-0 py-0 h-auto font-normal text-xs text-muted-foreground"
                              onClick={() => setMode("forgot_password")}
                            >
                              Esqueci a senha
                            </Button>
                          </div>
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
                <div className="text-center pt-2">
                  <Button
                    type="button"
                    variant="link"
                    className="text-xs text-muted-foreground"
                    onClick={() => {
                      setMode("login");
                      toast("Faça login com suas credenciais de administrador.");
                    }}
                  >
                    É administrador? Faça login aqui
                  </Button>
                </div>
              </div>
            ) : mode === "forgot_password" ? (
              <div className="mt-4 space-y-4">
                <Form {...resetForm}>
                  <form onSubmit={resetForm.handleSubmit(onResetPassword)} className="space-y-4">
                    <FormField
                      control={resetForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email para recuperação</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="seu@email.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    {success && (
                      <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
                    )}
                    <Button type="submit" className="w-full">
                      Enviar link
                    </Button>
                  </form>
                </Form>
                <div className="text-center pt-2">
                  <Button
                    type="button"
                    variant="link"
                    className="text-xs text-muted-foreground"
                    onClick={() => setMode("login")}
                  >
                    Voltar para o login
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={onGoogleSignIn}
                >
                  <Chrome size={18} /> Criar conta com Google
                </Button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">ou email</span>
                  </div>
                </div>
                <Form {...registerForm}>
                  <form
                    onSubmit={registerForm.handleSubmit(onRegister, onRegisterError)}
                    className="space-y-4"
                  >
                    <FormField
                      control={registerForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel>Tipo de conta</FormLabel>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                console.log("[Auth] Switching role to patient");
                                setSelectedRole("patient");
                                field.onChange("patient");
                                registerForm.setValue("role", "patient");
                              }}
                              className={cn(
                                "flex items-center justify-between rounded-lg border-2 p-3.5 text-sm font-semibold transition-all cursor-pointer",
                                selectedRole === "patient"
                                  ? "border-primary bg-primary/10 text-primary shadow-sm ring-2 ring-primary/20"
                                  : "border-border bg-card text-muted-foreground hover:bg-muted/50",
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <User size={18} />
                                <span>Sou paciente</span>
                              </div>
                              <div
                                className={cn(
                                  "h-4 w-4 rounded-full border flex items-center justify-center shrink-0",
                                  selectedRole === "patient"
                                    ? "border-primary bg-primary"
                                    : "border-muted-foreground/40",
                                )}
                              >
                                {selectedRole === "patient" && (
                                  <div className="h-1.5 w-1.5 rounded-full bg-white" />
                                )}
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                console.log("[Auth] Switching role to clinic");
                                setSelectedRole("clinic");
                                field.onChange("clinic");
                                registerForm.setValue("role", "clinic");
                              }}
                              className={cn(
                                "flex items-center justify-between rounded-lg border-2 p-3.5 text-sm font-semibold transition-all cursor-pointer",
                                selectedRole === "clinic"
                                  ? "border-primary bg-primary/10 text-primary shadow-sm ring-2 ring-primary/20"
                                  : "border-border bg-card text-muted-foreground hover:bg-muted/50",
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <Building2 size={18} />
                                <span>Sou clínica</span>
                              </div>
                              <div
                                className={cn(
                                  "h-4 w-4 rounded-full border flex items-center justify-center shrink-0",
                                  selectedRole === "clinic"
                                    ? "border-primary bg-primary"
                                    : "border-muted-foreground/40",
                                )}
                              >
                                {selectedRole === "clinic" && (
                                  <div className="h-1.5 w-1.5 rounded-full bg-white" />
                                )}
                              </div>
                            </button>
                          </div>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={registerForm.control}
                        name="zipCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CEP</FormLabel>
                            <FormControl>
                              <Input placeholder="00000-000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cidade</FormLabel>
                            <FormControl>
                              <Input placeholder="Sua Cidade" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={registerForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Endereço Completo</FormLabel>
                          <FormControl>
                            <Input placeholder="Rua, Número, Bairro" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
                    <div className="grid grid-cols-4 gap-4">
                      <FormField
                        control={registerForm.control}
                        name="zipCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CEP</FormLabel>
                            <FormControl>
                              <Input placeholder="00000-000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel>Cidade</FormLabel>
                            <FormControl>
                              <Input placeholder="Sua cidade" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>UF</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="SP"
                                maxLength={2}
                                className="uppercase"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={registerForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Logradouro (Rua, Número)</FormLabel>
                          <FormControl>
                            <Input placeholder="Av. Principal, 123" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
