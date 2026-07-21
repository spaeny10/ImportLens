import { AuthForm } from "../../../components/auth-form";
import { login } from "../actions";

export const metadata = { title: "Sign in — ImportLens" };

export default function LoginPage() {
  return (
    <>
      <AuthForm
        action={login}
        title="Sign in to your account"
        submitLabel="Sign in"
        fields={[
          { name: "email", label: "Email", type: "email", autoComplete: "email", placeholder: "you@company.com" },
          { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
        ]}
        footer={{ text: "No account?", linkText: "Create one", href: "/register" }}
      />
      <p className="mt-4 text-center text-xs text-slate-500">
        Demo login: demo@importapp.dev / demo1234
      </p>
    </>
  );
}
