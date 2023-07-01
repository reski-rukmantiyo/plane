import { useCallback, useState } from "react";

import { useRouter } from "next/router";

import useSWR, { mutate } from "swr";

// react-beautiful-dnd
import { DragDropContext, DropResult } from "react-beautiful-dnd";
import StrictModeDroppable from "components/dnd/StrictModeDroppable";
// services
import issuesService from "services/issues.service";
import stateService from "services/state.service";
import modulesService from "services/modules.service";
import trackEventServices from "services/track-event.service";
// contexts
import { useProjectMyMembership } from "contexts/project-member.context";
// hooks
import useToast from "hooks/use-toast";
import useIssuesView from "hooks/use-issues-view";
import useUserAuth from "hooks/use-user-auth";
// components
import {
  AllLists,
  AllBoards,
  FilterList,
  CalendarView,
  GanttChartView,
  SpreadsheetView,
} from "components/core";
import { CreateUpdateIssueModal, DeleteIssueModal } from "components/issues";
import { CreateUpdateViewModal } from "components/views";
import { CycleIssuesGanttChartView, TransferIssues, TransferIssuesModal } from "components/cycles";
import { IssueGanttChartView } from "components/issues/gantt-chart";
// ui
import { EmptySpace, EmptySpaceItem, EmptyState, PrimaryButton, Spinner } from "components/ui";
// icons
import {
  ListBulletIcon,
  PlusIcon,
  RectangleStackIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
// images
import emptyIssue from "public/empty-state/empty-issue.svg";
// helpers
import { getStatesList } from "helpers/state.helper";
import { orderArrayBy } from "helpers/array.helper";
// types
import { IIssue, IIssueFilterOptions } from "types";
// fetch-keys
import {
  CYCLE_DETAILS,
  CYCLE_ISSUES_WITH_PARAMS,
  MODULE_DETAILS,
  MODULE_ISSUES_WITH_PARAMS,
  PROJECT_ISSUES_LIST_WITH_PARAMS,
  STATES_LIST,
} from "constants/fetch-keys";
import { ModuleIssuesGanttChartView } from "components/modules";

type Props = {
  type?: "issue" | "cycle" | "module";
  openIssuesListModal?: () => void;
  isCompleted?: boolean;
};

export const IssuesView: React.FC<Props> = ({
  type = "issue",
  openIssuesListModal,
  isCompleted = false,
}) => {
  // create issue modal
  const [createIssueModal, setCreateIssueModal] = useState(false);
  const [createViewModal, setCreateViewModal] = useState<any>(null);
  const [preloadedData, setPreloadedData] = useState<
    (Partial<IIssue> & { actionType: "createIssue" | "edit" | "delete" }) | undefined
  >(undefined);

  // update issue modal
  const [editIssueModal, setEditIssueModal] = useState(false);
  const [issueToEdit, setIssueToEdit] = useState<
    (IIssue & { actionType: "edit" | "delete" }) | undefined
  >(undefined);

  // delete issue modal
  const [deleteIssueModal, setDeleteIssueModal] = useState(false);
  const [issueToDelete, setIssueToDelete] = useState<IIssue | null>(null);

  // trash box
  const [trashBox, setTrashBox] = useState(false);

  // transfer issue
  const [transferIssuesModal, setTransferIssuesModal] = useState(false);

  const router = useRouter();
  const { workspaceSlug, projectId, cycleId, moduleId, viewId } = router.query;

  const { memberRole } = useProjectMyMembership();

  const { user } = useUserAuth();

  const { setToastAlert } = useToast();

  const {
    groupedByIssues,
    issueView,
    groupByProperty: selectedGroup,
    orderBy,
    filters,
    isNotEmpty,
    setFilters,
    params,
  } = useIssuesView();

  const { data: stateGroups } = useSWR(
    workspaceSlug && projectId ? STATES_LIST(projectId as string) : null,
    workspaceSlug
      ? () => stateService.getStates(workspaceSlug as string, projectId as string)
      : null
  );
  const states = getStatesList(stateGroups ?? {});

  const handleDeleteIssue = useCallback(
    (issue: IIssue) => {
      setDeleteIssueModal(true);
      setIssueToDelete(issue);
    },
    [setDeleteIssueModal, setIssueToDelete]
  );

  const handleOnDragEnd = useCallback(
    (result: DropResult) => {
      setTrashBox(false);

      if (!result.destination || !workspaceSlug || !projectId || !groupedByIssues) return;

      const { source, destination } = result;

      const draggedItem = groupedByIssues[source.droppableId][source.index];

      if (destination.droppableId === "trashBox") {
        handleDeleteIssue(draggedItem);
      } else {
        if (orderBy === "sort_order") {
          let newSortOrder = draggedItem.sort_order;

          const destinationGroupArray = groupedByIssues[destination.droppableId];

          if (destinationGroupArray.length !== 0) {
            // check if dropping in the same group
            if (source.droppableId === destination.droppableId) {
              // check if dropping at beginning
              if (destination.index === 0)
                newSortOrder = destinationGroupArray[0].sort_order - 10000;
              // check if dropping at last
              else if (destination.index === destinationGroupArray.length - 1)
                newSortOrder =
                  destinationGroupArray[destinationGroupArray.length - 1].sort_order + 10000;
              else {
                if (destination.index > source.index)
                  newSortOrder =
                    (destinationGroupArray[source.index + 1].sort_order +
                      destinationGroupArray[source.index + 2].sort_order) /
                    2;
                else if (destination.index < source.index)
                  newSortOrder =
                    (destinationGroupArray[source.index - 1].sort_order +
                      destinationGroupArray[source.index - 2].sort_order) /
                    2;
              }
            } else {
              // check if dropping at beginning
              if (destination.index === 0)
                newSortOrder = destinationGroupArray[0].sort_order - 10000;
              // check if dropping at last
              else if (destination.index === destinationGroupArray.length)
                newSortOrder =
                  destinationGroupArray[destinationGroupArray.length - 1].sort_order + 10000;
              else
                newSortOrder =
                  (destinationGroupArray[destination.index - 1].sort_order +
                    destinationGroupArray[destination.index].sort_order) /
                  2;
            }
          }

          draggedItem.sort_order = newSortOrder;
        }

        const destinationGroup = destination.droppableId; // destination group id

        if (orderBy === "sort_order" || source.droppableId !== destination.droppableId) {
          // different group/column;

          // source.droppableId !== destination.droppableId -> even if order by is not sort_order,
          // if the issue is moved to a different group, then we will change the group of the
          // dragged item(or issue)

          if (selectedGroup === "priority") draggedItem.priority = destinationGroup;
          else if (selectedGroup === "state") draggedItem.state = destinationGroup;
        }

        const sourceGroup = source.droppableId; // source group id

        mutate<{
          [key: string]: IIssue[];
        }>(
          cycleId
            ? CYCLE_ISSUES_WITH_PARAMS(cycleId as string, params)
            : moduleId
            ? MODULE_ISSUES_WITH_PARAMS(moduleId as string, params)
            : PROJECT_ISSUES_LIST_WITH_PARAMS(projectId as string, params),
          (prevData) => {
            if (!prevData) return prevData;

            const sourceGroupArray = prevData[sourceGroup];
            const destinationGroupArray = groupedByIssues[destinationGroup];

            sourceGroupArray.splice(source.index, 1);
            destinationGroupArray.splice(destination.index, 0, draggedItem);

            return {
              ...prevData,
              [sourceGroup]: orderArrayBy(sourceGroupArray, orderBy),
              [destinationGroup]: orderArrayBy(destinationGroupArray, orderBy),
            };
          },
          false
        );

        // patch request
        issuesService
          .patchIssue(
            workspaceSlug as string,
            projectId as string,
            draggedItem.id,
            {
              priority: draggedItem.priority,
              state: draggedItem.state,
              sort_order: draggedItem.sort_order,
            },
            user
          )
          .then((response) => {
            const sourceStateBeforeDrag = states.find((state) => state.name === source.droppableId);

            if (
              sourceStateBeforeDrag?.group !== "completed" &&
              response?.state_detail?.group === "completed"
            )
              trackEventServices.trackIssueMarkedAsDoneEvent(
                {
                  workspaceSlug,
                  workspaceId: draggedItem.workspace,
                  projectName: draggedItem.project_detail.name,
                  projectIdentifier: draggedItem.project_detail.identifier,
                  projectId,
                  issueId: draggedItem.id,
                },
                user
              );

            if (cycleId) {
              mutate(CYCLE_ISSUES_WITH_PARAMS(cycleId as string, params));
              mutate(CYCLE_DETAILS(cycleId as string));
            }
            if (moduleId) {
              mutate(MODULE_ISSUES_WITH_PARAMS(moduleId as string, params));
              mutate(MODULE_DETAILS(moduleId as string));
            }
            mutate(PROJECT_ISSUES_LIST_WITH_PARAMS(projectId as string, params));
          });
      }
    },
    [
      workspaceSlug,
      cycleId,
      moduleId,
      groupedByIssues,
      projectId,
      selectedGroup,
      orderBy,
      handleDeleteIssue,
      params,
      states,
      user,
    ]
  );

  const addIssueToState = useCallback(
    (groupTitle: string) => {
      setCreateIssueModal(true);

      let preloadedValue: string | string[] = groupTitle;

      if (selectedGroup === "labels") {
        if (groupTitle === "None") preloadedValue = [];
        else preloadedValue = [groupTitle];
      }

      if (selectedGroup)
        setPreloadedData({
          [selectedGroup]: preloadedValue,
          actionType: "createIssue",
        });
      else setPreloadedData({ actionType: "createIssue" });
    },
    [setCreateIssueModal, setPreloadedData, selectedGroup]
  );

  const addIssueToDate = useCallback(
    (date: string) => {
      setCreateIssueModal(true);
      setPreloadedData({
        target_date: date,
        actionType: "createIssue",
      });
    },
    [setCreateIssueModal, setPreloadedData]
  );

  const makeIssueCopy = useCallback(
    (issue: IIssue) => {
      setCreateIssueModal(true);

      setPreloadedData({ ...issue, name: `${issue.name} (Copy)`, actionType: "createIssue" });
    },
    [setCreateIssueModal, setPreloadedData]
  );

  const handleEditIssue = useCallback(
    (issue: IIssue) => {
      setEditIssueModal(true);
      setIssueToEdit({
        ...issue,
        actionType: "edit",
        cycle: issue.issue_cycle ? issue.issue_cycle.cycle : null,
        module: issue.issue_module ? issue.issue_module.module : null,
      });
    },
    [setEditIssueModal, setIssueToEdit]
  );

  const removeIssueFromCycle = useCallback(
    (bridgeId: string, issueId: string) => {
      if (!workspaceSlug || !projectId || !cycleId) return;

      mutate(
        CYCLE_ISSUES_WITH_PARAMS(cycleId as string, params),
        (prevData: any) => {
          if (!prevData) return prevData;
          if (selectedGroup) {
            const filteredData: any = {};
            for (const key in prevData) {
              filteredData[key] = prevData[key].filter((item: any) => item.id !== issueId);
            }
            return filteredData;
          } else {
            const filteredData = prevData.filter((i: any) => i.id !== issueId);
            return filteredData;
          }
        },
        false
      );

      issuesService
        .removeIssueFromCycle(
          workspaceSlug as string,
          projectId as string,
          cycleId as string,
          bridgeId
        )
        .then(() => {
          setToastAlert({
            title: "Success",
            message: "Issue removed successfully.",
            type: "success",
          });
        })
        .catch((e) => {
          console.log(e);
        });
    },
    [workspaceSlug, projectId, cycleId, params, selectedGroup, setToastAlert]
  );

  const removeIssueFromModule = useCallback(
    (bridgeId: string, issueId: string) => {
      if (!workspaceSlug || !projectId || !moduleId) return;

      mutate(
        MODULE_ISSUES_WITH_PARAMS(moduleId as string, params),
        (prevData: any) => {
          if (!prevData) return prevData;
          if (selectedGroup) {
            const filteredData: any = {};
            for (const key in prevData) {
              filteredData[key] = prevData[key].filter((item: any) => item.id !== issueId);
            }
            return filteredData;
          } else {
            const filteredData = prevData.filter((item: any) => item.id !== issueId);
            return filteredData;
          }
        },
        false
      );

      modulesService
        .removeIssueFromModule(
          workspaceSlug as string,
          projectId as string,
          moduleId as string,
          bridgeId
        )
        .then(() => {
          setToastAlert({
            title: "Success",
            message: "Issue removed successfully.",
            type: "success",
          });
        })
        .catch((e) => {
          console.log(e);
        });
    },
    [workspaceSlug, projectId, moduleId, params, selectedGroup, setToastAlert]
  );

  const handleTrashBox = useCallback(
    (isDragging: boolean) => {
      if (isDragging && !trashBox) setTrashBox(true);
    },
    [trashBox, setTrashBox]
  );

  const nullFilters = Object.keys(filters).filter(
    (key) => filters[key as keyof IIssueFilterOptions] === null
  );

  const areFiltersApplied =
    Object.keys(filters).length > 0 && nullFilters.length !== Object.keys(filters).length;

  return (
    <>
      <CreateUpdateViewModal
        isOpen={createViewModal !== null}
        handleClose={() => setCreateViewModal(null)}
        preLoadedData={createViewModal}
        user={user}
      />
      <CreateUpdateIssueModal
        isOpen={createIssueModal && preloadedData?.actionType === "createIssue"}
        handleClose={() => setCreateIssueModal(false)}
        prePopulateData={{
          ...preloadedData,
        }}
      />
      <CreateUpdateIssueModal
        isOpen={editIssueModal && issueToEdit?.actionType !== "delete"}
        handleClose={() => setEditIssueModal(false)}
        data={issueToEdit}
      />
      <DeleteIssueModal
        handleClose={() => setDeleteIssueModal(false)}
        isOpen={deleteIssueModal}
        data={issueToDelete}
        user={user}
      />
      <TransferIssuesModal
        handleClose={() => setTransferIssuesModal(false)}
        isOpen={transferIssuesModal}
      />
      {areFiltersApplied && (
        <>
          <div className="flex items-center justify-between gap-2 px-5 pt-3 pb-0">
            <FilterList filters={filters} setFilters={setFilters} />
            <PrimaryButton
              onClick={() => {
                if (viewId) {
                  setFilters({}, true);
                  setToastAlert({
                    title: "View updated",
                    message: "Your view has been updated",
                    type: "success",
                  });
                } else
                  setCreateViewModal({
                    query: filters,
                  });
              }}
              className="flex items-center gap-2 text-sm"
            >
              {!viewId && <PlusIcon className="h-4 w-4" />}
              {viewId ? "Update" : "Save"} view
            </PrimaryButton>
          </div>
          {<div className="mt-3 border-t border-brand-base" />}
        </>
      )}

      <DragDropContext onDragEnd={handleOnDragEnd}>
        <StrictModeDroppable droppableId="trashBox">
          {(provided, snapshot) => (
            <div
              className={`${
                trashBox ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
              } fixed top-4 left-1/2 -translate-x-1/2 z-40 w-72 flex items-center justify-center gap-2 rounded border-2 border-red-500/20 bg-brand-base px-3 py-5 text-xs font-medium italic text-red-500 ${
                snapshot.isDraggingOver ? "bg-red-500 blur-2xl opacity-70" : ""
              } transition duration-300`}
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              <TrashIcon className="h-4 w-4" />
              Drop here to delete the issue.
            </div>
          )}
        </StrictModeDroppable>
        {groupedByIssues ? (
          isNotEmpty ? (
            <>
              {isCompleted && <TransferIssues handleClick={() => setTransferIssuesModal(true)} />}
              {issueView === "list" ? (
                <AllLists
                  type={type}
                  states={states}
                  addIssueToState={addIssueToState}
                  makeIssueCopy={makeIssueCopy}
                  handleEditIssue={handleEditIssue}
                  handleDeleteIssue={handleDeleteIssue}
                  openIssuesListModal={type !== "issue" ? openIssuesListModal : null}
                  removeIssue={
                    type === "cycle"
                      ? removeIssueFromCycle
                      : type === "module"
                      ? removeIssueFromModule
                      : null
                  }
                  isCompleted={isCompleted}
                  user={user}
                  userAuth={memberRole}
                />
              ) : issueView === "kanban" ? (
                <AllBoards
                  type={type}
                  states={states}
                  addIssueToState={addIssueToState}
                  makeIssueCopy={makeIssueCopy}
                  handleEditIssue={handleEditIssue}
                  openIssuesListModal={type !== "issue" ? openIssuesListModal : null}
                  handleDeleteIssue={handleDeleteIssue}
                  handleTrashBox={handleTrashBox}
                  removeIssue={
                    type === "cycle"
                      ? removeIssueFromCycle
                      : type === "module"
                      ? removeIssueFromModule
                      : null
                  }
                  isCompleted={isCompleted}
                  user={user}
                  userAuth={memberRole}
                />
              ) : issueView === "calendar" ? (
                <CalendarView
                  handleEditIssue={handleEditIssue}
                  handleDeleteIssue={handleDeleteIssue}
                  addIssueToDate={addIssueToDate}
                  isCompleted={isCompleted}
                  user={user}
                  userAuth={memberRole}
                />
              ) : issueView === "spreadsheet" ? (
                <SpreadsheetView
                  type={type}
                  handleEditIssue={handleEditIssue}
                  handleDeleteIssue={handleDeleteIssue}
                  openIssuesListModal={type !== "issue" ? openIssuesListModal : null}
                  isCompleted={isCompleted}
                  user={user}
                  userAuth={memberRole}
                />
              ) : (
                issueView === "gantt_chart" && <GanttChartView />
              )}
            </>
          ) : type === "issue" ? (
            <EmptyState
              type="issue"
              title="Create New Issue"
              description="Issues help you track individual pieces of work. With Issues, keep track of what's going on, who is working on it, and what's done."
              imgURL={emptyIssue}
            />
          ) : (
            <div className="grid h-full w-full place-items-center px-4 sm:px-0">
              <EmptySpace
                title="You don't have any issue yet."
                description="Issues help you track individual pieces of work. With Issues, keep track of what's going on, who is working on it, and what's done."
                Icon={RectangleStackIcon}
              >
                <EmptySpaceItem
                  title="Create a new issue"
                  description={
                    <span>
                      Use <pre className="inline rounded bg-brand-surface-2 px-2 py-1">C</pre>{" "}
                      shortcut to create a new issue
                    </span>
                  }
                  Icon={PlusIcon}
                  action={() => {
                    const e = new KeyboardEvent("keydown", {
                      key: "c",
                    });
                    document.dispatchEvent(e);
                  }}
                />
                {openIssuesListModal && (
                  <EmptySpaceItem
                    title="Add an existing issue"
                    description="Open list"
                    Icon={ListBulletIcon}
                    action={openIssuesListModal}
                  />
                )}
              </EmptySpace>
            </div>
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Spinner />
          </div>
        )}
      </DragDropContext>
    </>
  );
};
