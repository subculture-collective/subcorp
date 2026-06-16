function buildMissionContract(mission) {
  // Validate promiseid and artifactobligation requirements
  if (!mission.promiseid || !mission.artifactobligation) {
    throw new Error('Invalid mission contract: missing promiseid or artifactobligation');
  }

  // Check required artifactobligation properties
  const { path, owner, reviewGate, acceptanceCriteria } = mission.artifactobligation;
  if (!path || !owner || !reviewGate || !acceptanceCriteria || !Array.isArray(acceptanceCriteria)) {
    throw new Error('Invalid artifactobligation: missing required properties');
  }

  // Validate dependencies with reviewer gate
  if (mission.dependencies && mission.dependencies.length > 0) {
    mission.dependencies.forEach(dep => {
      if (!dep.input || !dep.reviewerGate) {
        throw new Error(`Invalid dependency: missing input or reviewerGate for ${dep.name}`);
      }
    });
  }

  // Enforce concrete definition of done
  if (!mission.definitionOfDone) {
    throw new Error('Mission requires concrete definition of done');
  }

  return mission;
}

// Example artifact obligation record
const artifactObligation = {
  path: 'output/reports/2026-06-15__evolution__self-evolution-analyze-issues-__praxis__v01.md',
  owner: 'praxis',
  reviewGate: 'Subrosa',
  acceptanceCriteria: ['Code change implemented', 'PR opened', 'Artifact published']
};