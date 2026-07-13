// ═══════════════════════════════════════════════════════════════════════
// STUDENTFIT OS — State Manager & Data Layer
// Esquema relacional: semanas → dias → series (Supabase)
//
// Arquitectura:
//   - AppState: objeto singleton que mantiene el estado local
//   - Persistencia: localStorage guarda la semana activa (cero pérdida al F5)
//   - Flujo asíncrono: onChange del <select> → fetch a Supabase → render DOM
//   - Event Delegation: un solo listener en el contenedor maneja edit/delete
// ═══════════════════════════════════════════════════════════════════════

// --- 1. CONFIGURACIÓN DE CONEXIÓN A SUPABASE ---
const SUPABASE_URL = 'https://yezfelmfxegpjtudympe.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllemZlbG1meGVncGp0dWR5bXBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5MDkzODksImV4cCI6MjA5NTQ4NTM4OX0.YkL7ZfGpwKRx1FF2JoRA_KH-whOwHt3c21nZW7HuAEQ';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- 2. STATE MANAGER ---
// Objeto singleton que centraliza todo el estado de la aplicación.
// Cualquier cambio de semana pasa por aquí y se persiste en localStorage.
const AppState = {
    semanas: [],           // Array de {id, nombre} cargado desde Supabase
    semanaActualId: null,  // ID (bigint) de la semana seleccionada
    diasCargados: [],      // Array de dias con series embebidas
    user: null,            // Objeto usuario de Supabase Auth
    keys: {                // Claves API del modelo BYOK
        gemini: null,
        fatsecret: null
    },

    setSemanaActual(id) {
        this.semanaActualId = parseInt(id);
        localStorage.setItem('studentfit_semana_id', this.semanaActualId);
    },

    getSemanaGuardada() {
        const saved = localStorage.getItem('studentfit_semana_id');
        return saved ? parseInt(saved) : null;
    }
};


// --- 3. APPLICATION BOOTSTRAP ---
document.addEventListener('DOMContentLoaded', async () => {

    // ═══════════════════════════════════════════════════════
    // AUTH GUARD: Verificar sesión ANTES de hacer nada
    // ═══════════════════════════════════════════════════════
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        // No hay sesión activa → redirigir al login
        console.log('🔒 Sin sesión activa. Redirigiendo a login...');
        window.location.href = 'login.html';
        return; // STOP: no ejecutar nada más
    }

    // Guardar usuario en el estado
    AppState.user = session.user;
    console.log('🔓 Sesión activa:', AppState.user.email);

    // ═══════════════════════════════════════════════════════
    // DOM REFERENCES (cacheadas una sola vez)
    // ═══════════════════════════════════════════════════════
    const sidebar            = document.getElementById('sidebar');
    const menuBtn            = document.getElementById('menu-btn');
    const closeBtn           = document.getElementById('close-btn');
    const semanaSelect       = document.getElementById('semana-select');
    const addSemanaBtn       = document.getElementById('add-semana-btn');
    const contenedorTablas   = document.getElementById('entrenamientos-container');
    const rutinaInput        = document.getElementById('rutina-input');
    const btnAddSerie        = document.getElementById('btn-add-serie');

    // Sidebar toggle
    menuBtn.addEventListener('click', () => sidebar.classList.add('active'));
    closeBtn.addEventListener('click', () => sidebar.classList.remove('active'));


    // ═══════════════════════════════════════════════════════
    // CORE 1: Cargar Semanas desde Supabase → poblar <select>
    // ═══════════════════════════════════════════════════════
    async function cargarSemanas() {
        console.log('📦 Cargando semanas desde Supabase...');

        const { data, error } = await supabaseClient
            .from('semanas')
            .select('id, nombre')
            .order('id', { ascending: true });

        if (error) {
            console.error('❌ Error cargando semanas:', error);
            semanaSelect.innerHTML = '<option value="">Error al cargar semanas</option>';
            return;
        }

        AppState.semanas = data || [];

        // Poblar el <select> dinámicamente
        semanaSelect.innerHTML = '';

        if (AppState.semanas.length === 0) {
            semanaSelect.innerHTML = '<option value="">-- No hay semanas. Crea una →</option>';
            contenedorTablas.innerHTML = `
                <div style="text-align:center;padding:60px 20px;color:#a0a0a0;">
                    <p style="font-size:18px;margin-bottom:10px;">🏋️ Bienvenido a StudentFit OS</p>
                    <p>Pulsa <strong>"+ Nueva Semana"</strong> para crear tu primer mesociclo.</p>
                </div>
            `;
            return;
        }

        AppState.semanas.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.nombre;
            semanaSelect.appendChild(opt);
        });

        // --- PERSISTENCIA: Recuperar estado guardado en localStorage ---
        const savedId = AppState.getSemanaGuardada();
        const existeEnLista = savedId && AppState.semanas.some(s => s.id === savedId);

        if (existeEnLista) {
            // Restauramos la semana donde el usuario estaba antes del F5
            semanaSelect.value = savedId;
            console.log('🔄 Restaurando semana guardada:', savedId);
            await seleccionarSemana(savedId);
        } else {
            // Primera vez o semana borrada: cargar la primera
            semanaSelect.value = AppState.semanas[0].id;
            await seleccionarSemana(AppState.semanas[0].id);
        }
    }


    // ═══════════════════════════════════════════════════════
    // CORE 2: Seleccionar Semana → fetch dias + series embebidas
    // ═══════════════════════════════════════════════════════
    // Este es el corazón de la app. Cada vez que el usuario cambia
    // de semana en el <select>, esta función:
    //   1. Persiste el ID en localStorage
    //   2. Hace UN SOLO fetch a Supabase con select embebido
    //   3. Limpia el DOM y renderiza solo los datos de esa semana
    async function seleccionarSemana(semanaId) {
        semanaId = parseInt(semanaId);
        if (!semanaId || isNaN(semanaId)) return;

        // Persistir estado
        AppState.setSemanaActual(semanaId);

        // UI: estado de carga
        contenedorTablas.innerHTML = `
            <div class="loading-overlay">
                <div class="loading-spinner"></div>
                <span>Cargando entrenamientos...</span>
            </div>
        `;

        // Fetch con SELECT embebido: dias → series (1 sola petición HTTP)
        // Supabase/PostgREST resuelve la FK automáticamente
        const { data: dias, error } = await supabaseClient
            .from('dias')
            .select(`
                id,
                nombre,
                orden,
                series (
                    id,
                    ejercicio,
                    num_serie,
                    peso,
                    repeticiones,
                    rir,
                    notas,
                    created_at
                )
            `)
            .eq('semana_id', semanaId)
            .order('orden', { ascending: true });

        if (error) {
            console.error('❌ Error cargando días/series:', error);
            contenedorTablas.innerHTML = `
                <div style="text-align:center;padding:40px;color:#ff4444;">
                    Error al cargar datos. Revisa la consola.
                </div>
            `;
            return;
        }

        // Actualizar estado local
        AppState.diasCargados = dias || [];

        console.log(`✅ Semana ${semanaId}: ${(dias || []).length} días cargados`);

        // Renderizar
        renderizarDias(AppState.diasCargados);
    }

    // Event listener: cambio de semana en el <select>
    semanaSelect.addEventListener('change', (e) => {
        const id = parseInt(e.target.value);
        if (id) seleccionarSemana(id);
    });


    // ═══════════════════════════════════════════════════════
    // RENDER: Construir Day Cards con tablas de series
    // ═══════════════════════════════════════════════════════
    function renderizarDias(dias) {
        contenedorTablas.innerHTML = '';

        if (dias.length === 0) {
            contenedorTablas.innerHTML = `
                <div style="text-align:center;padding:40px 20px;color:#a0a0a0;">
                    <p>No hay entrenamientos registrados para esta semana.</p>
                    <p style="margin-top:8px;font-size:13px;">Usa el formulario de arriba para añadir tu primera serie.</p>
                </div>
            `;
            return;
        }

        dias.forEach(dia => {
            const dayCard = document.createElement('div');
            dayCard.className = 'day-table-card';
            dayCard.dataset.diaId = dia.id;

            // Ordenar series: primero por ejercicio (alfabético), luego por num_serie
            const seriesOrdenadas = (dia.series || []).sort((a, b) => {
                const cmp = (a.ejercicio || '').localeCompare(b.ejercicio || '');
                return cmp !== 0 ? cmp : (a.num_serie || 0) - (b.num_serie || 0);
            });

            let filasHTML = '';
            seriesOrdenadas.forEach(serie => {
                filasHTML += `
                    <tr data-id="${serie.id}">
                        <td class="edit-cell">${serie.ejercicio}</td>
                        <td class="edit-cell">${serie.num_serie}</td>
                        <td class="edit-cell">${serie.peso}</td>
                        <td class="edit-cell">${serie.repeticiones}</td>
                        <td class="edit-cell">${serie.rir !== null && serie.rir !== undefined ? serie.rir : ''}</td>
                        <td class="edit-cell notas-cell">${serie.notas || ''}</td>
                        <td class="acciones-cell">
                            <button class="btn-icon btn-edit" title="Editar">✏️</button>
                            <button class="btn-icon btn-delete" title="Borrar">🗑️</button>
                        </td>
                    </tr>
                `;
            });

            dayCard.innerHTML = `
                <h4>${dia.nombre}</h4>
                <div class="table-container">
                    <table class="styled-table">
                        <thead>
                            <tr>
                                <th>Ejercicio</th>
                                <th>Serie</th>
                                <th>Peso (kg)</th>
                                <th>Reps</th>
                                <th>RIR</th>
                                <th>Notas</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>${filasHTML}</tbody>
                    </table>
                </div>
            `;

            contenedorTablas.appendChild(dayCard);
        });
    }


    // ═══════════════════════════════════════════════════════
    // ACTION: Añadir nueva semana
    // ═══════════════════════════════════════════════════════
    addSemanaBtn.addEventListener('click', async () => {
        // Calcular el número siguiente basándose en las semanas existentes
        const numeros = AppState.semanas.map(s => {
            const match = s.nombre.match(/\d+/);
            return match ? parseInt(match[0]) : 0;
        });
        const siguiente = (numeros.length > 0 ? Math.max(...numeros) : 0) + 1;
        const nuevoNombre = `Semana ${siguiente}`;

        addSemanaBtn.disabled = true;
        const textoOriginal = addSemanaBtn.textContent;
        addSemanaBtn.textContent = '⏳';

        const { data, error } = await supabaseClient
            .from('semanas')
            .insert([{ nombre: nuevoNombre }])
            .select()
            .single();

        addSemanaBtn.disabled = false;
        addSemanaBtn.textContent = textoOriginal;

        if (error) {
            console.error('❌ Error creando semana:', error);
            alert('Error al crear semana: ' + error.message);
            return;
        }

        console.log('✅ Nueva semana creada:', data);

        // Actualizar estado y <select>
        AppState.semanas.push(data);
        const opt = document.createElement('option');
        opt.value = data.id;
        opt.textContent = data.nombre;
        semanaSelect.appendChild(opt);

        // Auto-seleccionar la nueva semana
        semanaSelect.value = data.id;
        await seleccionarSemana(data.id);
    });


    // ═══════════════════════════════════════════════════════
    // ACTION: Añadir nueva serie
    // ═══════════════════════════════════════════════════════
    // Flujo:
    //   1. Validar inputs
    //   2. Find-or-Create el día (tabla dias)
    //   3. Insertar serie (tabla series)
    //   4. Re-fetch semana completa para garantizar consistencia
    btnAddSerie.addEventListener('click', async () => {
        const semanaId = parseInt(semanaSelect.value);
        if (!semanaId) {
            alert('Selecciona o crea una semana primero.');
            return;
        }

        const rutina    = rutinaInput.value.trim() || 'General';
        const ejercicio = document.getElementById('ejercicio-input').value.trim();
        const serie     = document.getElementById('serie-input').value;
        const peso      = document.getElementById('peso-input').value;
        const reps      = document.getElementById('reps-input').value;
        const rir       = document.getElementById('rir-input').value;
        const notas     = document.getElementById('notas-input').value.trim();

        if (!ejercicio || !serie || !peso || !reps) {
            alert('Rellena Ejercicio, Serie, Peso y Reps.');
            return;
        }

        const textoOriginal = btnAddSerie.innerHTML;
        btnAddSerie.innerHTML = 'Guardando... ⏳';
        btnAddSerie.disabled = true;

        try {
            // PASO 1: Find-or-Create día
            // Buscamos si ya existe un día con ese nombre en esta semana
            let diaId;
            const { data: diaExistente } = await supabaseClient
                .from('dias')
                .select('id')
                .eq('semana_id', semanaId)
                .eq('nombre', rutina)
                .maybeSingle();

            if (diaExistente) {
                diaId = diaExistente.id;
            } else {
                // Crear nuevo día — el orden se basa en cuántos días ya tiene la semana
                const ordenNuevo = AppState.diasCargados.length;
                const { data: nuevoDia, error: errDia } = await supabaseClient
                    .from('dias')
                    .insert([{ semana_id: semanaId, nombre: rutina, orden: ordenNuevo }])
                    .select()
                    .single();

                if (errDia) throw errDia;
                diaId = nuevoDia.id;
                console.log('🆕 Nuevo día creado:', nuevoDia);
            }

            // PASO 2: Insertar serie
            const { error: errSerie } = await supabaseClient
                .from('series')
                .insert([{
                    dia_id: diaId,
                    ejercicio: ejercicio,
                    num_serie: parseInt(serie),
                    peso: parseFloat(peso),
                    repeticiones: parseInt(reps),
                    rir: rir ? parseInt(rir) : null,
                    notas: notas || null
                }]);

            if (errSerie) throw errSerie;

            console.log('✅ Serie guardada correctamente');

            // PASO 3: Re-fetch para consistencia total (estado = nube)
            await seleccionarSemana(semanaId);

            // Auto-incrementar serie y limpiar campos parciales
            document.getElementById('serie-input').value = parseInt(serie) + 1;
            document.getElementById('reps-input').value = '';
            document.getElementById('notas-input').value = '';

        } catch (error) {
            console.error('❌ Error guardando serie:', error);
            alert('Error al guardar: ' + error.message);
        } finally {
            btnAddSerie.innerHTML = textoOriginal;
            btnAddSerie.disabled = false;
        }
    });


    // ═══════════════════════════════════════════════════════
    // EVENT DELEGATION: Editar y Borrar series
    // ═══════════════════════════════════════════════════════
    // Un solo listener en el contenedor padre maneja todos los clics
    // en botones de edición/borrado de cualquier tabla.
    contenedorTablas.addEventListener('click', async (e) => {
        const btn = e.target.closest('.btn-icon');
        if (!btn) return;

        const fila = btn.closest('tr');
        const rowId = fila.dataset.id;

        // --- ACCIÓN: BORRAR ---
        if (btn.classList.contains('btn-delete')) {
            if (confirm('⚠️ ¿Seguro que quieres borrar esta serie permanentemente?')) {
                btn.innerHTML = '⏳';

                const { error } = await supabaseClient
                    .from('series')
                    .delete()
                    .eq('id', rowId);

                if (!error) {
                    fila.remove();

                    // Si el día se queda sin series, eliminar también el día
                    const dayCard = btn.closest('.day-table-card');
                    if (dayCard && dayCard.querySelector('tbody').children.length === 0) {
                        const diaId = dayCard.dataset.diaId;
                        await supabaseClient.from('dias').delete().eq('id', diaId);
                        dayCard.remove();
                        console.log('🗑️ Día vacío eliminado:', diaId);
                    }
                } else {
                    alert('Error al borrar: ' + error.message);
                    btn.innerHTML = '🗑️';
                }
            }
        }

        // --- ACCIÓN: EDITAR / GUARDAR CAMBIOS ---
        if (btn.classList.contains('btn-edit')) {
            const isEditing = fila.classList.contains('is-editing');
            const celdas = fila.querySelectorAll('.edit-cell');

            if (!isEditing) {
                // ACTIVAR modo edición
                fila.classList.add('is-editing');
                btn.innerHTML = '💾';
                btn.title = 'Guardar';

                celdas.forEach(celda => {
                    celda.contentEditable = true;
                    celda.classList.add('editing-active');
                });
                celdas[0].focus();
            } else {
                // GUARDAR cambios en Supabase
                btn.innerHTML = '⏳';

                // Recopilar valores editados de las celdas
                // Orden: [ejercicio, num_serie, peso, repeticiones, rir, notas]
                const nuevosDatos = {
                    ejercicio:    celdas[0].innerText.trim(),
                    num_serie:    parseInt(celdas[1].innerText) || 1,
                    peso:         parseFloat(celdas[2].innerText) || 0,
                    repeticiones: parseInt(celdas[3].innerText) || 0,
                    rir:          celdas[4].innerText.trim() !== '' ? parseInt(celdas[4].innerText) : null,
                    notas:        celdas[5].innerText.trim() || null
                };

                const { error } = await supabaseClient
                    .from('series')
                    .update(nuevosDatos)
                    .eq('id', rowId);

                if (error) {
                    alert('Error al actualizar: ' + error.message);
                } else {
                    console.log('✅ Serie actualizada:', rowId);
                }

                // DESACTIVAR modo edición
                fila.classList.remove('is-editing');
                btn.innerHTML = '✏️';
                btn.title = 'Editar';
                celdas.forEach(celda => {
                    celda.contentEditable = false;
                    celda.classList.remove('editing-active');
                });
            }
        }
    });


    // ═══════════════════════════════════════════════════════════════
    // SECCIÓN: NAVEGACIÓN ENTRE SECCIONES (sidebar)
    // ═══════════════════════════════════════════════════════════════
    const seccionEntrenamiento = document.getElementById('seccion-entrenamiento');
    const seccionGraficos      = document.getElementById('seccion-graficos');
    const seccionMedidas       = document.getElementById('seccion-medidas');
    const seccionChat          = document.getElementById('seccion-chat');
    const sidebarLinks         = document.querySelectorAll('.sidebar-menu a[data-section]');

    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const seccion = link.dataset.section;

            // Actualizar clases activas en sidebar
            document.querySelectorAll('.sidebar-menu a').forEach(a => a.classList.remove('active'));
            link.classList.add('active');

            // Mostrar/ocultar secciones
            if (seccion === 'graficos') {
                seccionEntrenamiento.style.display = 'none';
                if (seccionMedidas) seccionMedidas.style.display = 'none';
                if (seccionChat) seccionChat.style.display = 'none';
                seccionGraficos.style.display = 'block';
                setTimeout(() => {
                    cargarEjerciciosParaGrafico();
                    if (typeof dibujarGraficoMedidas !== 'undefined') dibujarGraficoMedidas();
                }, 50);
            } else if (seccion === 'entrenamiento') {
                seccionGraficos.style.display = 'none';
                if (seccionMedidas) seccionMedidas.style.display = 'none';
                if (seccionChat) seccionChat.style.display = 'none';
                seccionEntrenamiento.style.display = 'block';
            } else if (seccion === 'medidas') {
                seccionEntrenamiento.style.display = 'none';
                seccionGraficos.style.display = 'none';
                if (seccionChat) seccionChat.style.display = 'none';
                if (seccionMedidas) {
                    seccionMedidas.style.display = 'block';
                    cargarMedidasGuardadas();
                }
            } else if (seccion === 'chat') {
                seccionEntrenamiento.style.display = 'none';
                seccionGraficos.style.display = 'none';
                if (seccionMedidas) seccionMedidas.style.display = 'none';
                if (seccionChat) seccionChat.style.display = 'block';
            }

            // Cerrar sidebar en móvil
            sidebar.classList.remove('active');
        });
    });


    // ═══════════════════════════════════════════════════════════════
    // SECCIÓN 2: GRÁFICOS DE PROGRESIÓN (adaptado a tabla 'series')
    // ═══════════════════════════════════════════════════════════════
    const graficoEjercicioSelect = document.getElementById('grafico-ejercicio-select');
    const graficoEmptyMsg        = document.getElementById('grafico-empty-msg');

    // Poblar dropdown de ejercicios únicos desde la tabla series
    async function cargarEjerciciosParaGrafico() {
        console.log('📋 Cargando ejercicios desde tabla series...');

        const { data, error } = await supabaseClient
            .from('series')
            .select('ejercicio');

        if (error) {
            console.error('❌ Error cargando ejercicios:', error);
            return;
        }

        const ejerciciosUnicos = [...new Set((data || []).map(d => d.ejercicio))].sort();
        graficoEjercicioSelect.innerHTML = '';

        if (ejerciciosUnicos.length === 0) {
            graficoEjercicioSelect.innerHTML = '<option value="">-- Sin datos aún --</option>';
            return;
        }

        ejerciciosUnicos.forEach(ej => {
            const opt = document.createElement('option');
            opt.value = ej;
            opt.textContent = ej;
            graficoEjercicioSelect.appendChild(opt);
        });

        dibujarGraficoProgreso();
    }

    // Variable global del gráfico
    window.miGrafico = null;

    // Dibujar gráfico de progresión por ejercicio
    // Ahora consulta 'series' con relación embebida a dias → semanas
    async function dibujarGraficoProgreso() {
        const ejercicioSeleccionado = graficoEjercicioSelect.value;
        if (!ejercicioSeleccionado) return;

        // Fetch series con la cadena de relaciones: series → dias → semanas
        const { data, error } = await supabaseClient
            .from('series')
            .select('ejercicio, peso, dias(nombre, semanas(nombre))');

        if (error) {
            console.error('❌ Error consultando datos para gráfico:', error);
            return;
        }

        // Filtrar por ejercicio (case-insensitive)
        const datosFiltrados = (data || []).filter(s =>
            s.ejercicio &&
            s.ejercicio.trim().toLowerCase() === ejercicioSeleccionado.trim().toLowerCase()
        );

        if (datosFiltrados.length === 0) {
            graficoEmptyMsg.textContent = `No hay datos registrados para "${ejercicioSeleccionado}".`;
            graficoEmptyMsg.style.display = 'block';
            if (window.miGrafico) { window.miGrafico.destroy(); window.miGrafico = null; }
            return;
        }

        graficoEmptyMsg.style.display = 'none';

        // Agrupar por semana: obtener peso máximo por semana
        const porSemana = {};
        datosFiltrados.forEach(row => {
            // Acceder al nombre de la semana a través de la relación embebida
            const semana = (row.dias && row.dias.semanas && row.dias.semanas.nombre)
                ? row.dias.semanas.nombre
                : 'Sin semana';
            if (!porSemana[semana]) porSemana[semana] = [];
            porSemana[semana].push(row.peso || 0);
        });

        // Ordenar semanas numéricamente
        const labels = Object.keys(porSemana).sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.replace(/\D/g, '')) || 0;
            return numA - numB;
        });

        const pesos = labels.map(semana => Math.max(...porSemana[semana]));

        console.log('📊 Gráfico:', ejercicioSeleccionado, labels, pesos);

        // Limpiar gráfico anterior
        if (window.miGrafico) {
            window.miGrafico.destroy();
            window.miGrafico = null;
        }

        // Renderizar Chart.js
        const canvas = document.getElementById('progresoChart');
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(57, 255, 20, 0.35)');
        gradient.addColorStop(0.5, 'rgba(57, 255, 20, 0.08)');
        gradient.addColorStop(1, 'rgba(57, 255, 20, 0.0)');

        window.miGrafico = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: `${ejercicioSeleccionado} — Peso Máx. (kg)`,
                    data: pesos,
                    borderColor: '#39ff14',
                    backgroundColor: gradient,
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#39ff14',
                    pointBorderColor: '#1e1e1e',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#39ff14',
                    pointHoverBorderWidth: 3,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 800, easing: 'easeInOutQuart' },
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: '#e0e0e0',
                            font: { size: 13, weight: '500' },
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 20,
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(30, 30, 30, 0.95)',
                        titleColor: '#39ff14',
                        bodyColor: '#e0e0e0',
                        borderColor: 'rgba(57, 255, 20, 0.3)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            title: (items) => `📅 ${items[0].label}`,
                            label: (item) => `Peso Máx: ${item.parsed.y} kg`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
                        ticks: { color: '#a0a0a0', font: { size: 12 }, padding: 8 }
                    },
                    y: {
                        beginAtZero: false,
                        grid: { color: 'rgba(57, 255, 20, 0.06)', drawBorder: false },
                        ticks: { color: '#a0a0a0', font: { size: 12 }, padding: 12 }
                    }
                }
            }
        });
    }

    graficoEjercicioSelect.addEventListener('change', dibujarGraficoProgreso);


    // ═══════════════════════════════════════════════════════════════
    // SECCIÓN 3: MEDIDAS CORPORALES (sin cambios en tabla 'medidas')
    // ═══════════════════════════════════════════════════════════════
    const hoy = new Date().toISOString().split('T')[0];
    const inputFechaMedida = document.getElementById('medida-fecha');
    if (inputFechaMedida) inputFechaMedida.value = hoy;

    function renderizarFilaMedida(medida) {
        const tbodyMedidas = document.querySelector('#tabla-medidas tbody');
        if (!tbodyMedidas) return;

        const tr = document.createElement('tr');
        tr.dataset.id = medida.id;
        tr.innerHTML = `
            <td class="edit-cell-medida">${medida.fecha}</td>
            <td class="edit-cell-medida">${medida.peso ? medida.peso : ''}</td>
            <td class="edit-cell-medida">${medida.cintura ? medida.cintura : ''}</td>
            <td class="edit-cell-medida">${medida.brazo ? medida.brazo : ''}</td>
            <td class="edit-cell-medida">${medida.pierna ? medida.pierna : ''}</td>
            <td class="acciones-cell">
                <button class="btn-icon btn-edit-medida" title="Editar">✏️</button>
                <button class="btn-icon btn-delete-medida" title="Borrar">🗑️</button>
            </td>
        `;
        tbodyMedidas.appendChild(tr);
    }

    async function cargarMedidasGuardadas() {
        const tbodyMedidas = document.querySelector('#tabla-medidas tbody');
        if (!tbodyMedidas) return;

        const { data, error } = await supabaseClient.from('medidas').select('*');
        if (error) {
            console.error('❌ Error cargando medidas:', error);
            return;
        }

        const medidasOrdenadas = (data || []).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        tbodyMedidas.innerHTML = '';
        medidasOrdenadas.forEach(renderizarFilaMedida);
    }

    const btnAddMedida = document.getElementById('btn-add-medida');
    if (btnAddMedida) {
        btnAddMedida.addEventListener('click', async () => {
            const fecha   = document.getElementById('medida-fecha').value;
            const peso    = document.getElementById('medida-peso').value;
            const cintura = document.getElementById('medida-cintura').value;
            const brazo   = document.getElementById('medida-brazo').value;
            const pierna  = document.getElementById('medida-pierna').value;

            if (!fecha || !peso) {
                alert('La fecha y el peso son obligatorios.');
                return;
            }

            const textoOriginal = btnAddMedida.innerHTML;
            btnAddMedida.innerHTML = 'Guardando... ⏳';
            btnAddMedida.disabled = true;

            const nuevaMedida = {
                fecha: fecha,
                peso: parseFloat(peso),
                cintura: cintura ? parseFloat(cintura) : null,
                brazo: brazo ? parseFloat(brazo) : null,
                pierna: pierna ? parseFloat(pierna) : null
            };

            const { data, error } = await supabaseClient
                .from('medidas')
                .insert([nuevaMedida])
                .select();

            btnAddMedida.innerHTML = textoOriginal;
            btnAddMedida.disabled = false;

            if (error) {
                alert('Error al guardar medida: ' + error.message);
                return;
            }

            document.getElementById('medida-cintura').value = '';
            document.getElementById('medida-brazo').value = '';
            document.getElementById('medida-pierna').value = '';

            cargarMedidasGuardadas();
        });
    }

    // Delegación eventos medidas (editar/borrar)
    const tablaMedidasEl = document.getElementById('tabla-medidas');
    if (tablaMedidasEl) {
        tablaMedidasEl.addEventListener('click', async (e) => {
            const btn = e.target.closest('.btn-icon');
            if (!btn) return;

            const fila = btn.closest('tr');
            const rowId = fila.dataset.id;

            if (btn.classList.contains('btn-delete-medida')) {
                if (confirm('⚠️ ¿Seguro que quieres borrar esta medida?')) {
                    btn.innerHTML = '⏳';
                    const { error } = await supabaseClient.from('medidas').delete().eq('id', rowId);
                    if (!error) {
                        fila.remove();
                    } else {
                        alert('Error al borrar: ' + error.message);
                        btn.innerHTML = '🗑️';
                    }
                }
            }

            if (btn.classList.contains('btn-edit-medida')) {
                const isEditing = fila.classList.contains('is-editing');
                const celdas = fila.querySelectorAll('.edit-cell-medida');

                if (!isEditing) {
                    fila.classList.add('is-editing');
                    btn.innerHTML = '💾';
                    btn.title = 'Guardar';
                    celdas.forEach(celda => {
                        celda.contentEditable = true;
                        celda.classList.add('editing-active');
                    });
                    celdas[0].focus();
                } else {
                    btn.innerHTML = '⏳';

                    const nuevosDatos = {
                        fecha:   celdas[0].innerText.trim(),
                        peso:    parseFloat(celdas[1].innerText) || 0,
                        cintura: celdas[2].innerText.trim() !== '' ? parseFloat(celdas[2].innerText) : null,
                        brazo:   celdas[3].innerText.trim() !== '' ? parseFloat(celdas[3].innerText) : null,
                        pierna:  celdas[4].innerText.trim() !== '' ? parseFloat(celdas[4].innerText) : null
                    };

                    const { error } = await supabaseClient
                        .from('medidas')
                        .update(nuevosDatos)
                        .eq('id', rowId);

                    if (error) {
                        alert('Error al actualizar: ' + error.message);
                    }

                    fila.classList.remove('is-editing');
                    btn.innerHTML = '✏️';
                    btn.title = 'Editar';
                    celdas.forEach(celda => {
                        celda.contentEditable = false;
                        celda.classList.remove('editing-active');
                    });
                }
            }
        });
    }


    // ═══════════════════════════════════════════════════════════════
    // GRÁFICO DE MEDIDAS CORPORALES (dinámico por métrica)
    // ═══════════════════════════════════════════════════════════════
    window.miGraficoMedidas = null;

    async function dibujarGraficoMedidas() {
        const msgEmpty = document.getElementById('grafico-peso-empty-msg');
        const selectElement = document.getElementById('medida-select');
        if (!selectElement) return;

        const metricaSeleccionada = selectElement.value;

        const nombresMetricas = {
            'peso': 'Evolución de Peso (kg)',
            'cintura': 'Evolución de Cintura (cm)',
            'brazo': 'Evolución de Brazo (cm)',
            'pierna': 'Evolución de Pierna (cm)'
        };

        const { data, error } = await supabaseClient.from('medidas').select('*');

        if (error) {
            console.error('❌ Error consultando medidas para gráfico:', error);
            return;
        }

        const datosFiltrados = (data || []).filter(m =>
            m[metricaSeleccionada] !== null && m[metricaSeleccionada] !== undefined
        );

        if (datosFiltrados.length === 0) {
            if (msgEmpty) msgEmpty.style.display = 'block';
            if (window.miGraficoMedidas) { window.miGraficoMedidas.destroy(); window.miGraficoMedidas = null; }
            return;
        }

        if (msgEmpty) msgEmpty.style.display = 'none';

        const medidasOrdenadas = datosFiltrados.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
        const labels  = medidasOrdenadas.map(m => m.fecha);
        const valores = medidasOrdenadas.map(m => m[metricaSeleccionada]);

        if (window.miGraficoMedidas) {
            window.miGraficoMedidas.destroy();
            window.miGraficoMedidas = null;
        }

        const canvas = document.getElementById('medidaChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(191, 0, 255, 0.35)');
        gradient.addColorStop(0.5, 'rgba(191, 0, 255, 0.08)');
        gradient.addColorStop(1, 'rgba(191, 0, 255, 0.0)');

        window.miGraficoMedidas = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: nombresMetricas[metricaSeleccionada],
                    data: valores,
                    borderColor: '#bf00ff',
                    backgroundColor: gradient,
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#bf00ff',
                    pointBorderColor: '#1e1e1e',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#bf00ff',
                    pointHoverBorderWidth: 3,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 800, easing: 'easeInOutQuart' },
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: '#e0e0e0',
                            font: { size: 13, weight: '500' },
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 20,
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(30, 30, 30, 0.95)',
                        titleColor: '#bf00ff',
                        bodyColor: '#e0e0e0',
                        borderColor: 'rgba(191, 0, 255, 0.3)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            title: (items) => `📅 ${items[0].label}`,
                            label: (item) => `${nombresMetricas[metricaSeleccionada].split(' ')[2]}: ${item.parsed.y}`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
                        ticks: { color: '#a0a0a0', font: { size: 12 }, padding: 8 }
                    },
                    y: {
                        beginAtZero: false,
                        grid: { color: 'rgba(191, 0, 255, 0.06)', drawBorder: false },
                        ticks: { color: '#a0a0a0', font: { size: 12 }, padding: 12 }
                    }
                }
            }
        });
    }

    const medidaSelect = document.getElementById('medida-select');
    if (medidaSelect) {
        medidaSelect.addEventListener('change', dibujarGraficoMedidas);
    }


    // ═══════════════════════════════════════════════════════════════
    // SECCIÓN 4: CONSULTAS IA (CHAT) — sin cambios
    // ═══════════════════════════════════════════════════════════════
    const chatInput      = document.getElementById('chat-input');
    const btnEnviarChat  = document.getElementById('btn-enviar-chat');
    const chatHistorial  = document.getElementById('chat-historial');

    async function enviarMensajeChat() {
        if (!chatInput || !chatHistorial) return;
        const texto = chatInput.value.trim();
        if (!texto) return;

        const msgUsuario = document.createElement('div');
        msgUsuario.className = 'chat-mensaje usuario';
        msgUsuario.innerHTML = `<div class="mensaje-burbuja">${texto}</div>`;
        chatHistorial.appendChild(msgUsuario);

        chatInput.value = '';
        chatHistorial.scrollTop = chatHistorial.scrollHeight;

        const msgEscribiendo = document.createElement('div');
        msgEscribiendo.className = 'chat-mensaje ia';
        msgEscribiendo.innerHTML = `<div class="mensaje-burbuja escribiendo">El entrenador está pensando... 🧠</div>`;
        chatHistorial.appendChild(msgEscribiendo);
        chatHistorial.scrollTop = chatHistorial.scrollHeight;

        try {
            const { data, error } = await supabaseClient.functions.invoke('chat-ia', {
                body: { mensaje: texto }
            });

            const burbuja = msgEscribiendo.querySelector('.mensaje-burbuja');
            if (burbuja) {
                burbuja.classList.remove('escribiendo');

                if (error) {
                    console.error('❌ Error from Edge Function:', error);
                    burbuja.innerHTML = 'Error de conexión con el cuartel general. Revisa la consola.';
                } else if (data && data.reply) {
                    burbuja.innerHTML = data.reply.replace(/\n/g, '<br>');
                } else {
                    burbuja.innerHTML = 'Recibí una respuesta vacía del modelo.';
                }

                chatHistorial.scrollTop = chatHistorial.scrollHeight;
            }
        } catch (err) {
            console.error('❌ Network error:', err);
            const burbuja = msgEscribiendo.querySelector('.mensaje-burbuja');
            if (burbuja) {
                burbuja.classList.remove('escribiendo');
                burbuja.innerHTML = 'Fallo crítico al contactar con la IA. ¿Está el servidor corriendo?';
                chatHistorial.scrollTop = chatHistorial.scrollHeight;
            }
        }
    }

    if (btnEnviarChat && chatInput) {
        btnEnviarChat.addEventListener('click', enviarMensajeChat);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') enviarMensajeChat();
        });
    }


    // ═══════════════════════════════════════════════════════════════
    // AUTH: Logout + User Display
    // ═══════════════════════════════════════════════════════════════
    // Mostrar email del usuario en el sidebar
    const userEmailDisplay = document.getElementById('user-email-display');
    if (userEmailDisplay && AppState.user) {
        userEmailDisplay.textContent = `👤 ${AppState.user.email}`;
    }

    // Botón Cerrar Sesión
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async (e) => {
            e.preventDefault();
            if (confirm('¿Seguro que quieres cerrar sesión?')) {
                await supabaseClient.auth.signOut();
                localStorage.removeItem('studentfit_semana_id');
                window.location.href = 'login.html';
            }
        });
    }


    // ═══════════════════════════════════════════════════════════════
    // BYOK: Modal de Ajustes (API Keys)
    // ═══════════════════════════════════════════════════════════════
    const modalAjustes    = document.getElementById('modal-ajustes');
    const btnOpenAjustes  = document.getElementById('btn-open-ajustes');
    const btnCloseAjustes = document.getElementById('close-modal-ajustes');
    const geminiKeyInput  = document.getElementById('gemini-key-input');
    const fatsecretKeyInput = document.getElementById('fatsecret-key-input');
    const btnGuardarKeys  = document.getElementById('btn-guardar-keys');
    const keysStatusMsg   = document.getElementById('keys-status-msg');

    // Abrir modal
    if (btnOpenAjustes && modalAjustes) {
        btnOpenAjustes.addEventListener('click', (e) => {
            e.preventDefault();
            modalAjustes.style.display = 'flex';
            sidebar.classList.remove('active');
            // Popular inputs con las keys actuales (si existen)
            if (geminiKeyInput) geminiKeyInput.value = AppState.keys.gemini || '';
            if (fatsecretKeyInput) fatsecretKeyInput.value = AppState.keys.fatsecret || '';
        });
    }

    // Cerrar modal (botón X)
    if (btnCloseAjustes && modalAjustes) {
        btnCloseAjustes.addEventListener('click', () => {
            modalAjustes.style.display = 'none';
        });
    }

    // Cerrar modal (clic fuera)
    if (modalAjustes) {
        modalAjustes.addEventListener('click', (e) => {
            if (e.target === modalAjustes) {
                modalAjustes.style.display = 'none';
            }
        });
    }

    // --- BYOK: Cargar keys del usuario desde user_settings ---
    async function cargarUserSettings() {
        if (!AppState.user) return;

        const { data, error } = await supabaseClient
            .from('user_settings')
            .select('gemini_api_key, fatsecret_api_key')
            .eq('user_id', AppState.user.id)
            .maybeSingle();

        if (error) {
            console.error('❌ Error cargando user_settings:', error);
            return;
        }

        if (data) {
            AppState.keys.gemini = data.gemini_api_key || null;
            AppState.keys.fatsecret = data.fatsecret_api_key || null;
            console.log('🔑 API Keys cargadas desde user_settings');
        } else {
            console.log('ℹ️ Sin API Keys configuradas aún');
        }
    }

    // --- BYOK: Guardar keys (UPSERT) ---
    if (btnGuardarKeys) {
        btnGuardarKeys.addEventListener('click', async () => {
            if (!AppState.user) return;

            const geminiKey = geminiKeyInput.value.trim() || null;
            const fatsecretKey = fatsecretKeyInput.value.trim() || null;

            btnGuardarKeys.disabled = true;
            btnGuardarKeys.textContent = 'Guardando... ⏳';
            if (keysStatusMsg) keysStatusMsg.textContent = '';

            // UPSERT: inserta si no existe, actualiza si ya existe
            const { error } = await supabaseClient
                .from('user_settings')
                .upsert({
                    user_id: AppState.user.id,
                    gemini_api_key: geminiKey,
                    fatsecret_api_key: fatsecretKey
                }, {
                    onConflict: 'user_id'
                });

            btnGuardarKeys.disabled = false;
            btnGuardarKeys.textContent = '💾 Guardar Claves';

            if (error) {
                console.error('❌ Error guardando keys:', error);
                if (keysStatusMsg) {
                    keysStatusMsg.style.color = '#ff4444';
                    keysStatusMsg.textContent = 'Error al guardar: ' + error.message;
                }
                return;
            }

            // Actualizar estado local
            AppState.keys.gemini = geminiKey;
            AppState.keys.fatsecret = fatsecretKey;

            console.log('✅ API Keys guardadas correctamente');
            if (keysStatusMsg) {
                keysStatusMsg.style.color = '#39ff14';
                keysStatusMsg.textContent = '✅ Claves guardadas correctamente.';
                setTimeout(() => { keysStatusMsg.textContent = ''; }, 3000);
            }
        });
    }


    // ═══════════════════════════════════════════════════════════════
    // INIT: Arrancar la aplicación
    // ═══════════════════════════════════════════════════════════════
    console.log('🚀 StudentFit OS — v3.0 (Auth + BYOK + Esquema Relacional)');
    // Cargar datos en paralelo: semanas de entrenamiento + API keys del usuario
    await Promise.all([
        cargarSemanas(),
        cargarUserSettings()
    ]);

});