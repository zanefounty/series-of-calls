#!/usr/bin/env python3
"""Exercise both real local MCP stdio servers without a browser or network.

This is bounded transport/gameplay evidence, not full source fidelity or browser
acceptance. NODE_PATH overrides are recorded; the lockfile is never modified.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import selectors
import subprocess
import time
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


class Client:
    def __init__(self, script, timeout=15):
        self.process = subprocess.Popen(["node", script], cwd=ROOT, stdin=subprocess.PIPE,
                                        stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        self.selector = selectors.DefaultSelector()
        self.selector.register(self.process.stdout, selectors.EVENT_READ, "stdout")
        self.selector.register(self.process.stderr, selectors.EVENT_READ, "stderr")
        self.buffer = b""
        self.stderr = b""
        self.sequence = 0
        self.timeout = timeout

    def request(self, method, params=None):
        self.sequence += 1
        message = {"jsonrpc": "2.0", "id": self.sequence, "method": method}
        if params is not None:
            message["params"] = params
        self.process.stdin.write((json.dumps(message) + "\n").encode())
        self.process.stdin.flush()
        deadline = time.monotonic() + self.timeout
        while True:
            while b"\n" in self.buffer:
                line, self.buffer = self.buffer.split(b"\n", 1)
                response = json.loads(line)
                if response.get("id") != self.sequence:
                    raise AssertionError("Unexpected response ID or unsolicited protocol output")
                if "error" in response:
                    raise AssertionError(response["error"])
                return response["result"]
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise TimeoutError("MCP response timed out: " + method)
            events = self.selector.select(remaining)
            for key, _ in events:
                chunk = os.read(key.fd, 65536)
                if not chunk:
                    self.selector.unregister(key.fileobj)
                    if key.data == "stdout":
                        raise RuntimeError("MCP server closed stdout: " + self.stderr.decode(errors="replace"))
                elif key.data == "stdout":
                    self.buffer += chunk
                    if len(self.buffer) > 16_000_000:
                        raise RuntimeError("MCP response exceeded the smoke-test bound")
                else:
                    self.stderr = (self.stderr + chunk)[-20000:]

    def tool(self, name, args=None, error=False):
        result = self.request("tools/call", {"name": name, "arguments": args or {}})
        if bool(result.get("isError")) != error:
            raise AssertionError({"tool": name, "expectedError": error, "result": result})
        text = result["content"][0]["text"]
        return text if error else json.loads(text)

    def initialize(self, expected):
        result = self.request("initialize", {"protocolVersion": "2025-11-25", "capabilities": {},
            "clientInfo": {"name": "series-of-calls-deployment-smoke", "version": "1"}})
        assert result["serverInfo"]["name"] == expected
        assert result["protocolVersion"] == "2025-11-25"
        self.process.stdin.write(b'{"jsonrpc":"2.0","method":"notifications/initialized"}\n')
        self.process.stdin.flush()
        return {tool["name"] for tool in self.request("tools/list")["tools"]}

    def close(self):
        self.selector.close()
        self.process.stdin.close()
        try:
            self.process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            self.process.terminate()
            try:
                self.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait()
        self.process.stdout.close()
        self.process.stderr.close()


def fixture_matrix():
    script = """
const E=require('./src/game/55-communications');
const rows=[];
for(const scenario of Object.keys(E.scenarios))for(const jurisdiction of E.jurisdictions)
for(const mode of ['guided','assessed','sandbox']){
 const options={scenario,jurisdiction,mode};let state=E.create(options);
 const commands=E.reference(state);
 for(const command of commands)state=E.dispatch(state,command);
 rows.push({options,commands,state,assessment:E.assess(state)});
}
console.log(JSON.stringify(rows));
"""
    return json.loads(subprocess.check_output(["node", "-e", script], cwd=ROOT, text=True, timeout=30))


def communications(report):
    client = Client("scripts/calls-mcp.js")
    try:
        names = client.initialize("series-of-calls")
        assert names == {"new_exercise", "inspect", "command", "export_exercise", "import_exercise"}
        for fixture in fixture_matrix():
            row = {"server": "communications", **fixture["options"]}
            try:
                client.tool("new_exercise", fixture["options"])
                initial = client.tool("inspect")
                assert not initial["observed"]["assessment"]["passed"], "Fresh exercise must not already pass"
                client.tool("command", {"command": {"type": "advance", "minutes": -1}}, error=True)
                assert client.tool("inspect") == initial, "Rejected command mutated state"
                for command in fixture["commands"]:
                    client.tool("command", {"command": command})
                observed = client.tool("inspect")
                assert observed["state"] == fixture["state"], "MCP differs from direct dispatch"
                assert observed["observed"]["assessment"] == fixture["assessment"]
                assert fixture["assessment"]["passed"], "Reference solution failed"
                assert client.tool("inspect") == observed, "Inspection mutated state"
                saved = client.tool("export_exercise")
                client.tool("new_exercise", fixture["options"])
                client.tool("import_exercise", {"json": json.dumps(saved)})
                assert client.tool("export_exercise") == saved, "Save round trip differs"
                client.tool("import_exercise", {"json": '{"v":1,"day":42}'}, error=True)
                assert client.tool("export_exercise") == saved, "Invalid import replaced state"
                client.tool("new_exercise", fixture["options"])
                for command in fixture["commands"]:
                    client.tool("command", {"command": command})
                assert client.tool("export_exercise") == saved, "Deterministic replay differs"
                row.update(status="passed", commands=len(fixture["commands"]),
                    checks=["reference-solution", "initial-failure", "rejected-command-atomicity",
                            "direct-dispatch-equivalence", "inspection-purity", "save-restore",
                            "foreign-save-rejection", "deterministic-replay"])
            except Exception as error:
                row.update(status="failed", error=str(error))
            report["results"].append(row)
    finally:
        client.close()


def full_campaigns(report):
    script = """
const {campaignJourney}=require('./scripts/lib/campaign-journey');
const rows=[];
for(const jurisdiction of ['AU','US','JP','EU'])for(const mode of ['guided','assessed','sandbox']){
 const journey=campaignJourney({jurisdiction,mode});
 rows.push({options:{scenario:'smb',jurisdiction,mode},commands:journey.steps.filter(s=>s.command).map(s=>s.command),state:journey.state,tracks:journey.tracks});
}
console.log(JSON.stringify(rows));
"""
    fixtures = json.loads(subprocess.check_output(["node", "-e", script], cwd=ROOT, text=True, timeout=120))
    client = Client("scripts/calls-mcp.js", timeout=30)
    try:
        client.initialize("series-of-calls")
        for fixture in fixtures:
            row = {"server": "communications-full-campaign", **fixture["options"]}
            try:
                client.tool("new_exercise", fixture["options"])
                for command in fixture["commands"]:
                    client.tool("command", {"command": command})
                actual = client.tool("export_exercise")
                assert actual == fixture["state"], "Full campaign MCP differs from direct dispatch"
                client.tool("new_exercise", fixture["options"])
                client.tool("import_exercise", {"json": json.dumps(actual)})
                assert client.tool("export_exercise") == actual, "Full campaign restore differs"
                row.update(status="passed", commands=len(fixture["commands"]), tracks=fixture["tracks"],
                           checks=["four-track-progression", "all-required-offers", "incident-recovery",
                                   "three-billing-periods", "renewal", "direct-dispatch-equivalence", "save-restore"])
            except Exception as error:
                row.update(status="failed", error=str(error))
            report["results"].append(row)
    finally:
        client.close()


def information_interfaces(report):
    script = """
const {journey}=require('./tests/lib/information-interface-fixture');
const rows=[];
for(const jurisdiction of ['AU','US','JP','EU'])for(const options of [{administration:false},{administration:true},{administration:true,restrictedCapture:false}])
 rows.push({...journey({jurisdiction,...options}),...options});
console.log(JSON.stringify(rows));
"""
    fixtures = json.loads(subprocess.check_output(["node", "-e", script], cwd=ROOT, text=True, timeout=60))
    client = Client("scripts/calls-mcp.js")
    try:
        client.initialize("series-of-calls")
        for fixture in fixtures:
            row = {"server": "defence-information-interface", **fixture["options"], "restrictedExport": fixture["administration"] and fixture.get("restrictedCapture", True)}
            try:
                client.tool("new_exercise", fixture["options"])
                for command in fixture["commands"]:
                    client.tool("command", {"command": command})
                actual = client.tool("export_exercise")
                assert actual == fixture["expectedState"], "Information interface MCP differs from direct dispatch"
                assert actual["information"]["transfers"][-1]["status"] == ("blocked" if fixture["administration"] and fixture.get("restrictedCapture", True) else "complete")
                if actual["information"]["transfers"][-1]["status"] == "complete":
                    node = actual["information"]["interfaces"][0]
                    source_record = actual["records"][0]["id"]
                    before_records = len(actual["records"])
                    for command in [{"type": "information", "command": {"action": "revoke-interface", "interfaceId": node["id"]}}, {"type": "advance", "minutes": 1}, {"type": "information", "command": {"action": "transfer", "interfaceId": node["id"], "recordId": source_record, "role": "supervisor"}}]:
                        client.tool("command", {"command": command})
                    blocked = client.tool("export_exercise")
                    assert blocked["information"]["transfers"][-1]["status"] == "blocked" and len(blocked["records"]) == before_records
                    repair = {"action": "interface", "id": node["id"], **{key: node["desired"][key] for key in ["policyId", "sourceResource", "destinationResource"]}}
                    for command in [{"type": "information", "command": repair}, {"type": "advance", "minutes": 1}, {"type": "information", "command": {"action": "transfer", "interfaceId": node["id"], "recordId": source_record, "role": "supervisor"}}]:
                        client.tool("command", {"command": command})
                    actual = client.tool("export_exercise")
                    assert actual["information"]["transfers"][-1]["status"] == "complete" and len(actual["records"]) == before_records + 1
                    row["recovery"] = "revoked-blocked-reprovisioned-complete"
                inspection = client.tool("inspect")
                assert len(inspection["packs"]["information"]["interfacePolicies"]) == 2
                assert client.tool("inspect") == inspection, "Interface inspection mutated state"
                forged = json.loads(json.dumps(actual))
                forged["records"][0]["classification"] = "public"
                client.tool("import_exercise", {"json": json.dumps(forged)}, error=True)
                assert client.tool("export_exercise") == actual, "Rejected origin tampering changed state"
                forged_policy = json.loads(json.dumps(actual))
                interface = forged_policy["information"]["interfaces"][0]
                wrong_policy = "defence-restricted-handover-v1" if fixture["administration"] else "defence-admin-to-training-v1"
                for configuration in ("desired", "effective"):
                    interface[configuration]["policyId"] = wrong_policy
                client.tool("import_exercise", {"json": json.dumps(forged_policy)}, error=True)
                assert client.tool("export_exercise") == actual, "Rejected interface policy tampering changed state"
                copied = next((record for record in actual["records"] if record.get("interfaceTransfer")), None)
                if copied:
                    parent = next(record for record in actual["records"] if record["id"] == copied["parents"][0])
                    for field, value in [("expiresAt", parent["expiresAt"] + 10000), ("access", copied["access"] + ["admin"])]:
                        forged_copy = json.loads(json.dumps(actual))
                        next(record for record in forged_copy["records"] if record["id"] == copied["id"])[field] = value
                        client.tool("import_exercise", {"json": json.dumps(forged_copy)}, error=True)
                        assert client.tool("export_exercise") == actual, "Rejected copied-record tampering changed state"
                    row["copiedRecordChecks"] = ["parent-retention-bound", "parent-access-bound"]
                client.tool("new_exercise", fixture["options"])
                client.tool("import_exercise", {"json": json.dumps(actual)})
                assert client.tool("export_exercise") == actual, "Interface save restore differs"
                row.update(status="passed", commands=len(fixture["commands"]), checks=["actual-meeting-capture", "explicit-interface", "restricted-classification", "direct-dispatch-equivalence", "inspection-purity", "tamper-rejection", "interface-policy-import-rejection", "save-restore"])
            except Exception as error:
                row.update(status="failed", error=str(error))
            report["results"].append(row)
    finally:
        client.close()


def workforce_offers(report):
    script = """
const {SOC,journey}=require('./tests/lib/workforce-offer-fixture');
const rows=[];
for(const jurisdiction of ['AU','US','JP','EU']){
 const fixture=journey({jurisdiction});let activeState=SOC.create(fixture.options);
 for(const command of fixture.commands){
  if(command.type==='workforce-offers'&&command.command.action==='order'&&command.command.units===0)break;
  activeState=SOC.dispatch(activeState,command);
 }
 rows.push({...fixture,activeState});
}
console.log(JSON.stringify(rows));
"""
    fixtures = json.loads(subprocess.check_output(["node", "-e", script], cwd=ROOT, text=True, timeout=60))
    client = Client("scripts/calls-mcp.js")
    try:
        client.initialize("series-of-calls")
        for fixture in fixtures:
            row = {"server": "workforce-offer", **fixture["options"],
                   "scope": "Synthetic Queueberry forecast coverage, real staffing independence, prepaid billing and import integrity"}
            try:
                client.tool("new_exercise", fixture["options"])
                inspected = client.tool("inspect")
                assert inspected["packs"]["workforceOffers"]["version"] == "soc-workforce-offers-1"
                negative_checks = []
                active_checked = False
                for command in fixture["commands"]:
                    if command["type"] == "workforce-offers" and command["command"]["action"] == "order" and command["command"]["units"] == 0:
                        active = client.tool("export_exercise")
                        assert active == fixture["activeState"], "Active workforce MCP differs from direct dispatch"
                        assert active["workforceOffers"]["effective"]["units"] == 1
                        inspected = client.tool("inspect")
                        assert inspected["observed"]["workforceOffers"]["integration"]["currentTest"]["status"] == "passed"
                        assert client.tool("inspect") == inspected, "Workforce inspection mutated state"
                        for label, invalid in [
                            ("wrong-tenant", {"action": "order", "tenant": "unrelated-customer", "units": 1}),
                            ("wrong-offer-version", {"action": "integrate", "id": "queueberry-wfm-workforce",
                                "tenant": active["workforceOffers"]["tenant"], "offerId": "queueberry-wfm-standard",
                                "offerVersion": "9.9", "resource": "people"}),
                        ]:
                            error = client.tool("command", {"command": {"type": "workforce-offers", "command": invalid}}, error=True)
                            assert "INVALID_WORKFORCE_OFFER" in error, label + " failed outside the offer validator"
                            assert client.tool("export_exercise") == active, label + " rejection mutated state"
                            negative_checks.append(label)
                        for label in ("deferred-renewal", "future-observation", "future-test", "pre-test-binding", "changed-ledger-amount", "deleted-ledger-row"):
                            forged = json.loads(json.dumps(active))
                            pack = forged["workforceOffers"]
                            if label == "deferred-renewal":
                                pack["nextInvoiceAt"] = forged["clock"] + 999
                            elif label == "future-observation":
                                pack["integration"]["observations"][0]["observedAt"] = forged["clock"] + 1
                            elif label == "future-test":
                                pack["integration"]["tests"][-1]["testedAt"] = forged["clock"] + 1
                            elif label == "pre-test-binding":
                                pack["integration"]["bindings"][0]["boundAt"] = 0
                            else:
                                invoice_id = pack["costRecords"][0]["id"]
                                entry = next(entry for entry in forged["business"]["ledger"] if entry.get("externalId") == invoice_id)
                                if label == "changed-ledger-amount":
                                    entry["cents"] += 1
                                else:
                                    forged["business"]["ledger"].remove(entry)
                            error = client.tool("import_exercise", {"json": json.dumps(forged)}, error=True)
                            assert "INVALID_WORKFORCE_OFFER" in error, label + " failed outside the workforce save validator"
                            assert client.tool("export_exercise") == active, label + " rejected import replaced state"
                            negative_checks.append(label)
                        active_checked = True
                    client.tool("command", {"command": command})
                assert active_checked, "Fixture did not reach its live billing checkpoint"
                actual = client.tool("export_exercise")
                assert actual == fixture["expectedState"], "Workforce journey MCP differs from direct dispatch"
                pack = actual["workforceOffers"]
                assert [test["status"] for test in pack["integration"]["tests"]] == ["failed", "passed"]
                assert pack["integration"]["forecasts"][0]["coveredPeople"] == ["agent-01"]
                assert pack["integration"]["forecasts"][0]["projectedCapacity"] == 15
                assert actual["workforceOps"]["forecasts"][0]["projectedCapacity"] == 30
                calls = [call for call in actual["interactions"] if call["caseId"] in ("wfm-first", "wfm-second")]
                assert len(calls) == 2 and all(call["phase"] == "resolved" for call in calls)
                assert {assignment["person"] for assignment in actual["workforceOps"]["assignments"]} == {"agent-01", "agent-02"}
                assert pack["effective"]["units"] == 0 and pack["nextInvoiceAt"] is None
                assert len(pack["costRecords"]) == 2 and all(invoice["cents"] == 4200 and invoice["periodMinutes"] == 60 for invoice in pack["costRecords"])
                inspected = client.tool("inspect")
                assert client.tool("inspect") == inspected, "Cancelled workforce inspection mutated state"
                client.tool("new_exercise", fixture["options"])
                client.tool("import_exercise", {"json": json.dumps(actual)})
                assert client.tool("export_exercise") == actual, "Workforce save restore differs"
                row.update(status="passed", commands=len(fixture["commands"]), rejectedMutations=negative_checks,
                           checks=["failed-supplier-observation", "failed-integration-test", "explicit-observation-retest-rebind",
                                   "named-person-forecast-coverage", "independent-real-call-staffing", "one-prepaid-renewal",
                                   "paid-boundary-cancellation", "direct-dispatch-equivalence", "inspection-purity",
                                   "command-atomicity", "chronology-import-atomicity", "ledger-import-atomicity", "save-restore"])
            except Exception as error:
                row.update(status="failed", error=str(error))
            report["results"].append(row)
    finally:
        client.close()


def completion_packs(report):
    client = Client("scripts/calls-mcp.js")
    row = {"server": "communications-customer-attendance-callback", "status": "running"}
    try:
        client.initialize("series-of-calls")
        client.tool("new_exercise", {"jurisdiction": "JP"})
        def command(value):
            return client.tool("command", {"command": value})
        def pack(kind, action, **fields):
            return command({"type": kind, "command": {"action": action, **fields}})
        pack("customer-needs", "start")
        for segment in ("smb", "enterprise", "government", "defence"):
            pack("customer-needs", "select", id=segment+"-profile", segment=segment)
        assert all(p["effective"] is None for p in client.tool("export_exercise")["customerNeeds"]["profiles"])
        command({"type": "configure", "id": "people", "config": {"people": 1}})
        command({"type": "advance", "minutes": 1})
        pack("workforce", "start")
        pack("channels", "start")
        command({"type": "advance", "minutes": 1})
        pack("workforce", "presence", person="agent-01", state="away")
        pack("channels", "webhook-configure", config={"enabled": True, "rateLimit": 2, "retries": 2, "backoff": 1})
        command({"type": "advance", "minutes": 1})
        pack("channels", "webhook-observe", authenticated=True, applicationAvailable=False, supplierAvailable=True)
        saved = client.tool("export_exercise")
        assert saved["workforceOps"]["actualPresence"]["agent-01"] == "away"
        assert saved["channels"]["webhooks"]["effective"]["enabled"]
        assert not saved["channels"]["webhooks"]["observed"]["applicationAvailable"]
        assert all(p["effective"]["geography"]["jurisdictions"] == ["JP"] for p in saved["customerNeeds"]["profiles"])
        assert "business" not in saved, "Customer planning must not fabricate procurement approval"
        client.tool("new_exercise")
        client.tool("import_exercise", {"json": json.dumps(saved)})
        assert client.tool("export_exercise") == saved
        row.update(status="passed", checks=["customer-profile-provisioning", "jurisdiction-seeds", "attendance-command", "callback-policy-and-observation", "save-restore"])
    except Exception as error:
        row.update(status="failed", error=str(error))
    finally:
        client.close()
        report["results"].append(row)



def pack_smoke(report):
    client = Client("scripts/calls-mcp.js")
    row = {"server": "communications-packs", "scope": "Speech discovery/prerequisites and live shared allowance usage; not full speech-model acceptance"}
    try:
        client.initialize("series-of-calls")
        client.tool("new_exercise", {"scenario": "enterprise"})
        initial = client.tool("inspect")
        assert initial["packs"]["speechModels"]["version"] == "soc-speech-models-1"
        client.tool("command", {"command": {"type": "speech-models", "command": {"action": "start"}}}, error=True)
        assert client.tool("inspect") == initial, "Rejected pack prerequisite mutated state"
        for pack in ("products", "information", "speech-models", "business"):
            client.tool("command", {"command": {"type": pack, "command": {"action": "start"}}})
        for command in (
            {"action": "allowancePool", "id": "voice-pool", "customer": "customer", "owner": "orchard-msp", "currency": "AUD", "unit": "minute", "periodMinutes": 60, "allowance": 8},
            {"action": "order", "offer": "workplace", "quantity": 2, "unit": "seat", "currency": "AUD", "resources": ["phone"], "sell": True, "allowancePool": "voice-pool"},
        ):
            client.tool("command", {"command": {"type": "business", "command": command}})
        client.tool("command", {"command": {"type": "advance", "minutes": 2}})
        client.tool("command", {"command": {"type": "interact", "channel": "voice", "from": "alex", "to": "+61255500201", "caseId": "pack-usage"}})
        client.tool("command", {"command": {"type": "advance", "minutes": 2}})
        saved = client.tool("export_exercise")
        assert saved["business"]["contracts"][0]["usage"] == 2
        assert saved["business"]["allowancePools"][0]["consumed"] == 2
        client.tool("import_exercise", {"json": json.dumps(saved)})
        assert client.tool("export_exercise") == saved
        row.update(status="passed", checks=["speech-discovery", "prerequisite-atomicity", "shared-allowance-voice-usage", "save-restore"])
    except Exception as error:
        row.update(status="failed", error=str(error))
    finally:
        client.close()
        report["results"].append(row)


def sp(report):
    client = Client("scripts/mcp.js", timeout=30)
    try:
        names = client.initialize("series-of-calls-sp")
        assert {"act", "advance", "status", "export_save", "load_save", "schema", "screen"} <= names
        states = []
        for attempt in range(2):
            client.tool("new_game", {"city": "fra", "name": "Synthetic MCP check", "seed": 7})
            client.tool("act", {"action": "launchBB", "args": {"city": "fra"}})
            client.tool("act", {"action": "buyTransit", "args": {"city": "fra", "net": "cog", "tier": 1}})
            quote = client.tool("act", {"action": "buyIx", "args": {"city": "fra", "tier": 1}})
            button = next(b for b in quote["screen"]["buttons"] if b["act"] == "dkAccept")
            client.tool("advance", {"days": 1}, error=True)
            client.tool("click", {"button": button["n"]})
            advance = client.tool("advance", {"days": 30})
            assert advance["daysRun"] == 30
            status = client.tool("status")
            assert status["day"] == 30
            states.append(status)
        assert states[0] == states[1], "SP seeded replay differs"
        client.tool("act", {"action": "slotDelGo"}, error=True)
        assert client.tool("status") == states[1], "Rejected SP action mutated state"
        # Inline export avoids writing a save outside the explicit report directory.
        exported = client.tool("export_save")
        client.tool("new_game", {"city": "nyc"})
        client.tool("load_save", {"json": exported if isinstance(exported, str) else json.dumps(exported)})
        restored = client.tool("status")
        assert restored == states[1], "SP import changed status: " + json.dumps({k: {"before": states[1].get(k), "after": restored.get(k)} for k in set(states[1]) | set(restored) if states[1].get(k) != restored.get(k)})
        report["results"].append({"server": "sp", "status": "passed", "checks": ["stdio",
            "schema-discovery", "purchase", "quote-click", "modal-time-rejection", "advance",
            "seeded-replay", "forbidden-action", "save-restore"]})
    finally:
        client.close()


def customer_fit(report):
    client = Client("scripts/calls-mcp.js")
    row = {"server": "customer-fit-renewal", "scope": "Explicit customer profile binding, measured capacity shortfall and delayed repair through actual stdio"}
    try:
        client.initialize("series-of-calls")
        client.tool("new_exercise", {"scenario": "smb", "jurisdiction": "AU", "mode": "guided"})
        for command in fixture_matrix()[0]["commands"]:
            client.tool("command", {"command": command})
        def dispatch(kind, action, **fields):
            return client.tool("command", {"command": {"type": kind, "command": {"action": action, **fields}}})
        def advance(minutes):
            return client.tool("command", {"command": {"type": "advance", "minutes": minutes}})
        dispatch("business", "start")
        dispatch("customer-needs", "start")
        dispatch("customer-needs", "select", id="mcp-needs", segment="smb")
        scale = {"employees": 35, "sites": 1, "seats": 0, "agents": 2, "rooms": 0}
        dispatch("customer-needs", "configure", id="mcp-needs", section="scale", value=scale)
        advance(1)
        dispatch("business", "order", offer="contact", quantity=2, unit="agent", currency="AUD",
                 resources=["service", "people"], sell=True, customerProfile="mcp-needs")
        advance(180)
        saved = client.tool("export_exercise")
        contract = saved["business"]["contracts"][0]
        assert contract["status"] == "renewal"
        dispatch("customer-needs", "configure", id="mcp-needs", section="scale", value={**scale, "agents": 3})
        advance(1)
        before = client.tool("export_exercise")
        renewal = {"type": "business", "command": {"action": "renew", "contract": contract["id"]}}
        error = client.tool("command", {"command": renewal}, error=True)
        assert "CUSTOMER_FIT_RENEWAL_BLOCKED" in error
        assert client.tool("export_exercise") == before
        dispatch("customer-needs", "configure", id="mcp-needs", section="scale", value=scale)
        client.tool("command", {"command": renewal}, error=True)
        advance(1)
        client.tool("command", {"command": renewal})
        advance(1)
        repaired = client.tool("export_exercise")
        assert repaired["business"]["contracts"][0]["status"] == "active"
        assert repaired["business"]["contracts"][0]["billedRetail"] == contract["billedRetail"]
        client.tool("import_exercise", {"json": json.dumps(repaired)})
        assert client.tool("export_exercise") == repaired
        row.update(status="passed", checks=["explicit-profile-binding", "capacity-shortfall", "rejected-renewal-atomicity", "desired-is-not-effective", "repair-renewal", "invoice-preservation", "save-restore"])
    except Exception as error:
        row.update(status="failed", error=str(error))
    finally:
        client.close()
    report["results"].append(row)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "evidence/deployment-review/mcp-smoke.json")
    parser.add_argument("--campaigns", action="store_true", help="Also execute all four campaign tracks through renewal in every jurisdiction and mode")
    args = parser.parse_args()
    report = {"checkedAt": datetime.now(timezone.utc).isoformat(), "status": "running", "results": [],
        "scope": "Real stdio MCP: 48 compact scenario/profile/mode references, SP play, pack checks, defence interfaces and four workforce-offer journeys. Not full campaign/source or browser acceptance.",
        "dependencyOverride": os.environ.get("NODE_PATH"), "inputs": {}}
    files = [p for folder in ("src", "scripts/lib", "content") for p in (ROOT / folder).rglob("*") if p.is_file()]
    files += [ROOT / p for p in ("scripts/calls-mcp.js", "scripts/mcp.js", "scripts/mcp-smoke.py", "tests/lib/information-interface-fixture.js", "tests/lib/workforce-offer-fixture.js", "package.json", "package-lock.json")]
    report["inputs"] = {str(p.relative_to(ROOT)): digest(p) for p in sorted(files)}
    try:
        report["nodeVersion"] = subprocess.check_output(["node", "--version"], text=True).strip()
        report["jsdomVersion"] = subprocess.check_output(["node", "-p", "require('jsdom/package.json').version"], cwd=ROOT, text=True, stderr=subprocess.PIPE).strip()
        communications(report)
        sp(report)
        pack_smoke(report)
        completion_packs(report)
        customer_fit(report)
        information_interfaces(report)
        workforce_offers(report)
        if args.campaigns:
            full_campaigns(report)
            report["scope"] = "Real stdio MCP: compact references, SP, pack checks, defence interfaces, workforce-offer journeys and four-track procurement-to-renewal campaigns in every jurisdiction/mode. Not browser acceptance or full source fidelity."
        assert all(digest(ROOT / p) == h for p, h in report["inputs"].items()), "Inputs changed during execution"
        assert len(report["results"]) == (80 if args.campaigns else 68), "Incomplete smoke matrix"
        report["status"] = "passed" if all(row["status"] == "passed" for row in report["results"]) else "failed"
    except Exception as error:
        report.update(status="failed", error=str(error))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({"status": report["status"], "cases": len(report["results"]), "report": str(args.output), "error": report.get("error")}))
    return 0 if report["status"] == "passed" else 1


if __name__ == "__main__":
    raise SystemExit(main())
