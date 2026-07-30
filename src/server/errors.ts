// Errores compartidos de la capa de servicio. Cruzar el límite de otro usuario (dueño distinto,
// reserva ajena) siempre se traduce a 404 en la UI/Server Action — nunca 403, que confirmaría que
// el recurso existe (blueprint.md §8).
export class NotFoundError extends Error {}
export class ForbiddenError extends Error {}
