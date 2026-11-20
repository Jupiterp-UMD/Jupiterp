<!-- This file is part of Jupiterp. See LICENSE at the repository root. -->
<script lang="ts">
  import { GRADE_BUCKETS, formatPercent, type GradeDistribution } from '$lib/course-planner/Grades';
  let { distribution = null, legend = false }: { distribution?: GradeDistribution | null; legend?: boolean } = $props();
  const colors = ['var(--grade-strong)', 'var(--grade-mid)', 'var(--grade-soft)', '#94a3b8', '#334155', '#d1d5db'];
</script>

{#if legend}
  <div class="grade-legend" aria-label="Grade colors">
    <span>Grades:</span>{#each GRADE_BUCKETS as bucket, i (bucket)}<span
        ><i style:background={colors[i]}></i>{bucket}</span
      >{/each}
  </div>
{:else if distribution && distribution.barTotal > 0}
  <div
    class="distribution-bar"
    role="img"
    aria-label={GRADE_BUCKETS.map(
      (bucket) => `${bucket}: ${formatPercent(distribution!.buckets[bucket], distribution!.barTotal)}%`
    ).join(', ')}
  >
    {#each GRADE_BUCKETS as bucket, i (bucket)}<span
        style:width={`${(distribution.buckets[bucket] / distribution.barTotal) * 100}%`}
        style:background={colors[i]}
        title={`${bucket}: ${formatPercent(distribution.buckets[bucket], distribution.barTotal)}% · ${distribution.buckets[bucket].toLocaleString()} students`}
      ></span>{/each}
  </div>
{:else}<span class="no-grades">No grade data</span>{/if}

<style>
  .distribution-bar {
    display: flex;
    height: 10px;
    width: 100%;
    min-width: 80px;
    border-radius: 8px;
    overflow: hidden;
  }
  .grade-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 9px;
    font-size: 11px;
    color: var(--text-secondary);
    align-items: center;
  }
  .grade-legend > span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  i {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    display: inline-block;
  }
  .no-grades {
    font-size: 12px;
    color: var(--text-secondary);
  }
</style>
