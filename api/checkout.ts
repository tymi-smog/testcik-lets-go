import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "./lib/db.js";
import { resend } from "./lib/resend.js";
import { authenticateRequest } from "./lib/auth.js";

type CheckoutItem = {
  eventId: string;
  eventTitle: string;
  ticketTypeId: string;
  ticketTypeName: string;
  price: number;
  quantity: number;
};

type CheckoutBody = {
  firstName: string;
  lastName: string;
  email?: string;
  items: CheckoutItem[];
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authUser = await authenticateRequest(req);
  if (!authUser) {
    return res.status(401).json({ error: "Musisz być zalogowany." });
  }

  if (!authUser.is_verified) {
    return res.status(403).json({ error: "Konto musi być zweryfikowane przed zakupem." });
  }

  const body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as CheckoutBody;
  const { firstName, lastName, items } = body || {};
  const email = authUser.email;

  if (!firstName || !lastName || !email || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Missing required checkout data" });
  }

  const normalizedItems = items.map((item) => ({
    eventId: Number(item.eventId),
    ticketTypeId: Number(item.ticketTypeId),
    quantity: Number(item.quantity),
  }));

  if (normalizedItems.some((item) => !item.eventId || !item.ticketTypeId || item.quantity <= 0)) {
    return res.status(400).json({ error: "Invalid checkout items" });
  }

  try {
    await sql`BEGIN`;

    const purchasedLines: Array<{
      eventTitle: string;
      ticketTypeName: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
      remaining: number;
    }> = [];

    for (const item of normalizedItems) {
      const rows = await sql`
        WITH selected AS (
          SELECT 
            tt.id,
            tt.name,
            tt.price,
            tt.available,
            tt.event_id,
            e.title AS event_title
          FROM ticket_types tt
          JOIN events e ON e.id = tt.event_id
          WHERE tt.id = ${item.ticketTypeId}
            AND tt.event_id = ${item.eventId}
          LIMIT 1
        ),
        updated AS (
          UPDATE ticket_types tt
          SET available = tt.available - ${item.quantity}
          FROM selected s
          WHERE tt.id = s.id
            AND s.available >= ${item.quantity}
          RETURNING tt.id, tt.available
        )
        SELECT 
          s.event_title,
          s.name,
          s.price,
          u.available
        FROM selected s
        JOIN updated u ON u.id = s.id
      `;

      if (!rows.length) {
        await sql`ROLLBACK`;
        return res.status(409).json({
          error: "Brak wystarczającej liczby biletów lub bilet nie istnieje",
        });
      }

      const row = rows[0] as {
        event_title: string;
        name: string;
        price: number | string;
        available: number;
      };
      const unitPrice = Number(row.price);

      purchasedLines.push({
        eventTitle: row.event_title,
        ticketTypeName: row.name,
        quantity: item.quantity,
        unitPrice,
        lineTotal: unitPrice * item.quantity,
        remaining: Number(row.available),
      });
    }

    const subtotal = purchasedLines.reduce((sum, line) => sum + line.lineTotal, 0);
    const serviceFee = Number((subtotal * 0.05).toFixed(2));
    const total = Number((subtotal + serviceFee).toFixed(2));

    const lineItemsHtml = purchasedLines
      .map(
        (line) =>
          `<tr>
            <td style="padding:8px;border:1px solid #ddd;">${line.eventTitle}</td>
            <td style="padding:8px;border:1px solid #ddd;">${line.ticketTypeName}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:center;">${line.quantity}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right;">${line.unitPrice.toFixed(2)} zł</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right;">${line.lineTotal.toFixed(2)} zł</td>
          </tr>`
      )
      .join("");

    await resend.emails.send({
      from: "register@panbilecik.eu",
      to: email,
      subject: "Potwierdzenie zakupu biletów",
      html: `
        <h2>Dziękujemy za zakup, ${firstName} ${lastName}!</h2>
        <p>Twoje zamówienie zostało opłacone poprawnie.</p>
        <table style="border-collapse:collapse;width:100%;max-width:800px;">
          <thead>
            <tr>
              <th style="padding:8px;border:1px solid #ddd;text-align:left;">Wydarzenie</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:left;">Bilet</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:center;">Ilość</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:right;">Cena szt.</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:right;">Razem</th>
            </tr>
          </thead>
          <tbody>
            ${lineItemsHtml}
          </tbody>
        </table>
        <p style="margin-top:16px;"><strong>Suma biletów:</strong> ${subtotal.toFixed(2)} zł</p>
        <p><strong>Opłata serwisowa:</strong> ${serviceFee.toFixed(2)} zł</p>
        <p><strong>Do zapłaty:</strong> ${total.toFixed(2)} zł</p>
      `,
    });

    await sql`COMMIT`;

    return res.status(200).json({
      success: true,
      subtotal,
      serviceFee,
      total,
      items: purchasedLines,
    });
  } catch (error) {
    try {
      await sql`ROLLBACK`;
    } catch {
      // Ignore rollback errors
    }
    console.error("CHECKOUT ERROR:", error);
    return res.status(500).json({ error: "Checkout failed" });
  }
}
