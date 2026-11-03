#!/usr/bin/env python3
"""Fail closed; repository flags alone cannot assert an enforced provider limit."""
import datetime,json,os,pathlib,urllib.request
ROOT=pathlib.Path(__file__).resolve().parents[1]
c=json.loads((ROOT/'maintenance/agent.json').read_text())
if not c['enabled']:raise SystemExit('Adaptation execution disabled: '+c['reasonDisabled'])
if c['monthlyLimitUSD']!=25 or c['maxAttempts']!=1 or c['maxMinutes']>20:raise SystemExit('Owner-reviewed governance change required')
if not all(c.get(k) for k in ['projectId','hardLimitVerifiedAt','hardLimitEvidence','model','cliVersion']):raise SystemExit('Incomplete owner-reviewed agent setup')
if not os.environ.get('SOC_OPENAI_API_KEY'):raise SystemExit('Dedicated project credential unavailable')
# A trusted preflight job must provide a current provider response; the generation job gets no admin credential.
receipt=json.loads(os.environ.get('SOC_LIMIT_RECEIPT','{}'))
if receipt.get('projectId')!=c['projectId'] or receipt.get('monthlyUSD')!=25 or receipt.get('enforced') is not True:raise SystemExit('No verified enforced project spend limit')
checked=datetime.datetime.fromisoformat(receipt['checkedAt'].replace('Z','+00:00'))
if not 0<=(datetime.datetime.now(datetime.timezone.utc)-checked).total_seconds()<3600:raise SystemExit('Provider spend-limit receipt expired')
print('Agent readiness verified')
