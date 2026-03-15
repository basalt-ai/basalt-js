import "dotenv/config";
import { Basalt, BasaltContextManager } from "../../src";
import { openai } from "@ai-sdk/openai";
import { generateText, CoreMessage } from "ai";

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

async function callPatient(
  patientSystemPrompt: string,
  patientMessages: CoreMessage[],
  messageNumber: number,
  conversationId: string,
  deps: { basalt: Basalt },
  experimentId?: string,
): Promise<string> {
  const span = deps.basalt.startObserve({
    name: "patient-message",
    featureSlug: FEATURE_SLUG,
    experiment_id: experimentId,
    metadata: {
      conversation_id: conversationId,
      message_number: messageNumber,
    },
    identity: {
      userId: "patient-simulation",
      organizationId: "clinic-example",
    },
    evaluators: ["clarity"],
    evaluationConfig: { sample_rate: 1 },
  });

  let text = "";

  try {
    await BasaltContextManager.withRootSpan(span, async () => {
      const input = patientMessages.length === 0
        ? "Écris ton premier message au cabinet médical."
        : patientMessages[patientMessages.length - 1].content as string;

      span.setInput(input);

      const result = await generateText({
        model: openai("gpt-4o-mini"),
        system: patientSystemPrompt,
        ...(patientMessages.length === 0
          ? { prompt: "Écris ton premier message au cabinet médical." }
          : { messages: patientMessages }),
        experimental_telemetry: {
          isEnabled: true,
          recordInputs: true,
          recordOutputs: true,
          functionId: "patient-agent",
          metadata: {
            conversation_id: conversationId,
            message_number: String(messageNumber),
          },
        },
      });

      text = result.text;
    });
  } finally {
    span.setOutput(text);
    span.end();
  }

  return text;
}

async function callDoctor(
  doctorMessages: CoreMessage[],
  messageNumber: number,
  conversationId: string,
  deps: { basalt: Basalt },
  experimentId?: string,
): Promise<string> {
  const canConclude = messageNumber >= MIN_MESSAGES;

  const systemPrompt = canConclude
    ? DOCTOR_SYSTEM_PROMPT
    : DOCTOR_SYSTEM_PROMPT.replace(
        `Quand tu estimes avoir assez d'éléments pour conclure, termine ta réponse par ${CONCLUSION_TAG}.`,
        "Ne conclus pas encore, pose des questions pour mieux comprendre la situation.",
      );

  const span = deps.basalt.startObserve({
    name: "doctor-message",
    featureSlug: FEATURE_SLUG,
    experiment_id: experimentId,
    metadata: {
      conversation_id: conversationId,
      message_number: messageNumber,
    },
    identity: {
      userId: "doctor-agent",
      organizationId: "clinic-example",
    },
    evaluators: ["hallucinations", "clarity"],
    evaluationConfig: { sample_rate: 1 },
  });

  let text = "";

  try {
    await BasaltContextManager.withRootSpan(span, async () => {
      const lastPatientMsg = doctorMessages[doctorMessages.length - 1].content as string;
      span.setInput(lastPatientMsg);

      const result = await generateText({
        model: openai("gpt-4o-mini"),
        system: systemPrompt,
        messages: doctorMessages,
        experimental_telemetry: {
          isEnabled: true,
          recordInputs: true,
          recordOutputs: true,
          functionId: "doctor-agent",
          metadata: {
            conversation_id: conversationId,
            message_number: String(messageNumber),
          },
        },
      });

      text = result.text;
    });
  } finally {
    span.setOutput(text);
    span.end();
  }

  return text;
}

export async function agent(
  patientSystemPrompt: string,
  deps: { basalt: Basalt },
  ctx?: { experimentId?: string; conversationId?: string },
) {
  ctx = ctx ?? {};
  const conversationId = ctx.conversationId ?? `conv-${Date.now()}`;
  const conversationLog: { role: string; content: string; messageNumber: number }[] = [];

  // Separate message histories for each agent's perspective
  const doctorMessages: CoreMessage[] = [];
  const patientMessages: CoreMessage[] = [];

  let messageNumber = 0;

  // Message 1: Patient sends the first message
  messageNumber++;
  const firstPatientMsg = await callPatient(
    patientSystemPrompt, patientMessages, messageNumber, conversationId, deps, ctx.experimentId,
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
      doctorMessages, messageNumber, conversationId, deps, ctx.experimentId,
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
      patientSystemPrompt, patientMessages, messageNumber, conversationId, deps, ctx.experimentId,
    );
    conversationLog.push({ role: "patient", content: patientMsg, messageNumber });

    doctorMessages.push({ role: "user", content: patientMsg });
    patientMessages.push({ role: "assistant", content: patientMsg });
  }

  return { conversationId, messages: conversationLog };
}
