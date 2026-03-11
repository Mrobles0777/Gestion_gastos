/**
 * Supabase Edge Function – Budget Alert Email
 *
 * Invoked from the client when a user exceeds their custom salary threshold.
 * Sends an email via Resend and marks the alert as sent.
 * Version: 1.0.2 (Triggered via GitHub Actions)
 *
 * Deploy: supabase functions deploy budget-alert
 * Set secret: supabase secrets set RESEND_API_KEY=re_xxxx
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL = 'Gestión de Gastos <onboarding@resend.dev>';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    const payload: AlertPayload = await req.json();
    const { email, salary, totalSpent, totalFixed, totalDaily, pct, monthKey } = payload;

    console.log('--- Budget Alert Debug ---');
    console.log('Target Email:', email);
    console.log('Spending Data:', { salary, totalSpent, pct, monthKey });
    console.log('API Key Present:', !!RESEND_API_KEY);

    if (!email || !salary) {
      console.error('Error: Missing required fields (email or salary)');
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!RESEND_API_KEY) {
      console.error('Error: RESEND_API_KEY is not set in Supabase Secrets');
      return new Response(
        JSON.stringify({ error: 'Mail service not configured (API Key missing)' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const now = new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' });
    console.log('Current Timestamp:', now);

    // Send email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [email],
        subject: `⚠️ Alerta: El umbral de gastos ha sido superado`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h2 style="color: #ef4444; margin-top: 0;">⚠️ Alerta de Presupuesto</h2>
            <p>Hola,</p>
            <p>Se ha superado el umbral de gastos configurado. Has consumido el <strong>${pct}%</strong> de tu sueldo este mes (${monthKey}).</p>
            
            <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; margin: 20px 0;">
              <h3 style="margin-top: 0; font-size: 16px; color: #374151;">Resumen de Gastos</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0; color: #6b7280;">Sueldo Mensual</td>
                  <td style="padding: 6px 0; text-align: right; font-weight: bold;">$${salary.toLocaleString('es-CL')}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280;">Gastos Fijos</td>
                  <td style="padding: 6px 0; text-align: right; font-weight: bold;">$${totalFixed.toLocaleString('es-CL')}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280;">Gastos Diarios</td>
                  <td style="padding: 6px 0; text-align: right; font-weight: bold;">$${totalDaily.toLocaleString('es-CL')}</td>
                </tr>
                <tr style="border-top: 1px solid #e5e7eb;">
                  <td style="padding: 10px 0 0 0; font-weight: bold; color: #111827;">Total Gastado</td>
                  <td style="padding: 10px 0 0 0; text-align: right; font-weight: bold; color: #ef4444; font-size: 18px;">
                    $${totalSpent.toLocaleString('es-CL')}
                  </td>
                </tr>
              </table>
            </div>

            <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
              <strong>Fecha y hora del reporte:</strong> ${now}<br>
              Este correo es generado automáticamente al registrar un gasto que supera el límite establecido.
            </p>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorBody = await emailResponse.text();
      return new Response(
        JSON.stringify({ error: `Email send failed: ${errorBody}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Alert email sent' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
