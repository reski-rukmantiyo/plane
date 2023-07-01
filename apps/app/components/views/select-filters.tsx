import { useRouter } from "next/router";

import useSWR from "swr";

// services
import stateService from "services/state.service";
import projectService from "services/project.service";
import issuesService from "services/issues.service";
// ui
import { Avatar, MultiLevelDropdown } from "components/ui";
// icons
import { getPriorityIcon, getStateGroupIcon } from "components/icons";
// helpers
import { getStatesList } from "helpers/state.helper";
// types
import { IIssueFilterOptions, IQuery } from "types";
// fetch-keys
import { PROJECT_ISSUE_LABELS, PROJECT_MEMBERS, STATES_LIST } from "constants/fetch-keys";
// constants
import { PRIORITIES } from "constants/project";

type Props = {
  filters: Partial<IIssueFilterOptions> | IQuery;
  onSelect: (option: any) => void;
  direction?: "left" | "right";
  height?: "sm" | "md" | "rg" | "lg";
};

export const SelectFilters: React.FC<Props> = ({
  filters,
  onSelect,
  direction = "right",
  height = "md",
}) => {
  const router = useRouter();
  const { workspaceSlug, projectId } = router.query;

  const { data: states } = useSWR(
    workspaceSlug && projectId ? STATES_LIST(projectId as string) : null,
    workspaceSlug && projectId
      ? () => stateService.getStates(workspaceSlug as string, projectId as string)
      : null
  );
  const statesList = getStatesList(states ?? {});

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

  return (
    <MultiLevelDropdown
      label="Filters"
      onSelect={onSelect}
      direction={direction}
      height={height}
      options={[
        {
          id: "priority",
          label: "Priority",
          value: PRIORITIES,
          children: [
            ...PRIORITIES.map((priority) => ({
              id: priority === null ? "null" : priority,
              label: (
                <div className="flex items-center gap-2">
                  {getPriorityIcon(priority)} {priority ?? "None"}
                </div>
              ),
              value: {
                key: "priority",
                value: priority === null ? "null" : priority,
              },
              selected: filters?.priority?.includes(priority === null ? "null" : priority),
            })),
          ],
        },
        {
          id: "state",
          label: "State",
          value: statesList,
          children: [
            ...statesList.map((state) => ({
              id: state.id,
              label: (
                <div className="flex items-center gap-2">
                  {getStateGroupIcon(state.group, "16", "16", state.color)} {state.name}
                </div>
              ),
              value: {
                key: "state",
                value: state.id,
              },
              selected: filters?.state?.includes(state.id),
            })),
          ],
        },
        {
          id: "assignees",
          label: "Assignees",
          value: members,
          children: [
            ...(members?.map((member) => ({
              id: member.member.id,
              label: (
                <div className="flex items-center gap-2">
                  <Avatar user={member.member} />
                  {member.member.first_name && member.member.first_name !== ""
                    ? member.member.first_name
                    : member.member.email}
                </div>
              ),
              value: {
                key: "assignees",
                value: member.member.id,
              },
              selected: filters?.assignees?.includes(member.member.id),
            })) ?? []),
          ],
        },
        {
          id: "created_by",
          label: "Created By",
          value: members,
          children: [
            ...(members?.map((member) => ({
              id: member.member.id,
              label: (
                <div className="flex items-center gap-2">
                  <Avatar user={member.member} />
                  {member.member.first_name && member.member.first_name !== ""
                    ? member.member.first_name
                    : member.member.email}
                </div>
              ),
              value: {
                key: "created_by",
                value: member.member.id,
              },
              selected: filters?.created_by?.includes(member.member.id),
            })) ?? []),
          ],
        },
        {
          id: "labels",
          label: "Labels",
          value: issueLabels,
          children: [
            ...(issueLabels?.map((label) => ({
              id: label.id,
              label: (
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: label.color && label.color !== "" ? label.color : "#000000",
                    }}
                  />
                  {label.name}
                </div>
              ),
              value: {
                key: "labels",
                value: label.id,
              },
              selected: filters?.labels?.includes(label.id),
            })) ?? []),
          ],
        },
      ]}
    />
  );
};
