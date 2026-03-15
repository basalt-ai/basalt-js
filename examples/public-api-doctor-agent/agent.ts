import "dotenv/config";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import {
  createTrace,
  buildGenerationLog,
  type CreateTraceParams,
} from "./basalt-api";

const FEATURE_SLUG = process.env.FEATURE_SLUG;

const MAX_MESSAGES = 10;
const MIN_MESSAGES = 4;
const CONCLUSION_TAG = "[CONCLUSION]";

const DOCTOR_SYSTEM_PROMPT = `Tu es un médecin généraliste qui répond aux patients via une messagerie sécurisée du cabinet médical.
Tu dois :
- Poser des questions pertinentes pour comprendre la situation clinique
- Être empathique et professionnel
- Utiliser un langage accessible
- Quand tu as suffisamment d'informations, donner ton avis médical et tes recommandations

Garde tes réponses concises (2-3 phrases max).
Quand tu estimes avoir assez d'éléments pour conclure, termine ta réponse par ${CONCLUSION_TAG}.`;

const openai = new OpenAI();

let logCounter = 0;
function nextLogId(): string {
  return `log-${Date.now()}-${++logCounter}`;
}

async function callPatient(
  patientSystemPrompt: string,
  patientMessages: ChatCompletionMessageParam[],
  messageNumber: number,
  conversationId: string,
  experimentId?: string,
): Promise<string> {
  const startTime = Date.now();

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: patientSystemPrompt },
    ...(patientMessages.length === 0
      ? [{ role: "user" as const, content: "Écris ton premier message au cabinet médical." }]
      : patientMessages),
  ];

  const input =
    patientMessages.length === 0
      ? "Écris ton premier message au cabinet médical."
      : (patientMessages[patientMessages.length - 1].content as string);

  const genStart = Date.now();
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
  });
  const genEnd = Date.now();

  const text = completion.choices[0]?.message?.content ?? "";
  const endTime = Date.now();

  // await createTrace({
  //   featureSlug: FEATURE_SLUG,
  //   name: "patient-message",
  //   input,
  //   output: text,
  //   startTime: new Date(startTime).toISOString(),
  //   endTime: new Date(endTime).toISOString(),
  //   metadata: {
  //     conversation_id: conversationId,
  //     message_number: messageNumber,
  //     value: `${conversationId}-${messageNumber}`,
  //   },
  //   user: { id: "patient-simulation", name: "patient-simulation" },
  //   organization: { id: "clinic-example", name: "clinic-example" },
  //   ...(experimentId ? { experiment: { id: experimentId } } : {}),
  //   logs: [
  //     buildGenerationLog(nextLogId(), completion, messages, text, genStart, genEnd, {
  //       conversation_id: conversationId,
  //       message_number: messageNumber,
  //       value: `${conversationId}-${messageNumber}`,
  //     }),
  //   ],
  //   evaluators: [{ slug: "clarity" }],
  //   evaluationConfig: { sampleRate: 1 },
  // });

  return text;
}

async function callDoctor(
  doctorMessages: ChatCompletionMessageParam[],
  messageNumber: number,
  conversationId: string,
  experimentId?: string,
): Promise<string> {
  const canConclude = messageNumber >= MIN_MESSAGES;

  const systemPrompt = canConclude
    ? DOCTOR_SYSTEM_PROMPT
    : DOCTOR_SYSTEM_PROMPT.replace(
        `Quand tu estimes avoir assez d'éléments pour conclure, termine ta réponse par ${CONCLUSION_TAG}.`,
        "Ne conclus pas encore, pose des questions pour mieux comprendre la situation.",
      );

  const startTime = Date.now();

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...doctorMessages,
  ];

  const lastPatientMsg = doctorMessages[doctorMessages.length - 1].content as string;

  const genStart = Date.now();
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
  });
  const genEnd = Date.now();

  const text = completion.choices[0]?.message?.content ?? "";
  const endTime = Date.now();

  await createTrace({
    featureSlug: FEATURE_SLUG,
    name: "doctor-message",
    input: lastPatientMsg,
    output: text,
    startTime: new Date(startTime).toISOString(),
    endTime: new Date(endTime).toISOString(),
    metadata: {
      conversation_id: conversationId,
      message_number: messageNumber,
      value: `${conversationId}-${messageNumber}`,
    },
    user: { id: "doctor-agent", name: "doctor-agent" },
    organization: { id: "clinic-example", name: "clinic-example" },
    ...(experimentId ? { experiment: { id: experimentId } } : {}),
    logs: [
      buildGenerationLog(nextLogId(), completion, messages, text, genStart, genEnd, {
        conversation_id: conversationId,
        message_number: messageNumber,
        value: `${conversationId}-${messageNumber}`,
      }),
    ],
    evaluators: [{ slug: "hallucinations" }, { slug: "clarity" }, { slug: "technical-precision" }],
    evaluationConfig: { sampleRate: 1 },
  });

  return text;
}

export async function agent(
  patientSystemPrompt: string,
  ctx?: { experimentId?: string; conversationId?: string },
) {
  ctx = ctx ?? {};
  const conversationId = ctx.conversationId ?? `conv-${Date.now()}`;
  const conversationLog: { role: string; content: string; messageNumber: number }[] = [];

  const doctorMessages: ChatCompletionMessageParam[] = [];
  const patientMessages: ChatCompletionMessageParam[] = [];

  let messageNumber = 0;

  // Message 1: Patient sends the first message
  messageNumber++;
  const firstPatientMsg = await callPatient(
    patientSystemPrompt, patientMessages, messageNumber, conversationId, ctx.experimentId,
  );
  conversationLog.push({ role: "patient", content: firstPatientMsg, messageNumber });

  doctorMessages.push({ role: "user", content: firstPatientMsg });
  patientMessages.push({ role: "assistant", content: firstPatientMsg });

  // Conversation loop
  let concluded = false;

  while (messageNumber < MAX_MESSAGES && !concluded) {
    // Doctor responds
    messageNumber++;
    const doctorMsg = await callDoctor(
      doctorMessages, messageNumber, conversationId, ctx.experimentId,
    );
    conversationLog.push({ role: "doctor", content: doctorMsg, messageNumber });

    doctorMessages.push({ role: "assistant", content: doctorMsg });
    patientMessages.push({ role: "user", content: doctorMsg });

    if (doctorMsg.includes(CONCLUSION_TAG) && messageNumber >= MIN_MESSAGES) {
      concluded = true;
      break;
    }

    if (messageNumber >= MAX_MESSAGES) break;

    // Patient responds
    messageNumber++;
    const patientMsg = await callPatient(
      patientSystemPrompt, patientMessages, messageNumber, conversationId, ctx.experimentId,
    );
    conversationLog.push({ role: "patient", content: patientMsg, messageNumber });

    doctorMessages.push({ role: "user", content: patientMsg });
    patientMessages.push({ role: "assistant", content: patientMsg });
  }

  return { conversationId, messages: conversationLog };
}
