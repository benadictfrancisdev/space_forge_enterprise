import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, User, ArrowUpRight, Building2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { DECISION_INTELLIGENCE_PATH, workspacePath } from "@/config/workspaceNav";
import { ConnectorHealthCheck } from "@/components/data-agent/ConnectorHealthCheck";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Activity } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Close mobile menu on route change
  useEffect(() => { setIsMenuOpen(false); }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getInitials = (email: string) => {
    return email.slice(0, 2).toUpperCase();
  };

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/90"
      style={{ borderBottom: "1px solid hsl(var(--border))" }}
    >
      <div className="container mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <Logo size="md" />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a href="/#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">
              Features
            </a>
            <a href="/#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">
              How it Works
            </a>
            <Link to="/v2" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">
              Workspace
            </Link>
            <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">
              Pricing
            </Link>
            <Link to="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">
              Docs
            </Link>
            <Link to={workspacePath("/analytics")} className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">
              Analytics
            </Link>
            <Link
              to={workspacePath("/apps/executive")}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors duration-200"
            >
              Intelligence
            </Link>
            <Link to={DECISION_INTELLIGENCE_PATH} className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">
              Decisions
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to={workspacePath("/apps/executive")}>
              <Button size="sm" variant="outline" className="rounded-full px-4 gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                Intelligence
              </Button>
            </Link>
            <Link to={workspacePath("/data-agent")}>
              <Button size="sm" className="rounded-full px-5 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                Analyze Data <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10" aria-label="System Health">
                  <Activity className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="end" className="p-0 w-auto border-border/60">
                <ConnectorHealthCheck />
              </PopoverContent>
            </Popover>
            <ThemeToggle />
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                        {getInitials(user.email || "U")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="max-w-[150px] truncate">{user.email}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to={workspacePath("/apps/executive")} className="cursor-pointer">
                      <Building2 className="w-4 h-4 mr-2" />
                      Intelligence
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={workspacePath("/data-agent")} className="cursor-pointer">
                      <User className="w-4 h-4 mr-2" />
                      Data Agent
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="outline" size="sm" className="rounded-full px-5">
                    Login
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button size="sm" className="rounded-full px-5 gap-1 bg-primary text-primary-foreground hover:bg-primary/90">
                    Sign Up <ArrowUpRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </>
            )}
          </div>

          <button
            className="md:hidden text-foreground p-2 -mr-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-secondary transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden mt-3 pb-4 pt-3 animate-fade-in border-t border-border">
            <div className="flex flex-col gap-1">
              {[
                { href: "/#features", label: "Features" },
                { href: "/#how-it-works", label: "How it Works" },
                { href: "/#integrations", label: "Integrations" },
              ].map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="px-3 py-3 min-h-[44px] flex items-center text-sm text-foreground/90 hover:bg-secondary rounded-lg transition-colors"
                >
                  {item.label}
                </a>
              ))}
              <Link to="/v2" className="px-3 py-3 min-h-[44px] flex items-center text-sm text-foreground/90 hover:bg-secondary rounded-lg transition-colors">
              Workspace
            </Link>
            <Link to="/pricing" className="px-3 py-3 min-h-[44px] flex items-center text-sm text-foreground/90 hover:bg-secondary rounded-lg transition-colors">Pricing</Link>
              <Link to="/docs" className="px-3 py-3 min-h-[44px] flex items-center text-sm text-foreground/90 hover:bg-secondary rounded-lg transition-colors">Docs</Link>
              <Link to={workspacePath("/apps/executive")} className="px-3 py-3 min-h-[44px] flex items-center text-sm font-semibold text-primary hover:bg-primary/5 rounded-lg transition-colors">Intelligence</Link>
              <Link to={DECISION_INTELLIGENCE_PATH} className="px-3 py-3 min-h-[44px] flex items-center text-sm text-foreground/90 hover:bg-secondary rounded-lg transition-colors">Decision Intelligence</Link>
              <Link to={workspacePath("/data-agent")} className="px-3 py-3 min-h-[44px] flex items-center text-sm text-foreground/90 hover:bg-secondary rounded-lg transition-colors">Data Agent</Link>
              <div className="flex gap-2 pt-3 mt-2 border-t border-border items-center">
                <ThemeToggle showLabel />
                {user ? (
                  <Button variant="ghost" size="sm" className="flex-1 min-h-[44px]" onClick={handleSignOut}>Sign Out</Button>
                ) : (
                  <>
                    <Link to="/auth" className="flex-1">
                      <Button variant="outline" size="sm" className="w-full rounded-full min-h-[44px]">Login</Button>
                    </Link>
                    <Link to="/auth" className="flex-1">
                      <Button size="sm" className="w-full rounded-full min-h-[44px] bg-primary text-primary-foreground">Sign Up</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
