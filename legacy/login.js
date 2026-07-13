// ═══════════════════════════════════════════════════════════════
// LOGIN.JS — Autenticación con Supabase Auth
// Maneja: Login con email/password, Registro, Redirección
// ═══════════════════════════════════════════════════════════════

// --- Conexión a Supabase (mismas credenciales que app.js) ---
const SUPABASE_URL = 'https://yezfelmfxegpjtudympe.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllemZlbG1meGVncGp0dWR5bXBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5MDkzODksImV4cCI6MjA5NTQ4NTM4OX0.YkL7ZfGpwKRx1FF2JoRA_KH-whOwHt3c21nZW7HuAEQ';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener('DOMContentLoaded', async () => {

    // --- Si ya hay sesión activa, saltar directo al dashboard ---
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        window.location.href = 'index.html';
        return;
    }

    // --- DOM refs ---
    const form         = document.getElementById('login-form');
    const emailInput   = document.getElementById('login-email');
    const passInput    = document.getElementById('login-password');
    const btnLogin     = document.getElementById('btn-login');
    const btnRegister  = document.getElementById('btn-register');
    const msgEl        = document.getElementById('login-msg');

    // Helper: mostrar mensaje de error o éxito
    function showMsg(text, isError = true) {
        msgEl.textContent = text;
        msgEl.className = isError ? 'login-error' : 'login-success';
    }

    // Helper: deshabilitar/habilitar botones durante operación async
    function setLoading(loading) {
        btnLogin.disabled = loading;
        btnRegister.disabled = loading;
        btnLogin.textContent = loading ? 'Conectando... ⏳' : 'Iniciar Sesión';
        btnRegister.textContent = loading ? '⏳' : 'Crear Cuenta Nueva';
    }

    // ═══════════════════════════════════════════
    // ACCIÓN: Iniciar Sesión
    // ═══════════════════════════════════════════
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        showMsg('');

        const email = emailInput.value.trim();
        const password = passInput.value;

        if (!email || !password) {
            showMsg('Rellena email y contraseña.');
            return;
        }

        setLoading(true);

        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        setLoading(false);

        if (error) {
            console.error('❌ Login error:', error);
            // Traducir errores comunes al español
            if (error.message.includes('Invalid login credentials')) {
                showMsg('Email o contraseña incorrectos.');
            } else if (error.message.includes('Email not confirmed')) {
                showMsg('Confirma tu email antes de iniciar sesión.');
            } else {
                showMsg(error.message);
            }
            return;
        }

        console.log('✅ Login exitoso:', data.user.email);
        window.location.href = 'index.html';
    });

    // ═══════════════════════════════════════════
    // ACCIÓN: Registrarse
    // ═══════════════════════════════════════════
    btnRegister.addEventListener('click', async () => {
        showMsg('');

        const email = emailInput.value.trim();
        const password = passInput.value;

        if (!email || !password) {
            showMsg('Rellena email y contraseña para registrarte.');
            return;
        }

        if (password.length < 6) {
            showMsg('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        setLoading(true);

        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password
        });

        setLoading(false);

        if (error) {
            console.error('❌ Register error:', error);
            if (error.message.includes('already registered')) {
                showMsg('Este email ya está registrado. Intenta iniciar sesión.');
            } else {
                showMsg(error.message);
            }
            return;
        }

        // Supabase puede requerir confirmación por email
        if (data.user && data.user.identities && data.user.identities.length === 0) {
            showMsg('Este email ya está registrado.', true);
        } else if (data.session) {
            // Auto-login tras registro (si no requiere confirmación por email)
            console.log('✅ Registro + login automático:', data.user.email);
            window.location.href = 'index.html';
        } else {
            // Requiere confirmación por email
            showMsg('✅ Cuenta creada. Revisa tu email para confirmar.', false);
        }
    });
});
