/**
 * This file is part of Jupiterp. For terms of use, please see LICENSE at
 * https://github.com/atcupps/Jupiterp/LICENSE.
 */
import { describe, expect, test } from '@jest/globals';
import type { Section } from '@jupiterp/jupiterp';
import type { CourseInstructorGradeSummary } from '../api/types';
import { comparisonProfessors } from './Comparison';

describe('comparisonProfessors', () => {
  const history = {
    instructor_slug: 'alex',
    instructor: 'Alex Canonical',
    graded: 30,
    gpa: 3.2,
    section_count: 1,
  } as CourseInstructorGradeSummary;

  test('merges current aliases by slug while retaining historical grades and canonical names', () => {
    const section = { instructors: ['A. Alias'], instructorSlugs: ['alex'] } as Section;
    const results = comparisonProfessors([history], [section, section]);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ name: 'Alex Canonical', current: true, distribution: { gpa: 3.2, graded: 30 } });
  });

  test('includes historical professors and current professors without grades, excluding unresolved names', () => {
    const section = { instructors: ['Bea', 'Unknown'], instructorSlugs: ['bea', null] } as Section;
    expect(comparisonProfessors([history], [section])).toMatchObject([
      { slug: 'alex', current: false },
      { slug: 'bea', current: true, distribution: null },
    ]);
  });

  test('keeps different professors with the same name separate', () => {
    const section = { instructors: ['Alex Canonical'], instructorSlugs: ['another-alex'] } as Section;
    expect(comparisonProfessors([history], [section])).toHaveLength(2);
  });
});
