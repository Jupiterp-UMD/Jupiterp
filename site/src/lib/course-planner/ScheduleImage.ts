/**
 * This file is part of Jupiterp. For terms of use, please see the file
 * called LICENSE at the top level of the Jupiterp source tree (online at
 * https://github.com/atcupps/Jupiterp/LICENSE).
 *
 *
 * @fileoverview Draws the current schedule onto a canvas so it can be
 * copied or downloaded as a PNG.
 *
 * The image is drawn from the schedule data rather than screenshotted from
 * the page, so it always shows the whole week at the same size regardless of
 * the viewer's screen, scroll position or open panels, and it leaves out
 * hover previews and remove buttons.
 */

import type { ClassMeetingExtended, Schedule, ScheduleBlock } from '../../types';
import { getClasstimeBounds, schedulify } from './Schedule';
import { getColorFromNumber } from './ClassMeetingUtils';
import { formatClasstime, formatInstructors, formatLocation } from './Formatting';

/** Sizes in CSS pixels; the canvas is drawn at `SCALE` times this. */
const SCALE = 2;
const PADDING = 32;
const HEADER_HEIGHT = 64;
const DAY_HEADER_HEIGHT = 28;
const TIME_GUTTER_WIDTH = 52;
const COLUMN_WIDTH = 200;
const HOUR_HEIGHT = 72;
const OTHER_CARD_HEIGHT = 76;
const OTHER_CARD_GAP = 8;
const FOOTER_HEIGHT = 36;
const BLOCK_GAP = 2;

/** Fewest hours the grid shows, matching the planner. */
const MIN_HOURS_SHOWN = 8;

const FONT_FAMILY = 'Cabin, Arial, sans-serif';
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

/** Colors the image is drawn with, read from the site's theme. */
export interface ImageTheme {
  background: string;
  text: string;
  textSecondary: string;
  gridLine: string;
}

const LIGHT_THEME: ImageTheme = {
  background: '#ffffff',
  text: '#000000',
  textSecondary: '#667085',
  gridLine: '#a2aabd',
};

/** One class meeting placed on the image. */
export interface ImageBlock {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  title: string;
  /** Detail lines, most important first; the renderer drops the rest when the block is short. */
  details: string[];
}

/** Everything the renderer needs to draw, in CSS pixels. */
export interface ImageLayout {
  width: number;
  height: number;
  gridTop: number;
  gridHeight: number;
  earliestHour: number;
  latestHour: number;
  columns: { name: string; x: number }[];
  blocks: ImageBlock[];
}

/**
 * The hours the grid spans: the earliest start floored and latest end ceiled,
 * widened to at least `MIN_HOURS_SHOWN` hours the same way the planner does.
 * @param schedule A `Schedule`
 * @returns The first and last hour shown, in 24-hour time
 */
export function getImageHourBounds(schedule: Schedule): { earliestHour: number; latestHour: number } {
  const hasTimedMeeting = [schedule.monday, schedule.tuesday, schedule.wednesday, schedule.thursday, schedule.friday]
    .flat()
    .some((classMeeting) => typeof classMeeting.meeting !== 'string');
  if (!hasTimedMeeting) {
    return { earliestHour: 8, latestHour: 16 };
  }

  const bounds = getClasstimeBounds(schedule);
  let earliestHour = bounds.earliestStart;
  let latestHour = bounds.latestEnd;
  const shortfall = MIN_HOURS_SHOWN - (latestHour - earliestHour);
  if (shortfall > 0) {
    earliestHour = Math.max(0, earliestHour - Math.floor(shortfall / 2));
    latestHour = Math.min(24, latestHour + Math.ceil(shortfall / 2));
  }
  return { earliestHour, latestHour };
}

/**
 * Label for a meeting with no set time, such as an online async section.
 * @param meeting The meeting's time code, e.g. `'OnlineAsync'`
 */
function formatUntimedMeeting(meeting: string): string {
  switch (meeting) {
    case 'OnlineAsync':
      return 'Online async';
    case 'Unknown':
      return 'Unknown time';
    case 'Unspecified':
      return 'Unspecified time';
    case 'No Sections':
      return 'No sections';
    default:
      return meeting;
  }
}

/**
 * The detail lines shown under a meeting's title, most important first.
 * @param classMeeting A meeting from a `Schedule`
 */
export function getMeetingDetails(classMeeting: ClassMeetingExtended): string[] {
  const meeting = classMeeting.meeting;
  if (typeof meeting === 'string') {
    return [
      formatUntimedMeeting(meeting),
      `Section ${classMeeting.sectionCode}`,
      formatInstructors(classMeeting.instructors),
    ].filter((line) => line.length > 0);
  }

  const time = formatClasstime(meeting.classtime);
  if (classMeeting.userEvent) {
    return [time, meeting.location.building.trim(), classMeeting.notes?.trim() ?? ''].filter((line) => line.length > 0);
  }
  return [
    time,
    formatLocation(meeting.location),
    `Section ${classMeeting.sectionCode}`,
    formatInstructors(classMeeting.instructors),
  ].filter((line) => line.length > 0);
}

/**
 * Lays out a schedule for the image. Hover previews are left out, since the
 * image shows what the student has actually picked.
 * @param selections The blocks on the student's current schedule
 * @returns Positions and text for everything on the image, in CSS pixels
 */
export function layoutScheduleImage(selections: ScheduleBlock[]): ImageLayout {
  const schedule = schedulify(selections.filter((selection) => !('course' in selection) || !selection.hover));
  const { earliestHour, latestHour } = getImageHourBounds(schedule);

  // Some sections list the same untimed meeting twice (e.g. two OnlineAsync
  // entries); one card says everything the image needs to.
  const otherCards: ImageBlock[] = [];
  const seenOtherCards = new Set<string>();
  for (const classMeeting of schedule.other) {
    const details = getMeetingDetails(classMeeting);
    const key = [classMeeting.courseCode, ...details].join('\n');
    if (seenOtherCards.has(key)) continue;
    seenOtherCards.add(key);
    otherCards.push({
      x: 0,
      y: 0,
      width: COLUMN_WIDTH - BLOCK_GAP * 2,
      height: OTHER_CARD_HEIGHT,
      color: getColorFromNumber(classMeeting.colorNumber),
      title: classMeeting.courseCode,
      details,
    });
  }

  const hasOther = otherCards.length > 0;
  const columnCount = hasOther ? 6 : 5;
  const gridLeft = PADDING + TIME_GUTTER_WIDTH;
  const gridTop = PADDING + HEADER_HEIGHT + DAY_HEADER_HEIGHT;
  const otherHeight = otherCards.length * (OTHER_CARD_HEIGHT + OTHER_CARD_GAP);
  const gridHeight = Math.max((latestHour - earliestHour) * HOUR_HEIGHT, otherHeight);

  const columns = [...DAY_NAMES, ...(hasOther ? ['Other'] : [])].map((name, i) => ({
    name,
    x: gridLeft + i * COLUMN_WIDTH,
  }));

  const blocks: ImageBlock[] = [];
  const days = [schedule.monday, schedule.tuesday, schedule.wednesday, schedule.thursday, schedule.friday];
  days.forEach((day, dayIndex) => {
    for (const classMeeting of day) {
      if (typeof classMeeting.meeting === 'string') continue;
      const { start, end } = classMeeting.meeting.classtime;
      const slotWidth = COLUMN_WIDTH / classMeeting.conflictTotal;
      blocks.push({
        x: columns[dayIndex].x + (classMeeting.conflictIndex - 1) * slotWidth + BLOCK_GAP,
        y: gridTop + (start - earliestHour) * HOUR_HEIGHT + BLOCK_GAP / 2,
        width: slotWidth - BLOCK_GAP * 2,
        height: (end - start) * HOUR_HEIGHT - BLOCK_GAP,
        color: getColorFromNumber(classMeeting.colorNumber),
        title: classMeeting.courseCode,
        details: getMeetingDetails(classMeeting),
      });
    }
  });

  otherCards.forEach((card, i) => {
    blocks.push({
      ...card,
      x: columns[5].x + BLOCK_GAP,
      y: gridTop + i * (OTHER_CARD_HEIGHT + OTHER_CARD_GAP),
    });
  });

  return {
    width: gridLeft + columnCount * COLUMN_WIDTH + PADDING,
    height: gridTop + gridHeight + FOOTER_HEIGHT + PADDING,
    gridTop,
    gridHeight,
    earliestHour,
    latestHour,
    columns,
    blocks,
  };
}

/**
 * Formats an hour as a grid label, e.g. `13` as `'1 PM'`.
 * @param hour An hour in 24-hour time
 */
export function formatHourLabel(hour: number): string {
  const hourInDay = hour % 24;
  const suffix = hourInDay < 12 ? 'AM' : 'PM';
  const hourOnClock = hourInDay % 12 === 0 ? 12 : hourInDay % 12;
  return `${hourOnClock} ${suffix}`;
}

/**
 * Turns a schedule name into a safe file name, e.g. `'Plan B!'` as `'Plan-B.png'`.
 * @param scheduleName The schedule's name
 */
export function imageFileName(scheduleName: string): string {
  const safeName = scheduleName
    .replace(/[^\w\- ]+/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return `${safeName || 'schedule'}.png`;
}

/**
 * Shortens a time range for narrow blocks, keeping the start's am/pm only
 * when it differs from the end's, e.g. `'9:00am - 9:50am'` as `'9:00-9:50am'`.
 * Returns other text unchanged.
 * @param text A detail line, possibly a time range from `formatClasstime`
 */
export function compactTimeRange(text: string): string {
  const match = text.match(/^(\d{1,2}:\d{2})(am|pm) - (\d{1,2}:\d{2})(am|pm)$/);
  if (!match) return text;
  const [, start, startSuffix, end, endSuffix] = match;
  return `${start}${startSuffix === endSuffix ? '' : startSuffix}-${end}${endSuffix}`;
}

/** Reads the site's current theme colors, so a dark-mode user gets a dark image. */
function readTheme(): ImageTheme {
  const styles = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback;
  return {
    background: read('--bg-primary', LIGHT_THEME.background),
    text: read('--text-primary', LIGHT_THEME.text),
    textSecondary: read('--text-secondary', LIGHT_THEME.textSecondary),
    gridLine: read('--outline', LIGHT_THEME.gridLine),
  };
}

/** Shortens `text` with an ellipsis until it fits in `maxWidth`. */
function truncateToWidth(context: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (context.measureText(text).width <= maxWidth) return text;
  const compact = compactTimeRange(text);
  if (compact !== text) return truncateToWidth(context, compact, maxWidth);
  let end = text.length;
  while (end > 0 && context.measureText(text.slice(0, end) + '…').width > maxWidth) {
    end--;
  }
  return end > 0 ? text.slice(0, end).trimEnd() + '…' : '';
}

/** Traces a rounded rectangle; `CanvasRenderingContext2D.roundRect` is too new to rely on. */
function traceRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function drawGrid(context: CanvasRenderingContext2D, layout: ImageLayout, theme: ImageTheme) {
  const gridLeft = layout.columns[0].x;
  const weekdayRight = gridLeft + DAY_NAMES.length * COLUMN_WIDTH;

  context.strokeStyle = theme.gridLine;
  context.lineWidth = 1;
  for (let hour = layout.earliestHour; hour <= layout.latestHour; hour++) {
    const y = layout.gridTop + (hour - layout.earliestHour) * HOUR_HEIGHT;
    context.globalAlpha = 0.5;
    context.beginPath();
    context.moveTo(gridLeft, y);
    context.lineTo(weekdayRight, y);
    context.stroke();

    if (hour < layout.latestHour) {
      context.globalAlpha = 0.2;
      context.beginPath();
      context.moveTo(gridLeft, y + HOUR_HEIGHT / 2);
      context.lineTo(weekdayRight, y + HOUR_HEIGHT / 2);
      context.stroke();
    }

    context.globalAlpha = 1;
    context.fillStyle = theme.textSecondary;
    context.font = `500 11px ${FONT_FAMILY}`;
    context.textAlign = 'right';
    context.textBaseline = 'middle';
    context.fillText(formatHourLabel(hour), gridLeft - 8, y);
  }

  context.fillStyle = theme.text;
  context.font = `600 15px ${FONT_FAMILY}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  for (const column of layout.columns) {
    const headerY = layout.gridTop - DAY_HEADER_HEIGHT / 2;
    context.fillText(column.name, column.x + COLUMN_WIDTH / 2, headerY);
  }
}

function drawBlock(context: CanvasRenderingContext2D, block: ImageBlock) {
  const titleHeight = 22;
  const lineHeight = 15;
  const textPadding = 8;
  const textWidth = block.width - textPadding * 2;

  context.save();
  traceRoundedRect(context, block.x, block.y, block.width, block.height, 8);
  context.fillStyle = block.color;
  context.fill();
  context.clip();

  // Course blocks are pastel in both themes, so their text is always black.
  context.fillStyle = 'rgba(0, 0, 0, 0.07)';
  context.fillRect(block.x, block.y, block.width, Math.min(titleHeight, block.height));
  context.fillStyle = '#000000';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = `600 14px ${FONT_FAMILY}`;
  const titleY = block.y + Math.min(titleHeight, block.height) / 2;
  context.fillText(truncateToWidth(context, block.title, textWidth), block.x + block.width / 2, titleY);

  context.font = `400 12px ${FONT_FAMILY}`;
  const linesThatFit = Math.floor((block.height - titleHeight - 4) / lineHeight);
  block.details.slice(0, Math.max(0, linesThatFit)).forEach((line, i) => {
    const lineY = block.y + titleHeight + 2 + lineHeight * (i + 0.5);
    context.fillText(truncateToWidth(context, line, textWidth), block.x + block.width / 2, lineY);
  });
  context.restore();
}

/**
 * Draws `selections` onto a new canvas in the site's current theme.
 * @param selections The blocks on the student's current schedule
 * @param scheduleName Shown as the image's title
 * @param subtitle Shown under the title, e.g. the term name
 * @returns A canvas holding the drawn schedule
 */
export async function drawScheduleImage(
  selections: ScheduleBlock[],
  scheduleName: string,
  subtitle: string
): Promise<HTMLCanvasElement> {
  // Canvas text falls back to Arial if Cabin has not loaded yet.
  await Promise.all([
    document.fonts.load(`400 12px ${FONT_FAMILY}`),
    document.fonts.load(`600 14px ${FONT_FAMILY}`),
  ]).catch(() => {});

  const layout = layoutScheduleImage(selections);
  const theme = readTheme();
  const canvas = document.createElement('canvas');
  canvas.width = layout.width * SCALE;
  canvas.height = layout.height * SCALE;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context is unavailable');
  context.scale(SCALE, SCALE);

  context.fillStyle = theme.background;
  context.fillRect(0, 0, layout.width, layout.height);

  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
  context.fillStyle = theme.text;
  context.font = `700 24px ${FONT_FAMILY}`;
  const titleWidth = layout.width - PADDING * 2;
  context.fillText(truncateToWidth(context, scheduleName, titleWidth), PADDING, PADDING + 24);
  context.fillStyle = theme.textSecondary;
  context.font = `400 14px ${FONT_FAMILY}`;
  context.fillText(subtitle, PADDING, PADDING + 46);

  drawGrid(context, layout, theme);
  for (const block of layout.blocks) {
    drawBlock(context, block);
  }

  context.fillStyle = theme.textSecondary;
  context.font = `400 12px ${FONT_FAMILY}`;
  context.textAlign = 'right';
  context.textBaseline = 'alphabetic';
  context.fillText('Made with Jupiterp · jupiterp.com', layout.width - PADDING, layout.height - PADDING);

  return canvas;
}

/**
 * Encodes a canvas as a PNG.
 * @param canvas The canvas to encode
 */
export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG encoding failed'))), 'image/png');
  });
}
