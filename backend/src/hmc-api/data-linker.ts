import * as APIv4 from "hyperschedule-shared/api/v4";
import type {
    AltStaffOutput,
    CalendarSessionOutput,
    CalendarSessionSectionOutput,
    CourseOutput,
    CourseSectionOutput,
    CourseSectionScheduleOutput,
    PermCountOutput,
    SectionInstructorOutput,
    StaffOutput,
    CourseAreaOutput,
} from "./data-loader";
import {
    parseAltStaff,
    parseCalendarSession,
    parseCalendarSessionSection,
    parseCourseBoomi,
    parseCourseArea,
    parseCourseSection,
    parseCourseSectionSchedule,
    parsePermCount,
    parseSectionInstructor,
    parseStaff,
} from "./data-loader";

import { buildings } from "./buildings";
import { createLogger } from "../logger";
import { fixEncoding, replaceQuotes } from "./encoding";
import type { HmcApiFiles } from "./fetcher/types";

const logger = createLogger("parser.hmc.link");

/**
 * re-serialize term to its string form from SectionIdentifier
 */
export function extractSectionTerm(id: APIv4.SectionIdentifier): string {
    return `${id.term}${id.year}${
        id.half === null ? "" : id.half.prefix + id.half.number.toString()
    }`;
}

const dateRegex = /^(?<year>\d{4})(?<month>\d{2})(?<day>\d{2})$/;

/**
 * converts date in string to APIv4 format
 * @param date: date in the format of yyyymmdd
 */
function parseCalendarDate(date: string): APIv4.CourseDate {
    const match = dateRegex.exec(date);
    if (match === null) throw Error(`Malformed date ${date}`);

    const groups = match.groups as {
        year: string;
        month: string;
        day: string;
    };

    // TODO: handle possible NaN and perform other date validation
    return {
        year: parseInt(groups.year, 10),
        month: parseInt(groups.month, 10),
        day: parseInt(groups.day, 10),
    };
}

/**
 * parse time in the string format and converts it to number of seconds since midnight
 * @param time: the time string. e.g. 1100 for 11:00, 935 for 9:35, 0 for 12:00
 */
function parseTime(time: string): number {
    const padded = time.padStart(4, "0");
    const hr = parseInt(padded.slice(0, 2), 10);
    const mn = parseInt(padded.slice(2, 4), 10);
    if (hr > 23 || hr < 0 || mn > 60 || mn < 0)
        throw Error(`Malformated time ${time}`);

    return hr * 3600 + mn * 60;
}

const weekdaysInOrder = [
    APIv4.Weekday.sunday,
    APIv4.Weekday.monday,
    APIv4.Weekday.tuesday,
    APIv4.Weekday.wednesday,
    APIv4.Weekday.thursday,
    APIv4.Weekday.friday,
    APIv4.Weekday.saturday,
];

/**
 * parse weekdays in the format of, e.g. -M-W-F-, to an array of weekdays
 * @param weekdays
 */
function parseWeekdays(weekdays: string): APIv4.Weekday[] {
    const res: APIv4.Weekday[] = [];
    if (weekdays.length !== 7)
        throw Error(`Malformed weekday string ${weekdays}`);

    for (let i = 0; i < 7; i++) {
        const c = weekdays[i];
        if (c === "-") continue;
        const weekday = weekdaysInOrder[i]!;
        if (c === weekday) res.push(weekday);
        else throw Error(`Malformed weekday string ${weekdays}`);
    }

    return res;
}

/**
 * converts the building code in the form of, e.g. HM SHAN 2465, to a more human-readable location
 * if any field is missing, there should still be a space
 */
function parseBuildingCode(code: string): string {
    const [campus, location, room] = code.split(" ");
    if (campus === undefined || location === undefined || room === undefined) {
        // if we cannot parse the code, just return it as-is because humans might be able to
        // interpret them
        logger.trace(`Malformed location code ${code}`);
        return code;
    }

    if (location === "ARR") return "Arranged location";
    else if (location === "TBA") return "To be announced";

    if (campus === "") {
        logger.trace(`Malformed location code ${code}`);
        return code;
    }

    const dict = buildings[campus];
    if (dict === undefined) {
        logger.trace(`Malformed location code ${code}`);
        return code;
    }

    const building = dict[location];
    if (building === undefined) {
        logger.trace(`Malformed location code ${code}`);
        return code;
    }

    // trim this because room might be empty string
    return `${building} ${room}`.trim();
}

function processCourse(
    courseMap: Map<string, APIv4.Course>,
    courseParsed: CourseOutput[],
) {
    const allCampuses: string[] = Object.values(APIv4.School);
    for (let c of courseParsed) {
        let potentialError = courseMap.has(c.code);

        let campus: APIv4.School;

        if (allCampuses.includes(c.campus)) {
            campus = c.campus as unknown as APIv4.School;
        } else {
            logger.trace(
                `Course found with unknown primary association, skipping`,
            );
            logger.trace(c);
            continue;
        }
        let courseCode: APIv4.CourseCode;
        try {
            courseCode = APIv4.parseCXCourseCode(c.code);
        } catch (e) {
            logger.trace(`Malformed course code ${c.code}`);
            continue;
        }

        if (potentialError) {
            const prevData = courseMap.get(c.code)!;
            if (
                !prevData.potentialError &&
                prevData.title === replaceQuotes(fixEncoding(c.title)) &&
                prevData.description ===
                    replaceQuotes(fixEncoding(c.description)) &&
                prevData.primaryAssociation === campus
            ) {
                potentialError = false;
            } else {
                logger.warn(
                    `Duplicate course key ${c.code} with differences, overwriting existing data`,
                );
            }
        }

        courseMap.set(APIv4.stringifyCourseCode(courseCode), {
            title: replaceQuotes(fixEncoding(c.title)),
            description: replaceQuotes(fixEncoding(c.description)),
            primaryAssociation: campus,
            code: courseCode,
            potentialError,
        });
    }
}

function processStaff(
    staffMap: Map<string, APIv4.Instructor>,
    staffParsed: StaffOutput,
    altstaffParsed: AltStaffOutput,
) {
    for (let staff of staffParsed) {
        staffMap.set(staff.cxId, {
            name: `${staff.firstName} ${staff.lastName}`,
        });
    }

    for (let staff of altstaffParsed) {
        if (!staffMap.has(staff.cxId))
            logger.trace("Nonexistent staff %o in alt-staff.json", staff);
        // overwrite existing staff if there is a preferred name
        staffMap.set(staff.cxId, {
            name: staff.altName,
        });
    }
}

function processCourseSection(
    courseSectionMap: Map<string, Partial<APIv4.Section>>,
    dupeMap: Map<string, number>,
    courseMap: Map<string, APIv4.Course>,
    courseAreaMap: Map<string, string[]>,
    courseSectionParsed: CourseSectionOutput,
) {
    const allSectionStatus = ["O", "C", "R"];

    for (const section of courseSectionParsed) {
        const sectionIdentifierString = APIv4.stringifySectionCodeLong(
            section.sectionId,
        );
        const courseCodeString = APIv4.stringifyCourseCode(section.sectionId);
        let potentialError: boolean = courseSectionMap.has(
            sectionIdentifierString,
        );
        if (potentialError) {
            logger.trace(`Duplicate course section ${sectionIdentifierString}`);
        }
        const course = courseMap.get(courseCodeString);
        if (course === undefined) {
            logger.trace(
                "Course section without course, skipping... %o",
                section,
            );
            continue;
        }

        let status: APIv4.SectionStatus;
        if (allSectionStatus.includes(section.status))
            status = section.status as APIv4.SectionStatus;
        else status = APIv4.SectionStatus.unknown;

        if (section.sectionNumber !== section.sectionId.sectionNumber)
            logger.info(
                "Mismatching section number, section ID is %O, section data is %d",
                section.sectionId,
                section.sectionNumber,
            );

        const courseAreas: string[] = courseAreaMap.get(courseCodeString) ?? [];

        // TODO: check remove
        // if (potentialError) {
        //     const n = dupeMap.get(section.sectionID);
        //     if (n) dupeMap.set(section.sectionID, n + 1);
        //     else dupeMap.set(section.sectionID, 1);
        //     const prevData = courseSectionMap.get(section.sectionID)!;
        //
        //     // we double-check that two data are the same. if they are, remove the error
        //     // flag. if flagged for error previously then we keep the flag
        //
        //     if (
        //         // we don't need to compare prevData.identifier here
        //         // because we know they are the same
        //         !prevData.potentialError &&
        //         prevData.course === course &&
        //         prevData.status === status &&
        //         prevData.credits === credits &&
        //         prevData.seatsFilled === seatsFilled &&
        //         prevData.seatsTotal === seatsTotal
        //     ) {
        //         potentialError = false;
        //         logger.trace(
        //             "Duplicate course section for %s, no differences",
        //             section.sectionID,
        //         );
        //     } else {
        //         logger.trace(
        //             "Duplicate course section for %s, different values ",
        //             section.sectionID,
        //         );
        //     }
        // }

        courseSectionMap.set(sectionIdentifierString, {
            course,
            status,
            courseAreas,
            potentialError,
            instructors: [],
            schedules: [],
            credits: section.credits,
            identifier: section.sectionId,
            seatsTotal: section.seatsTotal,
            seatsFilled: section.seatsFilled,
        });
    }
}

function processSectionInstructor(
    staffMap: Map<string, APIv4.Instructor>,
    dupeMap: Map<string, number>,
    courseSectionMap: Map<string, Partial<APIv4.Section>>,
    sectionInstructorParsed: SectionInstructorOutput,
) {
    for (let sectionInstructor of sectionInstructorParsed) {
        const sectionIdentifierString = APIv4.stringifySectionCodeLong(
            sectionInstructor.sectionId,
        );
        const section = courseSectionMap.get(sectionIdentifierString);
        if (section === undefined) {
            logger.trace(
                `Nonexistent section ${sectionIdentifierString} in section-instructor.json`,
            );
            continue;
        }

        for (const staffId of sectionInstructor.staff) {
            const staff = staffMap.get(staffId);

            if (staff === undefined) {
                logger.trace(
                    `Nonexistent instructor ${staffId} for ${sectionIdentifierString}`,
                );
                section.potentialError = true;
                continue;
            }

            if (!section.instructors!.includes(staff)) {
                section.instructors!.push(staff);
            } else {
                logger.trace(
                    `Duplicate staff ${staffId} for ${sectionIdentifierString}`,
                );
            }
        }
    }
}

function processPermCount(
    courseSectionMap: Map<string, Partial<APIv4.Section>>,
    permCountParsed: PermCountOutput,
) {
    for (let perm of permCountParsed) {
        const sectionIdentifierString = APIv4.stringifySectionCodeLong(
            perm.sectionId,
        );
        const section = courseSectionMap.get(sectionIdentifierString);
        if (section === undefined) {
            logger.trace(
                `Nonexistent section ${sectionIdentifierString} in perm-count.json`,
            );
            continue;
        }
        section.permCount = perm.permCount;
    }
}

function processCalendar(
    courseSectionMap: Map<string, Partial<APIv4.Section>>,
    calendarSessionParsed: CalendarSessionOutput,
    calendarSessionSectionParsed: CalendarSessionSectionOutput,
) {
    let calendarMap: Map<
        string,
        {
            start: APIv4.CourseDate;
            end: APIv4.CourseDate;
        }
    > = new Map();

    for (let session of calendarSessionParsed) {
        calendarMap.set(session.session, {
            start: parseCalendarDate(session.startDate),
            end: parseCalendarDate(session.endDate),
        });
    }

    for (let session of calendarSessionSectionParsed) {
        const sectionIdentifierString = APIv4.stringifySectionCodeLong(
            session.sectionId,
        );
        const section = courseSectionMap.get(sectionIdentifierString);
        if (section === undefined) {
            logger.trace(
                `Nonexistent section ID ${sectionIdentifierString} in calendar-session-section.json`,
            );
            continue;
        }

        const calendar = calendarMap.get(session.session);
        if (calendar === undefined) {
            logger.trace("Nonexistent calendar session %s", session.session);
            section.potentialError = true;
            section.startDate = { year: 1970, month: 1, day: 1 };
            section.endDate = { year: 1970, month: 1, day: 1 };
        } else {
            section.startDate = calendar.start;
            section.endDate = calendar.end;
        }
    }
}

function processSectionSchedule(
    courseSectionMap: Map<string, Partial<APIv4.Section>>,
    courseSectionScheduleParsed: CourseSectionScheduleOutput,
) {
    for (let schedule of courseSectionScheduleParsed) {
        const sectionIdString = APIv4.stringifySectionCodeLong(
            schedule.sectionId,
        );
        const section = courseSectionMap.get(sectionIdString);
        if (section === undefined) {
            logger.trace(
                `Nonexistent section ID ${sectionIdString} in course-section-schedule.json`,
            );
            continue;
        }

        const startTime = parseTime(schedule.beginTime);
        const endTime = parseTime(schedule.endTime);
        const weekdays = parseWeekdays(schedule.meetingDays);
        const location = parseBuildingCode(schedule.location);

        let merged: boolean = false;
        for (let s of section.schedules!) {
            // merge locations if multiple
            if (
                s.startTime === startTime &&
                s.endTime === endTime &&
                s.days.toString() === weekdays.toString()
            ) {
                if (s.locations.includes(location)) {
                    logger.trace(
                        `Duplicate location in ${sectionIdString} section schedule`,
                    );
                    section.potentialError = true;
                } else s.locations.push(location);
                merged = true;
                break;
            }
        }

        if (!merged) {
            section.schedules!.push({
                startTime,
                endTime,
                days: weekdays,
                locations: [location],
            });
        }
    }
}

function processCourseAreas(
    courseAreasParsed: CourseAreaOutput,
    courseAreaMap: Map<string, string[]>,
) {
    for (let area of courseAreasParsed) {
        // TODO: check catalog year
        const courseCodeString = APIv4.stringifyCourseCode(area.courseCode);
        if (courseAreaMap.has(courseCodeString))
            logger.trace(
                `Duplicate course ${courseCodeString} in course-area.json`,
            );
        courseAreaMap.set(courseCodeString, area.courseAreas);
    }
}

/**
 * Link all data together and group to the APIv4 section. We need the term to filter out data either from the past or future
 */
export function linkCourseData(files: HmcApiFiles): APIv4.Section[] {
    // course map contains course data needed for courses of all sections
    // whereas courseSectionMap contains section-specific information
    let courseMap: Map<string, APIv4.Course> = new Map();
    let courseSectionMap: Map<string, Partial<APIv4.Section>> = new Map();
    let staffMap: Map<string, APIv4.Instructor> = new Map();
    let dupeMap: Map<string, number> = new Map();
    let courseAreaMap: Map<string, string[]> = new Map();

    // boring file parsing
    const altstaffParsed: AltStaffOutput = parseAltStaff(files.altstaff);
    const calendarSessionParsed: CalendarSessionOutput = parseCalendarSession(
        files.calendarSession,
    );
    const calendarSessionSectionParsed: CalendarSessionSectionOutput =
        parseCalendarSessionSection(files.calendarSessionSection);
    const courseParsed: CourseOutput[] = parseCourseBoomi(files.courseRaw);
    const courseSectionParsed: CourseSectionOutput = parseCourseSection(
        files.courseSection,
    );
    const courseSectionScheduleParsed: CourseSectionScheduleOutput =
        parseCourseSectionSchedule(files.courseSectionSchedule);
    const permCountParsed: PermCountOutput = parsePermCount(files.permCount);
    const sectionInstructorParsed: SectionInstructorOutput =
        parseSectionInstructor(files.sectionInstructor);
    const staffParsed: StaffOutput = parseStaff(files.staff);
    const courseAreaParsed: CourseAreaOutput = parseCourseArea(
        files.courseAreas,
    );

    processCourse(courseMap, courseParsed);
    processCourseAreas(courseAreaParsed, courseAreaMap);
    processStaff(staffMap, staffParsed, altstaffParsed);
    processCourseSection(
        courseSectionMap,
        dupeMap,
        courseMap,
        courseAreaMap,
        courseSectionParsed,
    );
    processSectionInstructor(
        staffMap,
        dupeMap,
        courseSectionMap,
        sectionInstructorParsed,
    );
    processPermCount(courseSectionMap, permCountParsed);
    processCalendar(
        courseSectionMap,
        calendarSessionParsed,
        calendarSessionSectionParsed,
    );
    processSectionSchedule(courseSectionMap, courseSectionScheduleParsed);

    const res: Partial<APIv4.Section>[] = Array.from(courseSectionMap.values());
    for (let section of res) {
        if (section.permCount === undefined) section.permCount = 0;
        const validatedResult = APIv4.Section.safeParse(section);
        if (!validatedResult.success) {
            if (process.env.NODE_ENV === "production")
                logger.warn(
                    "invalid section %o, reason %o",
                    section,
                    validatedResult.error,
                );
            else {
                logger.error(
                    "invalid section %o, reason %o",
                    section,
                    validatedResult.error,
                );
                throw Error(
                    `Invalid section ${APIv4.stringifySectionCodeLong(
                        (section as APIv4.Section).identifier,
                    )}`,
                );
            }
            // apparently typescript thinks section is of type never,
            // probably because the schema check earlier
            (section as Partial<APIv4.Section>).potentialError = true;
        }
    }
    return res as APIv4.Section[];
}

import { loadCourseFiles } from "./fetcher/utils";

const term = { term: APIv4.Term.spring, year: 2023 };
linkCourseData(await loadCourseFiles(term));