#!/usr/bin/env python3
"""Actual stdio MCP provider journeys; gameplay API evidence, separate from browser play."""
import argparse, hashlib, importlib.util, json, subprocess
from pathlib import Path
from datetime import datetime, timezone
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('mcp_smoke', ROOT / 'scripts/mcp-smoke.py')
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def journey(scenario, plan):
    client = helper.Client('scripts/calls-mcp.js', timeout=30)
    state = None
    def send(command):
        nonlocal state
        state = client.tool('command', {'command': command})['state']
    def intent(command):
        send({'type': 'provider', 'command': command})
    def tick():
        send({'type': 'advance', 'minutes': 1})
    def purchase(command):
        q = client.tool('provider_quote', {'request': command})
        assert not q['blockers'], (scenario, command, q['blockers'])
        intent({**command, 'quoteRevision': q['atRevision']})
    def operation(operation_id):
        command = {'action': 'operation', 'operationId': operation_id, 'customerId': 'starter-customer'}
        for _ in range(80):
            q = client.tool('provider_quote', {'request': command})
            if not q['blockers']:
                purchase(command)
                return
            assert all(b in ['ENGINEER_CAPACITY', 'SUPPORT_CAPACITY'] or b.startswith('OPERATION_REQUIREMENT_') for b in q['blockers']), q['blockers']
            tick()
        raise AssertionError('Operation remained unavailable: ' + operation_id)
    try:
        client.initialize('series-of-calls')
        client.tool('new_provider_campaign', {'scenario': scenario, 'seed': 77, 'market': 'au-sydney'})
        state = client.tool('export_exercise')
        original = json.dumps(state, sort_keys=True)
        rejected = client.tool('command', {'command': {'type': 'fault', 'id': 'carrier', 'fault': 'OUTAGE'}}, error=True)
        assert 'CAMPAIGN_AUTHORING_FORBIDDEN' in rejected
        assert json.dumps(client.tool('export_exercise'), sort_keys=True) == original
        purchase({'action': 'purchase', 'offerId': 'starter', 'planId': plan, 'stage': 'base'})
        if scenario == 'enterprise': operation('room')
        if scenario == 'government': operation('recording')
        for stage in ['carrier', 'partner']:
            purchase({'action': 'purchase', 'offerId': 'starter', 'planId': plan, 'stage': stage, 'customerId': 'starter-customer'})
        for _ in range(3): tick()
        if scenario == 'enterprise':
            operation('recording'); operation('bpo'); operation('migration')
        elif scenario == 'government':
            operation('transcription'); operation('compliance')
        elif scenario == 'defence':
            operation('bpo'); operation('local-deployment'); operation('room'); operation('recording')
        while state['clock'] < 180:
            incident = next((i for i in state['providerCampaign']['incidents'] if i['status'] == 'active'), None)
            if incident:
                if scenario == 'defence':
                    for _ in range(25):
                        if any(i['phase'] == 'resolved' and i.get('providerContext', {}).get('connected') is False for i in state['portfolio']['customers'][0]['root']['interactions']): break
                        tick()
                    assert any(i['phase'] == 'resolved' and i.get('providerContext', {}).get('connected') is False for i in state['portfolio']['customers'][0]['root']['interactions'])
                intent({'action': 'acknowledge-incident', 'incidentId': incident['id']})
                operation('repair')
                if scenario == 'defence':
                    for _ in range(12):
                        if state['portfolio']['customers'][0]['root']['connected']: break
                        tick()
                    assert state['portfolio']['customers'][0]['root']['connected'], 'repair must actually reconnect before synchronization'
                    operation('sync-all')
            tick()
        periods = [h for h in state['providerCampaign']['periodHistory'] if h['qualified']][-2:]
        assert len(periods) == 2 and all(h['due'] == 24 and h['completedOnTime'] >= 22 and h['operatingResult'] > 0 for h in periods)
        purchase({'action': 'purchase', 'offerId': 'next-1', 'planId': plan, 'stage': 'base'})
        assert state['providerCampaign']['missionStatus'] == 'won'
        saved = client.tool('export_exercise')
        client.tool('import_exercise', {'json': json.dumps(saved)})
        assert client.tool('export_exercise') == saved
        return {'scenario': scenario, 'plan': plan, 'status': 'passed', 'clock': state['clock'], 'cashCents': state['business']['balance']['cash'], 'periods': periods, 'customers': len(state['providerCampaign']['customers']), 'requests': client.sequence, 'authorityRejection': True, 'saveRoundtrip': True}
    finally:
        client.close()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=Path('/tmp/soc-provider-stdio.json'))
    args = parser.parse_args()
    files = [p for folder in ['src', 'content'] for p in (ROOT / folder).rglob('*') if p.is_file()]
    files += [ROOT / p for p in ['scripts/provider-stdio-smoke.py', 'scripts/calls-mcp.js', 'scripts/mcp-smoke.py', 'package-lock.json']]
    hashes = {str(p.relative_to(ROOT)): digest(p) for p in sorted(files)}
    report = {'startedAt': datetime.now(timezone.utc).isoformat(), 'sourceCommit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(), 'inputs': hashes, 'scope': 'Actual stdio MCP provider API: two SMB strategies and three distinct segment missions. Not visible UI or full source acceptance.', 'results': [], 'status': 'running'}
    try:
        for scenario, plan in [('smb', 'swift'), ('smb', 'steady'), ('enterprise', 'swift'), ('government', 'swift'), ('defence', 'swift')]:
            report['results'].append(journey(scenario, plan))
        report['sourceDrift'] = [p for p, h in hashes.items() if digest(ROOT / p) != h]
        assert not report['sourceDrift'], report['sourceDrift']
        report['status'] = 'passed'
    except Exception as error:
        report['status'] = 'failed'; report['error'] = str(error)
    report['finishedAt'] = datetime.now(timezone.utc).isoformat()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'status': report['status'], 'journeys': len(report['results']), 'output': str(args.output), 'error': report.get('error')}))
    return 0 if report['status'] == 'passed' else 1

if __name__ == '__main__':
    raise SystemExit(main())
