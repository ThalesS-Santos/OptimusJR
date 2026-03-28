import { supabase } from '../supabase-config.js';
import { monthsName, daysOfWeek, generateCalendarDays } from './utils.js';
import { calendarEvents } from '../events.js';

window.renderCalendario = async function(container) {
    document.getElementById('page-title').innerText = 'Calendário Institucional 2026';
    if (!window.currentUser) return;

    container.innerHTML = `<div style="text-align:center; padding:2rem; color:var(--text-muted)">📅 Carregando calendário e eventos...</div>`;

    let events = [];
    let loadError = false;

    try {
        const { data, error } = await supabase
            .from('calendar_events')
            .select('*')
            .order('date', { ascending: true });

        if (error) throw error;
        events = data || [];
    } catch (err) {
        console.error("Erro ao carregar calendar_events:", err);
        loadError = true;
        events = typeof calendarEvents !== 'undefined' ? calendarEvents : [];
    }

    let calendarHtml = `
        <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 2rem; background: rgba(255,255,255,0.03); padding: 1rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); flex-wrap: wrap;">
            <div style="background: rgba(59, 130, 246, 0.2); padding: 0.6rem; border-radius: 8px;"><span style="font-size: 1.5rem;">📅</span></div>
            <div>
                <h4 style="color: #fff;">Metas & Planejamento Dinâmico</h4>
                <p style="font-size: 0.8rem; color: var(--text-muted);">Visualize e gerencie as datas da gestão.</p>
            </div>
            
            <div style="margin-left: auto; display: flex; gap: 0.8rem; align-items: center;">
                ${window.currentUser.role !== 'Ex-Júnior' ? `<button onclick="window.openCalendarModal()" style="background: #3b82f6; border: none; font-weight: bold; padding: 0.6rem 1.2rem; font-size: 0.85rem;">➕ Novo Evento</button>` : ''}
            </div>
        </div>

        ${loadError ? `<div class="card" style="margin-bottom: 2rem; border-color: #ef4444; background: rgba(239, 68, 68, 0.05);">
            <p style="color: #ef4444; font-weight: bold;">⚠️ Tabela 'calendar_events' não encontrada no Supabase!</p>
            <p style="font-size: 0.9rem; color: var(--text-muted); margin-top: 0.5rem;">Por favor, crie a tabela primeiro usando o arquivo <b><code>calendar_setup.sql</code></b> no SQL Editor do painel do Supabase. Enquanto isso, exibindo backup estático.</p>
        </div>` : ''}

        <div style="display: flex; gap: 0.8rem; font-size: 0.75rem; margin-bottom: 1.5rem; background: rgba(0,0,0,0.1); padding: 0.8rem; border-radius: 8px;">
            <span style="display: flex; align-items: center; gap: 4px;"><div style="width:8px; height:8px; border-radius:50%; background:#10b981;"></div>Mensal</span>
            <span style="display: flex; align-items: center; gap: 4px;"><div style="width:8px; height:8px; border-radius:50%; background:#6366f1;"></div>Semestral</span>
            <span style="display: flex; align-items: center; gap: 4px;"><div style="width:8px; height:8px; border-radius:50%; background:#f59e0b;"></div>Brasil Jr</span>
            <span style="display: flex; align-items: center; gap: 4px;"><div style="width:8px; height:8px; border-radius:50%; background:#3b82f6;"></div>Inovação</span>
            <span style="display: flex; align-items: center; gap: 4px;"><div style="width:8px; height:8px; border-radius:50%; background:#ef4444;"></div>Feriado</span>
        </div>

        <div class="calendar-grid">`;

    monthsName.forEach((m, mIdx) => {
        const days = generateCalendarDays(mIdx, 2026);
        calendarHtml += `
            <div class="calendar-month-card">
                <div class="calendar-month-title">${m}</div>
                <div class="calendar-days-header">
                    ${daysOfWeek.map(d => `<div>${d}</div>`).join('')}
                </div>
                <div class="calendar-days-grid">`;
        
        days.forEach(day => {
            if (!day) {
                calendarHtml += `<div class="calendar-day-cell" style="opacity:0;"></div>`;
            } else {
                const dateStr = `2026-${String(mIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayEvts = events.filter(e => e.date === dateStr);
                
                calendarHtml += `
                    <div class="calendar-day-cell">
                        <div class="calendar-day-number">${day}</div>
                        <div style="display: flex; flex-direction: column; gap: 2px; overflow-y: auto; max-height: 50px;">`;
                
                dayEvts.forEach(ev => {
                    let catClass = '';
                    if (ev.category === 'monthly') catClass = 'cat-monthly';
                    else if (ev.category === 'semiannual') catClass = 'cat-semiannual';
                    else if (ev.category === 'brasiljr') catClass = 'cat-brasiljr';
                    else if (ev.category === 'industry') catClass = 'cat-industry';
                    else if (ev.category === 'holiday') catClass = 'cat-holiday';
                    
                    const escapedTitle = ev.title.replace(/'/g, "\\'");
                    const escapedDesc = (ev.description || '').replace(/'/g, "\\'").replace(/\n/g, ' ');
                    
                    calendarHtml += `
                        <div class="calendar-event-tag ${catClass}" 
                            title="📌 ${ev.title}&#10;📅 ${new Date(ev.date + 'T12:00:00').toLocaleDateString('pt-BR')}"
                            onclick="window.showEventDetails('${escapedTitle}', '${ev.date}', '${escapedDesc}')" 
                            style="position: relative; cursor: pointer;">
                            ${ev.title}
                            ${(!loadError && window.currentUser?.role === 'Presidente') ? `<button onclick="event.stopPropagation(); window.deletarEvento('${ev.id}')" style="position: absolute; right: 2px; top: 0px; background: transparent; color: #fff; padding: 0; font-size: 0.8rem; font-weight: bold; border: none; opacity: 0.8; width: auto; cursor: pointer;" title="Excluir (Somente Presidente)">×</button>` : ''}
                        </div>`;
                });
                
                calendarHtml += `</div></div>`;
            }
        });
        
        calendarHtml += `</div></div>`;
    });

    calendarHtml += `
        </div>
        <div id="cal-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); z-index: 999; justify-content: center; align-items: center;">
            <div class="card" style="width: 400px; max-width: 90%; background: #111; padding: 2rem; position: relative;">
                <button onclick="document.getElementById('cal-modal').style.display='none'" style="position: absolute; right: 1rem; top: 1rem; background:transparent; border:none; color:white; font-size:1.5rem; width:auto; padding:0; cursor:pointer;">&times;</button>
                <h3>📋 Novo Evento</h3>
                <form id="cal-form" style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem;">
                    <div><label>Título</label><input type="text" id="c-title" required style="width:100%;"></div>
                    <div style="display: flex; gap: 1rem;">
                        <div style="flex:1;"><label>Data</label><input type="date" id="c-date" required style="width:100%;"></div>
                        <div style="flex:1;"><label>Horário (opcional)</label><input type="time" id="c-time" style="width:100%;"></div>
                    </div>
                    <div><label>Categoria</label>
                        <select id="c-cat" style="width: 100%;">
                            <option value="monthly">Mensal</option>
                            <option value="semiannual">Semestral</option>
                            <option value="brasiljr">Brasil Jr</option>
                            <option value="industry">Inovação</option>
                            <option value="holiday">Feriado</option>
                        </select>
                    </div>
                    <div><label>Descrição</label><textarea id="c-desc" style="width:100%; height: 60px;"></textarea></div>
                    <button type="submit">Cadastrar</button>
                    <button type="button" onclick="window.closeCalendarModal()" style="background: transparent; border: 1px solid #333; color: #9ca3af; margin-top: 0.5rem;">Cancelar</button>
                </form>
            </div>
        </div>
    `;

    container.innerHTML = calendarHtml;

    // Helper modals and functions
    if (!document.getElementById('cal-details-modal')) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="cal-details-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); z-index: 10000; justify-content: center; align-items: center;" onclick="if(event.target===this) this.style.display='none'">
                <div class="card" style="width: 400px; max-width: 90%; background: #111; padding: 2rem; position: relative; margin: 0 auto; overflow-y: auto; max-height: 90vh;">
                    <button onclick="document.getElementById('cal-details-modal').style.display='none'" style="position: absolute; right: 1rem; top: 1rem; background:transparent; border:none; color:white; font-size:1.5rem; width:auto; padding:0; cursor:pointer;">&times;</button>
                    <h3 id="cd-title" style="color: #3b82f6; margin-bottom: 0.5rem; padding-right: 1.5rem;"></h3>
                    <p style="color: #9ca3af; font-size: 0.9rem; margin-bottom: 1rem;">📅 <span id="cd-date"></span></p>
                    <div id="cd-desc" style="white-space: pre-wrap; font-size: 0.9rem; line-height: 1.5; color: #e5e7eb; background: rgba(255,255,255,0.03); padding: 1rem; border-radius: 8px;"></div>
                </div>
            </div>
        `);
    }

    window.showEventDetails = (title, date, desc) => {
        document.getElementById('cd-title').innerText = title;
        document.getElementById('cd-date').innerText = new Date(date + "T12:00:00").toLocaleDateString('pt-BR');
        document.getElementById('cd-desc').innerText = desc || 'Nenhuma descrição informada.';
        document.getElementById('cal-details-modal').style.display = 'flex';
    };

    window.openCalendarModal = () => { document.getElementById('cal-modal').style.display = 'flex'; }
    window.closeCalendarModal = () => { document.getElementById('cal-modal').style.display = 'none'; }

    document.getElementById('cal-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('c-title').value;
        const date = document.getElementById('c-date').value;
        const category = document.getElementById('c-cat').value;
        const description = document.getElementById('c-desc').value;

        const { error } = await supabase.from('calendar_events').insert([{ title, date, category, description }]);
        if (error) window.showToast("Erro: " + error.message, 'error');
        else { window.showToast("Evento cadastrado!", 'success'); window.closeCalendarModal(); window.renderCalendario(container); }
    });

    window.deletarEvento = async (id) => {
        if (!confirm("Excluir?")) return;
        const { error } = await supabase.from('calendar_events').delete().eq('id', id);
        if (error) window.showToast("Erro!", 'error');
        else window.renderCalendario(container);
    };
};

