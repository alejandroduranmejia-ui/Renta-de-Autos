ALTER TABLE "vehicles" ADD COLUMN "zone" text;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "pickup_notes" text;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "vehicle_type" text;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "transmission" text;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "fuel_type" text;--> statement-breakpoint
CREATE INDEX "idx_vehicles_zone" ON "vehicles" USING btree ("zone") WHERE "vehicles"."status" = 'active';--> statement-breakpoint
CREATE INDEX "idx_vehicles_daily_price" ON "vehicles" USING btree ("daily_price_cents") WHERE "vehicles"."status" = 'active';--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "chk_vehicle_type" CHECK ("vehicles"."vehicle_type" is null or "vehicles"."vehicle_type" in ('sedan','suv','hatchback','pickup','van','camioneta','deportivo'));--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "chk_vehicle_transmission" CHECK ("vehicles"."transmission" is null or "vehicles"."transmission" in ('automatica','mecanica'));--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "chk_vehicle_fuel_type" CHECK ("vehicles"."fuel_type" is null or "vehicles"."fuel_type" in ('gasolina','diesel','hibrido','electrico','gas'));