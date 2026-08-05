import React from "react";
import { Link } from "react-router-dom";
import { Button, Card } from "../components/ui";
import { t } from "../i18n";

interface FeatureCardProps {
  readonly title: string;
  readonly description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description }) => {
  return (
    <Card variant="feature" className="p-2xl">
      <h4 className="mb-sm">{title}</h4>
      <p className="font-body text-body-sm text-slate">{description}</p>
    </Card>
  );
};

export const Home: React.FC = () => {
  return (
    <>
      {/* Hero Section — warm sunset gradient */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-2xl py-hero text-center bg-gradient-to-br from-sunshine-300 via-sunshine-500 to-primary">
        <h1 className="text-hero font-display text-ink max-w-[800px]">
          {t.home.hero}
        </h1>
        <p className="mt-xl font-body text-subtitle text-ink-tint max-w-[600px]">
          {t.home.subtitle}
        </p>
        <div className="flex gap-lg mt-3xl">
          <Link to="/register">
            <Button variant="dark">{t.home.getStarted.toUpperCase()}</Button>
          </Link>
          <Link to="/login">
            <Button variant="secondary">{t.home.signIn.toUpperCase()}</Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="section px-2xl">
        <div className="max-w-[1280px] mx-auto">
          <p className="micro-label text-center mb-lg">{t.home.howItWorks}</p>
          <h2 className="text-center mb-section-sm">{t.home.threeSteps}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-xl">
            <FeatureCard
              title={t.home.request}
              description={t.home.requestDesc}
            />
            <FeatureCard
              title={t.home.accept}
              description={t.home.acceptDesc}
            />
            <FeatureCard
              title={t.home.deliver}
              description={t.home.deliverDesc}
            />
          </div>
        </div>
      </section>

      {/* CTA Band — cream */}
      <section className="py-section-lg px-2xl">
        <div className="card-cream max-w-[900px] mx-auto text-center p-section">
          <h2>{t.home.fleetManagement}</h2>
          <p className="mt-lg font-body text-subtitle text-slate max-w-[500px] mx-auto">
            {t.home.fleetDesc}
          </p>
          <Link to="/login" className="inline-block mt-3xl">
            <Button variant="dark">{t.home.adminPanel.toUpperCase()}</Button>
          </Link>
        </div>
      </section>
    </>
  );
};
