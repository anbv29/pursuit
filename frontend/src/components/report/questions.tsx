"use client";
import { plainCopy } from "@/lib/plain-copy";

import { useState, type FormEvent } from "react";
import { api, errorMessage } from "@/lib/api";
import { useAction, useApi } from "@/lib/hooks";
import { Button, Empty, Field, Notice, Textarea } from "../ui";
import { Cites, Section } from "./parts";

type Answer = { id: string; payload: { question: string; answer: string; source_ids: string[]; limitations: string[] } };

export function ReportQuestions({ path }: { path: string }) {
  const history = useApi<Answer[]>(`${path}/questions`);
  const [question, setQuestion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const ask = useAction(async () => {
    if (question.trim().length < 3) return setError("Ask a question in a few words.");
    try {
      await api(`${path}/questions`, { json: { question: question.trim() } });
      setQuestion(""); setError(null); await history.reload();
    } catch (e) { setError(errorMessage(e)); }
  });
  return (
    <Section id="questions" title="Ask about this report">
      <p className="text-sm text-ink-2">Answers use your saved report. They do not run new research or change its findings. Provider capacity and fair-use limits apply.</p>
      <div className="my-3 flex flex-wrap gap-2">
        {["Explain this report in plain English.", "What should I do first and why?", "Which claims have the weakest evidence?"].map((q) =>
          <Button key={q} size="sm" variant="secondary" onClick={() => setQuestion(q)}>{q}</Button>)}
      </div>
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); void ask.run(); }} className="space-y-3">
        <Field label="Your question">{(id) => <Textarea id={id} value={question} maxLength={2000} onChange={(e) => setQuestion(e.target.value)} placeholder="For example: What does ideal customer profile mean for my business?" />}</Field>
        <Button type="submit" loading={ask.pending}>Ask report</Button>
        {error && <Notice tone="bad">{error}</Notice>}
      </form>
      {history.error ? <Notice tone="bad">{history.error.message}</Notice> : history.data?.length ?
        <ol className="mt-5 divide-y divide-line">{history.data.map((row) => <li key={row.id} className="space-y-2 py-4">
          <p className="font-medium">{row.payload.question}</p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{plainCopy(row.payload.answer)}</p>
          <Cites ids={row.payload.source_ids} />
          {row.payload.limitations.map((t, i) => <p key={i} className="text-xs text-ink-3">{t}</p>)}
        </li>)}</ol> : <Empty title="Your questions stay here" body="Ask about a finding, unfamiliar term, or recommended next step." />}
    </Section>
  );
}
