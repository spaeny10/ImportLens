import { AuthForm } from "../../../components/auth-form";
import { register } from "../actions";

export const metadata = { title: "Create account — ImportLens" };

export default function RegisterPage() {
  return (
    <AuthForm
      action={register}
      title="Create your account"
      submitLabel="Create account"
      fields={[
        { name: "name", label: "Full name", type: "text", autoComplete: "name", placeholder: "Jane Doe" },
        { name: "email", label: "Email", type: "email", autoComplete: "email", placeholder: "you@company.com" },
        { name: "password", label: "Password (8+ characters)", type: "password", autoComplete: "new-password" },
      ]}
      footer={{ text: "Already have an account?", linkText: "Sign in", href: "/login" }}
    />
  );
}
