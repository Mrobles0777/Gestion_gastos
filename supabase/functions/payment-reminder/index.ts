import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY_PAYMENT') ?? Deno.env.get('RESEND_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const FROM_EMAIL = 'onboarding@resend.dev'; 

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Leer payload opcional (para simulación manual)
    let isSimulation = false;
    try {
      const payload = await req.json();
      isSimulation = payload?.is_simulation === true;
    } catch {
      // No hay payload, es una llamada normal (cron)
    }

    if (!RESEND_API_KEY) {
      console.error('[PaymentReminder] ERROR: RESEND_API_KEY_PAYMENT no configurada');
      return new Response(JSON.stringify({ error: 'Mail service not configured (Payment)' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Obtener fecha actual en Santiago
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('es-CL', {
      timeZone: 'America/Santiago',
      year: 'numeric',
      month: '2-digit',
      day: 'numeric',
    });
    const parts = formatter.formatToParts(now);
    const dayVal = parts.find(p => p.type === 'day')?.value;
    const monthVal = parts.find(p => p.type === 'month')?.value;
    const yearVal = parts.find(p => p.type === 'year')?.value;

    const currentDay = parseInt(dayVal || '1');
    const monthKey = `${yearVal}-${monthVal}-01`;

    console.log(`[PaymentReminder] Consultando: Día ${currentDay}, Mes ${monthKey} (Simulación: ${isSimulation})`);
    console.log(`[PaymentReminder] API Key detectada: ${RESEND_API_KEY.substring(0, 5)}...`);

    // 2. Consultar gastos
    let query = supabaseAdmin
      .from('fixed_expenses')
      .select(`
        *,
        profiles!inner (
          email,
          alert_email,
          full_name
        )
      `)
      .eq('is_paid', false)
      .eq('month', monthKey);

    // Si no es simulación, filtrar estrictamente por el día de hoy
    if (!isSimulation) {
      query = query.eq('due_day', currentDay);
    } else {
      // En simulación, traer máximo 3 para no saturar, de cualquier día
      query = query.limit(3);
    }

    const { data: expenses, error: expensesError } = await query;

    if (expensesError) {
      console.error('[PaymentReminder] Error en la base de datos:', expensesError);
      throw expensesError;
    }

    console.log(`[PaymentReminder] Gastos encontrados: ${expenses?.length || 0}`);

    if (!expenses || expenses.length === 0) {
      const msg = isSimulation 
        ? 'No hay gastos pendientes este mes para simular el envío.' 
        : 'No hay pagos pendientes para hoy.';
      console.log(`[PaymentReminder] ${msg}`);
      return new Response(JSON.stringify({ 
        message: msg, 
        debug: { day: currentDay, month: monthKey, isSimulation } 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Agrupar
    const userGroups: Record<string, any> = {};
    expenses.forEach((exp: any) => {
      const uid = exp.user_id;
      if (!userGroups[uid]) {
        userGroups[uid] = {
          email: exp.profiles.alert_email || exp.profiles.email,
          name: exp.profiles.full_name || 'Usuario',
          expenses: []
        };
      }
      userGroups[uid].expenses.push(exp);
    });

    // 4. Enviar
    const processed = [];
    let hasError = false;
    let lastError = null;

    for (const uid in userGroups) {
      const group = userGroups[uid];
      const html = `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
          <h2 style="color: #3b82f6;">Recordatorio de Pago</h2>
          <p>Hola <strong>${group.name}</strong>,</p>
          <p>Te recordamos que hoy vencen los siguientes gastos fijos:</p>
          <ul>
            ${group.expenses.map((e: any) => `<li>${e.label || e.category}: <strong>$${e.amount.toLocaleString('es-CL')}</strong></li>`).join('')}
          </ul>
          <p>Por favor, asegúrate de marcarlos como pagados en la aplicación una vez realizados.</p>
        </div>
      `;
      
      console.log(`[PaymentReminder] Enviando recordatorio a ${group.email}...`);

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [group.email],
          subject: `🔔 Recordatorio de Pago - ${currentDay}/${monthVal}`,
          html: html,
        }),
      });

      const resData = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error(`[PaymentReminder] Error de Resend para ${group.email}:`, resData);
        hasError = true;
        lastError = resData;
        processed.push({ email: group.email, status: 'error', detail: resData });
      } else {
        console.log(`[PaymentReminder] Éxito para ${group.email}:`, resData.id);
        processed.push({ email: group.email, status: 'success', id: resData.id });
      }
    }

    if (hasError && processed.length === 1) {
      // Si solo intentamos uno y falló, devolvemos error 500 para que la App lo note
      return new Response(JSON.stringify({ error: 'Resend delivery failed', processed, lastError }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: !hasError, processed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('Critical internal error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
