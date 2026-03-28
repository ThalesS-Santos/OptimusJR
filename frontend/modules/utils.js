// --- SHARED UTILITIES ---

export const monthsName = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
export const daysOfWeek = ["D", "S", "T", "Q", "Q", "S", "S"];

export function generateCalendarDays(month, year) {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
}

// Bind to window for non-module scripts if needed (fallback)
window.monthsName = monthsName;
window.daysOfWeek = daysOfWeek;
window.generateCalendarDays = generateCalendarDays;
