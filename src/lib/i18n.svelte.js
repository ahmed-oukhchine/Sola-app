const TRANSLATIONS = {
  en: {
    today: 'Today',
    inbox: 'Inbox',
    focus: 'Sola',
    routines: 'Routines',
    someday: 'Someday',
    lifeCourses: 'Life Courses',
    stats: 'Stats',
    settings: 'Settings',
    dashboard: 'Dashboard',
    calendar: 'Calendar',
    goals: 'Goals',
    kanban: 'Kanban',
    habits: 'Habits',
    tags: 'Tags',
    templates: 'Templates',
    addTask: 'Add task',
    search: 'Search...',
    points: 'Points',
    streak: 'Streak',
    theme: 'Theme',
    export: 'Export',
    import: 'Import',
    delete: 'Delete',
    cancel: 'Cancel',
    save: 'Save',
    start: 'Start',
    pause: 'Pause',
    resume: 'Resume',
    stop: 'Stop',
    reset: 'Reset',
    complete: 'Complete',
    morning: 'Morning',
    evening: 'Evening',
    unscheduled: 'Unscheduled',
    nextAction: 'Next action',
    focus: 'Sola',
    all: 'All',
    noTasks: 'No tasks yet',
    allDone: 'All done for today',
    goodMorning: 'Good morning',
    endOfDay: 'End of day',
    readyToFocus: 'Ready to focus',
  },
  es: {
    today: 'Hoy',
    inbox: 'Bandeja',
    focus: 'Enfoque',
    routines: 'Rutinas',
    someday: 'Algún día',
    lifeCourses: 'Lecciones',
    stats: 'Estadísticas',
    settings: 'Ajustes',
    dashboard: 'Panel',
    calendar: 'Calendario',
    goals: 'Metas',
    kanban: 'Kanban',
    habits: 'Hábitos',
    tags: 'Etiquetas',
    templates: 'Plantillas',
    addTask: 'Agregar tarea',
    search: 'Buscar...',
    points: 'Puntos',
    streak: 'Racha',
    theme: 'Tema',
    export: 'Exportar',
    import: 'Importar',
    delete: 'Eliminar',
    cancel: 'Cancelar',
    save: 'Guardar',
    start: 'Iniciar',
    pause: 'Pausa',
    resume: 'Reanudar',
    stop: 'Detener',
    reset: 'Reiniciar',
    complete: 'Completar',
    morning: 'Mañana',
    evening: 'Tarde',
    unscheduled: 'Sin horario',
    nextAction: 'Siguiente acción',
    focus: 'Enfoque',
    all: 'Todo',
    noTasks: 'Sin tareas aún',
    allDone: 'Todo listo por hoy',
    goodMorning: 'Buenos días',
    endOfDay: 'Fin del día',
    readyToFocus: 'Listo para enfocarte',
  }
}

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' }
]

let _locale = $state('en')

export function getLocale() { return _locale }

export function getTranslations() { return TRANSLATIONS[_locale] || TRANSLATIONS.en }

export function loadLocale() {
  _locale = localStorage.getItem('focus-locale') || 'en'
}

export function setLocale(code) {
  _locale = code
  localStorage.setItem('focus-locale', code)
}
