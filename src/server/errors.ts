// Errores compartidos de la capa de servicio. Cruzar el límite de otro usuario (dueño distinto,
// reserva ajena) siempre se traduce a 404 en la UI/Server Action — nunca 403, que confirmaría que
// el recurso existe (blueprint.md §8).
export class NotFoundError extends Error {}
export class ForbiddenError extends Error {}

// Límite de tasa superado. A diferencia de los dos de arriba, este SÍ se le dice al usuario tal
// cual: no revela nada que no supiera (que él mismo está pidiendo demasiado) y sin el mensaje la
// acción parecería simplemente rota (auditoría del 2026-08-08).
export class TooManyRequestsError extends Error {}
