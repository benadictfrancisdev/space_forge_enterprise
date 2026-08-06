import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { backend } from "@/platform";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Eye, ArrowRight, Sparkles, Loader2 } from "lucide-react";
import SEO from "@/components/SEO";

interface LeaderboardEntry {
  share_token: string;
  title: string;
  description?: string | null;
  dataset_name?: string | null;
  view_count: number;
  created_at: string;
  last_viewed_at?: string | null;
}

const medal = (i: number) => {
  if (i === 0) return "ðŸ¥‡";
  if (i === 1) return "ðŸ¥ˆ";
  if (i === 2) return "ðŸ¥‰";
  return `#${i + 1}`;
};

const Leaderboard = () => {
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await backend.functions.invoke("share-dashboard", {
        body: { action: "leaderboard", limit: 25 },
      });
      if (data?.success && Array.isArray(data.data)) setRows(data.data);
      setLoading(false);
    })();
  }, []);

  const totalViews = rows.reduce((s, r) => s + (r.view_count || 0), 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="Most Shared Dashboards Â· SpaceForge Leaderboard"
        description="The top public dashboards built and shared on SpaceForge â€” ranked by real human views. See what others are analyzing and build your own free."
      />
      <Navbar />
      <main className="container mx-auto px-4 py-10 max-w-4xl">
        <header className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
            <Trophy className="w-3.5 h-3.5" />
            Public leaderboard
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Most Shared Dashboards
          </h1>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            The top public dashboards built on SpaceForge, ranked by real human views.
            Bot traffic is filtered out.
          </p>
          {!loading && rows.length > 0 && (
            <p className="text-xs text-muted-foreground mt-3">
              {totalViews.toLocaleString()} total verified views across {rows.length} dashboards
            </p>
          )}
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading leaderboardâ€¦
          </div>
        ) : rows.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center">
              <Sparkles className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No public dashboards have been shared yet. Be the first.
              </p>
              <Button asChild className="mt-4">
                <Link to="/data-agent">
                  Build & share a dashboard <ArrowRight className="w-4 h-4 ml-1.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {rows.map((r, i) => (
              <Link
                key={r.share_token}
                to={`/shared/${r.share_token}`}
                className="block group"
              >
                <Card className="transition-colors hover:border-primary/50">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-10 text-center text-lg font-bold tabular-nums shrink-0">
                      {medal(i)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                        {r.title}
                      </h2>
                      {r.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {r.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {r.dataset_name && (
                          <Badge variant="outline" className="text-[10px]">{r.dataset_name}</Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          Shared {new Date(r.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 text-sm font-semibold tabular-nums">
                        <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                        {r.view_count.toLocaleString()}
                      </div>
                      <p className="text-[10px] text-muted-foreground">views</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        <Card className="mt-10 border-primary/30 bg-gradient-to-r from-primary/10 to-transparent">
          <CardHeader>
            <CardTitle className="text-base">Want to land on this leaderboard?</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Upload a spreadsheet, generate an executive dashboard, and share the public link.
            </p>
            <Button asChild>
              <Link to="/data-agent">
                Try free <ArrowRight className="w-4 h-4 ml-1.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default Leaderboard;
