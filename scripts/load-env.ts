import { config } from "dotenv";

// Módulo de solo efecto secundario. Un import (aunque sea el primero en el archivo) NO se
// ejecuta antes que otros imports del mismo archivo si esos otros imports importan algo que lee
// process.env en su propio nivel superior — TODOS los imports estáticos se resuelven en la fase
// de "hoisting" de ES modules, antes de que corra CUALQUIER statement normal del archivo
// (verificado en vivo: una llamada de función `config(...)` escrita entre dos `import`, incluso
// como la línea 1 en términos de statements normales, corre DESPUÉS de que todos los imports —
// incluyendo los transitivos como @/lib/env — ya se evaluaron y ya lanzaron su error).
//
// La única forma correcta es que la carga de env sea ELLA MISMA un import, declarado antes que
// cualquier otro en el archivo que lo usa — los imports hermanos de un mismo archivo sí se
// evalúan en el orden en que están escritos.
config({ path: ".env.local" });
