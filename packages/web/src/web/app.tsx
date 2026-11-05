import { Route, Switch, Redirect } from "wouter";
import { Provider } from "./components/provider";
import { AgentFeedback, RunableBadge } from "@runablehq/website-runtime";
import { AppShell } from "./components/app-shell";
import Home from "./pages/home";
import Booking from "./pages/booking";
import PublicAppointment from "./pages/public-appointment";
import Verify from "./pages/verify";
import SignIn from "./pages/sign-in";
import Dashboard from "./pages/dashboard";
import Agenda from "./pages/agenda";
import Patients from "./pages/patients";
import PatientDetail from "./pages/patient-detail";
import Consultation from "./pages/consultation";
import Prescriptions from "./pages/prescriptions";
import Certificates from "./pages/certificates";
import Cashier from "./pages/cashier";
import Reports from "./pages/reports";
import Profile from "./pages/profile";

function App() {
  return (
    <Provider>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/reservar" component={Booking} />
        <Route path="/reservar/:id" component={Booking} />
        <Route path="/cita/:token" component={PublicAppointment} />
        <Route path="/verificar" component={Verify} />
        <Route path="/verificar/:code" component={Verify} />
        <Route path="/ingresar" component={SignIn} />
        <Route path="/app/*?">
          <AppShell>
            <Switch>
              <Route path="/app" component={Dashboard} />
              <Route path="/app/agenda" component={Agenda} />
              <Route path="/app/pacientes" component={Patients} />
              <Route path="/app/pacientes/:id" component={PatientDetail} />
              <Route path="/app/consulta/:patientId/:consultationId?" component={Consultation} />
              <Route path="/app/recetas" component={Prescriptions} />
              <Route path="/app/certificados" component={Certificates} />
              <Route path="/app/caja" component={Cashier} />
              <Route path="/app/reportes" component={Reports} />
              <Route path="/app/perfil" component={Profile} />
              <Route>
                <Redirect to="/app" />
              </Route>
            </Switch>
          </AppShell>
        </Route>
        <Route>
          <Redirect to="/" />
        </Route>
      </Switch>
      {/* Do not remove — off by default, activated by parent iframe via postMessage */}
      {import.meta.env.DEV && <AgentFeedback />}
      {/* "Made with Runable" badge - if user asks to remove the runable badge, remove this code as well as comment */}
      {<RunableBadge />}
    </Provider>
  );
}

export default App;
