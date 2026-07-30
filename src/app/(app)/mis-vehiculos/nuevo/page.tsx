import { createVehicle } from "@/server/vehicles/mutations";

export default function NuevoVehiculoPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">
        Publicar vehículo
      </h1>
      <form action={createVehicle} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Marca
          <input
            name="make"
            required
            className="rounded-lg border border-input bg-transparent px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Modelo
          <input
            name="model"
            required
            className="rounded-lg border border-input bg-transparent px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Año
          <input
            type="number"
            name="year"
            required
            className="rounded-lg border border-input bg-transparent px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Placa
          <input
            name="plate"
            required
            className="rounded-lg border border-input bg-transparent px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Color
          <input
            name="color"
            required
            className="rounded-lg border border-input bg-transparent px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Puestos
          <input
            type="number"
            name="seats"
            required
            className="rounded-lg border border-input bg-transparent px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Precio por día (COP)
          <input
            type="number"
            name="dailyPriceCents"
            required
            className="rounded-lg border border-input bg-transparent px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Descripción
          <textarea
            name="description"
            className="rounded-lg border border-input bg-transparent px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="mt-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Crear
        </button>
      </form>
    </div>
  );
}
