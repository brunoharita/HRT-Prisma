"""Explicit, local-only 100-profile pilot. No contacts, product writes or scores.

Private run artifacts are necessary research/progress evidence, not a people
catalog. Only aggregate counters may be published. Reading is not assessment.
"""

import argparse
import asyncio
import json
import os
from pathlib import Path
import re
import sys
from urllib.parse import urlsplit

from linkedin_recruiter_trial import Search, NativeSelection, Limits, Trial, profile_root, verify_filters, public_summary, reviewed_builder
from linkedin_recruiter_mcp_trial import capture_search_page, single_attempt_reads


def minimal_experience(text: str) -> tuple[str, bool]:
    # The pinned extractor may include the sidebar/footer in a section capture.
    # Only observed UI boundaries are removed; unknown text stays for review.
    text = re.split(r"\n(?:Mais perfis para você|People also viewed|More profiles for you)\n|\nSobre\n\nAcessibilidade\n|\nAbout\n\nAccessibility\n", text, maxsplit=1)[0]
    # Do not retain contact data/URLs from the requested professional section.
    text = re.sub(r"https?://\S+", "[source link]", text)
    text = re.sub(r"[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}", "[contact removed]", text)
    text = re.sub(r"(?<!\d)(?:\+\d{1,3}[ .-]?)?\(?\d{2}\)?[ .-]?\d{4,5}[ .-]?\d{4}(?!\d)", "[contact removed]", text)
    return text[:18000], len(text) > 18000


class PrivateRun:
    def __init__(self, directory: Path):
        from linkedin_mcp_server.private_state import harden_directory
        self.directory = directory
        harden_directory(directory)
        self.path = directory / "research.json"
        self.data = json.loads(self.path.read_text(encoding="utf-8")) if self.path.exists() else {
            "version": "1.3.0", "target": 100, "profiles": [], "profile_attempts": 0,
            "status": "ready", "reason": None, "collection": None,
        }
        if self.data.get("version") != "1.3.0" or self.data.get("target") != 100:
            raise ValueError("Research run version/target differs")
        for entry in self.data["profiles"]:
            if entry["status"] == "in_flight":
                entry["status"] = "uncertain"

    def save(self):
        from linkedin_mcp_server.private_state import harden_created_file
        temporary = self.path.with_suffix(".pending")
        temporary.write_text(json.dumps(self.data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        harden_created_file(temporary)
        os.replace(temporary, self.path)

    def add(self, references):
        known = {entry["source"] for entry in self.data["profiles"]}
        for reference in references:
            root = profile_root(reference)
            if root not in known and len(known) < 100:
                self.data["profiles"].append({"token": "P" + str(len(known) + 1).zfill(3),
                                               "source": root, "status": "pending", "assessment": None})
                known.add(root)
        self.save()

    def summary(self):
        entries = self.data["profiles"]
        return {"pilotVersion": "1.3.0", "target": 100,
                "status": self.data["status"], "reason": self.data["reason"],
                "foundUnique": len(entries), "profileAttempts": self.data["profile_attempts"],
                "professionalSectionsRead": sum(p["status"] == "read" for p in entries),
                "experienceAvailable": sum(bool(p.get("experience")) for p in entries),
                "analyzed": sum(p.get("assessment") is not None for p in entries),
                "partialOrUnavailable": sum(p["status"] in {"partial", "unavailable", "error", "uncertain"} for p in entries),
                "pending": sum(p["status"] == "pending" for p in entries),
                "collection": self.data["collection"], "productionAccessed": False,
                "messagesOrConnectionsSent": False}


async def read_pending(run: PrivateRun, read, *, timeout=70):
    """Attempt each pending person once; do not retry partial/uncertain reads."""
    for entry in run.data["profiles"]:
        if entry["status"] != "pending":
            continue
        if run.data["profile_attempts"] >= 100:
            run.data.update(status="paused", reason="profile_budget_exhausted")
            break
        entry["status"] = "in_flight"
        run.data["profile_attempts"] += 1
        run.save()
        try:
            result = await asyncio.wait_for(read(entry["source"]), timeout=timeout)
            errors = result.get("section_errors", {})
            text, truncated = minimal_experience(result.get("sections", {}).get("experience", ""))
            entry.update(experience=text, truncated=truncated,
                         status="partial" if errors else ("read" if text.strip() else "unavailable"),
                         errorTypes=sorted({e.get("error_type", "unknown") for e in errors.values()}))
            run.save()
            if errors:
                run.data.update(status="paused", reason="partial_profile")
                break
        except asyncio.CancelledError:
            run.data.update(status="paused", reason="cancelled")
            run.save()
            raise
        except Exception as exc:
            entry.update(status="error", exceptionClass=type(exc).__name__)
            run.data.update(status="paused", reason="profile_read_" + type(exc).__name__)
            break
        if run.data["profile_attempts"] % 5 == 0:
            print(json.dumps(run.summary()), flush=True)
    else:
        run.data.update(status="paused" if any(p["status"] == "uncertain" for p in run.data["profiles"]) else "reading_finished",
                        reason="uncertain_profile" if any(p["status"] == "uncertain" for p in run.data["profiles"]) else None)
    run.save()
    return run.summary()


async def execute(identity_path: Path, plan_path: Path, run_id: str, resume: bool):
    os.environ.update({"PYTHON_DOTENV_DISABLED": "1", "AUTO_IMPORT_FROM_BROWSER": "false",
                       "LINKEDIN_TRACE_MODE": "off", "LINKEDIN_MCP_CHECK_FOR_UPDATES": "off"})
    reviewed_builder()
    from fastmcp import FastMCP, Client
    from linkedin_mcp_server.config import AppConfig, BrowserConfig, set_config
    from linkedin_mcp_server.drivers.browser import get_or_create_browser, close_browser
    from linkedin_mcp_server.linkedin import LinkedInExtractor
    from linkedin_mcp_server.core.utils import detect_rate_limit

    root = Path(__file__).resolve().parents[1]
    if not re.fullmatch(r"[a-zA-Z0-9_-]{1,80}", run_id):
        raise ValueError("Explicit local run ID required")
    identity = json.loads(identity_path.read_text(encoding="utf-8"))
    if identity.get("emailVerifiedInSourceSettings") is not True:
        raise ValueError("Verified source identity required")
    expected_path, name = identity["publicPath"], identity["publicName"].casefold()
    plan = json.loads(plan_path.read_text(encoding="utf-8"))["searches"][0]
    filters = tuple(NativeSelection(f["kind"], f["value"], f["label"], f["observed_url"], tuple(f["selected_values"])) for f in plan["filters"])
    searches = tuple(Search(plan["keywords"], filters, page=n) for n in range(1, 21))
    trial = Trial(root / "tmp/linkedin-recruiter-poc/control", "dedicated-test-account", run_id,
                  searches, Limits(pages=20, references=200, timeout_seconds=110), target_unique=100)
    run = PrivateRun(root / "tmp/linkedin-recruiter-poc/pilot-100" / run_id)
    if not resume and run.path.exists():
        raise ValueError("Existing run needs explicit resume")
    set_config(AppConfig(browser=BrowserConfig(
        user_data_dir=str(root / "tmp/linkedin-recruiter-session-worker/profile"),
        auto_import_from_browser=False, headless=False,
        chrome_path="C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
        login_inline_wait_seconds=0, default_timeout=5000)))
    mcp = FastMCP("Local explicit 100-profile professional evidence trial")

    @mcp.tool(timeout=3600, annotations={"readOnlyHint": True})
    async def run_pilot() -> dict:
        browser = None
        try:
            # Reserve the same account lock also while checking identity.
            descriptor = os.open(trial.lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
            try:
                os.close(descriptor)
                browser = await get_or_create_browser()
                extractor = LinkedInExtractor(browser.page)
                own = await extractor.get_my_profile()
                own_path = urlsplit(own.get("url", "")).path.rstrip("/")
                if (own.get("section_errors") or own_path not in {expected_path.rstrip("/"), "/in/me"}
                        or name not in " ".join(own.get("sections", {}).get("main_profile", "").casefold().split())):
                    raise ValueError("Dedicated identity mismatch")
                run.data["identityConfirmed"] = True
            finally:
                trial.lock.unlink()

            async def source(search, maximum):
                diagnostic = {}
                page = await capture_search_page(browser, extractor, search, "dedicated-test-account", expected_path, diagnostic)
                if page.signal == "ok" and "unverified" not in verify_filters(search, page).values():
                    run.add(page.references)
                print(json.dumps({"stage": "search", "page": search.page, "foundUnique": len(run.data["profiles"])}), flush=True)
                return page

            run.data.update(status="collecting", reason=None)
            collected = await trial.run(source, start=not resume, resume=resume)
            run.data["collection"] = public_summary(collected)
            run.save()
            if collected["status"] != "completed":
                run.data.update(status="paused", reason="collection_" + str(collected["reason"]))
                run.save()
                return run.summary()
            # Reacquire account exclusion for the entire serial reading phase.
            descriptor = os.open(trial.lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
            try:
                os.close(descriptor)
                run.data.update(status="reading", reason=None)
                run.save()
                async def read(url):
                    await detect_rate_limit(browser.page)
                    with single_attempt_reads(extractor):
                        data = await extractor.read_person(urlsplit(url).path.split("/")[2], {"experience"}, max_scrolls=1)
                    await detect_rate_limit(browser.page)
                    return data
                return await read_pending(run, read)
            finally:
                trial.lock.unlink()
        except Exception as exc:
            run.data.update(status="paused", reason=type(exc).__name__)
            run.save()
            return run.summary()
        finally:
            await close_browser()

    async with Client(mcp) as client:
        result = await client.call_tool("run_pilot", {}, timeout=3660)
        if result.is_error:
            raise RuntimeError("Pilot stopped; no automatic retry")
        summary = result.data if isinstance(result.data, dict) else result.structured_content
        return dict(summary, browserCloseRequested=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verified-identity", type=Path, required=True)
    parser.add_argument("--plan", type=Path, required=True)
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--resume", action="store_true")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    try:
        summary = asyncio.run(execute(args.verified_identity, args.plan, args.run_id, args.resume))
    except Exception as exc:
        summary = {"status": "paused", "reason": type(exc).__name__}
    args.output.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary), flush=True)
    sys.exit(0 if summary.get("status") == "reading_finished" else 1)
