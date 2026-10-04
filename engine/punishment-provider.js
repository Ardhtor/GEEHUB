/* GEEHUB PUNISHMENT PROVIDER
   A consequence-oriented world provider.
   It supplies controlled states of tension, restriction, pause, exposure,
   repetition, and release to scenes without requiring narrative exposition.
*/
(() => {
  const key = 'GEEHUB_PUNISHMENT_PROVIDER';
  const api = {
    id: 'punishment',
    kind: 'provider',
    version: 1,
    describe(input = {}) {
      const severity = Math.max(0, Math.min(1, Number(input.severity ?? 0.45)));
      const rule = input.rule || 'stay with the consequence';
      return {
        provider: key,
        rule,
        severity,
        states: [
          {name:'NOTICE', intensity: severity * .35},
          {name:'RESTRICTION', intensity: severity * .65},
          {name:'RECKONING', intensity: severity},
          {name:'RELEASE', intensity: Math.max(.08, severity * .28)}
        ],
        visualGrammar: ['slower motion','narrower space','stronger contrast','repeated gesture','return to baseline'],
        memory: {
          type: 'thinking-memory',
          question: input.question || 'What changes after the consequence?'
        }
      };
    },
    apply(scene = {}, input = {}) {
      const spec = this.describe(input);
      return {
        ...scene,
        temporalProvider: 'punishment',
        tension: spec.severity,
        constraint: spec.rule,
        stateSequence: spec.states,
        sensoryPressure: spec.visualGrammar,
        memoryQuestion: spec.memory.question
      };
    }
  };

  window.GEEHUB_PROVIDERS = window.GEEHUB_PROVIDERS || {};
  window.GEEHUB_PROVIDERS.punishment = api;
  window.dispatchEvent(new CustomEvent('geehub:provider-ready', {detail: api}));
})();