import { Button, Card } from "../../../components/ui";

type CreateErrandSuccessProps = {
  readonly pin: string;
  readonly onViewErrands: () => void;
};

export const CreateErrandSuccess = ({
  pin,
  onViewErrands,
}: CreateErrandSuccessProps) => (
  <div className="section-mobile md:section px-lg pt-xs">
    <div className="max-w-[500px] mx-auto">
      <Card className="p-xl text-center">
        <div className="mb-md">
          <h2 className="text-heading-5 text-ink ">
            ¡Favor creado exitosamente!
          </h2>
          <p className="font-body text-body-sm text-slate">
            Tu solicitud ha sido publicada. Un rider la tomará pronto.
          </p>
        </div>

        <div className="p-md bg-primary-50 rounded-lg border-2 border-primary-300 mb-md">
          <div className="flex flex-row gap-xs justify-center items-center">
            <p className="caption text-primary-700">🔐 PIN</p>
            <p className="text-heading-4 text-primary font-bold tracking-widest">
              {pin}
            </p>
          </div>
          <p className="text-body-sm text-muted">
            Comparte este código con la persona que recibirá el paquete
          </p>
        </div>

        <div className="p-md bg-cream rounded-md mb-md text-left">
          <p className="caption text-ink font-semibold mb-xs">
            ¿Para qué sirve el PIN?
          </p>
          <ul className="text-body-sm text-slate space-y-xs">
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
