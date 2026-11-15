import { NextResponse } from "next/server";

export async function POST(request) {
  let email;

  try {
    const body = await request.json();
    email = (body.email || "").trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!looksLikeEmail) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const apiKey = process.env.LOOPS_API_KEY;
  const listId = process.env.LOOPS_MAILING_LIST_ID;

  if (!apiKey || !listId) {
    console.error("Loops env variables are missing");
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const response = await fetch("https://app.loops.so/api/v1/contacts/create", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      source: "lead-gen site",
      subscribed: true,
      mailingLists: { [listId]: true },
    }),
  });

  // 409 means this email is already a contact. We treat it as success so
  // the form never reveals who is or isn't on the list.
  if (response.ok || response.status === 409) {
    return NextResponse.json({ ok: true });
  }

  console.error("Loops error:", response.status, await response.text());
  return NextResponse.json({ error: "Could not subscribe" }, { status: 502 });
}