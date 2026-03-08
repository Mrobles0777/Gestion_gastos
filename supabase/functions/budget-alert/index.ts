/**
 * Supabase Edge Function – Budget Alert Email
 *
 * Invoked from the client when a user exceeds their custom salary threshold.
 * Sends an email via Resend and marks the alert as sent.
 * Version: 1.0.1 (Triggered via GitHub Actions)
 *
 * Deploy: supabase functions deploy budget-alert
 * Set secret: supabase secrets set RESEND_API_KEY=re_xxxx
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL = 'Gestión de Gastos <onboarding@resend.dev>';

interface AlertPayload {
  user_id: string;
  email: string;
  salary: number;
  totalSpent: number;
  pct: number;
  monthKey: string;
}

serve(async (req) => {
  try {
    const payload: AlertPayload = await req.json();
    const { email, salary, totalSpent, pct, monthKey } = payload;

    if (!email || !salary) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400 },
      );
    }

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
        subject: `⚠️ Alerta: superaste el ${pct}% de tu sueldo`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #ef4444;">⚠️ Alerta de Presupuesto</h2>
            <p>Has consumido el <strong>${pct}%</strong> de tu sueldo este mes (${monthKey}).</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Sueldo mensual</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">
                  $${salary.toLocaleString('es-CL')}
                </td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">Total gastado</td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold; color: #ef4444;">
                  $${totalSpent.toLocaleString('es-CL')}
                </td>
              </tr>
            </table>
            <p style="color: #6b7280; font-size: 14px;">
              Este correo se envía una sola vez por mes al superar el ${pct}% del presupuesto.
            </p>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorBody = await emailResponse.text();
      return new Response(
        JSON.stringify({ error: `Email send failed: ${errorBody}` }),
        { status: 500 },
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Alert email sent' }),
      { status: 200 },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500 },
    );
  }
});
