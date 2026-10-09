import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n, UI_LANGUAGES } from "@/contexts/I18nContext";
import { Heart, LogOut, MessageSquare, User as UserIcon, History, Shield, Globe } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useI18n();
  const nav = useNavigate();
  const loc = useLocation();

  const linkCls = (path) =>
    `px-3 py-2 text-sm tracking-wide rounded-full transition-colors ${
      loc.pathname.startsWith(path)
        ? "bg-[#8BA888]/15 text-[#1A2E25]"
        : "text-[#5C6A64] hover:text-[#1A2E25]"
    }`;

  return (
    <header className="sticky top-0 z-40 bg-[#F9F8F6]/80 backdrop-blur-xl border-b border-[#E1DFDA]">
      <div className="max-w-7xl mx-auto px-4 md:px-8 min-h-[4rem] py-2 flex flex-wrap gap-2 items-center justify-between">
        <Link to={user ? "/chat" : "/"} className="flex items-center gap-2" data-testid="nav-logo">
          <div className="w-9 h-9 rounded-2xl bg-[#8BA888] flex items-center justify-center text-white">
            <Heart className="w-5 h-5" strokeWidth={1.6} />
          </div>
          <div className="leading-tight">
            <div className="font-heading text-lg text-[#1A2E25]">MediAI</div>
            <div className="text-[10px] tracking-[0.25em] uppercase text-[#5C6A64]">AI Medical</div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {user && (
            <>
              <Link to="/chat" className={linkCls("/chat")} data-testid="nav-chat">
                <MessageSquare className="inline w-4 h-4 mr-1.5 -mt-0.5" /> {t("consultation")}
              </Link>
              <Link to="/profile" className={linkCls("/profile")} data-testid="nav-profile">
                <UserIcon className="inline w-4 h-4 mr-1.5 -mt-0.5" /> {t("profile")}
              </Link>
              <Link to="/history" className={linkCls("/history")} data-testid="nav-history">
                <History className="inline w-4 h-4 mr-1.5 -mt-0.5" /> {t("history")}
              </Link>
              {user.role === "admin" && (
                <Link to="/admin" className={linkCls("/admin")} data-testid="nav-admin">
                  <Shield className="inline w-4 h-4 mr-1.5 -mt-0.5" /> {t("admin")}
                </Link>
              )}
            </>
          )}
        </nav>

        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          {user && <Link to="/chat" className={`md:hidden ${linkCls("/chat")}`} data-testid="nav-chat-mobile"><MessageSquare className="inline w-4 h-4 mr-1" /> Chat</Link>}
          <Link to="/library" className={linkCls("/library")} data-testid="nav-library">Library</Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="rounded-full text-[#5C6A64]" data-testid="lang-switcher">
                <Globe className="w-4 h-4 mr-1" /> {lang.toUpperCase()}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl">
              <DropdownMenuLabel>UI Language</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {UI_LANGUAGES.map((l) => (
                <DropdownMenuItem key={l.code} onClick={() => setLang(l.code)} data-testid={`lang-${l.code}`}>
                  {l.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="rounded-full" data-testid="user-menu">
                  <div className="w-8 h-8 rounded-full bg-[#8BA888] text-white text-sm flex items-center justify-center font-medium">
                    {(user.name || user.email || "?")[0].toUpperCase()}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-2xl w-56">
                <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => nav("/chat")} data-testid="menu-chat">
                  <MessageSquare className="w-4 h-4 mr-2" /> Chat
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => nav("/profile")} data-testid="menu-profile">
                  <UserIcon className="w-4 h-4 mr-2" /> {t("profile")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => nav("/history")} data-testid="menu-history">
                  <History className="w-4 h-4 mr-2" /> {t("history")}
                </DropdownMenuItem>
                {user.role === "admin" && (
                  <DropdownMenuItem onClick={() => nav("/admin")} data-testid="menu-admin">
                    <Shield className="w-4 h-4 mr-2" /> {t("admin")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => { await logout(); nav("/"); }} data-testid="menu-logout">
                  <LogOut className="w-4 h-4 mr-2" /> {t("signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="rounded-full" data-testid="nav-login">
                <Link to="/login">{t("signIn")}</Link>
              </Button>
              <Button asChild size="sm" className="rounded-full btn-sage" data-testid="nav-register">
                <Link to="/register">{t("signUp")}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
