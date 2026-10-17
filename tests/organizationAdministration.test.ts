import assert from "node:assert/strict";
import test from "node:test";
import { PLATFORM_ACCESS_PROFILES, canonicalAccessProfile, describePlatformAccessProfile, accessProfileRank } from "../web/src/shared/platformUsers.js";
import { planCompanyLimitValid } from "../web/src/domain/organizationAdministration.js";
import { evaluateRouteAccess, normalizeMembershipRole } from "../web/src/shared/access.js";
test("quatro perfis e Admin legado convergente preservam autoridade explícita", () => {
  assert.deepEqual(PLATFORM_ACCESS_PROFILES,["super_admin","owner","recruiter","member"]);
  assert.equal(canonicalAccessProfile("admin"),"recruiter");
  assert.equal(normalizeMembershipRole("admin"),"recruiter");
  assert.equal(normalizeMembershipRole("unknown"),null);
  assert.equal(describePlatformAccessProfile("member"),"Usuário comum");
  assert.equal(describePlatformAccessProfile("admin"),"Recruiter");
  assert.equal(accessProfileRank("recruiter"),accessProfileRank("admin"));
  assert.ok(accessProfileRank("recruiter")<accessProfileRank("owner"));
});
test("limites explícitos distinguem plano e quantidade contratada", () => {
  for(const plan of ["essential","essential_plus"] as const){assert.equal(planCompanyLimitValid(plan,1),true);assert.equal(planCompanyLimitValid(plan,2),false);}
  assert.equal(planCompanyLimitValid("professional",5),true);
  assert.equal(planCompanyLimitValid("professional",6),false);
  assert.equal(planCompanyLimitValid("enterprise",12),true);
  for(const limit of [0,-1,1.5,NaN,Infinity,100001])assert.equal(planCompanyLimitValid("enterprise",limit),false);
});
test("administração pode recuperar empresa inativa sem conceder operação ao usuário comum",()=>{
  const rule={requiresMembership:false,allowedRoles:["super_admin","owner","recruiter"] as const};
  for(const operatorProfile of ["super_admin","owner","recruiter"] as const){
    const state={isAuthenticated:true,operatorProfile,memberships:[],activeOrganizationId:null};
    assert.equal(evaluateRouteAccess(state,rule).allowed,true);
    assert.equal(evaluateRouteAccess(state,{...rule,requiresMembership:true}).allowed,false);
  }
  assert.equal(evaluateRouteAccess({isAuthenticated:true,operatorProfile:"member",memberships:[],activeOrganizationId:null},rule).allowed,false);
});
