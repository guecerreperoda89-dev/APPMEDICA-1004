# SINCRONIA — Design

Plataforma de gestión clínica para SINCRONIA · Cardiología Integral (Ecuador). Web (médicos + reserva pública) y app móvil (médicos). Dirección visual: minimalismo suizo editorial — tipografía grande y ligera, mucho blanco, pills redondeadas, botones tinta oscura, un hero con degradado iridiscente frío (azules) con un destello carmín. Clínico, preciso, calmado.

## Brand & Colors

| Token | Light | Use |
|-------|-------|-----|
| navy (primary) | #1F3263 | Marca, títulos, estados activos |
| crimson (accent) | #A51C30 | Acento puntual: alertas, alergias, flecha del logo, KPIs clave |
| ink | #151B2E | Botones primarios (pill negra), texto principal |
| background | #FFFFFF | Fondo |
| surface | #F4F5F8 | Tarjetas suaves, inputs |
| mutedForeground | #6B7280 | Texto secundario |
| border | #E6E8EF | Hairlines |
| success | #2F7D5B | Confirmada / pagado |
| warning | #B7791F | No asistió / pendiente |

Iridiscente hero: radial meshes de #C9D6F5, #E8EEFF, #F7E3E8, #DCE9F7 sobre blanco, con blur.

## Typography

- Display: **Outfit** 200–400, tracking negativo (-0.04em) en tamaños grandes (56–140px).
- Body/UI: **Poppins** 400/500/600, 14–15px base, line-height 1.6.
- Etiquetas: Poppins 500 11px uppercase tracking 0.12em.
- Mobile: System font con pesos ligeros en títulos grandes.

## Components

- Pills: rounded-full, borde hairline, fondo blanco/translúcido, 12–13px.
- Botón primario: pill ink #151B2E con flecha ↗ ; secundario: pill borde.
- Cards: radius 20px, borde hairline, sin sombras pesadas.
- Tablas: densas, filas con hairline, hover surface.
- Estados de cita: punto de color + label.

## Pages (web)

- `/` landing pública (marca + médicos + CTA reservar)
- `/reservar` y `/reservar/:id` reserva online
- `/cita/:token` ver/confirmar/cancelar cita (paciente)
- `/verificar/:code` verificación de documentos
- `/ingresar` login/registro médico
- `/app` panel · `/app/agenda` · `/app/pacientes` · `/app/pacientes/:id` ficha · `/app/consulta/nueva` · `/app/recetas` · `/app/certificados` · `/app/caja` · `/app/reportes` · `/app/perfil`

## Mobile (médico)

Tabs: Hoy · Agenda · Pacientes · Perfil. Pantallas: ficha de paciente, nueva consulta rápida, nueva receta, nuevo certificado (PDF compartible).
