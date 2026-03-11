import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY_BUDGET') ?? Deno.env.get('RESEND_API_KEY') ?? '';
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

    console.log(`[BudgetAlert] Procesando alerta simplificada para ${email}. Consumo: ${pct}%`);

    if (!RESEND_API_KEY) {
      throw new Error('Mail service not configured (Budget)');
    }

    // Cálculo de color para la barra de progreso
    const progressColor = pct >= 90 ? '#ef4444' : pct >= 75 ? '#f97316' : '#3b82f6';
    const now = new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' });

    // HTML Premium Simplificado
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; line-height: 1.6; margin: 0; padding: 0; background-color: #f1f5f9; }
          .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
          .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 40px 32px; text-align: center; color: white; }
          .alert-badge { background: rgba(255, 255, 255, 0.2); padding: 8px 16px; border-radius: 99px; font-size: 14px; font-weight: 600; display: inline-block; margin-bottom: 16px; }
          .limit-value { font-size: 64px; font-weight: 800; margin: 8px 0; line-height: 1; }
          .limit-label { font-size: 18px; opacity: 0.9; }
          
          .content { padding: 32px; }
          .progress-container { background: #f1f5f9; height: 12px; border-radius: 6px; margin: 24px 0; overflow: hidden; }
          .progress-bar { height: 100%; border-radius: 6px; width: ${Math.min(pct, 100)}%; background-color: ${progressColor}; transition: width 0.5s ease; }
          
          .summary-card { background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 16px; overflow: hidden; }
          .summary-item { display: flex; justify-content: space-between; padding: 16px; border-bottom: 1px solid #e2e8f0; }
          .summary-item:last-child { border-bottom: none; }
          .label { font-size: 14px; color: #64748b; font-weight: 600; }
          .value { font-size: 16px; font-weight: 700; color: #0f172a; }
          
          .highlight-item { background: #fff7ed; border: 1px solid #ffedd5; padding: 16px; border-radius: 12px; text-align: center; margin-top: 24px; }
          .highlight-text { color: #9a3412; font-size: 14px; font-weight: 600; margin: 0; }
          
          .footer { padding: 24px; text-align: center; font-size: 12px; color: #94a3b8; background: #f8fafc; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="alert-badge">⚠️ RECORDATORIO DE LÍMITE</div>
            <div class="limit-value">${pct}%</div>
            <div class="limit-label">Presupuesto Consumido</div>
          </div>
          
          <div class="content">
            <p style="margin-top: 0;">Hola,</p>
            <p>Tu consumo ha superado el límite configurado. Aquí tienes el desglose total para el mes de ${monthKey}:</p>
            
            <div class="progress-container">
              <div class="progress-bar"></div>
            </div>
            
            <div class="summary-card">
              <div class="summary-item">
                <span class="label">Sueldo Mensual</span>
                <span class="value">$${salary.toLocaleString('es-CL')}</span>
              </div>
              <div class="summary-item">
                <span class="label">Total Gastos Fijos</span>
                <span class="value">$${totalFixed.toLocaleString('es-CL')}</span>
              </div>
              <div class="summary-item">
                <span class="label">Total Gastos Diarios</span>
                <span class="value">$${totalDaily.toLocaleString('es-CL')}</span>
              </div>
              <div class="summary-item" style="background: #f1f5f9;">
                <span class="label" style="color: #1e293b;">GASTADO TOTAL</span>
                <span class="value" style="color: ${progressColor}; font-size: 18px;">$${totalSpent.toLocaleString('es-CL')}</span>
              </div>
            </div>

            <div class="highlight-item">
              <p class="highlight-text">
                Dinero disponible: <strong>$${(salary - totalSpent).toLocaleString('es-CL')}</strong>
              </p>
            </div>
          </div>
          
          <div class="footer">
            Gestión Gastos • ${now}
          </div>
        </div>
      </body>
      </html>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [email],
        subject: `🚨 Alerta de Gastos: ${pct}% de tu sueldo consumido`,
        html: html,
      }),
    });

    const resData = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error('[BudgetAlert] Resend Error:', resData);
      return new Response(JSON.stringify({ error: 'Failed to send email', detail: resData }), { status: res.status, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true, id: resData.id }), { headers: corsHeaders });

  } catch (error: any) {
    console.error('[BudgetAlert] Fatal Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
