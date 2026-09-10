import { Button, Card } from "../../../components/ui";

type CreateErrandSuccessProps = {
  readonly pin: string;
  readonly onViewErrands: () => void;
};

export const CreateErrandSuccess = ({
  pin,
  onViewErrands,
}: CreateErrandSuccessProps) => (
  <div className="section-mobile md:section px-lg">
    <div className="max-w-[500px] mx-auto">
      <Card className="p-2xl text-center">
        <div className="mb-xl">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success-light mb-md">
            <span className="text-3xl">✓</span>
          </div>
          <h2 className="text-heading-2 text-ink mb-sm">
            ¡Favor creado exitosamente!
          </h2>
          <p className="font-body text-body-md text-slate">
            Tu solicitud ha sido publicada. Un rider la tomará pronto.
          </p>
        </div>

        <div className="p-lg bg-primary-50 rounded-lg border-2 border-primary-300 mb-xl">
          <p className="caption text-primary-700 mb-xs">
            🔐 PIN de verificación
          </p>
          <p className="text-heading-1 text-primary font-bold tracking-widest">
            {pin}
          </p>
          <p className="text-xs text-muted mt-sm">
            Comparte este código con la persona que recibirá el paquete
          </p>
        </div>

        <div className="p-md bg-cream rounded-md mb-xl text-left">
          <p className="caption text-ink font-semibold mb-xs">
            ¿Para qué sirve el PIN?
          </p>
          <ul className="text-xs text-slate space-y-xs">
            <li>• El rider te pedirá el PIN al recoger el paquete</li>
            <li>
              • El destinatario debe conocer el PIN para recibir el paquete
            </li>
            <li>• Comparte el PIN solo con personas de confianza</li>
          </ul>
        </div>

        <Button onClick={onViewErrands} className="w-full">
          Ver mis favores
        </Button>
      </Card>
    </div>
  </div>
);
