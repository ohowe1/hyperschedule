import type { Endpoints } from "./types";

/**
 * This is the endpoint definition. For security reasons a lot of information has been left out, and all
 * params are set to null. The actual params are set in endpoints.ts with something like
 * ```ts
 *   import {setUsedParams} from "./utils";
 *
 *   const endpoints = {
 *     permCount: {
 *         link: "perm-count",
 *         params: setUsedParams("year", "catalog"),
 *         interval: 60,
 *         saveAs: "perm-count.json",
 *     }
 *   }
 * ```
 */

export const endpoints: Endpoints = {
    // fetch once per minute
    permCount: {
        name: "permCount",
        link: "perm-count",
        params: null,
        interval: 60,
        saveAs: "perm-count.json",
    },
    courseSection: {
        name: "courseSection",
        link: "course-section",
        params: null,
        interval: 60,
        saveAs: "course-section.json",
    },
    // fetch once per hour
    staff: {
        name: "staff",
        link: "staff",
        params: null,
        interval: 3600,
        saveAs: "staff.json",
    },
    altstaff: {
        name: "altstaff",
        link: "altstaff",
        params: null,
        interval: 3600,
        saveAs: "alt-staff.json",
    },
    courseRaw: {
        name: "courseRaw",
        link: "course-raw",
        params: null,
        interval: 3600,
        saveAs: "course.txt",
    },
    courseSectionSchedule: {
        name: "courseSectionSchedule",
        link: "course-section-schedule",
        params: null,
        interval: 3600,
        saveAs: "course-section-schedule.json",
    },
    calendarSession: {
        name: "calendarSession",
        link: "calendar-session",
        params: null,
        interval: 3600,
        saveAs: "calendar-session.json",
    },
    calendarSessionSection: {
        name: "calendarSessionSection",
        link: "calendar-session-section",
        params: null,
        interval: 3600,
        saveAs: "calendar-session-section.json",
    },
    sectionInstructor: {
        name: "sectionInstructor",
        link: "section-instructor",
        params: null,
        interval: 3600,
        saveAs: "section-instructor.json",
    },
    // fetch once per day
    courseAreas: {
        name: "courseAreas",
        link: "course-area",
        params: null,
        interval: 3600 * 24,
        saveAs: "course-area.json",
    },
    courseAreaDescription: {
        name: "courseAreaDescription",
        link: "course-area-description",
        params: null,
        interval: 3600 * 24,
        saveAs: "course-areas-description.json",
    },
};

export const endpointAuthorization = "local dev";
