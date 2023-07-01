import Link from "next/link";

// icons
import { ArrowTopRightOnSquareIcon, LinkIcon, TrashIcon } from "@heroicons/react/24/outline";
// helpers
import { timeAgo } from "helpers/date-time.helper";
// types
import { IUserLite, UserAuth } from "types";

type Props = {
  links: {
    id: string;
    created_at: Date;
    created_by: string;
    created_by_detail: IUserLite;
    metadata: any;
    title: string;
    url: string;
  }[];
  handleDeleteLink: (linkId: string) => void;
  userAuth: UserAuth;
};

export const LinksList: React.FC<Props> = ({ links, handleDeleteLink, userAuth }) => {
  const isNotAllowed = userAuth.isGuest || userAuth.isViewer;

  return (
    <>
      {links.map((link) => (
        <div key={link.id} className="relative">
          {!isNotAllowed && (
            <div className="absolute top-1.5 right-1.5 z-[1] flex items-center gap-1">
              <Link href={link.url}>
                <a
                  className="grid h-7 w-7 place-items-center rounded bg-brand-surface-1 p-1 outline-none hover:bg-brand-surface-2"
                  target="_blank"
                >
                  <ArrowTopRightOnSquareIcon className="h-4 w-4 text-brand-secondary" />
                </a>
              </Link>
              <button
                type="button"
                className="grid h-7 w-7 place-items-center rounded bg-brand-surface-1 p-1 text-red-500 outline-none duration-300 hover:bg-red-500/20"
                onClick={() => handleDeleteLink(link.id)}
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          )}
          <Link href={link.url}>
            <a className="relative flex gap-2 rounded-md bg-brand-base p-2" target="_blank">
              <div className="mt-0.5">
                <LinkIcon className="h-3.5 w-3.5" />
              </div>
              <div>
                <h5 className="w-4/5 break-words">{link.title}</h5>
                <p className="mt-0.5 text-brand-secondary">
                  Added {timeAgo(link.created_at)}
                  <br />
                  by{" "}
                  {link.created_by_detail.is_bot
                    ? link.created_by_detail.first_name + " Bot"
                    : link.created_by_detail.email}
                </p>
              </div>
            </a>
          </Link>
        </div>
      ))}
    </>
  );
};
