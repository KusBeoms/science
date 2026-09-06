"use strict";
(function () {
    "use strict";
    const G = (window.Game = window.Game || {});
    const Gp = G;
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
