import type { Requisite } from "./requisite";

// type alias for schema generation
type integer = number;

/**
 * All school codes are three letters for consistency. According to portal
 * there is no course taught at KGI
 */
export enum School {
    POM = "PO",
    HMC = "HM",
    PTZ = "PZ",
    CMC = "CM",
    SCR = "SC",
    CGU = "CG",
}

export enum Term {
    fall = "FA",
    spring = "SP",
    summer = "SU",
}

export enum SectionStatus {
    open = "O",
    closed = "C",
    reopened = "R",
    unknown = "U",
}

export enum Weekday {
    monday = "M",
    tuesday = "T",
    wednesday = "W",
    thursday = "R",
    friday = "F",
    saturday = "S",
    sunday = "U",
}

/**
 * For course start and end dates, used to identify half-semester types.
 */
export interface CourseDate {
    year: integer;
    month: integer;
    day: integer;
}

/**
 * CourseCode is what we can use to identify equivalent course offerings in
 * different semesters. As such, there is no year or semester attached to it.
 */
export interface CourseCode {
    /**
     * 2-4 letters code in all upper case, e.g. CSCI, PE, HSA
     */
    department: string;
    courseNumber: integer;
    suffix: string;
    // this is the last two letters of the course code, e.g. SC, HM, JT, AS, AF
    affiliation: string;
}

/** CourseIdentifier is the unique identifier we need to pinpoint a course offering
 * from the database. We may stringify it as something like
 * `TEST001 SC-05 2022/FA`.
 */
export interface SectionIdentifier extends CourseCode {
    sectionNumber: integer;
    year: integer;
    term: Term;
    // first or second or fifth half of the term,
    // e.g. F1 and F2 for fall, P1 and P2 for spring,
    // and H1/S1 through H5/S5 for the summer
    half: string;
}

/**
 * A course can be uniquely identified by a {@link SectionIdentifier}. This
 * implies that each section is its own course. While different sections for
 * the majority of the types are the same (i.e. only differ in time),
 * sometimes different sections are completely different, such as
 * HSA010HM and CORE001SC.
 */
export interface Course {
    identifier: SectionIdentifier;

    title: string;
    description: string;
    primaryAssociation: School;
    /**
     * The letter code for the course area. It is not necessarily the same as
     * the course department. This is useful for people to filter the course
     * on portal so they know which dropdown to select
     */
    courseAreas: string[];

    /**
     * number of credits the course has in non-hmc credit.
     */
    credits: number;
    permCount: integer;
    seatsTotal: integer;
    seatsFilled: integer;
    /**
     * the status of the course, e.g. open, closed, reopened
     */
    status: SectionStatus;

    schedules: Schedule[];

    startDate: CourseDate;
    endDate: CourseDate;

    /**
     * Some types have special notes.
     */
    notes: string;
    /**
     * A list of textbook names.
     */
    textbooks: string[];

    instructors: Instructor[];

    requisite: Requisite;
}

export interface Schedule {
    /**
     * seconds since midnight.
     */
    startTime: integer;
    /**
     * seconds since midnight.
     */
    endTime: integer;

    days: Weekday[];
    /**
     * Location is an array because some classes have multiple locations.
     * This is especially common for lab classes.
     */
    locations: Location[];
}

export interface Location {
    buildingName: string;
    // this is most likely to be the primary association of the course,
    // but not always. PE classes are most likely to be the exception
    school: School;
    roomName: string;
}

export interface Instructor {
    name: string;
    email: string;
}
