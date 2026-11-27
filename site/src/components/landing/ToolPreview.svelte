<!-- This file is part of Jupiterp. See LICENSE at the repository root.
     Illustrative sample data, not live course or review records. -->
<script lang="ts">
  import { TERM_NAME } from '$lib/term';
  import type { ToolKind } from '../layout/ToolIcon.svelte';
  import ToolIcon from '../layout/ToolIcon.svelte';
  import StarRating from '../professor/StarRating.svelte';
  import GradeDistribution from '../professor/GradeDistribution.svelte';
  import GradeTrend from '../professor/GradeTrend.svelte';
  import ComparePreview from './ComparePreview.svelte';
  import { toDistribution } from '$lib/course-planner/Grades';
  import type { ProfessorTerm } from '$lib/professor/ProfessorData';
  let { kind, compact = false }: { kind: ToolKind; compact?: boolean } = $props();
  const reviews = [
    {
      course: 'CMSC131',
      professor: 'Shell',
      rating: 5,
      title: 'The sweetest, kindest professor ever',
      term: 'Spring 2026',
      grade: 'A−',
      body: 'Professor Shell is the sweetest, kindest person ever. She makes it easy to ask questions, explains things patiently, and makes CMSC131 feel welcoming even if you’re new to coding.',
    },
    {
      course: 'MATH141',
      professor: 'Jimmy',
      rating: 4,
      title: 'Practice makes the difference',
      term: 'Fall 2025',
      grade: 'B',
      body: 'Calculus II took a lot of practice, but the worked examples and discussion sections helped. The pace is quick, so keep up with the weekly problem sets.',
    },
    {
      course: 'PHYS161',
      professor: 'Priyam',
      rating: 3.5,
      title: 'Helpful examples, fast pace',
      term: 'Spring 2026',
      grade: 'C',
      body: 'The examples helped connect the physics to the math. Some lectures felt rushed, but office hours cleared things up. More feedback on homework would make it even better.',
    },
  ];
  const sampleDistribution = toDistribution({
    a_plus: 100,
    a: 120,
    a_minus: 100,
    b_plus: 110,
    b: 90,
    b_minus: 70,
    c_plus: 70,
    c: 60,
    c_minus: 40,
    d_plus: 10,
    d: 30,
    d_minus: 20,
    f: 70,
    w: 110,
    other: 0,
    total: 1000,
    graded: 890,
    gpa: 2.78,
    section_count: 20,
  });
  const sampleGpas = [
    3.01, 2.83, 3.1, 3.11, 2.77, 2.7, 2.55, 3.02, 2.55, 2.86, 3.06, 3.08, 2.79, 2.45, 2.53, 2.58, 2.2, 3.0, 2.2, 2.63,
    2.8, 2.96, 3.08,
  ];
  const sampleTermCodes = [
    201201, 201301, 201308, 201401, 201501, 201701, 201708, 201801, 201808, 201901, 202001, 202008, 202101, 202201,
    202208, 202301, 202308, 202401, 202408, 202501, 202508, 202601, 202608,
  ];
  const sampleTerms: ProfessorTerm[] = sampleTermCodes.map((term, index) => ({
    term,
    gpa: sampleGpas[index],
    graded: 100,
    courseCount: 1,
  }));
</script>

{#snippet week(variant = 0, headings = false, blocked = false)}
  <div class="week" class:headings>
    {#each ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as day, index (day)}
      <div class="day-column">
        {#if headings}<span class="day-name">{blocked ? ['M', 'Tu', 'W', 'Th', 'F'][index] : day}</span>{/if}
        <div class="day-track">
          {#if blocked && (index === 1 || index === 3)}<span class="blocked-slot" title="Blocked after 4 PM"
            ></span>{/if}
          {#if !((variant === 1 || (blocked && variant === 2)) && index === 4)}
            <span
              class="meeting {['peach', 'green', 'peach', 'green', 'peach'][(index + variant) % 5]}"
              style:top={`${18 + ((index + variant) % 2) * 8}%`}
            ></span>
            {#if index % 2 === 0}<span class="meeting blue" style:top={`${48 + variant * 3}%`}></span>{/if}
            {#if index === 3}<span class="meeting purple" style:top={blocked ? '63%' : '70%'}></span>{/if}
            {#if variant > 1 && (!blocked || index % 2 === 0)}<span class="meeting yellow" style:top="72%"></span>{/if}
          {/if}
        </div>
      </div>
    {/each}
  </div>
{/snippet}

<div class="preview {kind}" class:compact>
  {#if kind === 'planner'}
    {#if compact}
      <div class="hero-week">{@render week(0, true)}</div>
    {:else}
      <div class="sample-card planner-card">
        <div class="course-sample">
          <div class="fake-input">Search CMSC</div>
          <div class="course">
            <strong>CMSC131 <small>4 credits</small></strong>
            <p>Object-Oriented Programming I</p>
            <span class="tag">FSMA</span> <span class="tag">FSAR</span>
          </div>
          {#each [['0101 · MWF 10:00', '12 open'], ['0201 · TuTh 2:00', '3 open'], ['0301 · MWF 1:00', 'Waitlist 4']] as row, i (i)}
            <div class="section-row"><span>{row[0]}</span><b class:waitlist={i === 2}>{row[1]}</b></div>
          {/each}
        </div>
        <div class="plan">
          <div class="plan-label"><b>Plan A</b><span>Credits: 15</span></div>
          {@render week(2)}
        </div>
      </div>
    {/if}
  {:else if kind === 'generator'}
    <div class="sample-card generator-card">
      <div class="wishlist">
        <span>Wishlist</span>{#each ['CMSC330', 'MATH141', 'ENGL101', 'COMM107'] as code, i (code)}<b
            class={['peach', 'blue', 'green', 'purple'][i]}>{code} ×</b
          >{/each}
      </div>
      <div class="constraints">
        {#each [['Blocked times', 'Tue/Thu after 4 PM'], ['Days off', 'Friday'], ['Sort by', 'Compact']] as row (row[0])}<div
          >
            <span>{row[0]}</span><b>{row[1]}</b>
          </div>{/each}
      </div>
      <div class="pinned-choices" aria-label="Sample course preferences">
        <div><b>CMSC330</b><span>Professor: <strong>Professor A only</strong></span></div>
        <div><b>MATH141</b><span>Section: <strong>0201 only</strong></span></div>
      </div>
      <div class="options">
        {#each [0, 1, 2] as variant (variant)}<div class:selected={variant === 0}>
            <b>Schedule {variant + 1}</b>{@render week(variant + 1, true, true)}<span
              >{['Fridays off · no gaps', 'Fridays off · 1 gap', 'Latest start'][variant]}</span
            >
          </div>{/each}
      </div>
      <p class="hint">
        <b>No schedules fit?</b> Jupiterp tells you which constraint to loosen, like unblocking Thursday afternoon.
      </p>
    </div>
  {:else if kind === 'grades'}
    <div class="sample-card grades-card">
      <span class="sample-note grade-sample-note">Professor Andrew · Sample data</span>
      <div class="grade-distribution"><GradeDistribution distribution={sampleDistribution} /></div>
      <div class="grade-trend">
        <h3>GPA Over Time (All courses)</h3>
        <GradeTrend terms={sampleTerms} />
      </div>
    </div>
  {:else if kind === 'reviews'}
    <div class="reviews-grid">
      {#each reviews as review, index (review.course)}
        <article class="review sample-card" class:offset={index === 1}>
          <div class="review-header">
            <div class="rating-badge" aria-label={`${review.rating} out of 5 stars`}>
              <strong>{review.rating.toFixed(1)}</strong>
              <div class="review-stars"><StarRating value={review.rating} size="text-[10px]" /></div>
            </div>
            <div class="review-heading">
              <span class="review-professor">Professor {review.professor}</span>
              <h3>{review.title}</h3>
              <small
                >{review.course} · {review.term} · Got {review.grade.startsWith('A') ? 'an' : 'a'} {review.grade}</small
              >
            </div>
          </div>
          <p>{review.body}</p>
        </article>
      {/each}
      <div class="moderation">
        <b>Read, approved, then published.</b>
        <p>
          Every published review is read and approved. About 99% of submitted reviews appear on the site within a few
          minutes.
        </p>
      </div>
      <span class="sample-note">Illustrative reviews</span>
    </div>
  {:else if kind === 'compare'}
    <div class="sample-card compare-card">
      <ComparePreview />
    </div>
  {:else}
    <div class="sample-card export-card">
      <div class="calendar-file">
        <ToolIcon kind="planner" /><b>{TERM_NAME.toLowerCase().replace(' ', '-')}.ics</b><span>Plan A · 5 courses</span>
      </div>
      <div class="export-copy">
        <h3>Export Schedule</h3>
        <p>Download your schedule as a .ics file and import it into your favorite app.</p>
        <span class="download">Download</span>
        <div class="calendar-apps"><span>Google Calendar</span><span>Apple Calendar</span><span>Outlook</span></div>
      </div>
    </div>
  {/if}
</div>

<style>
  .preview {
    font-size: 12px;
    line-height: 1.45;
    color: var(--landing-ink, #171717);
    width: 100%;
  }
  .sample-card {
    background: var(--landing-card, #fff);
    padding: 22px;
    border-radius: 20px;
    box-shadow: 0 20px 45px #60462e14;
  }
  .peach {
    background: #ffd2bc;
  }
  .green {
    background: #ccefd8;
  }
  .blue {
    background: #cddaff;
  }
  .purple {
    background: #e2d8ff;
  }
  .yellow {
    background: #ffeca5;
  }
  :global(.dark) .peach {
    background: #b66746;
  }
  :global(.dark) .green {
    background: #43866b;
  }
  :global(.dark) .blue {
    background: #5c78b8;
  }
  :global(.dark) .purple {
    background: #8265b6;
  }
  :global(.dark) .yellow {
    background: #a18a3f;
  }
  :global(.dark) .wishlist b {
    color: #f5f7fb;
  }
  :global(.dark) .section-row b {
    color: #80d6a5;
  }
  :global(.dark) .section-row b.waitlist {
    color: #ffa391;
  }
  :global(.dark) .sample-card {
    box-shadow: 0 18px 40px #00000026;
  }
  .week {
    display: flex;
    gap: 5px;
    height: 100%;
    min-height: 130px;
  }
  .day-column {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .day-name {
    text-align: center;
    font-size: 9px;
    margin-bottom: 7px;
    color: var(--landing-muted, #596174);
  }
  .day-track {
    background: var(--landing-track, #f0efed);
    border-radius: 4px;
    position: relative;
    flex: 1;
  }
  .meeting {
    position: absolute;
    width: 100%;
    height: 15%;
    border-radius: 2px;
  }
  .hero-week {
    padding: 14px;
    border: 1px solid var(--landing-line, #eee6e0);
    background: var(--landing-soft, #fbf9f7);
    border-radius: 14px;
    height: 245px;
  }
  .planner-card {
    display: grid;
    grid-template-columns: 45% 1fr;
    gap: 12px;
    padding: 14px;
  }
  .course-sample {
    min-width: 0;
  }
  .fake-input {
    border: 1px solid var(--landing-line, #eee6e0);
    padding: 8px;
    border-radius: 7px;
    color: var(--landing-muted);
    margin-bottom: 5px;
  }
  .course {
    background: var(--landing-peach, #fff0e7);
    border: 1px solid #f5c8b260;
    border-radius: 8px;
    padding: 9px;
  }
  .course strong {
    display: block;
  }
  small {
    font-size: 10px;
    color: var(--landing-muted);
  }
  .course small {
    float: right;
    font-weight: 400;
  }
  .course p {
    font-size: 10px;
    margin: 3px 0;
  }
  .tag {
    background: var(--landing-card, #fff);
    border-radius: 4px;
    padding: 1px 4px;
    font-size: 9px;
  }
  .section-row {
    display: flex;
    justify-content: space-between;
    gap: 4px;
    font-size: 9px;
    padding: 9px 5px;
    border: 1px solid var(--landing-line);
    border-radius: 6px;
    margin-top: 5px;
  }
  .section-row b {
    color: #218044;
  }
  .section-row b.waitlist {
    color: #d54c38;
  }
  .plan {
    display: flex;
    flex-direction: column;
  }
  .plan .week {
    flex: 1;
  }
  .plan-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 6px;
  }
  .plan-label > span {
    font-size: 9px;
    color: var(--landing-muted);
  }
  .wishlist {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 5px;
    font-size: 10px;
  }
  .wishlist > span {
    margin-right: 3px;
    color: var(--landing-muted);
  }
  .wishlist b {
    border-radius: 20px;
    padding: 4px 8px;
    color: #24242b;
  }
  .constraints {
    display: grid;
    grid-template-columns: 1.2fr 1fr 1fr;
    gap: 8px;
    margin: 12px 0;
  }
  .constraints > div {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--landing-line);
    border-radius: 9px;
    padding: 8px;
    font-size: 10px;
  }
  .constraints span {
    color: var(--landing-muted);
  }
  .pinned-choices {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 12px;
    font-size: 10px;
  }
  .pinned-choices > div {
    display: flex;
    flex-direction: column;
    gap: 3px;
    border: 1px solid var(--landing-line);
    background: var(--landing-soft);
    padding: 9px;
    border-radius: 9px;
  }
  .pinned-choices span {
    color: var(--landing-muted);
  }
  .pinned-choices strong {
    font-weight: 600;
  }
  .blocked-slot {
    position: absolute;
    bottom: 0;
    width: 100%;
    height: 19%;
    border-top: 1px dashed #b78c71;
    background: repeating-linear-gradient(135deg, #c6977435 0 3px, #c6977410 3px 6px);
  }
  .options {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  .options > div {
    border: 1px solid var(--landing-line);
    border-radius: 11px;
    padding: 8px;
  }
  .options > div.selected {
    border-color: #ff682b;
  }
  .options b {
    font-size: 10px;
  }
  .options .week {
    height: 155px;
    min-height: 0;
    margin: 7px 0;
    gap: 3px;
  }
  .options > div > span {
    font-size: 9px;
    color: var(--landing-muted);
  }
  .hint {
    background: var(--landing-hint, #fff8e5);
    padding: 11px;
    font-size: 10px;
    border-radius: 10px;
    margin-top: 12px;
  }
  .grade-sample-note {
    margin: 0 0 14px;
  }
  .grade-distribution :global(.h-56) {
    height: 175px;
  }
  .grade-distribution :global(.sm\:gap-5) {
    gap: 10px;
  }
  .grade-trend {
    margin-top: 28px;
  }
  .grade-trend h3 {
    font-size: 14px;
    font-weight: 700;
    margin-bottom: 24px;
  }
  .grade-trend :global(.h-52) {
    height: 145px;
  }
  .grade-trend :global(.text-sm) {
    font-size: 10px;
  }
  .grade-distribution :global(.text-lg) {
    font-size: 16px;
  }
  .reviews-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    position: relative;
    padding-bottom: 18px;
  }
  .review {
    padding: 17px;
    border: 1px solid var(--landing-line);
    border-radius: 15px;
  }
  .review p {
    margin: 16px 0 0;
    line-height: 1.6;
  }
  .review.offset {
    transform: none;
  }
  .review:first-child {
    grid-column: 1;
    grid-row: 1;
  }
  .review:nth-child(2) {
    grid-column: 1;
    grid-row: 2;
  }
  .review:nth-child(3) {
    grid-column: 2;
    grid-row: 1 / 3;
    align-self: center;
  }
  .review-header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }
  .rating-badge {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    flex-shrink: 0;
    width: 72px;
    min-height: 80px;
    padding: 8px 6px;
    border-radius: 10px;
    background: var(--landing-soft);
  }
  .review-stars {
    line-height: 1;
    max-width: 100%;
  }
  .review-stars :global(span) {
    font-size: 10px;
  }
  .review-stars :global(.inline-flex) {
    gap: 1px;
  }
  .rating-badge strong {
    color: var(--orange);
    font-size: 28px;
    line-height: 1;
  }
  .review-heading {
    min-width: 0;
  }
  .review-heading h3 {
    font-weight: 700;
    font-size: 14px;
    line-height: 1.35;
    margin-bottom: 6px;
  }
  .review-heading small {
    display: block;
    font-size: 10px;
    line-height: 1.5;
  }
  .moderation {
    grid-column: 1 / -1;
    padding: 16px 0 0;
    border-top: 1px solid var(--landing-line);
    color: var(--landing-muted);
    font-size: 11px;
    line-height: 1.6;
  }
  .moderation p {
    margin-top: 5px;
  }
  .sample-note {
    display: block;
    font-size: 9px;
    color: var(--landing-muted);
    margin-top: 10px;
  }
  .reviews-grid > .sample-note {
    position: absolute;
    bottom: 0;
  }
  .compare-card {
    container-type: inline-size;
  }
  .review-professor {
    display: block;
    font-size: 10px;
    font-weight: 600;
    color: var(--landing-muted);
    margin-bottom: 4px;
  }
  .export-card {
    display: flex;
    gap: 22px;
    align-items: center;
  }
  .calendar-file {
    background: var(--landing-soft);
    border: 1px solid var(--landing-line);
    border-radius: 16px;
    padding: 25px 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
    gap: 10px;
  }
  .calendar-file > span {
    font-size: 10px;
    color: var(--landing-muted);
  }
  .export-copy h3 {
    font-size: 16px;
    font-weight: 700;
    margin-bottom: 8px;
  }
  .export-copy p {
    color: var(--landing-muted);
  }
  .download {
    display: inline-block;
    background: #ff682b;
    color: #111;
    border-radius: 7px;
    padding: 7px 15px;
    font-weight: 600;
    margin: 10px 0;
  }
  .calendar-apps {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }
  .calendar-apps span {
    border: 1px solid var(--landing-line);
    border-radius: 5px;
    padding: 3px 6px;
    font-size: 9px;
  }
  .compact:not(.planner) {
    font-size: 10px;
  }
  .compact .sample-card {
    padding: 12px;
    border-radius: 12px;
    box-shadow: none;
    border: 1px solid var(--landing-line);
  }
  .compact .reviews-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  .compact .review {
    padding: 10px;
    grid-column: 1;
    grid-row: auto;
  }
  .compact .review:nth-child(3) {
    width: 100%;
  }
  .compact .review.offset {
    transform: none;
  }
  .compact .moderation {
    display: none;
  }
  .compact .review-header {
    gap: 8px;
  }
  .compact .rating-badge {
    width: 64px;
    min-height: 72px;
  }
  .compact .rating-badge strong {
    font-size: 23px;
  }
  .compact .review-heading h3 {
    font-size: 11px;
  }
  .compact .review-heading small {
    font-size: 9px;
  }
  .compact .review p {
    margin-top: 8px;
    font-size: 10px;
  }
  .compact .export-card {
    flex-direction: column;
    gap: 10px;
  }
  .compact .calendar-file {
    padding: 12px;
  }
  .compact .calendar-apps {
    display: none;
  }
  .compact .options .week {
    height: 155px;
  }
  .compact .options > div {
    padding: 7px;
  }
  .compact .options b {
    font-size: 10px;
  }
  .compact .constraints {
    margin: 0 0 10px;
    grid-template-columns: 1fr 1fr;
  }
  .compact .constraints > div:last-child {
    display: none;
  }
  .compact .constraints > div {
    padding: 8px;
  }
  .compact .pinned-choices {
    grid-template-columns: 1fr;
    font-size: 10px;
  }
  .compact .pinned-choices > div {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }
  .compact .options .day-name {
    font-size: 7px;
  }
  .compact .wishlist {
    display: none;
  }
  .compact .hint {
    font-size: 9px;
  }
  .compact .grade-distribution :global(.h-56) {
    height: 150px;
  }
  .compact .grade-distribution :global(.sm\:gap-5) {
    gap: 5px;
  }
  .compact .grade-distribution :global(.text-lg) {
    font-size: 13px;
  }
  .compact .grade-distribution :global(.text-sm) {
    font-size: 10px;
  }
  .compact .grade-trend :global(.h-52) {
    height: 125px;
  }
  .compact .grade-trend h3 {
    font-size: 12px;
  }
  @media (max-width: 600px) {
    .sample-card {
      padding: 15px;
    }
    .export-card {
      gap: 12px;
    }
    .calendar-file {
      padding: 20px 8px;
    }
  }
</style>
