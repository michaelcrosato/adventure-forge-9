
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { basename, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { SCENARIO } from "../engine/content.ts";
import { CAMPAIGN_CERTIFICATE_CONFIG, CAMPAIGN_RESOURCE_BOUNDS, currentCampaignCertificateBindings, campaignCertificateRoot } from "../verification/campaign-certificate.ts";
import { SymbolicModel } from "../verification/symbolic-model.ts";
import { verifyFactorizedComponent, FACTORIZED_SYMBOLIC_CERTIFICATE_SCHEMA } from "../verification/symbolic-factorized-certificates.ts";
import { certificateDescriptor } from "../verification/symbolic-certificates.ts";
import { writeForestArtifact, readForestArtifact, readBoundedBytes, parseJsonBytes, validateForestArtifact } from "../verification/certificate-files.ts";

// This untrusted Node producer intentionally uses checked runtime field layouts
// for projection lifting. It is not part of the engine or the trusted verifier.
// Every emitted candidate still requires fresh original-relational verification.
const {values}=parseArgs({options:{
  output:{type:"string"},
  "scene-candidates":{type:"string"},
  "fixtures-only":{type:"boolean",default:false},
}});
const fixturesOnly=values["fixtures-only"];
assert(fixturesOnly||values.output,"Use --output NEW_DIRECTORY, optionally --scene-candidates DIRECTORY, or --fixtures-only");
const directory=values.output===undefined?undefined:resolve(values.output);
const self=fileURLToPath(import.meta.url);
const hash=bytes=>createHash("sha256").update(bytes).digest("hex");
const selfHash=hash(readFileSync(self));
const bindings=fixturesOnly?undefined:currentCampaignCertificateBindings();
const policy={nodeLimit:2_000_000,cacheLimit:500_000,roundLimit:128,minimumCopyAt:750_000,allocationInterval:250_000,generationMs:120_000,verificationMs:120_000,coneCompactAt:1_250_000};
const limits={maxNodes:8_000_000,maxJsonBytes:128*1024*1024,maxCompressedBytes:32*1024*1024};
const save=(name,value)=>writeFileSync(join(directory,name),JSON.stringify(value)+"\n",{flag:"wx",mode:0o600});
const event=value=>process.stdout.write(JSON.stringify(value)+"\n");

function projectScenario(scenario,resources) {
  for(const resource of resources)assert(Object.hasOwn(scenario.initialResources,resource),"Unknown retained resource");
  const controlFlags=new Set(scenario.choices.flatMap(choice=>(choice.when??[]).filter(condition=>condition.type==="flag").map(condition=>condition.flag)));
  const clocks=new Map((scenario.clocks??[]).map(clock=>[clock.id,clock]));
  const conditions=value=>value===undefined?undefined:value.filter(condition=>{
    switch(condition.type) {
      case "flag": return true;
      case "resourceAtLeast": case "resourceAtMost": return resources.has(condition.resource);
      default: throw new Error("Unsupported projection condition");
    }
  });
  for(const scene of scenario.scenes)for(const line of scene.text)conditions(line.when);
  const effects=values=>values.filter(effect=>{
    switch(effect.type) {
      case "setFlag": return controlFlags.has(effect.flag);
      case "goTo": case "addFact": return true;
      case "setResource": case "adjustResource": return resources.has(effect.resource);
      case "advanceClock": assert(clocks.has(effect.clock),"Unknown projection clock");return resources.has(clocks.get(effect.clock).resource);
      default: throw new Error("Unsupported projection effect");
    }
  });
  return {
    ...scenario,
    initialResources:Object.fromEntries(Object.entries(scenario.initialResources).filter(([name])=>resources.has(name))),
    clocks:[...clocks.values()].filter(clock=>resources.has(clock.resource)),
    scenes:scenario.scenes.map(scene=>({...scene,text:[{text:"Abstract control projection."}]})),
    choices:scenario.choices.map(choice=>({...choice,...(choice.when===undefined?{}:{when:conditions(choice.when)}),effects:effects(choice.effects)})),
  };
}

function forward(model,{roundLimit=128,minimumCopyAt=750_000,allocationInterval=250_000,check=()=>{},observe=()=>{}}={}) {
  let owner=model,reached=owner.initial,copies=0;
  let threshold=Math.max(minimumCopyAt,owner.bdd.stats().nodes+allocationInterval);
  const compact=(round,choiceId)=>{
    const previousNodes=owner.bdd.stats().nodes;
    assert.equal(owner.bdd.exists(reached,owner.nextVariables),reached,"Projected reached root must be current-only");
    const fresh=owner.fresh();
    assert.notEqual(fresh,owner);
    assert.notEqual(fresh.bdd,owner.bdd);
    assert.deepEqual(fresh.scenario,owner.scenario);
    assert.deepEqual(fresh.fieldOrder,owner.fieldOrder);
    assert.deepEqual(fresh.currentVariables,owner.currentVariables);
    assert.deepEqual(fresh.nextVariables,owner.nextVariables);
    const roots=owner.bdd.copyForestTo(fresh.bdd,[reached,owner.initial,owner.validDomain,owner.playing,owner.completed]);
    assert.deepEqual(roots.slice(1),[fresh.initial,fresh.validDomain,fresh.playing,fresh.completed],"Projected anchors changed at handoff");
    owner=fresh;reached=roots[0];copies++;
    threshold=Math.max(minimumCopyAt,owner.bdd.stats().nodes+allocationInterval);
    observe({phase:"projection-compact",round,choiceId,nodes:owner.bdd.stats().nodes,previousNodes,copies});
    check();
  };
  for(let round=1;round<=roundLimit;round++) {
    let changed=false;
    for(let i=0;i<owner.choices.length;i++) {
      check();
      const choice=owner.choices[i];
      if(choice.terminal)continue;
      const previousNodes=owner.bdd.stats().nodes;
      const successor=owner.bdd.and(owner.playing,owner.image(reached,choice));
      assert.equal(owner.bdd.exists(successor,owner.nextVariables),successor,"Projected successor must be current-only");
      const updated=owner.bdd.or(reached,successor);
      changed=changed||updated!==reached;
      reached=updated;
      const nodes=owner.bdd.stats().nodes;
      if(nodes>=threshold&&nodes>previousNodes)compact(round,choice.id);
      check();
    }
    observe({phase:"projection-round",round,nodes:owner.bdd.stats().nodes,fixed:!changed,copies});
    if(!changed)return {model:owner,reached,rounds:round,copies};
    compact(round);
  }
  throw new Error("Projected forward closure exceeded round limit");
}

function lift(source,root,target) {
  assert.equal(source.bdd.exists(root,source.nextVariables),root,"Only current roots may be lifted");
  assert.deepEqual(source.scenes,target.scenes,"Projected scene encoding changed");
  assert.deepEqual(source.endings,target.endings,"Projected ending encoding changed");
  assert(source.flags.every(flag=>target.flags.includes(flag)),"Projected flag catalog is not a subset");
  const variables=new Map();
  for(const name of source.fieldOrder) {
    const from=source.fields.get(name),to=target.fields.get(name);
    assert(from&&to,"Missing projected field");
    assert.equal(from.maximum,to.maximum,"Projected field bounds differ");
    assert.equal(from.current.length,to.current.length,"Projected field width differs");
    for(let i=0;i<from.current.length;i++)variables.set(from.current[i],to.current[i]);
  }
  let previous=-1;
  for(const variable of [...variables.keys()].sort((a,b)=>a-b)) {
    assert(variables.get(variable)>previous,"Lift must preserve ordered variable semantics");
    previous=variables.get(variable);
  }
  const forest=source.bdd.exportForest([root]);
  const mapped={...forest,variableCount:target.variableCount,nodes:forest.nodes.map(([variable,low,high])=>{
    assert(variables.has(variable),"Unmapped or next-phase projected variable");
    return [variables.get(variable),low,high];
  })};
  return {root:target.bdd.importForest(mapped)[0],variables};
}

function fixture(unsafe=false) {
  return {
    version:1,initialScene:"hub",initialResources:{cash:unsafe?1:0,risk:0},initialFacts:[],clocks:[],
    scenes:[{id:"hub",title:"Hub",text:[{text:"The resource projection fixture."},{text:"A cosmetic mark.",when:[{type:"flag",flag:"cosmetic",value:true}]}]}],
    choices:[
      {id:"gain",scene:"hub",label:"Gain",description:"Advance bounded risk.",
        when:unsafe?[]:[{type:"resourceAtLeast",resource:"cash",value:1},{type:"flag",flag:"earned",value:false}],
        effects:[{type:"adjustResource",resource:"risk",delta:1},{type:"setFlag",flag:"earned",value:true},{type:"setFlag",flag:"cosmetic",value:true},{type:"goTo",scene:"hub"}]},
      {id:"finish",scene:"hub",label:"Finish",description:"Finish the fixture.",effects:[],outcome:{status:"completed",summary:"The fixture is complete."}},
    ],
  };
}

function fixtures() {
  let cases=0;
  for(const order of ["interleaved","blocked"]) {
    const original=fixture();
    const opts={nodeLimit:30_000,cacheLimit:1,order,transitionMode:"relational"};
    const full=new SymbolicModel(original,{cash:1,risk:2},opts);
    const abstract=new SymbolicModel(projectScenario(original,new Set(["risk"])),{risk:2},{...opts,transitionMode:"partitioned"});
    const result=forward(abstract,{roundLimit:16,minimumCopyAt:1,allocationInterval:1});
    assert(full.flags.includes("cosmetic")&&!result.model.flags.includes("cosmetic"),"Text-only flag was not projected away");
    assert.equal(result.model.bdd.and(result.reached,result.model.playing),result.reached,"Projection retained terminal states");
    const mapped=lift(result.model,result.reached,full);
    assert(full.currentVariables.length<=16);
    for(let mask=0;mask<2**full.currentVariables.length;mask++) {
      const assignment=Array(full.variableCount).fill(false);
      full.currentVariables.forEach((variable,index)=>assignment[variable]=Boolean(mask&(2**index)));
      const projected=Array(result.model.variableCount).fill(false);
      for(const [from,to]of mapped.variables)projected[from]=assignment[to];
      assert.equal(full.bdd.evaluate(mapped.root,assignment),result.model.bdd.evaluate(result.reached,projected),"Lift changed the complete raw truth table");
    }
    const bad=full.bdd.and(full.playing,full.bdd.and(full.validDomain,full.bdd.not(mapped.root)));
    const forest=full.bdd.exportForest([bad]);
    const originalSeed=full.choices.find(choice=>choice.id==="gain").boundExit;
    assert.notEqual(originalSeed,0,"Fixture must exercise a real original bound-exit seed");
    verifyFactorizedComponent(full,originalSeed,forest,{label:"bound-exit:gain",coneCompactAt:1});
    cases++;
    const badScenario=fixture(true);
    const unsafeFull=new SymbolicModel(badScenario,{cash:1,risk:2},opts);
    const unsafeAbstract=new SymbolicModel(projectScenario(badScenario,new Set(["risk"])),{risk:2},{...opts,transitionMode:"partitioned"});
    const unsafeResult=forward(unsafeAbstract,{roundLimit:16,minimumCopyAt:1,allocationInterval:1});
    const unsafeLift=lift(unsafeResult.model,unsafeResult.reached,unsafeFull);
    const unsafeBad=unsafeFull.bdd.and(unsafeFull.playing,unsafeFull.bdd.and(unsafeFull.validDomain,unsafeFull.bdd.not(unsafeLift.root)));
    assert.throws(()=>verifyFactorizedComponent(unsafeFull,unsafeFull.choices.find(choice=>choice.id==="gain").boundExit,unsafeFull.bdd.exportForest([unsafeBad]),{label:"unsafe",coneCompactAt:1}),error=>/seed|initial/i.test(String(error)));
    cases++;
    const wrong=new SymbolicModel(original,{cash:1,risk:3},opts);
    assert.throws(()=>lift(result.model,result.reached,wrong),/bounds differ/);
    cases++;
  }
  const unsupported={...fixture(),choices:[{...fixture().choices[0],effects:[{type:"unknown"}]}]};
  assert.throws(()=>projectScenario(unsupported,new Set(["risk"])),/Unsupported projection effect/);
  cases++;
  return cases;
}


const started=performance.now();
if(fixturesOnly) {
  event({type:"fixtures-passed",cases:fixtures(),elapsedMs:performance.now()-started});
} else {
mkdirSync(directory,{mode:0o700});
const totalLimitMs=600_000;
const parentDirectory=resolve(values["scene-candidates"]??join(campaignCertificateRoot(),"certificates/campaign"));
const projectionDirectory=join(directory,"projections");
const projections=[],forests=[],candidateDetails=[],parentFiles=[];
let phase="fixtures",activeResource=null,lastProgress=null;
const checkAll=()=>assert(performance.now()-started<=totalLimitMs,"Projected catalog checked time limit exceeded");
const metadata=path=>{
  const bytes=readBoundedBytes(path,4*1024*1024);
  parentFiles.push({path,sha256:hash(bytes)});
  return parseJsonBytes(bytes);
};
const recheck=()=>{
  assert.deepEqual(currentCampaignCertificateBindings(),bindings,"Original source changed during candidate assembly");
  assert.equal(hash(readFileSync(self)),selfHash,"Assembler changed during execution");
  for(const file of parentFiles)assert.equal(hash(readBoundedBytes(file.path,4*1024*1024)),file.sha256,"Parent metadata changed");
};
const resourceNames=Object.keys(CAMPAIGN_RESOURCE_BOUNDS).sort();
save("input.json",{schema:"af9-projected-factorized-candidate-input-v1",bindings,selfHash,policy,totalLimitMs,limits,resourceNames,parentDirectory,complete:false,accepted:false});

function generateProjection(resource,index) {
  const projectionStarted=performance.now();
  let forest,method,rounds=null,copies=null;
  {
    const keep=new Set([resource,...(SCENARIO.clocks??[]).map(clock=>clock.resource)]);
    const input=projectScenario(SCENARIO,keep);
    const bounds=Object.fromEntries([...keep].map(name=>[name,CAMPAIGN_RESOURCE_BOUNDS[name]]));
    const model=new SymbolicModel(input,bounds,{nodeLimit:policy.nodeLimit,cacheLimit:policy.cacheLimit,order:"interleaved",transitionMode:"partitioned"});
    const check=()=>{checkAll();assert(performance.now()-projectionStarted<=policy.generationMs,"Resource projection checked time limit exceeded");};
    const result=forward(model,{roundLimit:policy.roundLimit,minimumCopyAt:policy.minimumCopyAt,allocationInterval:policy.allocationInterval,check,observe:value=>{
      lastProgress={resource,...value,elapsedMs:performance.now()-started};event(lastProgress);
    }});
    const full=new SymbolicModel(SCENARIO,CAMPAIGN_RESOURCE_BOUNDS,CAMPAIGN_CERTIFICATE_CONFIG.verifier);
    const mapped=lift(result.model,result.reached,full);
    const bad=full.bdd.and(full.playing,full.bdd.and(full.validDomain,full.bdd.not(mapped.root)));
    forest=full.bdd.exportForest([bad]);
    rounds=result.rounds;copies=result.copies;method="playing-control-resource-and-clock-projection";
    check();
  }
  const artifact=writeForestArtifact(projectionDirectory,index,"inductive-projection:"+resource,forest,limits);
  const verificationStarted=performance.now();
  const checker=new SymbolicModel(SCENARIO,CAMPAIGN_RESOURCE_BOUNDS,CAMPAIGN_CERTIFICATE_CONFIG.verifier);
  const suppliedSeed=checker.bdd.importForest(forest)[0];
  verifyFactorizedComponent(checker,suppliedSeed,forest,{
    label:"inductive-projection:"+resource,coneCompactAt:policy.coneCompactAt,onProgress:value=>{
      checkAll();assert(performance.now()-verificationStarted<=policy.verificationMs,"Projection induction check timed out");
      event({resource,...value,elapsedMs:performance.now()-started});
    },
  });
  checkAll();
  assert(performance.now()-verificationStarted<=policy.verificationMs,"Projection induction check timed out");
  const record={resource,artifact,method,rounds,copies,elapsedMs:performance.now()-projectionStarted,
    inductionVerificationMs:performance.now()-verificationStarted,inductivePredicateVerified:true,
    scope:"original-model current/playing predicate, initial disjointness and all-choice backward closure; supplied seed equals predicate, not a regenerated failure seed"};
  writeFileSync(join(projectionDirectory,"projection-"+String(index).padStart(2,"0")+".json"),JSON.stringify(record)+"\n",{flag:"wx",mode:0o600});
  event({type:"projection-ready",...record});
  return record;
}

function originalSeeds(owner,choice) {
  const bdd=owner.bdd;
  const faults=bdd.or(choice.arithmeticError,choice.boundExit);
  const validSources=owner.preimage(owner.validDomain,choice);
  const invalidSources=owner.preimage(bdd.not(owner.validDomain),choice);
  const uncovered=bdd.and(choice.enabled,bdd.not(bdd.or(faults,validSources)));
  return [
    ["arithmetic-error",choice.arithmeticError],
    ["bound-exit",choice.boundExit],
    ["invalid-success",invalidSources],
    ["uncovered-enabled",uncovered],
  ].map(([kind,seed])=>{
    assert.equal(bdd.exists(seed,owner.nextVariables),seed,"Original failure seed is not current-only");
    return {id:kind+":"+choice.id,kind,choiceId:choice.id,seed};
  });
}

try {
  const fixtureCases=fixtures();
  event({type:"fixtures-passed",cases:fixtureCases,elapsedMs:performance.now()-started});
  mkdirSync(projectionDirectory,{mode:0o700});
  phase="projections";
  for(let index=0;index<resourceNames.length;index++) {
    activeResource=resourceNames[index];checkAll();
    projections.push(generateProjection(activeResource,index));
    recheck();
  }
  activeResource=null;
  phase="scene-import";
  let parentBindings,parentEntries,parentDescriptor,parentForestDirectory=parentDirectory;
  if(existsSync(join(parentDirectory,"manifest.json"))) {
    const parent=metadata(join(parentDirectory,"manifest.json"));
    assert.equal(parent.schema,"af9-campaign-factorized-certificate-manifest-v1");
    parentBindings=parent;
    parentEntries=parent.forests.entries;
    parentDescriptor=parent.certificate.descriptor;
    assert.equal(basename(parent.forests.directory),"forests");
    parentForestDirectory=join(parentDirectory,"forests");
  } else if(existsSync(join(parentDirectory,"candidates.json"))) {
    const parent=metadata(join(parentDirectory,"candidates.json"));
    assert.equal(parent.schema,"af9-factorized-candidate-generation-v1");
    parentBindings=parent.bindings;
    parentEntries=parent.forests;
    parentDescriptor=parent.certificate.descriptor;
  } else {
    const parentInput=metadata(join(parentDirectory,"input.json"));
    const parentFailure=metadata(join(parentDirectory,"failure.json"));
    assert.equal(parentInput.schema,"af9-factorized-candidate-input-v1");
    assert.equal(parentFailure.complete,false);
    assert.equal(parentFailure.accepted,false);
    assert.equal(parentFailure.sourceError,undefined,"Scene prefix source recheck failed");
    parentBindings=parentInput.bindings;
    parentEntries=parentFailure.forests;
  }
  // Reused data is not a reused verdict. Runtime/IO bindings may change, but
  // the game, symbolic core, bounds and bit layout must still match exactly.
  for(const key of ["build","generatorCore","bounds","catalog"])
    assert.deepEqual(parentBindings[key],bindings[key],"Scene candidates have incompatible "+key);
  for(const key of ["order","transitionMode"])
    assert.equal(parentBindings.config.verifier[key],bindings.config.verifier[key],"Scene candidates have incompatible "+key);
  const currentDescriptor=certificateDescriptor(new SymbolicModel(SCENARIO,CAMPAIGN_RESOURCE_BOUNDS,CAMPAIGN_CERTIFICATE_CONFIG.verifier));
  if(parentDescriptor!==undefined)assert.deepEqual(parentDescriptor,currentDescriptor,"Scene candidate descriptor changed");
  const sceneIds=bindings.catalog.sceneIds;
  const entries=parentEntries.slice(0,sceneIds.length).map(value=>validateForestArtifact(value,limits));
  assert.deepEqual(entries.map(entry=>entry.id),sceneIds.map(id=>"non-completion:scene:"+id),"Scene prefix catalog is incomplete");
  for(const entry of entries) {
    checkAll();
    const forest=readForestArtifact(parentForestDirectory,entry,limits);
    const artifact=writeForestArtifact(directory,forests.length,entry.id,forest,limits);
    forests.push(artifact);
    candidateDetails.push({id:entry.id,method:"imported-model-compatible-scene-candidate",parent:entry});
  }
  phase="failure-coverage";
  const projectionByResource=new Map(projections.map(value=>[value.resource,value]));
  const usedResources=new Set();
  for(let choiceIndex=0;choiceIndex<SCENARIO.choices.length;choiceIndex++) {
    checkAll();
    const authored=SCENARIO.choices[choiceIndex];
    const owner=new SymbolicModel(SCENARIO,CAMPAIGN_RESOURCE_BOUNDS,CAMPAIGN_CERTIFICATE_CONFIG.verifier);
    const choice=owner.choices[choiceIndex];
    assert.equal(choice.id,authored.id,"Authored choice order changed");
    const positives=authored.effects.flatMap(effect=>effect.type==="adjustResource"&&effect.delta>0?[effect.resource]:[]);
    const effects=authored.effects.flatMap(effect=>{
      if(effect.type==="adjustResource"||effect.type==="setResource")return [effect.resource];
      if(effect.type==="advanceClock")return [SCENARIO.clocks.find(clock=>clock.id===effect.clock).resource];
      return [];
    });
    const preferred=[...new Set([...positives,...effects,...resourceNames])];
    for(const spec of originalSeeds(owner,choice)) {
      checkAll();
      let bad=0,remaining=spec.seed;
      const selected=[];
      if(spec.seed!==0)for(const resource of preferred) {
        const projection=projectionByResource.get(resource);
        assert(projection,"Missing resource projection");
        const root=owner.bdd.importForest(readForestArtifact(projectionDirectory,projection.artifact,limits))[0];
        if(owner.bdd.and(remaining,root)===0)continue;
        bad=owner.bdd.or(bad,root);
        remaining=owner.bdd.and(remaining,owner.bdd.not(root));
        selected.push(resource);usedResources.add(resource);
        if(remaining===0)break;
      }
      assert.equal(remaining,0,"Resource projections do not cover original seed "+spec.id);
      assert.equal(owner.bdd.and(spec.seed,owner.bdd.not(bad)),0,"Original seed coverage changed");
      assert.equal(owner.bdd.and(owner.initial,bad),0,"Candidate contains the original initial state");
      const artifact=writeForestArtifact(directory,forests.length,spec.id,owner.bdd.exportForest([bad]),limits);
      forests.push(artifact);
      const detail={id:spec.id,method:spec.seed===0?"exact-zero-seed":"union-of-checked-inductive-projections",seedZero:spec.seed===0,projectionResources:selected,originalSeedCovered:true,initialInBad:false};
      candidateDetails.push(detail);
      save("candidate-"+String(forests.length-1).padStart(5,"0")+".json",{artifact,...detail});
    }
    event({type:"choice-covered",choiceId:choice.id,forests:forests.length,elapsedMs:performance.now()-started});
  }
  const descriptor=currentDescriptor;
  assert.deepEqual(forests.map(entry=>entry.id),[...sceneIds.map(id=>"non-completion:scene:"+id),...bindings.catalog.failureIds],"Complete candidate catalog differs");
  recheck();checkAll();
  save("candidates.json",{
    schema:"af9-factorized-candidate-generation-v1",bindings,generatorHashes:{projectedProducer:selfHash},
    strategy:{method:"inductive-projection-composition",resourceNames,policy,totalLimitMs},
    forests,certificate:{schema:FACTORIZED_SYMBOLIC_CERTIFICATE_SCHEMA,descriptor,
      sceneForests:sceneIds.map(sceneId=>({sceneId,forestId:"non-completion:scene:"+sceneId})),
      failureForests:bindings.catalog.failureIds.map(seedId=>({seedId,forestId:seedId}))},
    candidateDetails,projections,parentFiles,candidateCatalogComplete:true,complete:false,accepted:false,
    scope:"complete untrusted candidate catalog; original-model projection induction and original failure-seed coverage checked; complete independent certificate verification still required",
    elapsedMs:performance.now()-started,
  });
  event({type:"factorized-catalog-generated",forests:forests.length,usedResources:[...usedResources],elapsedMs:performance.now()-started,complete:false,accepted:false});
  recheck();
  save("closed.json",{candidateCatalogComplete:true,complete:false,accepted:false,elapsedMs:performance.now()-started});
  event({type:"candidate-production-closed",candidateCatalogComplete:true,complete:false,accepted:false,elapsedMs:performance.now()-started});
} catch(error) {
  let sourceError;
  try {recheck();}catch(failure){sourceError=String(failure);}
  save("failure.json",{phase,activeResource,lastProgress,error:String(error),sourceError,projections,forests,elapsedMs:performance.now()-started,complete:false,accepted:false});
  throw error;
}

}
