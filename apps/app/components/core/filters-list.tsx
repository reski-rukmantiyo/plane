import React from "react";
import { useRouter } from "next/router";
import useSWR from "swr";

// icons
import { XMarkIcon } from "@heroicons/react/24/outline";
import { getPriorityIcon, getStateGroupIcon } from "components/icons";
// ui
import { Avatar } from "components/ui";
// helpers
import { getStatesList } from "helpers/state.helper";
import { replaceUnderscoreIfSnakeCase } from "helpers/string.helper";
// services
import issuesService from "services/issues.service";
import projectService from "services/project.service";
import stateService from "services/state.service";
// types
import { PROJECT_ISSUE_LABELS, PROJECT_MEMBERS, STATES_LIST } from "constants/fetch-keys";
import { IIssueFilterOptions } from "types";

export const FilterList: React.FC<any> = ({ filters, setFilters }) => {
  const router = useRouter();
  const { workspaceSlug, projectId, viewId } = router.query;

  const { data: members } = useSWR(
    projectId ? PROJECT_MEMBERS(projectId as string) : null,
    workspaceSlug && projectId
      ? () => projectService.projectMembers(workspaceSlug as string, projectId as string)
      : null
  );

  const { data: issueLabels } = useSWR(
    projectId ? PROJECT_ISSUE_LABELS(projectId.toString()) : null,
    workspaceSlug && projectId
      ? () => issuesService.getIssueLabels(workspaceSlug as string, projectId.toString())
      : null
  );

  const { data: stateGroups } = useSWR(
    workspaceSlug && projectId ? STATES_LIST(projectId as string) : null,
    workspaceSlug
      ? () => stateService.getStates(workspaceSlug as string, projectId as string)
      : null
  );
  const states = getStatesList(stateGroups ?? {});

  if (!filters) return <></>;

  const nullFilters = Object.keys(filters).filter(
    (key) => filters[key as keyof IIssueFilterOptions] === null
  );

  return (
    <div className="flex flex-1 flex-wrap items-center gap-2 text-xs">
      {Object.keys(filters).map((key) => {
        if (filters[key as keyof typeof filters] !== null)
          return (
            <div
              key={key}
              className="flex items-center gap-x-2 rounded-full border border-brand-base bg-brand-surface-2 px-2 py-1"
            >
              <span className="capitalize text-brand-secondary">
                {replaceUnderscoreIfSnakeCase(key)}:
              </span>
              {filters[key as keyof IIssueFilterOptions] === null ||
              (filters[key as keyof IIssueFilterOptions]?.length ?? 0) <= 0 ? (
                <span className="inline-flex items-center px-2 py-0.5 font-medium">None</span>
              ) : Array.isArray(filters[key as keyof IIssueFilterOptions]) ? (
                <div className="space-x-2">
                  {key === "state" ? (
                    <div className="flex flex-wrap items-center gap-1">
                      {filters.state?.map((stateId: any) => {
                        const state = states?.find((s) => s.id === stateId);

                        return (
                          <p
                            key={state?.id}
                            className="inline-flex items-center gap-x-1 rounded-full px-2 py-0.5 font-medium"
                            style={{
                              color: state?.color,
                              backgroundColor: `${state?.color}20`,
                            }}
                          >
                            <span>
                              {getStateGroupIcon(
                                state?.group ?? "backlog",
                                "12",
                                "12",
                                state?.color
                              )}
                            </span>
                            <span>{state?.name ?? ""}</span>
                            <span
                              className="cursor-pointer"
                              onClick={() =>
                                setFilters(
                                  {
                                    state: filters.state?.filter((s: any) => s !== stateId),
                                  },
                                  !Boolean(viewId)
                                )
                              }
                            >
                              <XMarkIcon className="h-3 w-3" />
                            </span>
                          </p>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() =>
                          setFilters({
                            state: null,
                          })
                        }
                      >
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    </div>
                  ) : key === "priority" ? (
                    <div className="flex flex-wrap items-center gap-1">
                      {filters.priority?.map((priority: any) => (
                        <p
                          key={priority}
                          className={`inline-flex items-center gap-x-1 rounded-full px-2 py-0.5 capitalize ${
                            priority === "urgent"
                              ? "bg-red-500/20 text-red-500"
                              : priority === "high"
                              ? "bg-orange-500/20 text-orange-500"
                              : priority === "medium"
                              ? "bg-yellow-500/20 text-yellow-500"
                              : priority === "low"
                              ? "bg-green-500/20 text-green-500"
                              : "bg-brand-surface-1 text-brand-secondary"
                          }`}
                        >
                          <span>{getPriorityIcon(priority)}</span>
                          <span>{priority === "null" ? "None" : priority}</span>
                          <span
                            className="cursor-pointer"
                            onClick={() =>
                              setFilters(
                                {
                                  priority: filters.priority?.filter((p: any) => p !== priority),
                                },
                                !Boolean(viewId)
                              )
                            }
                          >
                            <XMarkIcon className="h-3 w-3" />
                          </span>
                        </p>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          setFilters({
                            priority: null,
                          })
                        }
                      >
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    </div>
                  ) : key === "assignees" ? (
                    <div className="flex flex-wrap items-center gap-1">
                      {filters.assignees?.map((memberId: string) => {
                        const member = members?.find((m) => m.member.id === memberId)?.member;

                        return (
                          <div
                            key={memberId}
                            className="inline-flex items-center gap-x-1 rounded-full bg-brand-surface-1 px-1 capitalize"
                          >
                            <Avatar user={member} />
                            <span>{member?.first_name}</span>
                            <span
                              className="cursor-pointer"
                              onClick={() =>
                                setFilters(
                                  {
                                    assignees: filters.assignees?.filter(
                                      (p: any) => p !== memberId
                                    ),
                                  },
                                  !Boolean(viewId)
                                )
                              }
                            >
                              <XMarkIcon className="h-3 w-3" />
                            </span>
                          </div>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() =>
                          setFilters({
                            assignees: null,
                          })
                        }
                      >
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    </div>
                  ) : key === "created_by" ? (
                    <div className="flex flex-wrap items-center gap-1">
                      {filters.created_by?.map((memberId: string) => {
                        const member = members?.find((m) => m.member.id === memberId)?.member;

                        return (
                          <div
                            key={`${memberId}-${key}`}
                            className="inline-flex items-center gap-x-1 rounded-full bg-brand-surface-1 px-1 capitalize"
                          >
                            <Avatar user={member} />
                            <span>{member?.first_name}</span>
                            <span
                              className="cursor-pointer"
                              onClick={() =>
                                setFilters(
                                  {
                                    created_by: filters.created_by?.filter(
                                      (p: any) => p !== memberId
                                    ),
                                  },
                                  !Boolean(viewId)
                                )
                              }
                            >
                              <XMarkIcon className="h-3 w-3" />
                            </span>
                          </div>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() =>
                          setFilters({
                            created_by: null,
                          })
                        }
                      >
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    </div>
                  ) : key === "labels" ? (
                    <div className="flex flex-wrap items-center gap-1">
                      {filters.labels?.map((labelId: string) => {
                        const label = issueLabels?.find((l) => l.id === labelId);

                        if (!label) return null;
                        const color = label.color !== "" ? label.color : "#0f172a";
                        return (
                          <div
                            className="inline-flex items-center gap-x-1 rounded-full px-2 py-0.5"
                            style={{
                              color: color,
                              backgroundColor: `${color}20`, // add 20% opacity
                            }}
                            key={labelId}
                          >
                            <div
                              className="h-1.5 w-1.5 rounded-full"
                              style={{
                                backgroundColor: color,
                              }}
                            />
                            <span>{label.name}</span>
                            <span
                              className="cursor-pointer"
                              onClick={() =>
                                setFilters(
                                  {
                                    labels: filters.labels?.filter((l: any) => l !== labelId),
                                  },
                                  !Boolean(viewId)
                                )
                              }
                            >
                              <XMarkIcon
                                className="h-3 w-3"
                                style={{
                                  color: color,
                                }}
                              />
                            </span>
                          </div>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() =>
                          setFilters({
                            labels: null,
                          })
                        }
                      >
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    (filters[key as keyof IIssueFilterOptions] as any)?.join(", ")
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-x-1 capitalize">
                  {filters[key as keyof typeof filters]}
                  <button
                    type="button"
                    onClick={() =>
                      setFilters({
                        [key]: null,
                      })
                    }
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          );
      })}
      {Object.keys(filters).length > 0 && nullFilters.length !== Object.keys(filters).length && (
        <button
          type="button"
          onClick={() =>
            setFilters({
              type: null,
              state: null,
              priority: null,
              assignees: null,
              labels: null,
              created_by: null,
            })
          }
          className="flex items-center gap-x-1 rounded-full border border-brand-base bg-brand-surface-2 px-3 py-1.5 text-xs"
        >
          <span>Clear all filters</span>
          <XMarkIcon className="h-3 w-3" />
        </button>
      )}
    </div>
  );
};
