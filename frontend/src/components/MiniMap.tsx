import Css from "./MiniMap.module.css";

import * as APIv4 from "hyperschedule-shared/api/v4";

import { useActiveScheduleResolved } from "@hooks/schedule";
import useStore from "@hooks/store";
import { PopupOption } from "@lib/popup";

import { sectionColorStyle } from "@lib/color";

import GridBackgroundColumns from "@components/schedule/GridBackgroundColumns";

import classNames from "classnames";

import {
    cardKey,
    comparePriority,
    groupCardsByDay,
    mergeCards,
} from "@lib/schedule";
import { useState } from "react";

export default function MiniMap() {
    const { bounds, cards, expandCards, startHour, endHour } =
        useActiveScheduleResolved();

    const clearExpand = useStore((store) => store.clearExpand);
    const theme = useStore((store) => store.theme);
    const setPopup = useStore((store) => store.setPopup);

    const [hoverSection, setHoverSection] = useState<string | null>(null);

    const byDay = groupCardsByDay(cards);

    return (
        <div className={Css.minimapContainer}>
            <div className={Css.minimapLabelDay}>
                <span>{bounds.sunday ? "Sun" : "Mon"}</span>
                <span>{bounds.saturday ? "Sat" : "Fri"}</span>
            </div>
            <div className={Css.minimapLabelTime}>
                <span>{startHour}am</span>
                <span>{endHour - 12}pm</span>
            </div>
            <div className={Css.minimap}>
                <div
                    className={classNames(Css.grid, {
                        [Css.showSunday!]: bounds.sunday,
                        [Css.showSaturday!]: bounds.saturday,
                    })}
                    style={
                        {
                            "--start-hour": startHour,
                            "--end-hour": endHour,
                        } as React.CSSProperties
                    }
                >
                    <GridBackgroundColumns />

                    {[Css.morning, Css.noon, Css.evening].map((time) => (
                        <div className={classNames(Css.rowLine, time)} />
                    ))}

                    {expandCards.map((card) => (
                        <div
                            key={`outline:${cardKey(card)}`}
                            className={Css.expandOutline}
                            style={{
                                gridColumn: card.day,
                                gridRow: `${
                                    Math.floor(card.startTime / 300) + 1
                                } / ${Math.floor(card.endTime / 300) + 1}`,
                                ...sectionColorStyle(
                                    card.section.identifier,
                                    theme,
                                ),
                            }}
                            onClick={clearExpand}
                        ></div>
                    ))}
                    {Object.entries(byDay).flatMap(([day, cards]) =>
                        mergeCards(cards).map((group, i) => {
                            return (
                                <div
                                    key={`group:${day}/${i}`}
                                    className={Css.cardGroup}
                                    style={{
                                        gridColumn: day,
                                        gridRow: `${
                                            Math.round(group.startTime / 300) +
                                            1
                                        } / ${
                                            Math.round(group.endTime / 300) + 1
                                        }`,
                                        gridTemplateRows: `repeat(${Math.round(
                                            (group.endTime - group.startTime) /
                                                300,
                                        )},1fr)`,
                                        gridTemplateColumns: `repeat(${group.cards.length},1fr)`,
                                    }}
                                >
                                    {group.cards
                                        .sort(comparePriority)
                                        .map((card, i) => {
                                            const sectionCode =
                                                APIv4.stringifySectionCodeLong(
                                                    card.section.identifier,
                                                );

                                            return (
                                                <div
                                                    key={`slice:${sectionCode}/${i}`}
                                                    className={classNames(
                                                        Css.slice,
                                                        {
                                                            [Css.hover]:
                                                                sectionCode ===
                                                                hoverSection,
                                                        },
                                                    )}
                                                    style={{
                                                        gridColumn: `${i + 1}`,
                                                        gridRow: `${
                                                            Math.round(
                                                                (card.startTime -
                                                                    group.startTime) /
                                                                    300,
                                                            ) + 1
                                                        } / ${
                                                            Math.round(
                                                                (card.endTime -
                                                                    group.startTime) /
                                                                    300,
                                                            ) + 1
                                                        }`,
                                                        ...sectionColorStyle(
                                                            card.section
                                                                .identifier,
                                                            theme,
                                                        ),
                                                    }}
                                                    onClick={() =>
                                                        setPopup({
                                                            option: PopupOption.SectionDetail,
                                                            section:
                                                                card.section
                                                                    .identifier,
                                                        })
                                                    }
                                                    onPointerEnter={() =>
                                                        setHoverSection(
                                                            sectionCode,
                                                        )
                                                    }
                                                    onPointerLeave={() =>
                                                        setHoverSection(null)
                                                    }
                                                ></div>
                                            );
                                        })}
                                </div>
                            );
                        }),
                    )}
                </div>
            </div>
        </div>
    );
}
