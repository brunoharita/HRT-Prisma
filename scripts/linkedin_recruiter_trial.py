"""Local-only Recruiter experiment. No server, cookies, LLM or domain writes.

The driver is deliberately injected: a source observation must come from an
authorized UI/read-only connector, never from text returned by an LLM. This
module does not launch a browser or import sessions. Checkpoints are technical
run progress, not a catalog of people, filters, occupations or Knowledge.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
import hashlib
from functools import lru_cache
import json
import os
from pathlib import Path
import re
import secrets
import subprocess
from typing import Awaitable, Callable
from urllib.parse import parse_qs, urlencode, urlsplit, urlunsplit, unquote

VERSION = "1.2.0"
UPSTREAM_PIN = "0c5f14ba3efcd9ad1bbd3163b4f2b9e47cda7b17"
# Only native facets observed in the source or the pinned upstream contract.
FACETS = {"location": "geoUrn", "current_company": "currentCompany",
          "past_company": "pastCompany", "school": "schoolFilter",
          "industry": "industry", "profile_language": "profileLanguage",
          "network": "network"}
CAPABILITIES = {
    **{name: "native_requires_receipt" for name in FACETS},
    **{name: "profile_evidence_required" for name in (
        "current_title", "past_title", "responsibilities", "relevant_years",
        "leadership", "degree", "graduation", "skills", "certifications",
        "language_proficiency", "availability", "employment_status")},
    "sex": "excluded", "gender": "excluded",
}


def digest(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def search_query(url: str) -> dict[str, list[str]]:
    parsed = urlsplit(url)
    if (parsed.scheme != "https" or parsed.netloc != "www.linkedin.com"
            or parsed.path.rstrip("/") != "/search/results/people"):
        raise ValueError("Unexpected source destination")
    return parse_qs(parsed.query)


@lru_cache(maxsize=1)
def reviewed_builder():
    from linkedin_mcp_server.linkedin import search_urls

    checkout = Path(search_urls.__file__).resolve().parents[2]
    sha = subprocess.check_output(["git", "-C", str(checkout), "rev-parse", "HEAD"], text=True).strip()
    if sha != UPSTREAM_PIN:
        raise ValueError("Upstream differs from the reviewed pin")
    subprocess.run(["git", "-C", str(checkout), "diff", "--quiet", "HEAD"], check=True)
    return search_urls.build_people_search_url


@dataclass(frozen=True)
class NativeSelection:
    """Ephemeral evidence of one unambiguous entity selected in the source UI."""

    kind: str
    value: str
    label: str
    observed_url: str
    selected_values: tuple[str, ...]

    def validate(self) -> None:
        if self.kind not in FACETS or not self.label.strip():
            raise ValueError("Unsupported or unresolved filter")
        if self.kind == "network":
            valid = self.value in {"F", "S", "O"}
        elif self.kind == "profile_language":
            valid = bool(re.fullmatch(r"[a-z]{2}", self.value))
        else:
            valid = bool(re.fullmatch(r"[0-9]+", self.value))
        if not valid or self.value not in self.selected_values:
            raise ValueError("Filter needs an exact selected native entity")
        encoded = search_query(self.observed_url).get(FACETS[self.kind], [])
        if len(encoded) != 1 or self.value not in json.loads(encoded[0]):
            raise ValueError("Selected entity absent from observed source URL")


@dataclass(frozen=True)
class Search:
    keywords: str
    filters: tuple[NativeSelection, ...] = ()
    page: int = 1

    def url(self) -> str:
        # Reuse the reviewed upstream grammar; extend outside its frozen clone.
        if not self.keywords.strip() or len(self.keywords) > 300:
            raise ValueError("Bounded professional query required")
        if type(self.page) is not int or not 1 <= self.page <= 20:
            raise ValueError("Outside the observed bounded pagination contract")
        params = search_query(reviewed_builder()(self.keywords))
        groups: dict[str, list[str]] = {}
        for selected in self.filters:
            selected.validate()
            values = groups.setdefault(FACETS[selected.kind], [])
            if selected.value not in values:
                values.append(selected.value)
        for key, values in groups.items():
            params[key] = [json.dumps(values, separators=(",", ":"))]
        if self.page > 1:
            params["page"] = [str(self.page)]
        return "https://www.linkedin.com/search/results/people/?" + urlencode(params, doseq=True)


@dataclass(frozen=True)
class Observation:
    account_key: str
    final_url: str
    selected: dict[str, tuple[str, ...]] = field(default_factory=dict)
    references: tuple[str, ...] = ()
    # Trusted driver classifications, not arbitrary matches against profile text.
    signal: str = "ok"  # challenge/restricted/rate_limit/login/error/partial
    results_observed: bool = False
    explicit_empty: bool = False
    active_page: int | None = None
    has_next: bool | None = None


def verify_filters(search: Search, page: Observation) -> dict[str, str]:
    actual = search_query(page.final_url)
    if actual.get("keywords") != [search.keywords]:
        raise ValueError("Source changed the requested query")
    if actual.get("page", ["1"]) != [str(search.page)]:
        raise ValueError("Source changed the requested page")
    result = {}
    if search.page > 1:
        result["page"] = "source_applied" if page.active_page == search.page else "unverified"
    for kind in {item.kind for item in search.filters}:
        expected = {item.value for item in search.filters if item.kind == kind}
        encoded = actual.get(FACETS[kind], [])
        values = set(json.loads(encoded[0])) if len(encoded) == 1 else set()
        # The selected state is essential: the requested URL alone is no receipt.
        result[kind] = "source_applied" if (
            values == expected and set(page.selected.get(kind, ())) == expected
        ) else "unverified"
    return result


def profile_root(url: str) -> str:
    parsed = urlsplit(url)
    path = unquote(parsed.path)
    match = re.match(r"^/in/([^/]+)(?:/|$)", path)
    # The pinned upstream deliberately returns root-relative /in/... references.
    # Resolve ONLY that shape to the already verified source, never //host,
    # relative traversal, arbitrary schemes or a browser-interpreted backslash.
    source_relative = (not parsed.scheme and not parsed.netloc and url.startswith("/in/"))
    source_absolute = parsed.scheme == "https" and parsed.netloc in {"www.linkedin.com", "linkedin.com"}
    if (not (source_relative or source_absolute) or "\\" in path
            or not match or match[1] in {"me", ".", ".."}
            or re.search(r"[\s\x00-\x1f\x7f]", path)):
        raise ValueError("Not a canonical public profile reference")
    # URL encoding/query/trailing slash/section links do not create new people.
    return urlunsplit(("https", "www.linkedin.com", "/in/" + match[1], "", ""))


@dataclass(frozen=True)
class Limits:
    pages: int = 6
    references: int = 60
    timeout_seconds: float = 45

    def __post_init__(self):
        if not (1 <= self.pages <= 20 and 1 <= self.references <= 200
                and 0 < self.timeout_seconds <= 120):
            raise ValueError("Outside the bounded local trial budget")


Driver = Callable[[Search, int], Awaitable[Observation]]


class Trial:
    """One explicit run; per-account cross-process exclusion; no auto retries.

    A crash leaves a .lock intentionally: never remove a possibly active lock.
    In normal exceptions/cancellation, finally releases the owned lock. An
    uncertain page is never repeated implicitly on resume.
    """

    def __init__(self, root: Path, account_key: str, run_id: str,
                 searches: tuple[Search, ...], limits: Limits = Limits(), *, target_unique: int | None = None):
        if not account_key or not re.fullmatch(r"[a-zA-Z0-9_-]{1,80}", run_id):
            raise ValueError("Explicit account and local run ID required")
        if not searches or len(searches) > limits.pages:
            raise ValueError("Search plan exceeds the page budget")
        if target_unique is not None and not 1 <= target_unique <= 100:
            raise ValueError("Outside the approved unique-profile target")
        self.target_unique = target_unique
        self.searches, self.limits, self.account = searches, limits, account_key
        self.root = root / digest(account_key)
        self.root.mkdir(parents=True, exist_ok=True)
        self.path, self.lock = self.root / (run_id + ".json"), self.root / "active.lock"
        self.plan = digest(json.dumps([s.url() for s in searches]) + repr(limits)
                           + (str(target_unique) if target_unique is not None else ""))

    def _save(self, state: dict) -> None:
        temporary = self.path.with_suffix(".pending")
        temporary.write_text(json.dumps(state, indent=2) + "\n", encoding="utf-8")
        os.replace(temporary, self.path)

    def _load(self) -> dict:
        if not self.path.exists():
            return {"version": VERSION, "plan": self.plan, "salt": secrets.token_hex(24),
                    "status": "ready", "reason": None, "pages": 0, "references": 0,
                    "seen": [], "completed": [], "in_flight": None, "events": []}
        state = json.loads(self.path.read_text(encoding="utf-8"))
        if state["version"] != VERSION or state["plan"] != self.plan:
            raise ValueError("Checkpoint belongs to another plan/version")
        if (not isinstance(state["pages"], int) or not 0 <= state["pages"] <= self.limits.pages
                or not isinstance(state["references"], int) or not 0 <= state["references"] <= self.limits.references
                or len(set(state["completed"])) != len(state["completed"])
                or any(type(i) is not int or not 0 <= i < len(self.searches) for i in state["completed"])
                or state["status"] not in {"ready", "running", "paused", "completed"}):
            raise ValueError("Invalid technical checkpoint; do not reset counters")
        return state

    async def run(self, driver: Driver, *, start: bool = False, resume: bool = False,
                  retry_interrupted: bool = False) -> dict:
        if start == resume:
            raise ValueError("Choose explicit start or resume")
        descriptor = os.open(self.lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        try:
            os.close(descriptor)
            state = self._load()
            if start and self.path.exists():
                raise ValueError("Existing run needs explicit resume")
            if resume and not self.path.exists():
                raise ValueError("Nothing to resume")
            if state["status"] == "completed":
                return state
            if state["in_flight"] is not None and not retry_interrupted:
                state.update(status="paused", reason="uncertain_page_needs_explicit_retry")
                self._save(state)
                return state
            state.update(status="running", reason=None)
            for key in ("exception_class", "failure_stage", "failure_code"):
                state.pop(key, None)
            self._save(state)
            for index, search in enumerate(self.searches):
                if index in state["completed"]:
                    continue
                if state["pages"] >= self.limits.pages or state["references"] >= self.limits.references:
                    state.update(status="paused", reason="budget_exhausted")
                    break
                state["pages"] += 1  # Attempts consume budget even on failure.
                state["in_flight"] = index
                self._save(state)
                validation_stage = "driver"
                try:
                    page = await asyncio.wait_for(
                        driver(search, self.limits.references - state["references"]),
                        timeout=self.limits.timeout_seconds)
                    if page.account_key != self.account:
                        raise ValueError("identity_mismatch")
                    if page.signal != "ok":
                        state.update(status="paused", reason="source_" + (
                            page.signal if page.signal in {"challenge", "restricted", "rate_limit", "login", "partial"}
                            else "error"))
                        break
                    validation_stage = "filter_receipt"
                    receipts = verify_filters(search, page)
                    if "unverified" in receipts.values():
                        state.update(status="paused", reason="filter_not_proven")
                        break
                    if not page.results_observed or (not page.references and not page.explicit_empty):
                        state.update(status="paused", reason="results_unavailable")
                        break
                    if page.references and page.explicit_empty:
                        raise ValueError("contradictory_empty_state")
                    if len(page.references) > self.limits.references - state["references"]:
                        state.update(status="paused", reason="reference_budget_exceeded")
                        break
                    validation_stage = "reference_normalization"
                    keys = list(dict.fromkeys(digest(state["salt"] + profile_root(url)) for url in page.references))
                    new = [key for key in keys if key not in set(state["seen"])]
                    if self.target_unique is not None:
                        new = new[:self.target_unique - len(state["seen"])]
                    state["seen"] = sorted(set(state["seen"]) | set(new))
                    state["references"] += len(page.references)
                    state["events"].append({"page": index, "filters": receipts,
                                            "returned": len(page.references), "new": len(new),
                                            "empty": page.explicit_empty})
                    state["completed"].append(index)
                    state["in_flight"] = None
                    self._save(state)
                    if self.target_unique is not None and len(state["seen"]) >= self.target_unique:
                        state.update(status="completed", reason="unique_target_reached")
                        break
                    if page.has_next is False:
                        state.update(status="completed", reason="source_exhausted")
                        break
                except asyncio.CancelledError:
                    state.update(status="paused", reason="cancelled")
                    self._save(state)
                    raise
                except Exception as exc:
                    # Provider exception messages can contain private profile data.
                    state.update(status="paused", reason=("timeout" if isinstance(exc, TimeoutError)
                                                         else "invalid_observation_or_driver_error"))
                    state["exception_class"] = type(exc).__name__
                    state["failure_stage"] = validation_stage
                    # Only our fixed validation messages may leave this boundary.
                    safe_codes = {"Unexpected source destination": "unexpected_source_destination",
                                  "Source changed the requested query": "source_query_changed",
                                  "Source changed the requested page": "source_page_changed",
                                  "Not a canonical public profile reference": "invalid_profile_reference"}
                    state["failure_code"] = safe_codes.get(str(exc), "unclassified_validation_or_driver_error")
                    break
            else:
                state.update(status="completed", reason=None)
            self._save(state)
            return state
        finally:
            self.lock.unlink()


def public_summary(state: dict) -> dict:
    """No account ID, hashes of people, query, raw profile or secret in reports."""
    summary = {key: state[key] for key in (
        "version", "status", "reason", "pages", "references", "completed", "events")}
    summary["unique_references"] = len(state["seen"])
    if state.get("exception_class"):
        summary["exception_class"] = state["exception_class"]
        summary["failure_stage"] = state.get("failure_stage")
        summary["failure_code"] = state.get("failure_code")
    return summary


async def replay_observations(path: Path, checkpoint_root: Path, run_id: str) -> dict:
    """Exercise the controller with receipts already obtained through the UI.

    This is explicitly a replay, NOT a live MCP call or an autonomous collector.
    Tokens preserve reference equality without copying names/profile URLs.
    """
    data = json.loads(path.read_text(encoding="utf-8"))
    if (data.get("source") != "internal-browser-ui"
            or data.get("testAccountVerified") is not True
            or data.get("thirdPartyIdentitiesIncluded") is not False):
        raise ValueError("Verified, minimized UI receipts required")
    account = "dedicated-test-account"
    pages = data["observations"]
    searches = []
    for page in pages:
        filters = tuple(NativeSelection(kind, value, kind, page["final_url"], tuple(values))
                        for kind, values in page["selected"].items() for value in values)
        searches.append(Search(page["keywords"], filters))
    remaining = iter(pages)

    async def recorded_driver(search, maximum):
        page = next(remaining)
        references = []
        for token in page["reference_tokens"]:
            if not re.fullmatch(r"reference-[0-9]+", token):
                raise ValueError("Only opaque equality tokens are allowed in replay")
            references.append("https://www.linkedin.com/in/poc-" + token)
        return Observation(account, page["final_url"],
                           {k: tuple(v) for k, v in page["selected"].items()}, tuple(references),
                           results_observed=page["results_observed"], explicit_empty=page["explicit_empty"])

    run = Trial(checkpoint_root, account, run_id, tuple(searches))
    summary = public_summary(await run.run(recorded_driver, start=True))
    summary.update(mode="replay_of_real_ui_receipts", autonomousMcpAdapterTested=False,
                   liveSourceSearches=len(pages), newNetworkCallsDuringReplay=0)
    return summary


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--replay-observations", type=Path, required=True)
    parser.add_argument("--checkpoint-root", type=Path, required=True)
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    os.environ.update({"PYTHON_DOTENV_DISABLED": "1", "AUTO_IMPORT_FROM_BROWSER": "false",
                       "LINKEDIN_TRACE_MODE": "off", "LINKEDIN_MCP_CHECK_FOR_UPDATES": "off"})
    summary = asyncio.run(replay_observations(args.replay_observations, args.checkpoint_root, args.run_id))
    args.output.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False))
