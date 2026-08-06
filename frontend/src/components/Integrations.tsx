import { memo } from "react";

const integrations = ["Excel", "CSV", "Google Sheets", "PDF", "JSON", "Tally Prime", "Zoho Books", "Vyapar", "Razorpay", "Webhooks"];

const Integrations = () => {
  return (
    <section id="integrations" className="py-24 md:py-28 relative border-t border-border">
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="grid md:grid-cols-12 gap-10 items-start">
          <div className="md:col-span-4">
            <p className="text-[10px] font-medium tracking-[0.24em] uppercase text-muted-foreground mb-4">
              Works with what you have
            </p>
            <h2 className="text-2xl md:text-3xl font-medium text-foreground tracking-[-0.02em] leading-tight">
              Drop in any file
              <br />
              <span className="italic font-light text-foreground/55">your business already uses.</span>
            </h2>
          </div>
          <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-5 gap-px bg-border border border-border rounded-xl overflow-hidden">
            {integrations.map((name) => (
              <div
                key={name}
                className="bg-card px-4 py-6 text-center text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default memo(Integrations);
