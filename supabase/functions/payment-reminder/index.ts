import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const FROM_EMAIL = 'onboarding@resend.dev'; // Usar el raw para mayor compatibilidad inicial

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

    if (!RESEND_API_KEY) {
      console.error('Error: RESEND_API_KEY no configurada');
      return new Response(JSON.stringify({ error: 'Mail service not configured' }), {
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

    console.log(`--- Recordatorios: Día ${currentDay}, Mes ${monthKey} ---`);

    // 2. Consultar gastos
    const { data: expenses, error: expensesError } = await supabaseAdmin
      .from('fixed_expenses')
      .select(`
        *,
        profiles!inner (
          email,
          alert_email,
          full_name
        )
      `)
      .eq('due_day', currentDay)
      .eq('is_paid', false)
      .eq('month', monthKey);

    if (expensesError) {
      console.error('Database error:', expensesError);
      throw expensesError;
    }

    if (!expenses || expenses.length === 0) {
      console.log('No hay pagos para hoy.');
      return new Response(JSON.stringify({ message: 'No payments today', debug: { day: currentDay, month: monthKey } }), {
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
    for (const uid in userGroups) {
      const group = userGroups[uid];
      const html = `<h2>Recordatorio de Pago</h2><p>Hola ${group.name}, hoy vencen: ${group.expenses.map((e:any)=> e.label || e.category).join(', ')}</p>`;
      
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [group.email],
          subject: `Recordatorio de Pago (${currentDay})`,
          html: html,
        }),
      });
      processed.push({ email: group.email, status: res.status });
    }

    return new Response(JSON.stringify({ success: true, processed }), {
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
