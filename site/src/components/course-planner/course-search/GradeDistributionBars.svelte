<!--
This file is part of Jupiterp. For terms of use, please see the file
called LICENSE at the top level of the Jupiterp source tree (online at
https://github.com/atcupps/Jupiterp/LICENSE).
Copyright (C) 2026 Andrew Cupps
-->
<script lang="ts">
  import {
    bucketPercent,
    BUCKET_LETTERS,
    GRADE_BUCKETS,
    type GradeBucket,
    type GradeDistribution,
    type LetterGrade,
  } from '../../../lib/course-planner/Grades';

  interface Props {
    distribution: GradeDistribution;
  }

  let { distribution }: Props = $props();

  interface BarSegment {
    letter: LetterGrade;
    fillClass: string;
    width: number;
    count: number;
  }

  type BucketSegments = Record<GradeBucket, BarSegment[]>;

  // Static letter -> class map; Tailwind requires literal class names.
  //
  // One hue, three shades, keyed to the modifier rather than the letter: every
  // plus is strong, every bare letter is mid, every minus is soft. A- and B-
  // are deliberately identical. Segments are drawn in fixed order and
  // labelled, so position already says which grade it is; the shade only has
  // to separate each segment from its neighbours.
  //
  // W is grey because a withdrawal is not a grade and should not read as part
  // of the distribution.
  const fillClasses: Partial<Record<LetterGrade, string>> = {
    'A+': 'bg-grade-strong',
    A: 'bg-grade-mid',
    'A-': 'bg-grade-soft',
    'B+': 'bg-grade-strong',
    B: 'bg-grade-mid',
    'B-': 'bg-grade-soft',
    'C+': 'bg-grade-strong',
    C: 'bg-grade-mid',
    'C-': 'bg-grade-soft',
    'D+': 'bg-grade-strong',
    D: 'bg-grade-mid',
    'D-': 'bg-grade-soft',
    F: 'bg-grade-strong',
    W: 'bg-mid-gray',
  };

  function computeSegments(dist: GradeDistribution): BucketSegments {
    const segments = {} as BucketSegments;
    for (const bucket of GRADE_BUCKETS) {
      segments[bucket] = [];
      if (dist.barTotal === 0) {
        continue;
      }
      // Reversed so segments run minus -> plus (light -> dark)
      for (const letter of [...BUCKET_LETTERS[bucket]].reverse()) {
        const count = dist.letters[letter];
        if (count === 0) {
          continue;
        }
        segments[bucket].push({
          letter,
          fillClass: fillClasses[letter] ?? '',
          width: (count / dist.barTotal) * 100,
          count,
        });
      }
    }
    return segments;
  }

  let segments = $derived(computeSegments(distribution));
</script>

<div class="flex flex-col gap-[3px]">
  {#each GRADE_BUCKETS as bucket (bucket)}
    <div class="flex flex-row items-center gap-1">
      <span class="w-4 text-xs font-bold 2xl:text-sm">
        {bucket}
      </span>
      <div class="bg-hover flex h-2 flex-1 flex-row overflow-hidden rounded-sm">
        {#each segments[bucket] as segment (segment.letter)}
          <div
            style="width: {segment.width}%"
            class="h-full {segment.fillClass}"
            title="{segment.letter}: {segment.count}"
          ></div>
        {/each}
      </div>
      <span class="text-text-secondary w-9 text-right text-[10px] tabular-nums">
        {bucketPercent(distribution, bucket)}%
      </span>
    </div>
  {/each}
</div>
