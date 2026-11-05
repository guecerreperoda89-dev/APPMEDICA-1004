// Entry point referenced by index.html — composition only.
// El retorno del login gestionado (handleRedirect) se completa en lib/auth.ts (authReady)
// y el Provider espera esa promesa antes de montar las rutas.
import "./lib/auth";
import "./__main";
