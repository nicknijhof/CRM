'use client';

import { useOptimistic, useTransition } from 'react';
import { STAGE_BADGE_CLASSES } from '@/lib/constants';
import type { PipelineStage } from '@/lib/types';

export default function PipelineStageButtons({
  contactId,
  currentStage,
  stages,
  updateStage,
}: {
  contactId: string;
  currentStage: PipelineStage;
  stages: { value: PipelineStage; label: string }[];
  updateStage: (contactId: string, stage: PipelineStage) => Promise<void>;
}) {
  const [optimisticStage, setOptimisticStage] = useOptimistic(currentStage);
  const [, startTransition] = useTransition();

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {stages.map((s) => (
        <button
          key={s.value}
          type="button"
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            optimisticStage === s.value ? STAGE_BADGE_CLASSES[s.value] : 'bg-stone-200 text-stone-500 hover:bg-stone-300'
          }`}
          onClick={() => {
            startTransition(async () => {
              setOptimisticStage(s.value);
              await updateStage(contactId, s.value);
            });
          }}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
