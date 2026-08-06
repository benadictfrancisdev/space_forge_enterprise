import { MessageSquare, Mic, Brain, History, BarChart3, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const capabilities = [
  { icon: MessageSquare, title: "Natural Language Queries", desc: "Ask in plain English — 'What's my best-selling SKU this month?' — and get instant answers with charts." },
  { icon: Mic, title: "Voice Input", desc: "Speak your questions. SpaceBot transcribes, understands, and responds with actionable data insights." },
  { icon: History, title: "Conversation Memory", desc: "SpaceBot remembers context across questions. Say 'Compare that with last quarter' — it knows what 'that' means." },
  { icon: Brain, title: "Smart Follow-Ups", desc: "After every answer, SpaceBot suggests follow-up questions you should be asking but didn't think of." },
  { icon: BarChart3, title: "Inline Visualizations", desc: "Charts, tables, and KPIs generated right inside the chat. No need to switch tabs or build dashboards." },
  { icon: Search, title: "Deep Data Search", desc: "SpaceBot digs through millions of rows to find exactly what you need — faster than any SQL query." },
];

const SpaceBotSection = () => {
  return (
    <section className="py-24 px-4 relative overflow-hidden bg-muted/30">
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Content */}
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Voice + Conversational Agent</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Meet{" "}
              <span className="text-primary">SpaceBot</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              A conversational AI assistant embedded in SpaceForge. Ask questions in chat or voice: 
              "What's my best-selling SKU this month?" or "Compare last two quarters." 
              SpaceBot maintains conversation context across questions.
            </p>

            {/* Chat preview mockup */}
            <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-4 mb-8 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-muted-foreground">You</span>
                </div>
                <div className="bg-muted rounded-xl rounded-tl-sm px-4 py-2.5">
                  <p className="text-sm text-foreground">What's my best-selling SKU this month?</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Brain className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="bg-primary/5 border border-primary/10 rounded-xl rounded-tl-sm px-4 py-2.5">
                  <p className="text-sm text-foreground">
                    SKU-4821 (Wireless Headphones) leads with 2,340 units sold — up 18% from last month. 
                    Shall I compare this with Q3 performance?
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-muted-foreground">You</span>
                </div>
                <div className="bg-muted rounded-xl rounded-tl-sm px-4 py-2.5">
                  <p className="text-sm text-foreground">Yes, compare last two quarters.</p>
                </div>
              </div>
            </div>

            <Link to="/data-agent">
              <Button size="lg" className="rounded-full px-8 bg-primary hover:bg-primary/90 text-primary-foreground">
                <MessageSquare className="w-5 h-5 mr-2" />
                Try SpaceBot
              </Button>
            </Link>
          </div>

          {/* Right: Feature grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {capabilities.map((cap, i) => (
              <div
                key={i}
                className="group p-5 rounded-2xl border border-border bg-card/50 backdrop-blur-sm hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                  <cap.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1">{cap.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{cap.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SpaceBotSection;
