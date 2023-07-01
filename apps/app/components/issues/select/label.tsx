import React, { useState } from "react";

import { useRouter } from "next/router";

import useSWR from "swr";

// headless ui
import { Combobox, Transition } from "@headlessui/react";
// services
import issuesServices from "services/issues.service";
// ui
import { IssueLabelsList } from "components/ui";
// icons
import {
  CheckIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  RectangleGroupIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
// types
import type { IIssueLabels } from "types";
// fetch-keys
import { PROJECT_ISSUE_LABELS } from "constants/fetch-keys";

type Props = {
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  value: string[];
  onChange: (value: string[]) => void;
  projectId: string;
};

export const IssueLabelSelect: React.FC<Props> = ({ setIsOpen, value, onChange, projectId }) => {
  // states
  const [query, setQuery] = useState("");

  const router = useRouter();
  const { workspaceSlug } = router.query;

  const { data: issueLabels } = useSWR<IIssueLabels[]>(
    projectId ? PROJECT_ISSUE_LABELS(projectId) : null,
    workspaceSlug && projectId
      ? () => issuesServices.getIssueLabels(workspaceSlug as string, projectId)
      : null
  );

  const filteredOptions =
    query === ""
      ? issueLabels
      : issueLabels?.filter((l) => l.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <Combobox
      as="div"
      value={value}
      onChange={(val) => onChange(val)}
      className="relative flex-shrink-0"
      multiple
    >
      {({ open }: any) => (
        <>
          <Combobox.Button className="flex cursor-pointer items-center rounded-md border border-brand-base text-xs shadow-sm duration-200 hover:bg-brand-surface-2">
            {value && value.length > 0 ? (
              <span className="flex items-center justify-center gap-2 px-3 py-1 text-xs">
                <IssueLabelsList
                  labels={value.map((v) => issueLabels?.find((l) => l.id === v)?.color) ?? []}
                  length={3}
                  showLength={true}
                />
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2 px-2.5 py-1 text-xs">
                <TagIcon className="h-3.5 w-3.5 text-brand-secondary" />
                <span className=" text-brand-secondary">Label</span>
              </span>
            )}
          </Combobox.Button>

          <Transition
            show={open}
            as={React.Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Combobox.Options
              className={`absolute z-10 mt-1 max-h-52 min-w-[8rem] overflow-auto rounded-md border-none
                bg-brand-surface-1 px-2 py-2 text-xs shadow-md focus:outline-none`}
            >
              <div className="flex w-full items-center justify-start rounded-sm  border-[0.6px] border-brand-base bg-brand-surface-1 px-2">
                <MagnifyingGlassIcon className="h-3 w-3 text-brand-secondary" />
                <Combobox.Input
                  className="w-full bg-transparent py-1 px-2 text-xs text-brand-secondary focus:outline-none"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search for label..."
                  displayValue={(assigned: any) => assigned?.name}
                />
              </div>
              <div className="py-1.5">
                {issueLabels && filteredOptions ? (
                  filteredOptions.length > 0 ? (
                    filteredOptions.map((label) => {
                      const children = issueLabels?.filter((l) => l.parent === label.id);

                      if (children.length === 0) {
                        if (!label.parent)
                          return (
                            <Combobox.Option
                              key={label.id}
                              className={({ active }) =>
                                `${
                                  active ? "bg-brand-surface-2" : ""
                                } group flex min-w-[14rem] cursor-pointer select-none items-center gap-2 truncate rounded px-1 py-1.5 text-brand-secondary`
                              }
                              value={label.id}
                            >
                              {({ selected }) => (
                                <div className="flex w-full justify-between gap-2 rounded">
                                  <div className="flex items-center justify-start gap-2">
                                    <span
                                      className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                                      style={{
                                        backgroundColor: label.color,
                                      }}
                                    />
                                    <span>{label.name}</span>
                                  </div>
                                  <div className="flex items-center justify-center rounded p-1">
                                    <CheckIcon
                                      className={`h-3 w-3 ${
                                        selected ? "opacity-100" : "opacity-0"
                                      }`}
                                    />
                                  </div>
                                </div>
                              )}
                            </Combobox.Option>
                          );
                      } else
                        return (
                          <div className="border-y border-brand-base">
                            <div className="flex select-none items-center gap-2 truncate p-2 text-brand-base">
                              <RectangleGroupIcon className="h-3 w-3" /> {label.name}
                            </div>
                            <div>
                              {children.map((child) => (
                                <Combobox.Option
                                  key={child.id}
                                  className={({ active }) =>
                                    `${
                                      active ? "bg-brand-surface-2" : ""
                                    } group flex min-w-[14rem] cursor-pointer select-none items-center gap-2 truncate rounded px-1 py-1.5 text-brand-secondary`
                                  }
                                  value={child.id}
                                >
                                  {({ selected }) => (
                                    <div className="flex w-full justify-between gap-2 rounded">
                                      <div className="flex items-center justify-start gap-2">
                                        <span
                                          className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                                          style={{
                                            backgroundColor: child?.color,
                                          }}
                                        />
                                        <span>{child.name}</span>
                                      </div>
                                      <div className="flex items-center justify-center rounded p-1">
                                        <CheckIcon
                                          className={`h-3 w-3 ${
                                            selected ? "opacity-100" : "opacity-0"
                                          }`}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </Combobox.Option>
                              ))}
                            </div>
                          </div>
                        );
                    })
                  ) : (
                    <p className="px-2 text-xs text-brand-secondary">No labels found</p>
                  )
                ) : (
                  <p className="px-2 text-xs text-brand-secondary">Loading...</p>
                )}
                <button
                  type="button"
                  className="flex w-full select-none items-center rounded py-2 px-1 hover:bg-brand-surface-2"
                  onClick={() => setIsOpen(true)}
                >
                  <span className="flex items-center justify-start gap-1 text-brand-secondary">
                    <PlusIcon className="h-4 w-4" aria-hidden="true" />
                    <span>Create New Label</span>
                  </span>
                </button>
              </div>
            </Combobox.Options>
          </Transition>
        </>
      )}
    </Combobox>
  );
};
