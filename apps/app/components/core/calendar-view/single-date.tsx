import React, { useState } from "react";

// react-beautiful-dnd
import { Draggable } from "react-beautiful-dnd";
// component
import StrictModeDroppable from "components/dnd/StrictModeDroppable";
import { SingleCalendarIssue } from "./single-issue";
// icons
import { PlusSmallIcon } from "@heroicons/react/24/outline";
// helper
import { formatDate } from "helpers/calendar.helper";
// types
import { ICurrentUserResponse, IIssue } from "types";

type Props = {
  handleEditIssue: (issue: IIssue) => void;
  handleDeleteIssue: (issue: IIssue) => void;
  index: number;
  date: {
    date: string;
    issues: IIssue[];
  };
  addIssueToDate: (date: string) => void;
  isMonthlyView: boolean;
  showWeekEnds: boolean;
  user: ICurrentUserResponse | undefined;
  isNotAllowed: boolean;
};

export const SingleCalendarDate: React.FC<Props> = ({
  handleEditIssue,
  handleDeleteIssue,
  date,
  index,
  addIssueToDate,
  isMonthlyView,
  showWeekEnds,
  user,
  isNotAllowed,
}) => {
  const [showAllIssues, setShowAllIssues] = useState(false);

  const totalIssues = date.issues.length;

  return (
    <StrictModeDroppable droppableId={date.date}>
      {(provided) => (
        <div
          key={index}
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`group relative flex min-h-[150px] flex-col gap-1.5 border-t border-brand-base p-2.5 text-left text-sm font-medium hover:bg-brand-surface-1 ${
            isMonthlyView ? "" : "pt-9"
          } ${
            showWeekEnds
              ? (index + 1) % 7 === 0
                ? ""
                : "border-r"
              : (index + 1) % 5 === 0
              ? ""
              : "border-r"
          }`}
        >
          {isMonthlyView && <span>{formatDate(new Date(date.date), "d")}</span>}
          {totalIssues > 0 &&
            date.issues.slice(0, showAllIssues ? totalIssues : 4).map((issue: IIssue, index) => (
              <Draggable key={issue.id} draggableId={issue.id} index={index}>
                {(provided, snapshot) => (
                  <SingleCalendarIssue
                    key={index}
                    index={index}
                    provided={provided}
                    snapshot={snapshot}
                    issue={issue}
                    handleEditIssue={handleEditIssue}
                    handleDeleteIssue={handleDeleteIssue}
                    user={user}
                    isNotAllowed={isNotAllowed}
                  />
                )}
              </Draggable>
            ))}
          {totalIssues > 4 && (
            <button
              type="button"
              className="w-min whitespace-nowrap rounded-md border border-brand-base bg-brand-surface-2 px-1.5 py-1 text-xs"
              onClick={() => setShowAllIssues((prevData) => !prevData)}
            >
              {showAllIssues ? "Hide" : totalIssues - 4 + " more"}
            </button>
          )}

          <div
            className={`absolute top-2 right-2 flex items-center justify-center rounded-md bg-brand-surface-2 p-1 text-xs text-brand-secondary opacity-0 group-hover:opacity-100`}
          >
            <button
              className="flex items-center justify-center gap-1 text-center"
              onClick={() => addIssueToDate(date.date)}
            >
              <PlusSmallIcon className="h-4 w-4 text-brand-secondary" />
              Add issue
            </button>
          </div>

          {provided.placeholder}
        </div>
      )}
    </StrictModeDroppable>
  );
};
