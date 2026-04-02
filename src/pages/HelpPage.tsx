import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, FolderKanban, ClipboardList, CalendarDays,
  FileText, FileStack, FolderOpen, ShieldCheck, Receipt, TrendingUp,
  Megaphone, Clapperboard, Search, ChevronDown, BookOpen, Scissors, Camera,
} from "lucide-react";

type Step = string;
type Section = {
  id: string;
  icon: React.ElementType;
  color: string;
  title: string;
  subtitle: string;
  description: string;
  steps: Step[];
  tips?: string[];
};

const SECTIONS: Section[] = [
  {
    id: "dashboard",
    icon: LayoutDashboard,
    color: "text-primary",
    title: "Today — Dashboard",
    subtitle: "Tu centro de comando diario",
    description: "La pantalla principal que ves al entrar. Muestra un resumen de todo lo que está pasando hoy en la agencia: tareas del día, campañas activas, ediciones pendientes y métricas clave.",
    steps: [
      "Al abrir el CRM aterrizas aquí automáticamente.",
      "Las 4 tarjetas arriba muestran: filmaciones de hoy, ediciones por revisar, aprobaciones pendientes y leads nuevos. Haz clic en cualquiera para ir directo a esa sección.",
      "En 'Today's Focus' ves las tareas con fecha de hoy. Si hay tareas vencidas aparece una alerta roja con el conteo.",
      "En 'Active Campaigns' ves el progreso de cada campaña con una barra que va desde Discovery hasta Complete.",
      "El panel derecho 'Overview' muestra todos los números clave — clientes activos, campañas totales, aprobaciones pendientes. Cada fila es clickeable.",
    ],
    tips: [
      "Si ves 'All clear for today!' significa que no tienes tareas vencidas para hoy — es un buen día.",
      "La barra de progreso de campañas tiene 9 etapas: Discovery → Pre-production → Filming → Editing → Review → Revisions → Posting → Reporting → Complete.",
    ],
  },
  {
    id: "clients",
    icon: Users,
    color: "text-primary",
    title: "Clients — Clientes",
    subtitle: "Gestiona todos tus clientes",
    description: "Aquí viven todos los clientes de la agencia. Puedes crear, editar y ver el detalle de cada uno, incluyendo qué servicios tienen contratados.",
    steps: [
      "Haz clic en 'New Client' (botón arriba a la derecha) para agregar un cliente nuevo.",
      "Llena el nombre, email (opcional), tipo de cliente (Business / Influencer / Creator) y los servicios habilitados (Film, Edit, Post, Report).",
      "El tipo de cliente determina el checklist de onboarding que se genera automáticamente.",
      "Haz clic en una tarjeta de cliente para ver su detalle: servicios habilitados y checklist.",
      "En el detalle aparece el botón 'Edit' (arriba a la derecha) para modificar nombre, email, tipo o servicios.",
      "El menú (⋮) en cada tarjeta tiene opciones: Edit Client, Start Onboarding y Delete.",
    ],
    tips: [
      "Usa el buscador arriba para encontrar clientes por nombre o email.",
      "Empieza siempre creando el cliente antes de crear sus campañas.",
    ],
  },
  {
    id: "campaigns",
    icon: FolderKanban,
    color: "text-accent",
    title: "Campaigns — Campañas",
    subtitle: "El corazón del trabajo de producción",
    description: "Cada proyecto de contenido que haces para un cliente es una campaña. Aquí creas, organizas y navegas todas las campañas de la agencia.",
    steps: [
      "Clic en 'New Campaign' para crear una campaña.",
      "Elige el cliente al que pertenece, ponle un nombre y selecciona un template (Film+Edit, Film+Edit+Post, etc.).",
      "El template define qué tareas se crean automáticamente para esa campaña.",
      "Haz clic en una campaña para entrar a su página de detalle, donde ves todas las tareas, activos y aprobaciones de esa campaña específica.",
      "En el detalle de la campaña puedes avanzar la etapa (stage) del proyecto y agregar tareas manualmente.",
    ],
    tips: [
      "Usa el buscador para filtrar por nombre de campaña o nombre de cliente.",
      "El color del badge indica la etapa actual de la campaña.",
    ],
  },
  {
    id: "tasks",
    icon: ClipboardList,
    color: "text-[hsl(280_60%_55%)]",
    title: "Tasks — Tareas",
    subtitle: "Vista Kanban y lista de todas las tareas",
    description: "Vista global de todas las tareas de todas las campañas. Puedes verlas en modo Kanban (tablero) o en lista, filtrar por campaña o estado, y mover tareas entre columnas con drag & drop.",
    steps: [
      "Al entrar verás el tablero Kanban con 4 columnas: To Do, In Progress, Review y Complete.",
      "Arrastra y suelta cualquier tarjeta de una columna a otra para cambiar su estado.",
      "Usa el botón 'List' (arriba a la derecha) para cambiar a vista de lista si prefieres.",
      "Filtra por campaña usando el selector 'All campaigns', o por estado con 'All statuses'.",
      "El buscador filtra tareas por nombre en tiempo real.",
    ],
    tips: [
      "Las tareas en rojo en el Kanban tienen fecha vencida.",
      "Las tareas se crean desde la página de detalle de cada campaña, no directamente aquí.",
    ],
  },
  {
    id: "calendar",
    icon: CalendarDays,
    color: "text-pink-400",
    title: "Calendar — Calendario de Contenido",
    subtitle: "Planifica qué publicar y cuándo",
    description: "Calendario editorial mensual para planificar las publicaciones de todos los clientes en todas las plataformas sociales. Cada día del mes muestra qué contenido está programado.",
    steps: [
      "Navega entre meses con las flechas ← → arriba del calendario.",
      "Haz clic en cualquier día vacío para programar una publicación en esa fecha.",
      "En el formulario elige: cliente, campaña (opcional), plataforma (Instagram, TikTok, YouTube, etc.), tipo de contenido (Reel, Post, Story, Short, etc.) y estado.",
      "Escribe el caption, hashtags y notas internas si los tienes listos.",
      "Haz clic en un post existente en el calendario para editarlo o eliminarlo.",
      "Los colores en el calendario identifican cada plataforma de un vistazo.",
    ],
    tips: [
      "Los estados son: Draft (gris), Scheduled (azul), Posted (verde), Cancelled (rojo).",
      "Las estadísticas arriba del calendario muestran el resumen del mes actual.",
    ],
  },
  {
    id: "scripts",
    icon: FileText,
    color: "text-warning",
    title: "Scripts — Guiones y Copy",
    subtitle: "Gestiona los guiones de tus videos",
    description: "Sección para escribir, revisar y aprobar los guiones de los videos antes de filmar. Cada script va vinculado a una campaña y lleva control de versiones.",
    steps: [
      "Clic en 'New Script' para crear un guión.",
      "Ponle un título, elige la campaña a la que pertenece y escribe el contenido completo del guión.",
      "El estado del script puede ser: Draft, Review, Approved o Archived.",
      "Haz clic en un script para abrirlo y editarlo directamente.",
      "Cada vez que guardas cambios al contenido, el número de versión sube automáticamente (v1, v2, v3...).",
      "El botón 'Duplicate' crea una copia del script para hacer variaciones sin perder el original.",
    ],
    tips: [
      "Usa el estado 'Review' cuando envíes el guión al cliente o director para feedback.",
      "Cambia a 'Approved' cuando el guión esté listo para filmar.",
    ],
  },
  {
    id: "callsheets",
    icon: FileStack,
    color: "text-[hsl(200_70%_50%)]",
    title: "Call Sheets — Órdenes de Filmación",
    subtitle: "Organiza los días de rodaje",
    description: "Crea call sheets profesionales para cada día de filmación. Incluyen el equipo que va a rodar, los horarios de llamado y el itinerario del día.",
    steps: [
      "Clic en 'New Call Sheet' para crear una orden de filmación.",
      "Llena el título, campaña, fecha del rodaje, locación, hora de llamado (call time) y hora de cierre (wrap time).",
      "En la sección 'Crew' agrega cada persona del equipo con su nombre, rol, hora de llamado individual y teléfono.",
      "En la sección 'Schedule' agrega el itinerario del día con hora, actividad y notas para cada bloque.",
      "Los call sheets se muestran con colores según urgencia: verde = hoy, amarillo = mañana, gris = pasado.",
      "Haz clic en uno para ver el detalle completo o editarlo.",
    ],
    tips: [
      "El botón 'Print' abre el call sheet en una ventana nueva lista para imprimir o guardar como PDF.",
      "Puedes filtrar entre 'Upcoming' y 'Past' con el toggle arriba.",
    ],
  },
  {
    id: "assets",
    icon: FolderOpen,
    color: "text-accent",
    title: "Assets — Archivos y Recursos",
    subtitle: "Almacén central de todos los archivos",
    description: "Repositorio centralizado para subir y organizar videos, imágenes y otros archivos de las campañas. Todos los archivos quedan vinculados a su campaña correspondiente.",
    steps: [
      "Clic en 'Upload Asset' para subir un archivo.",
      "Selecciona el archivo desde tu dispositivo (o arrastra y suéltalo), elige la campaña a la que pertenece.",
      "Las imágenes y videos muestran preview directo en la grilla.",
      "Haz clic en un archivo para verlo en grande o descargarlo.",
      "Filtra por campaña o tipo de archivo usando los selectores arriba.",
      "El menú de cada archivo tiene la opción de eliminarlo.",
    ],
    tips: [
      "Los editores también tienen su propia sección de assets en /editor/assets con las mismas funciones.",
    ],
  },
  {
    id: "approvals",
    icon: ShieldCheck,
    color: "text-warning",
    title: "Approvals — Aprobaciones",
    subtitle: "Revisa y aprueba el contenido editado",
    description: "Centro de revisión y aprobación de entregas. Cuando un editor termina un video, va aquí para que lo revises antes de enviarlo al cliente.",
    steps: [
      "La pestaña 'Pending' muestra todo lo que está esperando revisión.",
      "Haz clic en una aprobación para abrirla y ver el preview del archivo.",
      "Escribe feedback en el campo de texto si tienes comentarios.",
      "Presiona 'Approve' si el contenido está listo, o 'Request Revision' para pedir cambios.",
      "Cada vez que pides una revisión se registra como una ronda (Round 1, Round 2...) con el feedback guardado.",
      "La pestaña 'Processed' muestra el historial de aprobaciones ya gestionadas.",
    ],
    tips: [
      "El número de aprobaciones pendientes aparece en el Dashboard y en la barra de notificaciones.",
      "El historial de rondas de revisión te ayuda a llevar el control de cuántas vueltas lleva un video.",
    ],
  },
  {
    id: "invoices",
    icon: Receipt,
    color: "text-green-400",
    title: "Invoices — Facturas",
    subtitle: "Crea y gestiona la facturación",
    description: "Módulo completo de facturación para crear facturas profesionales por cliente, agregar líneas de servicio, calcular impuestos y darles seguimiento de pago.",
    steps: [
      "Clic en 'New Invoice' para crear una factura.",
      "Selecciona el cliente y campaña (opcional), pon la fecha de vencimiento.",
      "Agrega líneas de ítem con descripción, cantidad y precio unitario — el total se calcula automáticamente.",
      "Agrega el porcentaje de impuesto (tax %) si aplica.",
      "La factura se crea en estado 'Draft'. Cuando la envíes al cliente cámbiala a 'Sent'.",
      "Haz clic en cualquier factura para ver su detalle. Usa el botón 'Edit Invoice' para modificar cualquier campo.",
      "Cuando el cliente pague, haz clic en 'Mark as Paid' para registrarlo.",
      "El botón 'Print / PDF' abre la factura en formato profesional lista para imprimir o guardar como PDF.",
    ],
    tips: [
      "Los estados son: Draft → Sent → Paid (o Overdue si se venció).",
      "Las estadísticas arriba muestran el total facturado, lo cobrado y lo pendiente.",
    ],
  },
  {
    id: "leads",
    icon: TrendingUp,
    color: "text-success",
    title: "Leads — Prospectos",
    subtitle: "Pipeline de clientes potenciales",
    description: "Gestiona todos los prospectos que llegan a la agencia, ya sea desde el website, redes sociales o referidos. Lleva el seguimiento de en qué etapa está cada uno.",
    steps: [
      "Los leads del formulario del website llegan aquí automáticamente.",
      "Haz clic en un lead para ver su información completa: nombre, email, servicio de interés y mensaje.",
      "Cambia el estado del lead según el avance: New → Contacted → Converted → Closed.",
      "Agrega notas internas para recordar detalles de conversaciones o llamadas.",
      "El botón de email abre tu cliente de correo con el email del lead pre-cargado.",
      "Cuando conviertes un lead, crea el cliente desde la sección Clients.",
    ],
    tips: [
      "Filtra por estado usando las pestañas arriba (All, New, Contacted, Converted, Closed).",
      "El contador de 'New Leads' en el Dashboard se actualiza en tiempo real.",
    ],
  },
  {
    id: "ads",
    icon: Megaphone,
    color: "text-orange-400",
    title: "Ads — Plataformas de Publicidad",
    subtitle: "Registra las cuentas de ads que usas",
    description: "Directorio de todas las plataformas de publicidad digital: Meta Ads, Google Ads, TikTok Ads, YouTube Ads, streaming y más. Registra qué plataformas estás usando y sus datos de cuenta.",
    steps: [
      "Las plataformas están organizadas en 4 categorías: Social, Search, Streaming/CTV y Programmatic.",
      "Haz clic en cualquier tarjeta de plataforma para configurarla.",
      "Elige el estado: Activo (lo usas), Planeado (lo vas a usar), Pausado o No aplica.",
      "Agrega el nombre de la cuenta, Account ID/Pixel ID, presupuesto mensual y notas.",
      "El botón 'Ads Manager →' abre directamente la plataforma en una nueva pestaña.",
      "Las tarjetas activas se destacan con un borde de color.",
    ],
    tips: [
      "El resumen arriba muestra cuántas plataformas tienes activas y el presupuesto mensual total.",
    ],
  },
  {
    id: "templates",
    icon: Clapperboard,
    color: "text-muted-foreground",
    title: "Templates — Plantillas",
    subtitle: "Plantillas de campaña reutilizables",
    description: "Vista de las plantillas de campaña disponibles. Cada template define qué tipo de tareas se generan automáticamente cuando creas una campaña nueva.",
    steps: [
      "Aquí ves todos los templates disponibles: Film+Edit, Film+Edit+Post, Full Service, etc.",
      "Cada template muestra las tareas que incluye y para qué tipo de cliente aplica.",
      "Los templates se seleccionan al momento de crear una campaña nueva — no se configuran aquí directamente.",
      "Usa esta sección como referencia para saber qué incluye cada paquete antes de asignarlo.",
    ],
    tips: [
      "Los templates están predefinidos según los servicios de Thrive Agency.",
    ],
  },
];

const EDITOR_SECTIONS = [
  {
    id: "editor",
    icon: Scissors,
    color: "text-[hsl(280_60%_55%)]",
    title: "My Tasks (Editor)",
    subtitle: "Tus tareas asignadas de edición",
    description: "Vista personalizada para editores que muestra únicamente las tareas que tienes asignadas. Desde aquí puedes actualizar el estado de tus ediciones y subir los archivos terminados.",
    steps: [
      "Al entrar como editor, ves directamente tus tareas pendientes.",
      "Haz clic en una tarea para ver los detalles: campaña, cliente, fecha de entrega.",
      "Actualiza el estado de 'In Progress' a 'Review' cuando termines para que el dueño lo revise.",
      "Sube el archivo editado directamente desde la tarea para que quede vinculado.",
    ],
  },
  {
    id: "videographer",
    icon: Camera,
    color: "text-[hsl(200_70%_50%)]",
    title: "My Tasks (Videographer)",
    subtitle: "Tus tareas de filmación",
    description: "Vista para videógrafos que muestra las filmaciones y tareas asignadas. Puedes ver los shot lists de cada producción y marcar cuando termines.",
    steps: [
      "Al entrar como videógrafo, ves tus filmaciones y tareas asignadas.",
      "Haz clic en 'Shot Lists' en la barra lateral para ver los detalles de cada toma.",
      "Marca las tomas como completadas a medida que avanza el rodaje.",
      "Actualiza el estado de la tarea cuando termines la filmación.",
    ],
  },
];

function SectionCard({ section }: { section: Section }) {
  const [open, setOpen] = useState(false);
  const Icon = section.icon;

  return (
    <Card
      id={section.id}
      className={cn("luxury-card overflow-hidden transition-all", open && "border-primary/30")}
    >
      <button
        className="w-full text-left p-5 flex items-start gap-4"
        onClick={() => setOpen(o => !o)}
      >
        <div className={cn("w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center flex-shrink-0 mt-0.5")}>
          <Icon className={cn("h-5 w-5", section.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-display font-semibold text-base">{section.title}</h3>
              <p className="text-sm text-muted-foreground">{section.subtitle}</p>
            </div>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform", open && "rotate-180")} />
          </div>
          {!open && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-1">{section.description}</p>
          )}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-5 border-t border-border pt-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{section.description}</p>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Cómo usarlo</p>
            <ol className="space-y-2">
              {section.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-muted-foreground leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {section.tips && section.tips.length > 0 && (
            <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">💡 Tips</p>
              {section.tips.map((tip, i) => (
                <p key={i} className="text-sm text-muted-foreground leading-relaxed">• {tip}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default function HelpPage() {
  const [query, setQuery] = useState("");

  const filtered = SECTIONS.filter(s =>
    !query ||
    s.title.toLowerCase().includes(query.toLowerCase()) ||
    s.subtitle.toLowerCase().includes(query.toLowerCase()) ||
    s.description.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Manual de Usuario</h1>
              <p className="text-sm text-muted-foreground">Thrive Hub — Guía completa de uso</p>
            </div>
          </div>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar en el manual..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </header>

      <main className="p-6 max-w-3xl mx-auto space-y-8">

        {/* Quick nav */}
        {!query && (
          <Card className="luxury-card p-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Índice rápido</p>
            <div className="flex flex-wrap gap-2">
              {SECTIONS.map(s => {
                const Icon = s.icon;
                return (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    onClick={e => {
                      e.preventDefault();
                      document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 hover:bg-muted text-sm transition-colors"
                  >
                    <Icon className={cn("h-3.5 w-3.5", s.color)} />
                    {s.title.split(" — ")[0]}
                  </a>
                );
              })}
            </div>
          </Card>
        )}

        {/* Owner sections */}
        <div className="space-y-3">
          {!query && (
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
              Navegación del Owner / Dueño
            </p>
          )}
          {filtered.map(section => (
            <SectionCard key={section.id} section={section} />
          ))}
          {filtered.length === 0 && (
            <Card className="luxury-card p-12 text-center">
              <Search className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No se encontró nada para "{query}"</p>
            </Card>
          )}
        </div>

        {/* Editor / Videographer sections */}
        {!query && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
              Vistas de Editor y Videógrafo
            </p>
            {EDITOR_SECTIONS.map(section => (
              <SectionCard key={section.id} section={section as Section} />
            ))}
          </div>
        )}

        {/* Global tips */}
        {!query && (
          <Card className="luxury-card p-6 border-primary/20 bg-primary/5">
            <p className="text-sm font-semibold mb-3">⌨️ Atajos y funciones globales</p>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <kbd className="inline-flex h-6 select-none items-center gap-1 rounded border border-border bg-muted px-2 text-[11px] font-medium text-foreground flex-shrink-0">
                  ⌘K
                </kbd>
                <span>Abre la búsqueda global — busca clientes, campañas, tareas, leads y scripts al mismo tiempo desde cualquier pantalla.</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded bg-muted flex items-center justify-center flex-shrink-0">
                  <span className="text-[11px]">🔔</span>
                </div>
                <span>El ícono de campana arriba a la derecha muestra notificaciones y alertas de pago sin leer. El número rojo indica cuántas hay pendientes.</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded bg-muted flex items-center justify-center flex-shrink-0">
                  <span className="text-[11px]">↔️</span>
                </div>
                <span>El ícono de menú arriba a la izquierda colapsa o expande la barra lateral para tener más espacio de trabajo.</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded bg-muted flex items-center justify-center flex-shrink-0">
                  <span className="text-[11px]">🔄</span>
                </div>
                <span>El CRM se actualiza en tiempo real. Si alguien más hace un cambio (una tarea, aprobación, cliente) lo verás reflejado automáticamente sin recargar la página.</span>
              </div>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
