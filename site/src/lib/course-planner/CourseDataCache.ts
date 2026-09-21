/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 *
 * @fileoverview A cache to store course data fetched from the API.
 */

import { SortBy, type Course, type CoursesWithSectionsConfig } from '@jupiterp/jupiterp';
import { client } from '$lib/client';
import type { ServerSideFilterParams } from '../../types';

export class CourseDataCache {
  /**
   * A cache storing data from the API. Matches a string constructed from
   * the request query and filter params to the cached data.
   */
  private cache: Record<string, CourseDataCacheEntry>;

  /**
   * Tracks in-flight requests so concurrent callers can await the same
   * promise instead of duplicating work.
   */
  private pendingRequests: Record<string, Promise<Course[]>>;

  /**
   * Incrementing counter used to derive a simple least-recently-used
   * ordering for cache entries.
   */
  private lruCounter: number = 0;

  /**
   * The current size of the cache (number of entries).
   */
  private size: number = 0;

  /**
   * The maximum number of entries to store in the cache.
   */
  private maxSize: number;

  /**
   * The most recently accessed department code. Since cache accesses are
   * asynchronous, this is used to validate that the list of courses used
   * in course search is the most recently requested one.
   */
  private mostRecentAccess: RequestInput | null = null;

  /**
   * @param maxSize The maximum number of entries to store in the cache.
   * Defaults to 20. When the cache exceeds this size, the least-recently
   * used entry will be removed.
   */
  constructor(maxSize: number = 20) {
    this.cache = {};
    this.pendingRequests = {};
    this.maxSize = maxSize;
  }

  /**
   * @returns The most recently-accessed department code, or `null` if no
   * accesses have been made yet.
   */
  public getMostRecentAccess(): RequestInput | null {
    return this.mostRecentAccess;
  }

  /**
   * Get course data for a department code. If the data is not in the
   * cache, it requests it from the API and stores it in the cache.
   * @returns A `Promise` which resolves to the list of `Course`s for
   *          the input.
   */
  public async getCoursesAndSections(input: RequestInput): Promise<Course[]> {
    const key = keyFromRequestInput(input);
    this.mostRecentAccess = input;
    const cacheEntry = this.cache[key];
    if (cacheEntry) {
      if (cacheEntry.status === 'data') {
        this.lruCounter += 1;
        cacheEntry.lastUsed = this.lruCounter;
        return cacheEntry.data;
      }

      const pending = this.pendingRequests[key];
      if (cacheEntry.status === 'request sent' && pending) {
        const data = await pending;
        const updatedEntry = this.cache[key];
        if (updatedEntry && updatedEntry.status === 'data') {
          this.lruCounter += 1;
          updatedEntry.lastUsed = this.lruCounter;
          return updatedEntry.data;
        }
        return data;
      }
    }

    const hadEntry = Boolean(cacheEntry);
    this.cache[key] = { status: 'request sent' };
    const requestConfig = generateRequestConfig(input);
    this.pendingRequests[key] = this.requestCoursesForDept(key, requestConfig, !hadEntry);
    if (!hadEntry) {
      this.size += 1;
    }

    try {
      return await this.pendingRequests[key];
    } finally {
      delete this.pendingRequests[key];
    }
  }

  private async requestCoursesForDept(
    key: string,
    cfg: CoursesWithSectionsConfig,
    isNewEntry: boolean
  ): Promise<Course[]> {
    try {
      const response = await client.coursesWithSections(cfg);

      if (!response.ok()) {
        // format-check exempt 2
        throw new Error(
          `API request to get courses for ${key} failed: ${response.statusCode} ${response.statusMessage}`
        );
      }

      const courses = response.data;
      if (courses == null) {
        throw new Error(`Null course data returned for ${key}`);
      }

      const existingEntry = this.cache[key];
      if (!existingEntry || existingEntry.status !== 'request sent') {
        return courses;
      }

      this.lruCounter += 1;
      this.cache[key] = {
        status: 'data',
        data: courses,
        lastUsed: this.lruCounter,
      };
      this.evictLeastRecentlyUsed(key);
      return courses;
    } catch (error) {
      if (key in this.cache) {
        delete this.cache[key];
        if (isNewEntry) {
          this.size = Math.max(0, this.size - 1);
        }
      }
      throw error;
    }
  }

  private evictLeastRecentlyUsed(excludeKey: string): void {
    if (this.size <= this.maxSize) {
      return;
    }

    let candidateKey: string | null = null;
    let oldestMarker = Number.POSITIVE_INFINITY;

    for (const [key, entry] of Object.entries(this.cache)) {
      if (key === excludeKey) {
        continue;
      }

      if (entry.status === 'data') {
        if (entry.lastUsed < oldestMarker) {
          oldestMarker = entry.lastUsed;
          candidateKey = key;
        }
      }
    }

    if (candidateKey === null) {
      return;
    }

    if (candidateKey in this.cache) {
      delete this.cache[candidateKey];
      this.size = Math.max(0, this.size - 1);
      delete this.pendingRequests[candidateKey];
    }
  }

  public isPending(): boolean {
    // format-check exempt 2
    return this.mostRecentAccess !== null && keyFromRequestInput(this.mostRecentAccess) in this.pendingRequests;
  }
}

function keyFromRequestInput(input: RequestInput): string {
  const filtersPart = JSON.stringify(input.filters);
  return `${input.type}:${input.value}|filters:${filtersPart}`;
}

function generateRequestConfig(input: RequestInput): CoursesWithSectionsConfig {
  const cfg: CoursesWithSectionsConfig = {
    limit: 500,
    sortBy: new SortBy().ascending('course_code'),
  };

  const filters: ServerSideFilterParams = input.filters ?? {};

  if (input.type === 'deptCode') {
    cfg.prefix = input.value;
  } else if (input.type === 'courseNumber') {
    cfg.number = input.value;
  }

  if (filters.genEds && filters.genEds.length > 0) {
    cfg.genEds = new Set(filters.genEds);
  }

  if (filters.instructor && filters.instructor.length > 0) {
    cfg.instructor = filters.instructor;
  }

  return cfg;
}

type CourseDataCacheEntry = { status: 'request sent' } | { status: 'data'; data: Course[]; lastUsed: number };

export interface RequestInput {
  type: 'deptCode' | 'courseNumber';
  value: string;
  filters?: ServerSideFilterParams;
}
