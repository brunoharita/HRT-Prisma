"""Opt-in local MCP trial: one bounded read-only tool, no production integration.

Uses the existing dedicated session only. Does not register messaging/connection
tools, trigger login repair, import browser cookies, or bypass source controls.
"""

import argparse
import asyncio
from contextlib import contextmanager
import json
import os
from pathlib import Path
import sys
from urllib.parse import urlsplit, parse_qs
from unittest.mock import patch

from linkedin_recruiter_trial import (
    NativeSelection, Observation, Search, Trial, Limits, public_summary, reviewed_builder,
    profile_root,
)


@contextmanager
def single_attempt_reads(extractor):
    """Preserve the local no-retry contract at the pinned capture boundary.

    SectionCapture.capture normally retries a noise-only response. Delegate to
    the same single-attempt implementation and let the controller pause instead.
    Search-results capture has no permalink listener/overlay to manage.
    """
    capture = extractor._capture
    with patch.object(capture, "capture", new=capture._capture_once):
        yield


async def execute(plan_path: Path, identity_path: Path, run_id: str,
                  *, workspace_root: Path | None = None) -> dict:
    os.environ.update({"PYTHON_DOTENV_DISABLED": "1", "AUTO_IMPORT_FROM_BROWSER": "false",
                       "LINKEDIN_TRACE_MODE": "off", "LINKEDIN_MCP_CHECK_FOR_UPDATES": "off"})
    reviewed_builder()  # Refuse a different/dirty upstream before any browser.
    from fastmcp import FastMCP, Client
    from linkedin_mcp_server.config import set_config, AppConfig, BrowserConfig
    from linkedin_mcp_server.core.exceptions import AuthenticationError, AccountRestrictedError, RateLimitError
    from linkedin_mcp_server.core.utils import detect_rate_limit
    from linkedin_mcp_server.drivers.browser import get_or_create_browser, close_browser
    from linkedin_mcp_server.linkedin import LinkedInExtractor

    root = workspace_root or Path(__file__).resolve().parents[1]
    session = root / "tmp/linkedin-recruiter-session-worker/profile"
    if not session.is_dir():
        raise ValueError("Dedicated session unavailable; manual login required outside this tool")
    identity = json.loads(identity_path.read_text(encoding="utf-8"))
    if identity.get("emailVerifiedInSourceSettings") is not True:
        raise ValueError("Source identity verification missing")
    expected_path, expected_name = identity["publicPath"], identity["publicName"].casefold()
    if not expected_path.startswith("/in/") or not expected_name.strip():
        raise ValueError("Explicit verified self identity required")
    plan = json.loads(plan_path.read_text(encoding="utf-8"))
    searches = tuple(Search(item["keywords"], tuple(NativeSelection(
        kind=f["kind"], value=f["value"], label=f["label"],
        observed_url=f["observed_url"], selected_values=tuple(f["selected_values"]))
        for f in item["filters"])) for item in plan["searches"])
    if len(searches) != 1:
        raise ValueError("This final live witness permits exactly one search")
    if any(len([f for f in search.filters if f.kind == chosen.kind]) != 1
           for search in searches for chosen in search.filters):
        raise ValueError("Live driver currently requires a single native value per facet")
    # No CLI/default-account discovery or auto-import. Existing reviewed runtime.
    set_config(AppConfig(browser=BrowserConfig(
        user_data_dir=str(session), auto_import_from_browser=False, headless=False,
        chrome_path="C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
        login_inline_wait_seconds=0, default_timeout=5000)))
    mcp = FastMCP("Prisma local read-only filter trial")
    identity_confirmed = False
    diagnostic = {}

    @mcp.tool(timeout=120, annotations={"readOnlyHint": True})
    async def run_readonly_trial() -> dict:
        nonlocal identity_confirmed
        account_key = "dedicated-test-account"

        async def driver(search, maximum):
            nonlocal identity_confirmed
            stage = "session"
            try:
                browser = await get_or_create_browser()
                extractor = LinkedInExtractor(browser.page)
                stage = "self_identity"
                own = await extractor.get_my_profile()
                path = urlsplit(own.get("url", "")).path.rstrip("/")
                name_present = expected_name in " ".join(
                    own.get("sections", {}).get("main_profile", "").casefold().split())
                if own.get("section_errors") or not name_present or path not in {expected_path.rstrip("/"), "/in/me"}:
                    return Observation("identity-mismatch", browser.page.url, signal="error")
                identity_confirmed = True
                await detect_rate_limit(browser.page)
                # Minimal scoped seam: replace only the URL grammar during this
                # serialized read, preserving the pinned extractor/capture/errors.
                stage = "search_capture"
                with single_attempt_reads(extractor), patch("linkedin_mcp_server.linkedin.person.build_people_search_url",
                           return_value=search.url()):
                    result = await extractor.search_people(search.keywords)
                stage = "selected_controls"
                await detect_rate_limit(browser.page)
                selected = {}
                for f in search.filters:
                    if f.kind == "network":
                        control = browser.page.get_by_role("radio", name="Filtrar conexões de " + f.label, exact=True)
                        applied = await control.count() == 1 and await control.is_checked()
                    else:
                        control = browser.page.get_by_role("button", name="Filtrar " + f.label, exact=True)
                        applied = await control.count() == 1 and await control.is_visible()
                    if applied:
                        selected[f.kind] = (f.value,)
                errors = result.get("section_errors", {})
                signal = "rate_limit" if any(e.get("error_type") == "rate_limit" for e in errors.values()) else (
                    "partial" if errors else "ok")
                stage = "result_observation"
                empty = await browser.page.get_by_role("heading", name="Nenhum resultado encontrado", exact=True).count() == 1
                refs = tuple(r["url"] for r in result.get("references", {}).get("search_results", [])
                             if r.get("kind") == "person" and urlsplit(r.get("url", "")).path.rstrip("/") != expected_path.rstrip("/"))
                final = urlsplit(browser.page.url)
                invalid_references = 0
                own_alias_references = 0
                for reference in refs:
                    if urlsplit(reference).path.rstrip("/") == "/in/me":
                        own_alias_references += 1
                    try:
                        profile_root(reference)
                    except (ValueError, TypeError):
                        invalid_references += 1
                diagnostic.update(observation={
                    "sourceHostExpected": final.netloc == "www.linkedin.com",
                    "peopleSearchPath": final.path.rstrip("/") == "/search/results/people",
                    "keywordsMatch": parse_qs(final.query).get("keywords") == [search.keywords],
                    "selectedFilterKinds": list(selected), "references": len(refs),
                    "invalidProfileReferences": invalid_references, "selfAliasReferences": own_alias_references})
                return Observation(account_key, browser.page.url, selected, refs, signal,
                                   bool(result.get("sections", {}).get("search_results")) or empty, empty)
            except AccountRestrictedError:
                return Observation(account_key, "", signal="restricted")
            except AuthenticationError:
                return Observation(account_key, "", signal="login")
            except RateLimitError:
                return Observation(account_key, "", signal="rate_limit")
            except Exception as exc:
                diagnostic.update(stage=stage, exceptionClass=type(exc).__name__)
                raise

        trial = Trial(root / "tmp/linkedin-recruiter-poc/control", account_key, run_id,
                      searches, Limits(pages=1, references=10, timeout_seconds=110))
        try:
            state = await trial.run(driver, start=True)
            return dict(public_summary(state), mode="real_mcp_inprocess_real_browser",
                        toolsExposed=["run_readonly_trial"], identityConfirmed=identity_confirmed,
                        sourceEmailVerifiedSeparately=True, liveSourceSearches=1 if identity_confirmed else 0,
                        autonomousMcpAdapterTested=True, thirdPartyProfilesOpened=0,
                        driverDiagnostic=diagnostic)
        finally:
            await close_browser()

    async with Client(mcp) as client:
        response = await client.call_tool("run_readonly_trial", {}, timeout=130)
        if response.is_error:
            raise RuntimeError("Read-only MCP tool failed; no automatic retries")
        summary = response.data
        if not isinstance(summary, dict):
            summary = response.structured_content
        if not isinstance(summary, dict):
            raise ValueError("Unexpected MCP response")
        return dict(summary, browserCloseRequested=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plan", type=Path, required=True)
    parser.add_argument("--verified-identity", type=Path, required=True)
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    try:
        summary = asyncio.run(execute(args.plan, args.verified_identity, args.run_id))
    except Exception as exc:
        # Exception messages may carry personal data or source URLs.
        summary = {"status": "stopped", "exceptionClass": type(exc).__name__, "automaticRetries": 0}
    args.output.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False))
    sys.exit(0 if summary.get("status") == "completed" else 1)
