import { Navbar } from "@/components/marketing/navbar";
import { Hero } from "@/components/marketing/hero";
import { ProblemSection, SolutionSection } from "@/components/marketing/problem-solution";
import { AISection, ReceiptIntelligence } from "@/components/marketing/ai-section";
import { ComplianceReadinessSection } from "@/components/marketing/compliance-readiness";
import { InteractiveDemoCTA } from "@/components/marketing/interactive-demo-cta";
import { AfricanMarketSection, PricingSection, SecuritySection, Footer } from "@/components/marketing/misc-sections";
import { GoogleTechShowcase } from "@/components/marketing/google-tech-showcase";

export default function HomePage() {
  return (
    <main>
      <Navbar />
      <Hero />
      <ProblemSection />
      <SolutionSection />
      <AISection />
      <ReceiptIntelligence />
      <ComplianceReadinessSection />
      <AfricanMarketSection />
      <GoogleTechShowcase />
      <InteractiveDemoCTA />
      <PricingSection />
      <SecuritySection />
      <Footer />
    </main>
  );
}
