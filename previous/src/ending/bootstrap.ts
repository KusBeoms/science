/* data/personality/branching/timeline/credits 조각을 모아 Game.Ending으로 조립 */
(function () {
  "use strict";
  const G = (window.Game = window.Game || ({} as GameNamespace));
  const Gp = G as any;

  G.Ending = {
    NAMES: Gp._endingNames,
    FLAVOR: Gp._endingFlavor,
    CLAUSE: Gp._endingClause,
    ARCH: Gp._endingArch,
    naturalEndingKind() { return Gp._endingNaturalType(); },
    computeArchetype() { return Gp._endingComputeArchetype(); },
    buildCredits() { Gp._endingBuildCredits(); },
    restart() { Gp._endingRestart(); },
  };
})();
