import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY_BUDGET') ?? Deno.env.get('RESEND_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
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
    const { user_id, email, salary, totalSpent, totalFixed, totalDaily, pct, monthKey } = payload;

    console.log(`[BudgetAlert] Procesando alerta premium detallada para ${email}. Consumo: ${pct}%`);

    if (!RESEND_API_KEY) {
      throw new Error('Mail service not configured (Budget)');
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Formatear fechas para las consultas
    // monthKey viene como YYYY-MM
    const firstDay = `${monthKey}-01`;
    const lastDay = `${monthKey}-31`; // Suficiente para cubrir el mes

    console.log(`[BudgetAlert] Querying with firstDay: ${firstDay}, lastDay: ${lastDay}`);

    // 1. Obtener detalles de gastos reales para el desglose
    const [fixedRes, dailyRes] = await Promise.all([
      supabaseAdmin.from('fixed_expenses')
        .select('label, category, amount')
        .eq('user_id', user_id)
        .eq('month', firstDay) // Importante: debe ser el primer día del mes
        .order('amount', { ascending: false })
        .limit(5),
      supabaseAdmin.from('daily_expenses')
        .select('description, category, amount')
        .eq('user_id', user_id)
        .gte('date', firstDay)
        .lte('date', lastDay)
        .order('amount', { ascending: false })
        .limit(5)
    ]);

    const topFixed = fixedRes.data || [];
    const topDaily = dailyRes.data || [];

    console.log(`[BudgetAlert] Results - Fixed: ${topFixed.length}, Daily: ${topDaily.length}`);
    if (fixedRes.error) console.error('[BudgetAlert] Fixed Query Error:', fixedRes.error);
    if (dailyRes.error) console.error('[BudgetAlert] Daily Query Error:', dailyRes.error);

    // Cálculo de color para la barra de progreso
    const progressColor = pct >= 90 ? '#ef4444' : pct >= 75 ? '#f97316' : '#3b82f6';
    const now = new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' });

    // HTML Premium Mixto (Tarjetas + Listas)
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
          
          .stats-grid { display: table; width: 100%; border-spacing: 12px 0; margin: 0 -12px 24px -12px; }
          .stat-card { background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; display: table-cell; width: 50%; vertical-align: top; }
          .stat-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
          .stat-value { font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 8px; }
          
          .section-title { font-size: 16px; font-weight: 700; color: #0f172a; margin: 32px 0 12px 0; }
          .expense-item { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
          .expense-name { color: #334155; }
          .expense-amount { font-weight: 600; color: #0f172a; }
          
          .highlight-item { background: #fff7ed; border: 1px solid #ffedd5; padding: 16px; border-radius: 12px; text-align: center; margin-top: 32px; }
          
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
            <p>Has superado el límite configurado. Aquí tienes el desglose actual de tus gastos para ${monthKey}:</p>
            
            <div class="progress-container">
              <div class="progress-bar"></div>
            </div>
            
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-label">Sueldo</div>
                <div class="stat-value">$${salary.toLocaleString('es-CL')}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Gastado Total</div>
                <div class="stat-value" style="color: ${progressColor};">$${totalSpent.toLocaleString('es-CL')}</div>
              </div>
            </div>

            <div class="section-title">📉 Gastos Fijos Principales</div>
            ${topFixed.length > 0 ? topFixed.map(e => `
              <div class="expense-item">
                <span class="expense-name">${e.label || e.category}</span>
                <span class="expense-amount">$${e.amount.toLocaleString('es-CL')}</span>
              </div>
            `).join('') : '<p style="font-size: 13px; color: #94a3b8;">No hay gastos fijos este mes.</p>'}

            <div class="section-title">🛍️ Gastos Diarios Principales</div>
            ${topDaily.length > 0 ? topDaily.map(e => `
              <div class="expense-item">
                <span class="expense-name">${e.description || e.category}</span>
                <span class="expense-amount">$${e.amount.toLocaleString('es-CL')}</span>
              </div>
            `).join('') : '<p style="font-size: 13px; color: #94a3b8;">No hay gastos diarios registrados.</p>'}

            <div class="highlight-item">
               <p style="margin: 0; color: #9a3412; font-size: 14px; font-weight: 500;">
                Dinero restante: <strong>$${(salary - totalSpent).toLocaleString('es-CL')}</strong>
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
        subject: `🚨 Alerta: ${pct}% de tu presupuesto consumido`,
        html: html,
      }),
    });

    const resData = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error('[BudgetAlert] Resend Error:', resData);
      return new Response(JSON.stringify({ error: 'Failed' }), { status: res.status, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });

  } catch (error: any) {
    console.error('[BudgetAlert] Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
