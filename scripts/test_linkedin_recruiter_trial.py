"""Deterministic tests: no login, browser, network, database or LLM."""

import asyncio
import json
import os
from pathlib import Path
import socket
import sys
import tempfile
import threading
import unittest
from unittest.mock import patch, AsyncMock, MagicMock
from types import SimpleNamespace
from urllib.parse import parse_qs, urlsplit

os.environ.update({"PYTHON_DOTENV_DISABLED": "1", "AUTO_IMPORT_FROM_BROWSER": "false",
                   "LINKEDIN_TRACE_MODE": "off", "LINKEDIN_MCP_CHECK_FOR_UPDATES": "off"})

from linkedin_recruiter_trial import (
    CAPABILITIES, Limits, NativeSelection, Observation, Search, Trial,
    profile_root, public_summary, verify_filters,
    reviewed_builder,
)
from linkedin_recruiter_mcp_trial import execute, single_attempt_reads

# Same Windows asyncio wakeup-pipe exception as the original offline harness.
_local = threading.local()
_socketpair = socket.socketpair


def internal_pair(*args, **kwargs):
    _local.active = True
    try:
        return _socketpair(*args, **kwargs)
    finally:
        _local.active = False


def offline(event, args):
    if event == "socket.connect" and getattr(_local, "active", False):
        if isinstance(args[1], tuple) and args[1][0] in {"127.0.0.1", "::1"}:
            return
    if event in {"socket.connect", "socket.getaddrinfo", "socket.sendto"}:
        raise RuntimeError("Offline test forbids networking")


socket.socketpair = internal_pair
sys.addaudithook(offline)
BASE = "https://www.linkedin.com/search/results/people/?keywords=Vendedor"


def selection(kind="location", value="101039681", key="geoUrn"):
    return NativeSelection(kind, value, "Synthetic selected entity",
                           BASE + "&" + key + "=%5B%22" + value + "%22%5D", (value,))


class Filters(unittest.TestCase):
    def test_pin_is_mandatory(self):
        reviewed_builder.cache_clear()
        try:
            with patch("linkedin_recruiter_trial.subprocess.check_output", return_value="wrong-sha"):
                with self.assertRaisesRegex(ValueError, "reviewed pin"):
                    reviewed_builder()
        finally:
            reviewed_builder.cache_clear()

    def test_unicode_and_arbitrary_selected_cities(self):
        for city in ("101039681", "104746682", "999999"):
            search = Search("Gestão de Estoque", (selection(value=city),))
            params = parse_qs(urlsplit(search.url()).query)
            self.assertEqual(params["keywords"], ["Gestão de Estoque"])
            self.assertEqual(json.loads(params["geoUrn"][0]), [city])
            self.assertNotIn("location", params)

    def test_native_facets_and_multi_select(self):
        for kind, value, key in (("current_company", "1", "currentCompany"),
                                 ("past_company", "2", "pastCompany"),
                                 ("school", "3", "schoolFilter"),
                                 ("industry", "4", "industry"),
                                 ("profile_language", "pt", "profileLanguage"),
                                 ("network", "O", "network")):
            selected = selection(kind, value, key)
            search = Search("Vendedor", (selected,))
            self.assertEqual(verify_filters(search, Observation(
                "account", search.url(), {kind: (value,)})), {kind: "source_applied"})
        search = Search("Vendedor", (selection(value="1"), selection(value="2")))
        self.assertEqual(json.loads(parse_qs(urlsplit(search.url()).query)["geoUrn"][0]), ["1", "2"])

    def test_url_echo_is_not_application(self):
        search = Search("Vendedor", (selection(),))
        self.assertEqual(verify_filters(search, Observation("account", search.url())), {"location": "unverified"})

    def test_ignored_or_changed_filter(self):
        search = Search("Vendedor", (selection(),))
        for url in (BASE, selection(value="2").observed_url):
            self.assertEqual(verify_filters(search, Observation(
                "account", url, {"location": ("101039681",)})), {"location": "unverified"})

    def test_refuse_ambiguous_unselected_or_unknown_entities(self):
        for item in (
            NativeSelection("location", "Bauru", "Bauru", BASE, ()),
            NativeSelection("location", "101039681", "Bauru", BASE, ("101039681",)),
            NativeSelection("sex", "female", "female", BASE, ("female",)),
            NativeSelection("location", "1", "Bauru", BASE + "&geoUrn=[1]", ()),
        ):
            with self.assertRaises(ValueError):
                Search("Vendedor", (item,)).url()

    def test_redirect_or_query_change_not_proof(self):
        for url in ("https://example.com/search/results/people/?keywords=Vendedor",
                    BASE.replace("Vendedor", "Outra")):
            with self.assertRaises(ValueError):
                verify_filters(Search("Vendedor"), Observation("account", url))

    def test_profile_evidence_is_not_search_matching(self):
        for criterion in ("past_title", "current_title", "responsibilities", "relevant_years",
                          "degree", "graduation", "skills", "leadership", "certifications",
                          "employment_status", "availability", "language_proficiency"):
            self.assertEqual(CAPABILITIES[criterion], "profile_evidence_required")
        self.assertEqual(CAPABILITIES["sex"], "excluded")
        self.assertEqual(CAPABILITIES["gender"], "excluded")

    def test_no_implicit_synonym_expansion(self):
        self.assertNotEqual(Search("Vendedor").url(), Search("Sales Representative").url())
        self.assertEqual(parse_qs(urlsplit(Search("Gerente de Logística").url()).query)["keywords"],
                         ["Gerente de Logística"])

    def test_profile_variants_and_refused_destinations(self):
        root = profile_root("https://linkedin.com/in/synthetic/?tracking=1")
        self.assertEqual(root, profile_root("https://www.linkedin.com/in/synthetic/details/experience/"))
        self.assertEqual(root, profile_root("https://www.linkedin.com/in/%73ynthetic"))
        for url in ("http://linkedin.com/in/a", "https://evil.test/in/a", "https://www.linkedin.com/in/me"):
            with self.assertRaises(ValueError):
                profile_root(url)

    def test_actual_upstream_person_reference_is_relative_and_must_normalize(self):
        from linkedin_mcp_server.linkedin.link_metadata import classify_link

        kind, reference = classify_link("https://www.linkedin.com/in/synthetic/?tracking=1")
        self.assertEqual((kind, reference), ("person", "/in/synthetic/"))
        self.assertEqual(profile_root(reference), profile_root("https://www.linkedin.com/in/synthetic"))
        for unsafe in ("//evil.test/in/synthetic", "//www.linkedin.com/in/synthetic", "/company/synthetic/",
                       "in/synthetic", "/in/me/", "/in/synthetic\\evil", "javascript:/in/synthetic",
                       "/in/../", "/in/%2e%2e/", "/in/synthetic%20name/", "/in/%00"):
            with self.assertRaises(ValueError):
                profile_root(unsafe)

    def test_budget_constraints_and_network_guard(self):
        for args in ({"pages": 7}, {"references": 0}, {"timeout_seconds": 0}):
            with self.assertRaises(ValueError):
                Limits(**args)
        with self.assertRaisesRegex(RuntimeError, "Offline"):
            socket.getaddrinfo("offline.invalid", 443)


class Execution(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.queries = (Search("Vendedor", (selection(),)), Search("Sales Representative", (selection(),)))
        self.calls = 0

    def trial(self, **kwargs):
        return Trial(self.root, "dedicated-test-account", "test", self.queries, **kwargs)

    async def driver(self, search, maximum):
        self.calls += 1
        return Observation("dedicated-test-account", search.url(), {"location": ("101039681",)},
                           ("https://www.linkedin.com/in/synthetic/?tracking=1",), results_observed=True)

    async def test_completion_dedup_checkpoint_minimization_and_restart(self):
        state = await self.trial().run(self.driver, start=True)
        self.assertEqual((state["status"], self.calls, len(state["seen"])), ("completed", 2, 1))
        self.assertEqual([e["new"] for e in state["events"]], [1, 0])
        serialized = self.trial().path.read_text()
        for private in ("linkedin.com/in", "synthetic", "Vendedor", "dedicated-test-account"):
            self.assertNotIn(private, serialized)
        self.assertNotIn("seen", public_summary(state))
        await self.trial().run(self.driver, resume=True)
        self.assertEqual(self.calls, 2)

    async def test_explicit_start_and_plan_integrity(self):
        with self.assertRaises(ValueError):
            await self.trial().run(self.driver)
        await self.trial().run(self.driver, start=True)
        with self.assertRaises(ValueError):
            await self.trial().run(self.driver, start=True)
        changed = Trial(self.root, "dedicated-test-account", "test", (Search("Other"),))
        with self.assertRaises(ValueError):
            await changed.run(self.driver, resume=True)

    async def test_exclusion_across_instances_same_account(self):
        entered, release = asyncio.Event(), asyncio.Event()

        async def blocked(search, maximum):
            entered.set()
            await release.wait()
            return await self.driver(search, maximum)

        task = asyncio.create_task(self.trial().run(blocked, start=True))
        await entered.wait()
        with self.assertRaises(FileExistsError):
            await self.trial().run(self.driver, start=True)
        release.set()
        await task

    async def test_source_signals_stop_without_retry(self):
        for signal in ("challenge", "restricted", "rate_limit", "login", "error", "partial"):
            run = Trial(self.root, "dedicated-test-account", signal, self.queries)

            async def signaled(search, maximum):
                return Observation("dedicated-test-account", search.url(), signal=signal)

            state = await run.run(signaled, start=True)
            self.assertEqual((state["status"], state["reason"], state["pages"]), ("paused", "source_" + signal, 1))
            state = await run.run(self.driver, resume=True)
            self.assertEqual(state["reason"], "uncertain_page_needs_explicit_retry")
        self.assertEqual(self.calls, 0)

    async def test_identity_mismatch(self):
        async def other(search, maximum):
            return Observation("official-account", search.url(), results_observed=True, explicit_empty=True)
        state = await self.trial().run(other, start=True)
        self.assertEqual((state["status"], state["pages"], state["references"]), ("paused", 1, 0))

    async def test_failure_preserves_previous_page_and_explicit_resume(self):
        async def fail_second(search, maximum):
            if self.calls == 1:
                raise RuntimeError("Private provider data must not be saved")
            return await self.driver(search, maximum)
        state = await self.trial().run(fail_second, start=True)
        self.assertEqual((state["completed"], state["pages"]), ([0], 2))
        self.assertNotIn("Private", self.trial().path.read_text())
        state = await self.trial().run(self.driver, resume=True, retry_interrupted=True)
        self.assertEqual((state["status"], self.calls, state["pages"]), ("completed", 2, 3))

    async def test_timeout_and_cancel_preserve_uncertain_state(self):
        async def slow(search, maximum):
            await asyncio.Event().wait()
        state = await self.trial(limits=Limits(timeout_seconds=0.01)).run(slow, start=True)
        self.assertEqual((state["reason"], state["pages"]), ("timeout", 1))
        run = Trial(self.root, "dedicated-test-account", "cancel", self.queries)
        entered = asyncio.Event()

        async def cancel(search, maximum):
            entered.set()
            await asyncio.Event().wait()
        task = asyncio.create_task(run.run(cancel, start=True))
        await entered.wait()
        task.cancel()
        with self.assertRaises(asyncio.CancelledError):
            await task
        self.assertFalse(run.lock.exists())

        self.assertEqual(json.loads(run.path.read_text())["reason"], "cancelled")

    async def test_budget_exhaustion_and_no_automatic_reset(self):
        state = await self.trial(limits=Limits(references=1)).run(self.driver, start=True)
        self.assertEqual((state["reason"], self.calls), ("budget_exhausted", 1))
        state = await self.trial(limits=Limits(references=1)).run(self.driver, resume=True)
        self.assertEqual((state["reason"], self.calls), ("budget_exhausted", 1))

    async def test_ignored_filter_and_unavailable_not_zero(self):
        for name, observation in (
            ("ignored", Observation("dedicated-test-account", BASE, results_observed=True, explicit_empty=True)),
            ("unavailable", Observation("dedicated-test-account", self.queries[0].url(), {"location": ("101039681",)})),
        ):
            async def driver(search, maximum):
                return observation
            state = await Trial(self.root, "dedicated-test-account", name, self.queries).run(driver, start=True)
            self.assertEqual(state["completed"], [])
            self.assertEqual(state["reason"], "filter_not_proven" if name == "ignored" else "results_unavailable")

    async def test_explicit_empty_is_observed_result(self):
        async def empty(search, maximum):
            return Observation("dedicated-test-account", search.url(), {"location": ("101039681",)},
                               results_observed=True, explicit_empty=True)
        state = await self.trial().run(empty, start=True)
        self.assertEqual(state["status"], "completed")
        self.assertTrue(all(e["empty"] for e in state["events"]))

    async def test_driver_cannot_exceed_reference_budget(self):
        async def too_many(search, maximum):
            return Observation("dedicated-test-account", search.url(), {"location": ("101039681",)},
                               ("https://www.linkedin.com/in/a", "https://www.linkedin.com/in/b"), results_observed=True)
        state = await self.trial(limits=Limits(references=1)).run(too_many, start=True)
        self.assertEqual(state["reason"], "reference_budget_exceeded")

    async def test_corrupt_checkpoint_fails_closed_without_reset(self):
        run = self.trial()
        await run.run(self.driver, start=True)
        state = json.loads(run.path.read_text())
        state["pages"] = -1
        run.path.write_text(json.dumps(state))
        with self.assertRaisesRegex(ValueError, "Invalid technical checkpoint"):
            await self.trial().run(self.driver, resume=True)
        self.assertEqual(self.calls, 2)
        self.assertFalse(run.lock.exists())

    async def test_relative_and_absolute_references_deduplicate_with_real_format(self):
        async def source(search, maximum):
            return Observation("dedicated-test-account", search.url(), {"location": ("101039681",)},
                               ("/in/synthetic/", "https://www.linkedin.com/in/synthetic/?tracking=1"),
                               results_observed=True)
        state = await self.trial().run(source, start=True)
        self.assertEqual((state["status"], len(state["seen"])), ("completed", 1))
        self.assertEqual([e["new"] for e in state["events"]], [1, 0])

    async def test_invalid_reference_still_stops_with_sanitized_diagnostic(self):
        async def source(search, maximum):
            return Observation("dedicated-test-account", search.url(), {"location": ("101039681",)},
                               ("https://external.invalid/in/private-person",), results_observed=True)
        state = public_summary(await self.trial().run(source, start=True))
        self.assertEqual((state["status"], state["failure_stage"], state["failure_code"]),
                         ("paused", "reference_normalization", "invalid_profile_reference"))
        self.assertNotIn("private-person", json.dumps(state))


class McpBoundary(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "tmp/linkedin-recruiter-session-worker/profile").mkdir(parents=True)
        self.plan_path, self.identity_path = self.root / "plan.json", self.root / "identity.json"
        self.plan_path.write_text(json.dumps({"searches": [{"keywords": "Vendedor", "filters": [{
            "kind": "location", "value": "101039681", "label": "Synthetic city",
            "observed_url": selection().observed_url, "selected_values": ["101039681"]}]}]}))
        self.identity_path.write_text(json.dumps({"emailVerifiedInSourceSettings": True,
                                                 "publicPath": "/in/own-synthetic", "publicName": "Own Synthetic"}))
        self.page = MagicMock()
        self.page.url = Search("Vendedor", (selection(),)).url()
        self.page.get_by_role.side_effect = lambda role, **kw: SimpleNamespace(
            count=AsyncMock(return_value=1 if role == "button" else 0),
            is_visible=AsyncMock(return_value=True))
        self.extractor = SimpleNamespace(
            _capture=SimpleNamespace(capture=AsyncMock(), _capture_once=AsyncMock()),
            get_my_profile=AsyncMock(return_value={"url": "https://www.linkedin.com/in/me",
                                                  "sections": {"main_profile": "Own Synthetic"}}),
            search_people=AsyncMock(return_value={"sections": {"search_results": "Professional result"},
                                                  "references": {"search_results": [
                                                      {"kind": "person", "url": "/in/synthetic/"}]}}))

    async def call(self):
        with patch("linkedin_mcp_server.drivers.browser.get_or_create_browser", new=AsyncMock(
            return_value=SimpleNamespace(page=self.page))), patch(
                "linkedin_mcp_server.drivers.browser.close_browser", new=AsyncMock()) as closed, patch(
                "linkedin_mcp_server.core.utils.detect_rate_limit", new=AsyncMock()), patch(
                "linkedin_mcp_server.linkedin.LinkedInExtractor", return_value=self.extractor):
            result = await execute(self.plan_path, self.identity_path, "mock", workspace_root=self.root)
            closed.assert_awaited_once()
            return result

    async def test_actual_mcp_transport_with_simulated_browser(self):
        result = await self.call()
        self.assertEqual((result["status"], result["references"]), ("completed", 1))
        self.assertEqual(result["toolsExposed"], ["run_readonly_trial"])
        self.assertEqual(result["events"][0]["filters"], {"location": "source_applied"})

    async def test_identity_mismatch_does_not_search(self):
        self.extractor.get_my_profile.return_value = {"url": "https://www.linkedin.com/in/other", "sections": {}}
        result = await self.call()
        self.assertFalse(result["identityConfirmed"])
        self.extractor.search_people.assert_not_awaited()
        self.assertEqual(result["reason"], "invalid_observation_or_driver_error")

    async def test_private_exception_not_leaked_and_no_retry(self):
        self.extractor.search_people.side_effect = RuntimeError("Private source text must not escape")
        result = await self.call()
        self.assertEqual(result["driverDiagnostic"], {"stage": "search_capture", "exceptionClass": "RuntimeError"})
        self.assertNotIn("Private", json.dumps(result))
        self.extractor.search_people.assert_awaited_once()

    async def test_upstream_noise_only_capture_is_not_retried(self):
        from linkedin_mcp_server.linkedin.capture import SectionCapture, CapturePlan, CaptureMode
        from linkedin_mcp_server.linkedin.contracts import (
            ExtractedSection, RATE_LIMITED_SECTION_TEXT,
        )
        session = SimpleNamespace(delay=AsyncMock())
        capture = SectionCapture(session, MagicMock(), MagicMock())
        once = AsyncMock(return_value=ExtractedSection(RATE_LIMITED_SECTION_TEXT, []))
        capture._capture_once = once
        with single_attempt_reads(SimpleNamespace(_capture=capture)):
            result = await capture.capture(BASE, "search_results", CapturePlan(CaptureMode.SEARCH_RESULTS))
        self.assertEqual(result.text, RATE_LIMITED_SECTION_TEXT)
        once.assert_awaited_once()
        session.delay.assert_not_awaited()


if __name__ == "__main__":
    unittest.main(verbosity=2)
