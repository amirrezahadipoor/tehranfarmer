import type { CropId } from './data';
import type { Task } from './engineRender';

/** با خالی‌شدن بذر، فقط تسک‌های کاشتِ باقی‌مانده متوقف می‌شوند؛ سایر کارهای صف دست‌نخورده می‌مانند. */
export function stopPlantingQueueWithoutSeed(
  walker: { tasks: Task[] },
  seeds: Readonly<Partial<Record<CropId, number>>>,
  seed: CropId,
): boolean {
  if ((seeds[seed] ?? 0) > 0) return false;
  const previousLength = walker.tasks.length;
  walker.tasks = walker.tasks.filter((task) => task.kind !== 'plant');
  return walker.tasks.length !== previousLength;
}
