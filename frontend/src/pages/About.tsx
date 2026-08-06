import Navbar from "@/components/Navbar";
import SpaceBackground from "@/components/SpaceBackground";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

const About = () => (
  <div className="min-h-screen bg-background relative">
    <SEO
      title="About SpaceForge AI — Our Mission to Democratize Data Intelligence"
      description="SpaceForge AI is an AI-powered analytics platform built to make advanced data intelligence accessible, instant, and actionable for every team — from startups to enterprises."
    />
    <SpaceBackground />
    <Navbar />
    <main className="relative z-10 pt-24 pb-16">
      <div className="container mx-auto px-6 max-w-3xl">
        <h1 className="text-4xl font-extrabold text-foreground mb-6">About SpaceForge</h1>
        <p className="text-muted-foreground leading-relaxed mb-6">
          SpaceForge is an AI-powered data analytics platform built for teams that demand real-time insights. 
          We believe every organization — from startups to enterprises — deserves access to advanced analytics 
          without the complexity of traditional data infrastructure.
        </p>
        <h2 className="text-2xl font-bold text-foreground mb-4">Our Mission</h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          To democratize data intelligence by making advanced analytics accessible, instant, and actionable 
          for every team, regardless of technical expertise.
        </p>
        <h2 className="text-2xl font-bold text-foreground mb-4">Founder & CEO</h2>
        <p className="text-muted-foreground leading-relaxed mb-6">
          SpaceForge was founded, designed and developed by{" "}
          <a href="/founder" className="text-foreground font-semibold hover:underline" rel="author">
            Benadict Francis
          </a>
          {" "}— an AI engineer and technology entrepreneur building intelligent software that helps
          businesses transform data into better decisions.{" "}
          <a href="/founder" className="text-primary hover:underline">Read more about the founder →</a>
        </p>
        <h2 className="text-2xl font-bold text-foreground mb-4">Contact</h2>
        <p className="text-muted-foreground leading-relaxed">
          Reach out at{" "}
          <a href="mailto:hello@spaceforge.in" className="text-primary hover:underline">hello@spaceforge.in</a>
          {" "}or connect on{" "}
          <a href="https://www.linkedin.com/in/benadict-francis-5959a7313" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">LinkedIn</a>
          {" "}and{" "}
          <a href="https://github.com/benadictfrancisdev" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">GitHub</a>.
        </p>
      </div>
    </main>
    <Footer />
  </div>
);

export default About;
