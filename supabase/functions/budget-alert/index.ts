/**
 * Supabase Edge Function – Budget Alert Email (NIVEL ROBUSTO)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL = 'onboarding@resend.dev';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlertPayload {
  user_id: string;
  email: string;
  salary: number;
  totalSpent: number;
  totalFixed: number;
  totalDaily: number;
  pct: number;
  monthKey: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: AlertPayload = await req.json();
    const { email, salary, totalSpent, totalFixed, totalDaily, pct, monthKey } = payload;

    console.log(`[BudgetAlert] Proc de alerta para ${email}. Consumo: ${pct}%`);

    if (!email || !salary) {
      throw new Error('Missing required fields: email or salary');
    }

    if (!RESEND_API_KEY) {
      console.error('[BudgetAlert] ERROR: RESEND_API_KEY no configurada.');
      return new Response(JSON.stringify({ error: 'Mail service not configured' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const now = new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' });

    // HTML del correo
    const html = `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #ef4444; margin-top: 0;">⚠️ Límite de Presupuesto</h2>
        <p>Has consumido el <strong>${pct}%</strong> de tu sueldo este mes (${monthKey}).</p>
        
        <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Sueldo Mensual</td>
              <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #0f172a;">$${salary.toLocaleString('es-CL')}</td>
            </tr>
            <tr style="border-top: 1px solid #e2e8f0;">
              <td style="padding: 10px 0 0 0; font-weight: bold; color: #0f172a;">Total Gastado</td>
              <td style="padding: 10px 0 0 0; text-align: right; font-weight: bold; color: #ef4444; font-size: 18px;">
                $${totalSpent.toLocaleString('es-CL')}
              </td>
            </tr>
          </table>
        </div>
        <p style="color: #94a3b8; font-size: 11px; margin-top: 24px;">Reporte generado el ${now}</p>
      </div>
    `;

    console.log('[BudgetAlert] Enviando a Resend...');
    
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [email],
        subject: `⚠️ Alerta: Has superado el ${pct}% de tu presupuesto`,
        html: html,
      }),
    });

    const resData = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error('[BudgetAlert] Resend API Error:', resData);
      return new Response(JSON.stringify({ error: 'Resend delivery failed', detail: resData }), {
        status: res.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[BudgetAlert] ¡Éxito!', resData);

    return new Response(JSON.stringify({ success: true, id: resData.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[BudgetAlert] Error crítico:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
