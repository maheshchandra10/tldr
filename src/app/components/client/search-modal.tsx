"use client";

import Image from "next/image";
import React from "react";
import { useDebouncedCallback } from "use-debounce";

import {
  MailingListType,
  SearchDataParams,
} from "@/helpers/types";
import { urlMapping } from "@/config/config";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowDownIcon, ArrowUpIcon, Cross2Icon } from "@radix-ui/react-icons";

import { defaultFilter, filterReducer } from "./actions/filter-reducer";
import SearchResult from "./search-result-ui";
import Spinner from "./spinner";

import { useSearch } from "@/services/search-service";
import {
  SearchTotalHits,
  SearchResponseBody,
} from "@elastic/elasticsearch/lib/api/types";
import { BITCOINDEV, DEBOUNCE_DELAY, LIGHTNINGDEV } from "@/config/config";

export type SearchResults = {
  searchResults: SearchResponseBody[];
  totalSearchResults: number;
  bitcoinDevCount: number;
  lightningDevCount: number;
};

const SearchBox = () => {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState<SearchDataParams | null>(
    null
  );

  const [filter, dispatch] = React.useReducer(filterReducer, defaultFilter);

  const searchFeedInputRef = React.useRef<HTMLInputElement>(null);

  const { data, fetchNextPage, isFetching, isFetchingNextPage, isError } = useSearch({
    queryString: searchQuery?.query.keyword ?? "",
    authorString: searchQuery?.query.author ?? "",
    mailListType: searchQuery?.path ?? null,
    sortFields: [],
  });

  let results: SearchResults = {
    searchResults: [],
    totalSearchResults: 0,
    bitcoinDevCount: 0,
    lightningDevCount: 0,
  };

  if (data) {
    const pageLength = data.pages.length;
    const domainAggregations = data?.pages[pageLength - 1].aggregations
      ?.domain as unknown as any;
    const totalHitsAsSearchTotalHits = data?.pages[pageLength - 1].hits
      ?.total as SearchTotalHits;
    const bitcoinDevCount =
      domainAggregations?.buckets.find(
        (url: string) => url === urlMapping[BITCOINDEV]
      )?.doc_count ?? 0;
    const lightningDevCount =
      domainAggregations?.buckets.find(
        (url: string) => url === urlMapping[LIGHTNINGDEV]
      )?.doc_count ?? 0;

    results = {
      searchResults: data.pages,
      totalSearchResults: totalHitsAsSearchTotalHits.value,
      bitcoinDevCount,
      lightningDevCount,
    };
  }

  const showDescription =
    !isFetching &&
    !isFetchingNextPage &&
    !isError &&
    Boolean(
      results?.totalSearchResults && results?.totalSearchResults > 0
    );

  const showSpinner = (isFetching || isFetchingNextPage) && !isError;

  const setSearchQueryPath = (path: MailingListType | null) => {
    const managePathSelection = (prevPath: MailingListType | null | undefined) => {
      if (searchQuery?.path === path) {
        return null
      }
      return path
    }
    setSearchQuery((prev) => ({
      path: managePathSelection(prev?.path),
      query: {
        ...prev?.query,
      },
    }));
  };

  const resetToDefault = () => {
    setSearchQuery(null);
  };

  const setRelevance = (type: "old-new" | "new-old") => {
    setSearchQuery((prev) => ({
      path: prev?.path ?? null,
      query: {
        keyword: prev?.query.keyword,
        author: prev?.query.author,
      },
      relevance: type,
    }));
  };

  const debouncedSearch = useDebouncedCallback((value) => {
    setSearchQuery((prev) => ({
      path: prev?.path || null,
      query: {
        ...prev?.query,
        keyword: value,
      },
    }));
  }, DEBOUNCE_DELAY);

  const debouncedSearchAuthor = useDebouncedCallback((value) => {
    setSearchQuery((prev) => ({
      path: prev?.path || null,
      query: {
        ...prev?.query,
        author: value,
      },
    }));
  }, DEBOUNCE_DELAY);

  const handleFetchMore = () => {
    fetchNextPage();
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && e.which === 75 && (e.metaKey || e.ctrlKey)) {
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      searchFeedInputRef.current?.focus();
    }, 100);

    if (!open) {
      resetToDefault();
    }

    return () => clearTimeout(timer);
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <div className="relative">
          <input
            name="searchbox"
            className="border-[1px] rounded-md border-[#ccc] w-[200px] md:w-[274px] py-2 pl-9"
            placeholder="search [cmd/ctrl+k]"
          />
          <Image
            className="absolute top-1/2 left-0 -translate-y-1/2 ml-2 pointer-events-none"
            src="/icons/search_icon.svg"
            alt="search_icon"
            width={24}
            height={24}
          />
        </div>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-slate-400 opacity-50 data-[state=open]:animate-overlayShow fixed inset-0 z-20" />
        <Dialog.Content className="data-[state=open]:animate-contentShow overflow-y-auto fixed top-[50%] left-[50%] max-h-[65vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-white p-[25px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none z-30">
          <Dialog.Title className="m-0 text-[16px] font-medium flex items-center gap-x-4">
            <span>Filter results by: </span>
            <span className="flex items-center gap-x-2">
              <button
                className={`border rounded py-1 px-2 text-xs hover:bg-slate-100 ${
                  searchQuery?.path === BITCOINDEV && "bg-slate-200"
                }`}
                onClick={() => {
                  setSearchQueryPath(BITCOINDEV);
                }}
              >
                bitcoin-dev
              </button>
              <button
                className={`border rounded py-1 px-2 text-xs hover:bg-slate-100 ${
                  searchQuery?.path === LIGHTNINGDEV && "bg-slate-200"
                }`}
                onClick={() => {
                  setSearchQueryPath(LIGHTNINGDEV);
                }}
              >
                lightning-dev
              </button>
              <button
                className={`border p-[6px] hover:bg-slate-100 focus:bg-slate-100 inline-flex h-[25px] w-[25px] appearance-none items-center justify-center focus:outline-none`}
                aria-label="clear-filter"
                onClick={() => {
                  setSearchQueryPath(null);
                }}
              >
                <Cross2Icon />
              </button>
            </span>
          </Dialog.Title>
          <Dialog.Description
            className={`flex justify-between mt-[10px] mb-5 text-[15px] leading-normal ${
              showDescription ? "visible" : "hidden"
            }`}
          >
            <div>
              Search results for{" "}
              {searchQuery?.query.keyword && (
                <span className="font-medium italic">
                  {searchQuery.query.keyword}
                </span>
              )}
              {searchQuery?.query.author && (
                <span>
                  {" "}
                  {searchQuery?.query.keyword && "by"}{" "}
                  <span className="font-medium italic">
                    {searchQuery.query.author}
                  </span>
                </span>
              )}
            </div>
            {/* <div className="font-medium flex gap-x-3 text-sm text-right items-center justify-center">
              <span>relevance</span>
              <div className="flex items-center gap-x-1">
                <button
                  className={`${
                    filter.old && "bg-slate-200 border-slate-500"
                  }}`}
                  onClick={() => {
                    dispatch({ type: "old-new" });
                    setRelevance("old-new");
                  }}
                >
                  <ArrowUpIcon />
                </button>
                <button
                  className={`${
                    filter.new && "bg-slate-200 border-slate-500"
                  }}`}
                  onClick={() => {
                    dispatch({ type: "new-old" });
                    setRelevance("new-old");
                  }}
                >
                  <ArrowDownIcon />
                </button>
              </div>
            </div> */}
          </Dialog.Description>
          <fieldset className="my-[15px] flex flex-col items-start gap-2">
            <label htmlFor="search"></label>
            <input
              className="inline-flex h-[35px] w-full flex-1 items-center justify-center rounded-[4px] p-[10px] text-[15px] leading-none shadow-[0_0_0_1px] outline-none focus:shadow-[0_0_0_1.5px]"
              id="search"
              ref={searchFeedInputRef}
              placeholder="Search feed"
              onChange={(e) => debouncedSearch(e.target.value)}
            />
            <label htmlFor="search-author"></label>
            <input
              className="inline-flex h-[35px] w-[50%] flex-1 items-center justify-center rounded-[4px] p-[10px] text-[15px] leading-none shadow-[0_0_0_1px] outline-none focus:shadow-[0_0_0_2px]"
              id="search-author"
              placeholder="Optional: author name"
              onChange={(e) => debouncedSearchAuthor(e.target.value)}
            />
          </fieldset>
          <div className="mt-[25px] flex flex-col justify-center items-center">
            <Spinner isPending={showSpinner} />
            <SearchResult
              searchResults={results}
              searchQuery={searchQuery}
              isPending={isFetching || isFetchingNextPage}
              showMoreResults={handleFetchMore}
              setOpen={setOpen}
            />
          </div>
          <Dialog.Close asChild>
            <button
              className="text-[10px] hover:bg-slate-300 bg-slate-200 focus:shadow-slate-300 absolute top-[10px] right-[10px] inline-flex h-[25px] w-[25px] appearance-none items-center justify-center rounded focus:outline-none"
              aria-label="Close"
              onClick={resetToDefault}
            >
              esc
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default SearchBox;
