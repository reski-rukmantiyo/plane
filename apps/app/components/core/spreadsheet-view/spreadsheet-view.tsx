import React, { useState } from "react";

// next
import { useRouter } from "next/router";

// components
import { SpreadsheetColumns, SpreadsheetIssues } from "components/core";
import { CustomMenu, Icon, Spinner } from "components/ui";
// hooks
import useIssuesProperties from "hooks/use-issue-properties";
import useSpreadsheetIssuesView from "hooks/use-spreadsheet-issues-view";
// types
import { ICurrentUserResponse, IIssue, Properties, UserAuth } from "types";
// constants
import { SPREADSHEET_COLUMN } from "constants/spreadsheet";
// icon
import { PlusIcon } from "@heroicons/react/24/outline";

type Props = {
  type: "issue" | "cycle" | "module";
  handleEditIssue: (issue: IIssue) => void;
  handleDeleteIssue: (issue: IIssue) => void;
  openIssuesListModal?: (() => void) | null;
  isCompleted?: boolean;
  user: ICurrentUserResponse | undefined;
  userAuth: UserAuth;
};

export const SpreadsheetView: React.FC<Props> = ({
  type,
  handleEditIssue,
  handleDeleteIssue,
  openIssuesListModal,
  isCompleted = false,
  user,
  userAuth,
}) => {
  const [expandedIssues, setExpandedIssues] = useState<string[]>([]);

  const router = useRouter();
  const { workspaceSlug, projectId } = router.query;

  const { spreadsheetIssues } = useSpreadsheetIssuesView();

  const [properties] = useIssuesProperties(workspaceSlug as string, projectId as string);

  const columnData = SPREADSHEET_COLUMN.map((column) => ({
    ...column,
    isActive: properties
      ? column.propertyName === "labels"
        ? properties[column.propertyName as keyof Properties]
        : column.propertyName === "title"
        ? true
        : properties[column.propertyName as keyof Properties]
      : false,
  }));

  const gridTemplateColumns = columnData
    .filter((column) => column.isActive)
    .map((column) => column.colSize)
    .join(" ");

  return (
    <div className="h-full rounded-lg text-brand-secondary overflow-x-auto whitespace-nowrap bg-brand-base">
      <div className="sticky z-[2] top-0 border-b border-brand-base bg-brand-surface-1 w-full min-w-max">
        <SpreadsheetColumns columnData={columnData} gridTemplateColumns={gridTemplateColumns} />
      </div>
      {spreadsheetIssues ? (
        <div className="flex flex-col h-full w-full bg-brand-base rounded-sm ">
          {spreadsheetIssues.map((issue: IIssue, index) => (
            <SpreadsheetIssues
              key={`${issue.id}_${index}`}
              index={index}
              issue={issue}
              expandedIssues={expandedIssues}
              setExpandedIssues={setExpandedIssues}
              gridTemplateColumns={gridTemplateColumns}
              properties={properties}
              handleEditIssue={handleEditIssue}
              handleDeleteIssue={handleDeleteIssue}
              isCompleted={isCompleted}
              user={user}
              userAuth={userAuth}
            />
          ))}
          <div
            className="relative group grid auto-rows-[minmax(44px,1fr)] hover:rounded-sm hover:bg-brand-surface-2 border-b border-brand-base w-full min-w-max"
            style={{ gridTemplateColumns }}
          >
            {type === "issue" ? (
              <button
                className="flex gap-1.5 items-center  pl-7 py-2.5 text-sm sticky left-0 z-[1] text-brand-secondary bg-brand-base group-hover:text-brand-base group-hover:bg-brand-surface-2 border-brand-base w-full"
                onClick={() => {
                  const e = new KeyboardEvent("keydown", { key: "c" });
                  document.dispatchEvent(e);
                }}
              >
                <PlusIcon className="h-4 w-4" />
                Add Issue
              </button>
            ) : (
              !isCompleted && (
                <CustomMenu
                  className="sticky left-0 z-[1]"
                  customButton={
                    <button
                      className="flex gap-1.5 items-center  pl-7 py-2.5 text-sm sticky left-0 z-[1] text-brand-secondary bg-brand-base group-hover:text-brand-base group-hover:bg-brand-surface-2 border-brand-base w-full"
                      type="button"
                    >
                      <PlusIcon className="h-4 w-4" />
                      Add Issue
                    </button>
                  }
                  position="left"
                  menuItemsClassName="left-5 !w-36"
                  noBorder
                >
                  <CustomMenu.MenuItem
                    onClick={() => {
                      const e = new KeyboardEvent("keydown", { key: "c" });
                      document.dispatchEvent(e);
                    }}
                  >
                    Create new
                  </CustomMenu.MenuItem>
                  {openIssuesListModal && (
                    <CustomMenu.MenuItem onClick={openIssuesListModal}>
                      Add an existing issue
                    </CustomMenu.MenuItem>
                  )}
                </CustomMenu>
              )
            )}
          </div>
        </div>
      ) : (
        <Spinner />
      )}
    </div>
  );
};
