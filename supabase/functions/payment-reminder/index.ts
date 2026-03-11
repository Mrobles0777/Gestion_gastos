import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const FROM_EMAIL = 'Gestión de Gastos <onboarding@resend.dev>';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Manejar preflight de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
    try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (!RESEND_API_KEY) {
      console.error('Error: RESEND_API_KEY no está configurada.');
      return new Response(JSON.stringify({ error: 'Mail service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Obtener el día actual de Santiago, Chile
    const now = new Date();
    const santiagoTime = new Intl.DateTimeFormat('es-CL', {
      timeZone: 'America/Santiago',
      day: 'numeric',
      month: '2-digit',
      year: 'numeric'
    }).formatToParts(now);
    
    const currentDay = parseInt(santiagoTime.find(p => p.type === 'day')?.value || '1');
    const monthKey = `${santiagoTime.find(p => p.type === 'year')?.value}-${santiagoTime.find(p => p.type === 'month')?.value}-01`;

    console.log(`--- Iniciando Recordatorios de Pago (Día: ${currentDay}, Mes: ${monthKey}) ---`);

    // 2. Consultar gastos vencidos hoy que no estén pagados
    // NOTA: Requiere que fixed_expenses tenga FK hacia profiles para el join
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
      console.error('Error consultando base de datos:', expensesError);
      throw expensesError;
    }

    if (!expenses || expenses.length === 0) {
      console.log('No hay pagos pendientes para hoy.');
      return new Response(JSON.stringify({ message: 'No pending payments today' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Agrupar por usuario
    const userGroups: { [key: string]: any } = {};
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

    console.log(`Usuarios a notificar: ${Object.keys(userGroups).length}`);

    // 4. Enviar correos
    const results = [];
    for (const uid in userGroups) {
      const group = userGroups[uid];
      
      console.log(`Enviando recordatorio a: ${group.email}`);

      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #3b82f6; margin-top: 0;">📅 Recordatorio de Pago</h2>
          <p>Hola ${group.name},</p>
          <p>Hoy vencen los siguientes gastos fijos que aún no has marcado como pagados:</p>
          
          <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="border-bottom: 2px solid #e5e7eb;">
                  <th style="padding: 8px 0; text-align: left; color: #374151;">Gasto</th>
                  <th style="padding: 8px 0; text-align: right; color: #374151;">Monto</th>
                </tr>
              </thead>
              <tbody>
                ${group.expenses.map((e: any) => `
                  <tr style="border-bottom: 1px solid #f3f4f6;">
                    <td style="padding: 10px 0; color: #4b5563;">${e.label || e.category}</td>
                    <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #111827;">
                      $${e.amount.toLocaleString('es-CL')}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <p>Puedes marcarlos como pagados desde la aplicación para mantener tu presupuesto al día.</p>
          <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
            Este es un recordatorio automático de Gestión de Gastos.
          </p>
        </div>
      `;

      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [group.email],
            subject: `📅 Recordatorio de Pago: Vence hoy (${currentDay})`,
            html: emailHtml,
          }),
        });

        results.push({ email: group.email, status: res.status });
      } catch (err: any) {
        console.error(`Fallo al enviar correo a ${group.email}:`, err);
        results.push({ email: group.email, status: 'error', message: err.message });
      }
    }

    return new Response(JSON.stringify({ success: true, processed: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error crítico en Recordatorios de Pago:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
