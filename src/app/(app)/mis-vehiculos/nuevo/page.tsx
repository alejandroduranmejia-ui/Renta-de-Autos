import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VehicleDiscoveryFields } from "@/components/vehicles/vehicle-fields";
import { createVehicle } from "@/server/vehicles/mutations";

export default function NuevoVehiculoPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">
        Publicar vehículo
      </h1>
      <form action={createVehicle} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="make">Marca</Label>
          <Input id="make" name="make" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="model">Modelo</Label>
          <Input id="model" name="model" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="year">Año</Label>
          <Input id="year" type="number" name="year" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="plate">Placa</Label>
          <Input id="plate" name="plate" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="color">Color</Label>
          <Input id="color" name="color" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="seats">Puestos</Label>
          <Input id="seats" type="number" name="seats" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dailyPriceCents">Precio por día (COP)</Label>
          <Input
            id="dailyPriceCents"
            type="number"
            name="dailyPriceCents"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="description">Descripción</Label>
          <textarea
            id="description"
            name="description"
            className="min-h-24 rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
          />
        </div>

        <VehicleDiscoveryFields />
        <Button type="submit" className="mt-2 h-10">
          Crear
        </Button>
      </form>
    </div>
  );
}
