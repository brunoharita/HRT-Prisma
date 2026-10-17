import assert from 'node:assert/strict';import test from 'node:test';
import {decodeOwnerOnboarding,OWNER_ONBOARDING_CONTRACT,ownerOnboardingPath} from '../web/src/domain/ownerOnboarding.js';
const value={contract:OWNER_ONBOARDING_CONTRACT,username:'hrtsolutions.owner',profile:'owner',group:{id:'group-a',name:'HRT Solutions'},company:{id:'company-a',name:'Primeira empresa'}};
test('Owner context preserves authoritative fields and a reloadable origin path',()=>{assert.equal(decodeOwnerOnboarding(value,'group-a').username,'hrtsolutions.owner');assert.equal(ownerOnboardingPath('group-a'),'/organizations/group-a/owner/new');});
test('Owner context refuses unknown, partial or different group data',()=>{for(const invalid of [null,{}, {...value,contract:'unknown'},{...value,profile:'recruiter'},{...value,group:{id:'group-b',name:'Other'}},{...value,company:null}])assert.throws(()=>decodeOwnerOnboarding(invalid,'group-a'),/contexto/);});
