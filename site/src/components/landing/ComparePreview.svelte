<!-- This file is part of Jupiterp. See LICENSE at the repository root.
     Fictional sample professors and statistics for the landing-page preview. -->
<script lang="ts">
  const buckets = ['A', 'B', 'C', 'D', 'F', 'W'];
  const gradeColors = ['#c2440f', '#f5692e', '#ffc4ab', '#94a3b8', '#334155', '#d1d5db'];
  const professors = [
    {
      name: 'Naren',
      grades: [5, 10, 40, 32, 8, 5],
      rating: 1.2,
      colors: ['#c2440f', '#f5692e', '#ffc4ab'],
      withdrawn: '#888',
    },
    {
      name: 'Mohe',
      grades: [25, 35, 22, 10, 4, 4],
      rating: 4.0,
      colors: ['#0369a1', '#38bdf8', '#bae6fd'],
      withdrawn: '#647f98',
    },
    {
      name: 'Chase',
      grades: [72, 18, 5, 1, 1, 3],
      rating: 4.8,
      colors: ['#5b21b6', '#8b5cf6', '#ddd6fe'],
      withdrawn: '#7c6f9a',
    },
  ].map((professor) => {
    const graded = 100 - professor.grades[5];
    const points = professor.grades
      .slice(0, 5)
      .reduce((sum, count, index) => sum + count * [3.91, 3, 2, 1, 0][index], 0);
    return { ...professor, graded: graded * 10, gpa: points / graded };
  });
  const mean =
    professors.reduce((sum, professor) => sum + professor.gpa * professor.graded, 0) /
    professors.reduce((sum, professor) => sum + professor.graded, 0);
  const max = Math.max(...professors.flatMap((professor) => professor.grades));
</script>

<div class="comparison-preview">
  <div class="course-picker">Course: <strong>CMSC330</strong><span>3 professors selected</span></div>
  <p class="sample-label">Fictional professors · Sample data</p>
  <div class="grade-key">
    <b>Grades:</b>{#each buckets as bucket, index (bucket)}<span
        ><i style:background={gradeColors[index]}></i>{bucket}</span
      >{/each}
  </div>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Professor</th><th>GPA</th><th>Rating</th><th>% A</th><th>Students</th><th>Grades</th></tr></thead>
      <tbody>
        <tr class="average"
          ><th>Course average</th><td>{mean.toFixed(2)}</td><td>—</td><td>34%</td><td>3,000</td><td>—</td></tr
        >
        {#each professors as professor (professor.name)}
          <tr
            ><th>Prof. {professor.name}</th><td>{professor.gpa.toFixed(2)}</td><td class="rating"
              >{professor.rating.toFixed(1)}</td
            ><td>{professor.grades[0]}%</td><td>1,000</td><td
              ><div class="summary-bar" role="img" aria-label={`${professor.name}'s grade distribution`}>
                {#each professor.grades as percent, index (index)}<span
                    style:width={`${percent}%`}
                    style:background={gradeColors[index]}
                  ></span>{/each}
              </div></td
            ></tr
          >
        {/each}
      </tbody>
    </table>
  </div>

  <section class="gpa-panel" aria-label="Sample GPA comparison">
    <h3>Average GPA in CMSC330</h3>
    <div class="professor-legend">
      {#each professors as professor (professor.name)}<div>
          <span><i style:background={professor.colors[1]}></i>Professor {professor.name}</span><strong
            >{professor.gpa.toFixed(2)} <small>/ 4.0</small></strong
          >
        </div>{/each}
    </div>
    <div
      class="gpa-scale"
      role="img"
      aria-label={`GPA comparison: Naren ${professors[0].gpa.toFixed(2)}, Mohe ${professors[1].gpa.toFixed(2)}, Chase ${professors[2].gpa.toFixed(2)}. Course mean ${mean.toFixed(2)}.`}
    >
      <div class="scale-line"></div>
      {#each [1.5, 1.9, 2.2, 2.4, 2.5, 2.8, 3.0, 3.2, 3.4] as gpa (gpa)}<span
          class="other-dot"
          style:left={`${(gpa / 4) * 100}%`}
        ></span>{/each}
      <span class="mean-marker" style:left={`${(mean / 4) * 100}%`}></span>
      {#each professors as professor, index (professor.name)}<span
          class="professor-marker"
          style:left={`${(professor.gpa / 4) * 100}%`}
          style:background={professor.colors[1]}>{index + 1}</span
        >{/each}
    </div>
    <div class="scale-labels"><span>0.0</span><span>2.0</span><span>4.0</span></div>
    <p class="sample-label">Gray dots: other professors · Course mean {mean.toFixed(2)}</p>
  </section>

  <section class="distribution-panel" aria-label="Sample grouped grade distributions">
    <h3>Grade distribution</h3>
    <div class="professor-legend">
      {#each professors as professor (professor.name)}<span
          ><i style:background={professor.colors[1]}></i>Professor {professor.name}</span
        >{/each}
    </div>
    <div class="grouped-chart">
      {#each buckets as bucket, bucketIndex (bucket)}
        <div class="bucket-group">
          {#each professors as professor (professor.name)}
            {@const percent = professor.grades[bucketIndex]}
            <div
              class="bar"
              style:height={`${(percent / max) * 85}%`}
              role="img"
              aria-label={`${professor.name}, ${bucket}: ${percent}%`}
            >
              <span class="percent">{percent}%</span>
              <div class="segments">
                {#if bucketIndex < 4}{#each [30, 40, 30] as portion, shade (shade)}<div
                      style:flex={portion}
                      style:background={professor.colors[shade]}
                      title={`${professor.name}: ${bucket}${['+', '', '−'][shade]} · ${((percent * portion) / 100).toFixed(1)}%`}
                    ></div>{/each}
                {:else}<div
                    style:flex={1}
                    style:background={bucketIndex === 5 ? professor.withdrawn : professor.colors[0]}
                    title={`${professor.name}: ${bucket} · ${percent}%`}
                  ></div>{/if}
              </div>
            </div>
          {/each}
          <span class="bucket-label">{bucket}</span>
        </div>
      {/each}
    </div>
  </section>
</div>

<style>
  .comparison-preview {
    min-width: 0;
    font-size: 10px;
    line-height: 1.4;
  }
  .course-picker {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
  }
  .course-picker > span {
    margin-left: auto;
    color: var(--landing-muted);
    font-size: 9px;
  }
  .sample-label {
    color: var(--landing-muted);
    font-size: 9px;
    margin: 5px 0 12px;
  }
  .grade-key {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 9px;
    margin-bottom: 8px;
  }
  .grade-key > span {
    display: flex;
    align-items: center;
    gap: 3px;
  }
  i {
    display: inline-block;
    width: 7px;
    height: 7px;
    border-radius: 3px;
    flex-shrink: 0;
  }
  .table-wrap {
    border: 1px solid var(--landing-line);
    border-radius: 10px;
    overflow: hidden;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9px;
  }
  th,
  td {
    padding: 8px 5px;
    border-bottom: 1px solid var(--landing-line);
    text-align: right;
    white-space: nowrap;
  }
  th:first-child {
    text-align: left;
  }
  thead th {
    font-weight: 700;
  }
  tbody tr:last-child > * {
    border-bottom: 0;
  }
  .average {
    background: var(--landing-track);
  }
  .rating {
    color: var(--orange);
    font-weight: 700;
  }
  .summary-bar {
    display: flex;
    width: 65px;
    height: 8px;
    overflow: hidden;
    border-radius: 3px;
    margin-left: auto;
  }
  .gpa-panel,
  .distribution-panel {
    border: 1px solid var(--landing-line);
    border-radius: 12px;
    margin-top: 12px;
    padding: 12px;
  }
  h3 {
    font-size: 12px;
    font-weight: 700;
    margin-bottom: 10px;
  }
  .professor-legend {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 7px;
    font-size: 9px;
  }
  .professor-legend span {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .professor-legend strong {
    display: block;
    font-size: 18px;
    margin-top: 4px;
  }
  small {
    font-size: 9px;
    color: var(--landing-muted);
    font-weight: 400;
  }
  .gpa-scale {
    position: relative;
    height: 32px;
    margin-top: 8px;
  }
  .scale-line {
    height: 1px;
    background: var(--landing-muted);
    position: absolute;
    top: 50%;
    width: 100%;
  }
  .other-dot,
  .professor-marker,
  .mean-marker {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
  }
  .other-dot {
    border: 1.5px solid var(--landing-muted);
    background: var(--landing-card);
    width: 7px;
    height: 7px;
    border-radius: 50%;
  }
  .mean-marker {
    width: 1px;
    height: 20px;
    background: var(--landing-ink);
  }
  .professor-marker {
    display: grid;
    place-items: center;
    width: 17px;
    height: 17px;
    border: 1px solid var(--landing-card);
    border-radius: 50%;
    color: #111;
    font-size: 8px;
    font-weight: 700;
  }
  .scale-labels {
    display: flex;
    justify-content: space-between;
    color: var(--landing-muted);
    font-size: 9px;
  }
  .gpa-panel .sample-label {
    margin-bottom: 0;
  }
  .grouped-chart {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 12px;
    height: 170px;
    margin-top: 12px;
    margin-bottom: 20px;
    border-bottom: 1px solid var(--landing-line);
  }
  .bucket-group {
    display: flex;
    align-items: end;
    position: relative;
    gap: 3px;
    height: 100%;
  }
  .bar {
    position: relative;
    min-width: 0;
    flex: 1;
  }
  .segments {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    border-radius: 3px 3px 0 0;
  }
  .percent {
    position: absolute;
    top: -15px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 8px;
    font-weight: 600;
  }
  .bucket-label {
    position: absolute;
    top: calc(100% + 5px);
    width: 100%;
    text-align: center;
    color: var(--landing-muted);
  }
  @container (max-width:400px) {
    table {
      font-size: 8px;
    }
    th,
    td {
      padding: 7px 3px;
    }
    .summary-bar {
      width: 42px;
    }
    .professor-legend {
      font-size: 8px;
    }
    .grouped-chart {
      gap: 8px;
    }
    .bucket-group {
      gap: 2px;
    }
    .percent {
      font-size: 6px;
    }
  }
</style>
