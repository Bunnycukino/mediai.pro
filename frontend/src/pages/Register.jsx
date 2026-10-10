import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Register() {
  const { register } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (password !== confirm) { setErr("Passwords do not match"); return; }
    if (password.length < 8) { setErr("Password must be at least 8 characters"); return; }
    setLoading(true);
    const res = await register(email.trim(), password, name.trim());
    setLoading(false);
    if (res.ok) {
      toast.success("Account created!");
      nav("/profile", { replace: true });
    } else {
      setErr(res.error);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F8F6]">
      <Navbar />
      <div className="max-w-md mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <div className="text-xs uppercase tracking-[0.3em] text-[#5C6A64] mb-3">MediAI</div>
          <h1 className="font-heading text-4xl text-[#1A2E25]">{t("signUp")}</h1>
          <p className="text-[#5C6A64] mt-3 text-sm">Create your MediAI account for educational health conversations.</p>
        </div>
        <form onSubmit={submit} className="bg-white border border-[#E1DFDA] rounded-3xl p-8 space-y-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-[0.2em] text-[#5C6A64]">{t("fullName")}</Label>
            <Input required value={name} onChange={(e) => setName(e.target.value)}
              className="rounded-xl h-12 border-[#E1DFDA] bg-[#F9F8F6]" data-testid="register-name" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-[0.2em] text-[#5C6A64]">{t("email")}</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl h-12 border-[#E1DFDA] bg-[#F9F8F6]" data-testid="register-email" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-[0.2em] text-[#5C6A64]">{t("password")}</Label>
            <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl h-12 border-[#E1DFDA] bg-[#F9F8F6]" data-testid="register-password" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-[0.2em] text-[#5C6A64]">{t("confirmPassword")}</Label>
            <Input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)}
              className="rounded-xl h-12 border-[#E1DFDA] bg-[#F9F8F6]" data-testid="register-confirm" />
          </div>
          {err && (
            <div className="text-sm text-[#CC7A6B] bg-[#CC7A6B]/8 rounded-xl px-3 py-2" data-testid="register-error">{err}</div>
          )}
          <Button type="submit" disabled={loading} className="w-full h-12 rounded-full btn-sage text-base" data-testid="register-submit">
            {loading ? "..." : t("signUp")}
          </Button>
          <p className="text-sm text-[#5C6A64] text-center">
            {t("haveAccount")}{" "}
            <Link to="/login" className="text-[#8BA888] hover:underline" data-testid="register-to-login">{t("signIn")}</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
