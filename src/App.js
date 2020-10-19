import React from 'react';
import './App.css';
import _ from "lodash"
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import { aspects } from "./Data.js" // ascension data goes there

// Hey
// Relevant code is in filterApplicableAspects(), calculateShortestPath() and calculateV2() for the self-fuelling.
// Whole thing is a mess atm; took me quite a lot of tinkering to get things working and I haven't cleaned up the code since. My apologies.

const strings = {
  iterations: "How many builds should be randomly generated. With higher amounts the search takes longer but is more likely to find the most efficient build. Keep this in the thousands, and increase it when you're doing crazy searches (3+ aspects chosen, multiple T3s, stuff like that).",
  useFullCore: "Use a full Core instead of its lone nodes. A full Core grants 2 of each embodiment for 5 points.",
  selfSustain: "If enabled, shows aspects which can be removed after completing the chosen aspects.",
  preference: "Controls the scoring system for builds. The first option will make the search favor builds which require less points to sustain after removing all unnecessary aspects. The second option favors paths which require the least amount of points to reach, but may require more points to sustain.",
  considerDipping: "If enabled, the search will include the possibility of 'dipping' into a tier 2 aspects to get the embodiment reward on their second node, for only 2 points. This is rarely ever useful for finding shortest paths. If you're using this, you should increase the 'builds to try' setting considerably.",
  mode: "'Find shortest paths' gives you paths towards your chosen aspects that require the least amount of points to complete. 'Self-sustain' mode instead gives you a list of other aspects you need to pick in order to self-sustain the ones you chose, using the least amount of Ascension Points possible."
}

String.prototype.format = function () { // by gpvos from stackoverflow
  var args = arguments;
  return this.replace(/\{(\d+)\}/g, function (m, n) { return args[n]; });
};

// calculate embodiments rewarded per Ascension point spent
for (var x in aspects) {
  var aspect = aspects[x];
  aspect.rewardsPerPoint = {};
  aspect.totalRequirements = 0;

  for (var y in aspect.rewards) {
    aspect.rewardsPerPoint[y] = aspect.rewards[y] / aspect.nodes
  }

  // total embodiment req
  for (var z in aspect.requirements) {
    aspect.totalRequirements += aspect.requirements[z];
  }
}

// Checkbox element for choosing aspects that supports 3 states: unselected, selected and excluded
class Checkbox extends React.Component {
  toggle() {
    if (this.props.app.state.selection.includes(this.props.data)) { // add or exclude if this is a t3 aspect or core node (cannot exclude those)
      this.props.app.updateSelection(this.props.data, null)

      if (!this.props.data.isCoreNode && this.props.data.tier != 3)
        this.props.app.updateExclusion(this.props.data, null)
    }
    else if (this.props.app.state.excluded.includes(this.props.data)) { // exclude
      this.props.app.updateExclusion(this.props.data, null)
    }
    else { // remove from selection
      this.props.app.updateSelection(this.props.data, null);
    }
  }

  render() {
    var state = "checkbox ";
    var text = ""

    // disable onClick if this is a core node and we're using full core
    let onClick = (this.props.data.isCoreNode != undefined && this.props.app.state.useFullCore) ? null : () => this.toggle()

    // css classes and text
    if (this.props.data.isCoreNode != undefined && this.props.app.state.useFullCore) {
      state += "chk-grey"
      text = "✓"
    }
    else if (this.props.app.state.selection.includes(this.props.data)) {
      state += "chk-green"
      text = "✓"
    }
    else if (this.props.app.state.excluded.includes(this.props.data)) {
      state += "chk-red"
      text = "✕"
    }

    return (
      <div className={"unselectable " + state + " " + (this.props.darkMode ? "dark-mode-checkbox" : "")} onClick={onClick}>
        <p>{text}</p>
      </div>
    )
  }
}

// embodiment icon component
class Embodiment extends React.Component {
  render() {
    return (
    <div className={"embodiment " + this.props.type + ((this.props.darkMode) ? " dark-mode-embodiment" : " ")}>
      <p className={(this.props.darkMode ? "dark-mode-text" : "")}>{this.props.amount}</p>
    </div>
    )
  }
}

// component for displaying selectable aspects
class Aspect extends React.Component {
  getRequirementsText() { // create embodiment icons for the requirements
    var elements = [];

    for (var x in this.props.data.requirements) {
      var amount = this.props.data.requirements[x]
      var element;
      var type = x; // serves to figure out css class; each embodiment type has a different border color
      let darkMode = (this.props.darkMode)

      element = <Embodiment key={x} darkMode={darkMode} type={type} amount={amount}/>
      elements.push(element);
    }

    return elements;
  }

  getRewards() { // get text for aspect rewards, used in the tooltip
    var text = [];
    var embs = {
      force: 0,
      entropy: 0,
      form: 0,
      inertia: 0,
      life: 0,
    }

    for (let x in this.props.data.rewards) {
      var amount = this.props.data.rewards[x]
      embs[x] = amount;
    }

    // don't even show the header for tier 3 aspects, as they don't ever offer rewards
    let header = (this.props.data.tier != 3) ? "Completion rewards:" : "";
    for (let z in embs) {
      if (embs[z] != 0)
        text.push(<p key={this.props.data.name + "_tooltip_" + z}>{embs[z] + " " + capitalizeFirstLetter(z)}</p>);
    }

    return <div>
      <p>{header}</p>
      <div>{text}</div>
    </div>;
  }

  getTooltip() { // gets the tooltip for this aspect
    let name = this.props.data.name
    let cost = this.props.data.nodes;
    let rewards = this.getRewards();
    let nodeText = ((this.props.data.nodes > 1) ? " ({0} nodes)" : " ({0} node)").format(cost)
    
    // note to self, dont nest <p> elements accidentally. bad stuff happens
    return (<div className="tooltip">
        <p className="tooltip">{name + nodeText}<br /></p>
        {rewards}
      </div>
    );
  }

  render() {
    return (
      <Tippy content={this.getTooltip()} placement="bottom" duration="0">
        <div className="aspect unselectable">
          <Checkbox data={this.props.data} app={this.props.app} darkMode={this.props.darkMode}></Checkbox>
          <p className={(this.props.darkMode ? "dark-mode-text" : "")}>{this.props.data.name}</p>
          <div className="embodiments-box">
            {this.getRequirementsText()}
          </div>
        </div>
      </Tippy>
    )
  }
}

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      selection: [], // chosen aspects
      excluded: [], // excluded aspects
      result: null, // search outcome object
      useFullCore: false,
      considerDipping: false, // consider dipping t2s. currently disabled
      selfSustain: true,
      preference: "0", // scoring mode
      iterations: 4000, // how many random builds are generated and compared
      maximumOutputs: 10, // maximum path results shown
      resultIndex: 0, // currently displayed result index
      darkMode: false,
      mode: "fastest",
    }

    // dark mode is saved between sessions
    if (window.localStorage.getItem("darkMode") == "true")
      this.state.darkMode = true;
  }

  // switch between the different results
  changeIndex(change) {
    let current = this.state.resultIndex;
    current += change;
    if (current > this.state.result.bestBuilds.length-1)
      current = 0;
    else if (current < 0)
      current = this.state.result.bestBuilds.length-1;

    this.setState({
      resultIndex: current,
    })
  }

  filterApplicableAspects(list) { // list is chosen aspects
    /*
      This method is called before starting a search.
      Its purpose is to filter out aspects that we are 100% sure
      will not be useful to the search,
      or are excluded by the user.
      An example of this would be aspects that ONLY grant form,
      while we're searching for paths that do not require form.
    */

    var realList = []; // list of aspects that will be used in the search
    var excludedAspects = []; // list of IDs of excluded aspects
    for (var n = 0; n < this.state.excluded.length; n++) {
      excludedAspects.push(this.state.excluded[n].id)
    }
    
    for (var x = 0; x < list.length; x++) {
      var aspect = list[x];

      // exclude individual core nodes if we're using full core
      if (aspect.isCoreNode != undefined && this.state.useFullCore) {

      }
      else
        realList.push(aspect); 

      // we dont split t2s up here anymore

      // if (aspect.tier == 2) {
      //   for (var z in aspects) {
      //     var asp = aspects[z];

      //     if (asp.id == aspect.id && asp.generated == true) {
      //       realList.push(asp);
      //     }
      //   }
      // }
      // else {
      //   realList.push(aspect);
      // }
    }

    // add the full core to the list of user chosen aspects if we're using it
    if (this.state.useFullCore) {
      realList.push(aspects.core_full);
    }

    list = realList;

    var newList = {}
    var reqs = {
      force: 0,
      entropy: 0,
      form: 0,
      inertia: 0,
      life: 0,
    }

    // check what embodiment types we need
    for (var z in list) {
      var aspect = list[z];

      reqs.force = (aspect.requirements.force > reqs.force) ? aspect.requirements.force : reqs.force;

      reqs.entropy = (aspect.requirements.entropy > reqs.entropy) ? aspect.requirements.entropy : reqs.entropy;

      reqs.form = (aspect.requirements.form > reqs.form) ? aspect.requirements.form : reqs.form;

      reqs.inertia = (aspect.requirements.inertia > reqs.inertia) ? aspect.requirements.inertia : reqs.inertia;

      reqs.life = (aspect.requirements.life > reqs.life) ? aspect.requirements.life : reqs.life;
    }

    // checks if an aspect has any relevant award compared against a list of requirements
    function hasRelevantReward(aspect, reqs) {
      for (var x in aspect.rewards) {
        var reward = aspect.rewards[x];

        // if it's excluded, it's not relevant
        if (excludedAspects.includes(aspect.id))
          return false;

        // more exclusions based on settings
        if (aspect.dipping && !this.state.considerDipping)
          return false;

        // !!! always ignore base tier 2s !!!, use only the generated versions, which have the +embodiment node considered
        // if (aspect.tier == 2 && aspect.generated == undefined)
        //   return false;

        // core handling
        if (aspect.id == "core_full" && !this.state.useFullCore)
          return false;
        else if (aspect.isCoreNode && this.state.useFullCore)
          return false;

        // filter out t2 variants that don't have a relevant +emb
        if (aspect.generated != undefined && reqs[aspect.extraEmbodimentType] == 0)
          return false;

        // if an aspect rewards a type of embodiment we need, it's valid. Otherwise we discard it
        if (reward > 0 && reqs[x] > 0)
          return true;
      }

      return false;
    }

    for (var x in aspects) {
      var aspect = aspects[x];

      const func = hasRelevantReward.bind(this);
      if (func(aspect, reqs)) {
        newList[x] = aspect;
      }
    }

    // make sure the aspects we have chosen don't get filtered out.
    // this doesn't do shit right? TODO remove
    for (var y in list) {
      if (!newList.hasOwnProperty(list[y].id))
        newList[list[y].id] = list[y];
    }

    var highestReq = 0;
    var aspectWithHighestRequirements;

    for (var i in newList) {
      if (newList[i].totalRequirements > highestReq)
        aspectWithHighestRequirements = newList[i];
    }

    var chosenAspects = {}; // turn it into object and filter out irrelevant t2 variants
    // no longer needed. TODO REMOVE
    for (var b = 0; b < list.length; b++) {
      var asp = list[b]
      if ((asp.generated != undefined && reqs[asp.extraEmbodimentType] == 0) || asp.dipping != undefined) {
        //console.log("unneeded " + asp.name)
      }
      else
        chosenAspects[b] = list[b];
    }

    this.setState({
      waiting: true,
    })

    return {
      reqs: reqs,
      aspects: newList,
      chosenAspects: chosenAspects,
      aspectWithHighestRequirements: aspectWithHighestRequirements,
    };
  }

  async calculateShortestPath() {
    var data = this.filterApplicableAspects(this.state.selection);
    data.chosenAspects = _.cloneDeep(data.chosenAspects)

    // quit if nothing was selected
    if (Object.keys(data.chosenAspects).length == 0)
      return;

    // warn if the user has excluded a lot of aspects
    if (this.state.excluded.length >= 6)
      if (!window.confirm("You've excluded a lot of aspects. I haven't implemented failsafes for that so if you continue, the webpage may freeze if there is literally no way to build towards the goal. Just a warnin'."))
        return;

    // is this needed? it's not even reshuffled every iteration
    var chosenAspects = [] // we "shuffle" this.
    var buildWithChosenAspects = [];
    for (let x in data.chosenAspects) {
      chosenAspects.push(data.chosenAspects[x]);
      buildWithChosenAspects.push(data.chosenAspects[x])
    }

    var builds = []; // actually paths

    for (let x = 0; x < this.state.iterations; x++) {
      var build = [];
      var maxPoints = 0;
      var currentPoints = 0;
      var path = [];
      let keys = 0;
      let chosenAspects = _.cloneDeep(buildWithChosenAspects);
      let aspects = _.cloneDeep(data.aspects);
      let partialT2s = [];

      function changePoints(delta) {
        currentPoints += delta;
        if (currentPoints > maxPoints)
          maxPoints = currentPoints;
      }

      function addPartialT2(asp, embBonus=null) {
        let realAsp = _.cloneDeep(asp)
        if (embBonus == null) {
  
        }
        else {
          realAsp.rewards = {}
          realAsp.rewards[embBonus] = 1;
          realAsp.name += " (partial, " + embBonus + ")"
        }
        realAsp.nodes = 2;
        realAsp.fullAspect = asp;

        partialT2s.push(realAsp)
        build.push(realAsp);
        path.push({
          aspect: realAsp,
          role: (isChosenNode(asp)) ? "goal" : "removable"
        })
        changePoints(realAsp.nodes);

        // immediately check for stuff we can remove after reaching the emb node
        checkForRemovals(true)
      }

      function isChosenNode(asp) {
        for (let x in chosenAspects) {
          if (chosenAspects[x].id == asp.id)
            return true;
        }
        return false;
      }

      // check if removing an aspect would still keep requirements for goals in a build
      function fullfillsGoalsIfRemoved(build, goals, asp) {
        // this used to be just goals
        let reqs = getTotalReqs(goals.concat(build), true)
        let goalReqs = getTotalReqs(goals, true)
        let newBuild = build.filter((x) => {return x != asp})
        let rews = getTotalRewards(newBuild)

        // filter out reqs that are not relevant to goals
        for (let x in reqs) {
          if (goalReqs[x] == undefined) {
            delete reqs[x]
          }
        }

        for (let x in reqs) {
          if (rews[x] < reqs[x])
            return false;
        }
        return true;
      }

      function checkForRemovals(removeT1s=true) {
        // todo we should somehow prioritize removing asps that have more nodes
        let newPath = path.slice()
        newPath.reverse()
        for (let x in newPath) {
          if (newPath[x].role == "removable") {
            let asp = newPath[x].aspect;

            if (((asp.isCoreNode == undefined) || removeT1s) && (asp.tier != 2 || asp.fullAspect != undefined)) {
              // if we're overflowing reqs, check if we can remove this aspect
              let rews = getTotalRewards(build, false, true)
              let reqs = getTotalReqs(chosenAspects, true)

              let overflowed = false;

              for (let z in reqs) { // iterate through reqs not rews, otherwise irrelevant embs get in the way
                if (rews[z] > reqs[z]) {
                  overflowed = true;
                  break;
                }
              }

              if (overflowed) {
                // if this is a t2 thing, it needs special consideration due to them being split up
                if (asp.tier == 2) {
                  // merge partial and full
                  let buildWithoutSplitT2 = build.filter((x) => {return x != asp && x.name != asp.fullAspect.name + " (complete)"})
                  let realFullAspect = _.cloneDeep(asp.fullAspect)

                  // add emb bonus
                  for (let x in asp.rewards) {
                    realFullAspect.rewards[x] += 1;
                  }

                  buildWithoutSplitT2.push(realFullAspect)

                  if (fullfillsGoalsIfRemoved(buildWithoutSplitT2, chosenAspects, realFullAspect)) {
                    // filter full
                    let full;
                    let ind;
                    for (let x in path) {
                      if (path[x].aspect.name == asp.fullAspect.name + " (complete)") {
                        full = path[x].aspect;
                        ind = x;
                      }
                    }
                    path[ind].role = "removable-removed"
                    path.push({
                      aspect: full,
                      role: "remove"
                    })
                    // does this work??
                    build = build.filter((x) => {return x.name != full.name})
                    changePoints(-asp.nodes)

                    // filter partial
                    path[newPath.length - 1 - x].role = "removable-removed"
                    path.push({
                      aspect: asp,
                      role: "remove"
                    })
                    // does this work??
                    build = build.filter((x) => {return x.name != asp.name})
                    changePoints(-asp.nodes)

                    console.log(build)
                  }
                }
                else if (fullfillsGoalsIfRemoved(build, chosenAspects, asp)) {
                  // change the role of this path element so we don't do this procedure on it again
                  path[newPath.length - 1 - x].role = "removable-removed"
                  path.push({
                    aspect: asp,
                    role: "remove"
                  })
                  // does this work??
                  build = build.filter((x) => {return x.name != asp.name})
                  changePoints(-asp.nodes)
                }
              }
            }
          }
        }
      }

      // choosing asps
      for (let x = 0; x < 1000; x++) {
        let ignoreStep = false;

        // try to remove stuff
        // check if we overflowed anything, then try to remove. also do this whenever we add a partial t2
        checkForRemovals(false) // alright boys, ignoring T1s here finally fixed doppel bug

        // check if we can complete a partial t2
        let partialT2sToRemove = []
        for (let z in partialT2s) {
          let asp = _.cloneDeep(partialT2s[z].fullAspect)
          let isChosen = isChosenNode(asp)
          asp.nodes = asp.nodes - 2;
          asp.name += " (complete)"

          build.push(asp)
          path.push({
            aspect: asp,
            role: isChosen ? "goal" : "removable"
          })
          changePoints(asp.nodes);

          partialT2sToRemove.push(partialT2s[z])

          // this is new
          checkForRemovals(true)

          if (isChosen)
            keys++;
        }
        partialT2s = partialT2s.filter((x) => {return !partialT2sToRemove.includes(x)})

        // check if we can pick the chosen asps now
        for (let z in chosenAspects) {
          let chosenAsp = chosenAspects[z];
          if (fullfillsRequirements(build, [chosenAsp]) && !includesAspect(build, chosenAsp)) {
            if (chosenAsp.tier == 2) {
              let relevantEmbodiments = getTotalReqs(chosenAspects, true)
              // console.log(relevantEmbodiments)
              // port this back to v2?
              // checkForRemovals()
              addPartialT2(chosenAsp, _.sample(Object.keys(relevantEmbodiments)))
              // checkForRemovals(true)
            }
            else {
              build.push(chosenAsp)
              path.push({
                aspect: chosenAsp,
                role: "goal",
              });
              changePoints(chosenAsp.nodes);
              keys++;
            }
            ignoreStep = true;
          }
        }

        // throw out garbo builds that never went anywhere
        if (path.length > 25)
          break;

        if (!ignoreStep) {
          // build complete
          if (keys == chosenAspects.length) {
            checkForRemovals(true)

            let finalBuild = {
              path: path,
              build: build,
              maxPoints: maxPoints,
              points: currentPoints,
            }
            builds.push(finalBuild);
            break;
          }

          // else pick randoms
          let asp = _.sample(aspects);
          // why didnt we have to del in the calcV2?
          let remainingReqs = getRemainingReqs2(build, chosenAspects, true);
          let relevantEmbodiments = getRelevantEmbs(build, chosenAspects)

          if (hasRelevantRewards(asp, remainingReqs) && !includesAspect(build, asp) && fullfillsRequirements(build, [asp])) {
            if (asp.tier == 2) {
              let embBonus = _.sample(relevantEmbodiments)

              // get the partial t2 first, then add a check for completing them outside this loop?
              if (embBonus != undefined) {
                addPartialT2(asp, embBonus)
              }
            }
            else {
              build.push(asp);

              path.push({
                aspect: asp,
                role: "removable"
              })
              changePoints(asp.nodes);
            }
          }
        }
      }
    }

    var bestBuilds = [];
    var bestPoints = null;
    for (let x in builds) { // filter them down to the most point-efficient ones
      // let build = builds[x].build
      //let pointsNeeded = getTotalPoints(build)
      let pointsNeeded = builds[x].maxPoints

      if (bestBuilds.length == 0) {
        bestBuilds.push(builds[x]);
        bestPoints = pointsNeeded;
      }
      else if (pointsNeeded < bestPoints) {
        bestBuilds = [builds[x]];
        bestPoints = pointsNeeded;
      }
      else if (pointsNeeded == bestPoints && bestBuilds.length <= this.state.maximumOutputs) {
        bestBuilds.push(builds[x]);
      }
    }

    console.log(bestBuilds);
    console.log(bestPoints)

    if (bestBuilds.length == 0) {
      console.log("No results found. Try again and/or increase the 'builds to try' setting.")
    }
    else {
      this.setState({result: {
        bestBuilds: filterDuplicatePaths(bestBuilds),
        buildPoints: bestPoints,
        pointsNeeded: bestPoints,
      }})
    }
  }

  async calculateV2() {
    // step 1: make a list of relevant aspects and gather the total embodiment requirements
    var data = this.filterApplicableAspects(this.state.selection);
    data.chosenAspects = _.cloneDeep(data.chosenAspects)
    
    // quit if nothing was selected
    if (Object.keys(data.chosenAspects).length == 0)
      return;

    // warn if the user has excluded a lot of aspects
    if (this.state.excluded.length >= 6)
      if (!window.confirm("You've excluded a lot of aspects. I haven't implemented failsafes for that so if you continue, the webpage may freeze if there is literally no way to build towards the goal. Just a warnin'."))
        return;
    
    var reqs = getTotalReqs(data.chosenAspects);

    var relevantEmbodiments = []; // works
    for (let x in reqs) {
      if (reqs[x] > 0)
        relevantEmbodiments.push(x);
    }

    var chosenAspects = [] // we "shuffle" this.
    var buildWithChosenAspects = [];
    for (let x in data.chosenAspects) {
      chosenAspects.push(data.chosenAspects[x]);
      buildWithChosenAspects.push(data.chosenAspects[x])
    }

    var validBuilds = []; // valid self-sustainable builds

    console.log(data.aspects);

    // new build
    for (let x = 0; x < this.state.iterations; x++) {
      let chosenAspects = _.cloneDeep(buildWithChosenAspects);
      let aspects = _.cloneDeep(data.aspects);
      //var selfSustainBuild = [...buildWithChosenAspects]
      var selfSustainBuild = [];

      for (let x in chosenAspects) {
        let asp = chosenAspects[x]
        if (asp.tier == 2) {
          let embBonus = _.sample(relevantEmbodiments)

          asp.rewards[embBonus] = (asp.rewards[embBonus] == undefined) ? 1 : asp.rewards[embBonus] + 1;
          asp.name += " (+" + embBonus + ")"
        }
        selfSustainBuild.push(asp);
      }

      for (let x = 0; x < 1000; x++) { // getting rest of aspects needed to selfsustain
        if (selfSustainBuild.length >= 10)
          break;

        let reqs = getRemainingReqs(selfSustainBuild);

        // check if we're done
        if (fullfillsRequirements(selfSustainBuild)) {
          // if (!validBuilds.includes(selfSustainBuild)) // no idea if this works
          validBuilds.push(selfSustainBuild);
          break;
        }
        else { // else pick random asp and check again
          let asp = _.sample(aspects);

          if (hasRelevantRewards(asp, reqs) && !includesAspect(selfSustainBuild, asp)) {
            if (asp.tier == 2) {
              let embBonus = _.sample(relevantEmbodiments)

              if (embBonus != undefined) {
                asp.rewards[embBonus] = (asp.rewards[embBonus] == undefined) ? 1 : asp.rewards[embBonus] + 1;
                asp.name += " (+" + embBonus + ")"

                selfSustainBuild.push(asp);
              }
            }
            else {
              selfSustainBuild.push(asp);
            }
          }
        }
      }
    }

    var bestBuilds = [];
    var bestPoints = null;
    for (let x in validBuilds) { // filter them down to the most point-efficient ones
      let build = validBuilds[x]
      let pointsNeeded = getTotalPoints(build)

      if (bestBuilds.length == 0) {
        bestBuilds.push(build);
        bestPoints = pointsNeeded;
      }
      else if (pointsNeeded < bestPoints) {
        bestBuilds = [build];
        bestPoints = pointsNeeded;
      }
      else if (pointsNeeded == bestPoints && bestBuilds.length <= this.state.maximumOutputs) {
        bestBuilds.push(build);
      }
    }

    console.log(bestBuilds);
    console.log(bestPoints);

    var bestPaths = [];
    var bestPathsPoints = null;

    // this is where we actually make paths
    for (let x in bestBuilds) { // todo: revise if it rand picks the same way of calcV1, then filter the fastest paths
      break; // haha sike not anymore
      let keyAspects = bestBuilds[x];
      let aspects = _.cloneDeep(data.aspects);
      let path = [];
      let build = [];
      let keys = 0;

      for (let z = 0; z < this.state.iterations/3; z++) {
        for (let c in keyAspects) {
          let asp = keyAspects[c]
          if (fullfillsRequirements(build, [asp]) && !includesAspect(build, asp)) {
            console.log("picked " + asp.name + " (goal) because reqs were fulfilled")

            build.push(asp);
            path.push({
              aspect: asp,
              role: (includesAspect(data.chosenAspects, asp)) ? "goal" : "key", // todo distinguish goal and key
            });

            keys++;
          }
        }

        // check if we got everything
        if (keys === keyAspects.length) {
          break;
        }
        else {
          let asp = _.sample(aspects);
          let relevantEmbodiments = getRemainingReqs(keyAspects, true);
          // let relevantEmbodiments = getRemainingReqs(build); // this was a problem, we're checking the reqs of what we're building...

          if (hasRelevantRewards(asp, reqs) && !includesAspect(build, asp) && fullfillsRequirements(build, [asp])) {
            if (asp.tier == 2) {
              let embBonus = _.sample(relevantEmbodiments)

              //console.log(embBonus)

              if (embBonus != undefined) {
                asp.rewards[embBonus] = (asp.rewards[embBonus] == undefined) ? 1 : asp.rewards[embBonus] + 1;
                asp.name += " (+" + embBonus + ")"

                build.push(asp);

                path.push({
                  aspect: asp,
                  role: "removable"
                })
              }
            }
            else {
              build.push(asp);

              path.push({
                aspect: asp,
                role: "removable"
              })
            }
          }
        }
      }

      for (let z = 0; z < path.length; z++) {
        if (path[z].role == "removable") {
          path.push({
            aspect: path[z].aspect,
            role: "remove",
          })
        }
      }

      let points = getTotalPoints(build);

      if (bestPaths.length == 0) {
        bestPaths.push(path);
        bestPathsPoints = points;
      }
      else if (points < bestPathsPoints) {
        bestPaths = [path];
        bestPathsPoints = points;
      }
      else if (points == bestPathsPoints) {
        bestPaths.push(path);
      }
    }

    bestPaths = filterDuplicatePaths(bestPaths)
    bestBuilds = filterDuplicateBuilds(bestBuilds)

    // var pathIds = []
    // var duplicates = []

    // // filter out duplicates
    // for (let x in bestPaths) {
    //   let pathId = []

    //   for (let z in bestPaths[x]) {
    //     let asp = bestPaths[x][z].aspect;
    //     pathId.push(asp.id)
    //   }

    //   pathId.sort();

    //   if (pathIds.length == 0)
    //     pathIds.push(pathId)
    //   else {
    //     for (let z in pathIds) {
    //       if (pathIds[z] == pathId) {
    //         pathIds.push(pathId)
    //       }
    //       else {
    //         duplicates.push(bestPaths[x])
    //       }
    //     }
    //   }
    
    // }

    // bestPaths = bestPaths.filter(function(item){
    //   return !duplicates.includes(item);
    // })

    // console.log("Paths:")
    // console.log(bestPaths)

    // var result = {
    //   bestBuilds: bestBuilds,
    //   buildPoints: bestPoints,
    //   selfSustainPoints: bestPoints,
    //   bestPaths: bestPaths,
    //   pathPoints: bestPathsPoints,
    // }

    let result = {
      bestBuilds: bestBuilds,
      buildPoints: bestPoints,
      pointsNeeded: bestPoints,
    }

    //return result;
    this.setState({
      result: result,
      resultIndex: 0,
    })
  }

  // add/remove aspects to the list of aspects we want to calculate, called by the checkboxes
  updateSelection(aspect, e) {
    var selection = this.state.selection.slice();

    if (!selection.includes(aspect))
      selection.push(aspect);
    else
      selection = selection.filter(function(val){ return val != aspect })

    this.setState({
      selection: selection
    })
  }

  updateExclusion(aspect, e) {
    var selection = this.state.excluded.slice();

    if (!selection.includes(aspect))
      selection.push(aspect);
    else
      selection = selection.filter(function(val){ return val != aspect })

    this.setState({
      excluded: selection
    })
  }

  run() {
    switch (this.state.mode) {
      case "fastest": {
        this.calculateShortestPath();
        break;
      }
      case "self-sustain": {
        this.calculateV2();
        break;
      }
      case "minmaxembodiments": {
        this.calculateMaxEmbs();
        break;
      }
    }
  }

  renderResults() {
    if (this.state.result == null)
      return null;
    
    var text = [];
    if (this.state.mode == "fastest") {
      let header = ((this.state.result.bestBuilds.length > 1) ? "{0} paths found" : "{0} path found").format(this.state.result.bestBuilds.length) + " ({0} points needed, {1} to sustain)".format(this.state.result.bestBuilds[this.state.resultIndex].maxPoints, this.state.result.bestBuilds[this.state.resultIndex].points)

      var resultsPanel = <div className="flexbox-horizontal">
        {(this.state.result.bestBuilds.length > 1) ? <button className="arrow-button" onClick={() => this.changeIndex(1)}>{"<"}</button> : null}
        <p className={this.textClass}>{header}</p>
        {(this.state.result.bestBuilds.length > 1) ? <button className="arrow-button" onClick={() => this.changeIndex(-1)}>{">"}</button> : null}
      </div>

      var path = this.state.result.bestBuilds[this.state.resultIndex].path;
      let darkModeClass = this.state.darkMode ? "-dark-mode" : ""

      for (let x in path) {
        let element = path[x];

        switch(element.role) {
          case "goal": {
            text.push(<p className={"result-goal" + darkModeClass} key={x}>{element.aspect.name}</p>)
            break;
          }
          case "removable-removed":
          case "removable": {
            text.push(<p className={"result-removable" + darkModeClass} key={x}>{element.aspect.name}</p>)
            break;
          }
          case "remove": {
            text.push(<p className={"result-removable" + darkModeClass} key={x}>{"❌ " + element.aspect.name}</p>)
            break;
          }
          case "key": {
            text.push(<p className={"result-key" + darkModeClass} key={x}>{element.aspect.name}</p>)
            break;
          }
        }

        if (x != path.length - 1)
          text.push(<p className={"result-arrow" + darkModeClass} key={-x-1}>{" -> "}</p>)
      }

      return <div>
        <div>{resultsPanel}</div>
        <div className="flexbox-horizontal">{text}</div>
      </div>;
    }
    else if (this.state.mode == "self-sustain") {
      let header = ((this.state.result.bestBuilds.length > 1) ? "{0} builds found" : "{0} build found").format(this.state.result.bestBuilds.length) + " ({0} points to sustain)".format(this.state.result.buildPoints)

      let elements = []

      var resultsPanel = <div className="flexbox-horizontal">
        {(this.state.result.bestBuilds.length > 1) ? <button className="arrow-button" onClick={() => this.changeIndex(1)}>{"<"}</button> : null}
        <p className={this.textClass}>{header}</p>
        {(this.state.result.bestBuilds.length > 1) ? <button className="arrow-button" onClick={() => this.changeIndex(-1)}>{">"}</button> : null}
      </div>

      let build = this.state.result.bestBuilds[this.state.resultIndex];

      for (let x in build) {
        elements.push(<p className={this.textClass + " result-goal"}>{build[x].name}</p>)

        if (x != build.length - 1)
          elements.push(<p className={this.textClass} style={{marginRight: "5px"}}>, </p>)
      }

      return <div>
        {resultsPanel}
        <div className="flexbox-horizontal">{elements}</div>
        <div className="flexbox-horizontal">{text}</div>
      </div>;
    }
  }

  get textClass() {return (this.state.darkMode) ? "dark-mode-text" : ""}
  get checkboxClass() {return (this.state.darkMode) ? "dark-mode-checkbox" : ""}

  render() {
    var forceAspects = [];
    var entropyAspects = [];
    var formAspects = [];
    var inertiaAspects = [];
    var lifeAspects = [];

    // dark mode bg
    if (this.state.darkMode) {
      document.getElementsByTagName("body")[0].classList = "dark-bg"
    }
    else {
      document.getElementsByTagName("body")[0].classList = ""
    }

    // aspect elements
    for (var x in aspects) {
      var aspect = aspects[x];
      var currentAspect;

      var element = <Aspect
      darkMode={this.state.darkMode} 
      data={aspect}
      key={x}
      clickCallback={this.updateSelection.bind(this)}
      app={this}
      />

      var hr = <hr key={x + "_hr"}></hr>;

      if (aspect.generated == undefined) { // don't display "technical" aspects
        switch (aspect.family) {
          case "force":
            currentAspect = forceAspects;
            break;
          case "entropy":
            currentAspect = entropyAspects;
            break;
          case "form":
            currentAspect = formAspects;
            break;
          case "inertia":
            currentAspect = inertiaAspects;
            break;
          case "life":
            currentAspect = lifeAspects;
            break;
          default:
            break;
        }
      }

      if (currentAspect != undefined) {
        if (currentAspect != undefined && currentAspect.generated == undefined)
          currentAspect.push(element);

        var aspectsAfterWhichWePutAnHrSoThingsLookNice = [
          "core_force",
          "serpent",
          "tiger",
          "core_entropy",
          "wolf",
          "supplicant",
          "core_form",
          "silkworm",
          "wealth",
          "core_inertia",
          "guardsman",
          "rhinoceros",
          "core_life",
          "rabbit",
          "stag",
        ]
        if (aspectsAfterWhichWePutAnHrSoThingsLookNice.includes(aspect.id) && currentAspect.generated == undefined)
          currentAspect.push(hr);
        }
    }

    // display requirements and rewards of chosen aspects
    var requirementsInfo = null;
    if (this.state.selection.length > 0 || this.state.useFullCore) {
      // consider the core. it's not usually in selection and is instead added during filtering
      let selection = this.state.selection.slice();
      if (this.state.useFullCore) {
        selection.push(aspects.core_full)
        selection = selection.filter(function(item) {return item.isCoreNode == undefined})
      }

      let reqs = getTotalReqs(selection, true)
      let rewards = getTotalRewards(selection, true, true)
      let nodes = getTotalPoints(selection)

      let reqEmbs = []
      let rewEmbs = []
      let pointsText = <p className={this.textClass} style={{marginLeft: "0px"}}>{", nodes: {0}".format(nodes)}</p>
      var key = 0;

      for (let x in reqs) {
        reqEmbs.push(<Embodiment
          key={key}
          type={x}
          amount={reqs[x]}
          darkMode={this.state.darkMode}
        />)
        key++;
      }
      if (reqEmbs.length == 0) {
        reqEmbs.push(<p className={this.textClass} style={{marginLeft: "5px"}}>none</p>)
      }

      for (let x in rewards) {
        if (x == "any") {
          rewEmbs.push(<p key={key} className={this.textClass}>{", {0} any".format(rewards[x])}</p>)
        }
        else {
          rewEmbs.push(<Embodiment
            key={key}
            type={x}
            amount={rewards[x]}
            darkMode={this.state.darkMode}
          />)
        }
        key++;
      }
      if (rewEmbs.length == 0) {
        rewEmbs.push(<p className={this.textClass} style={{marginLeft: "5px"}}>none.</p>)
      }

      requirementsInfo = <div className="flexbox-horizontal">
        <p className={this.textClass}>{"Requirements of chosen aspects: "}</p>
        {reqEmbs}
        <p className={this.textClass}>{", rewards:"}</p>
        {rewEmbs}
        {pointsText}
      </div>
    }

    let resultsPanel = this.renderResults();

    return (
      <div>
        <div className="table">
          <div className="aspect-column">
            {forceAspects}
          </div>
          <div className="aspect-column">
            {entropyAspects}
          </div>
          <div className="aspect-column">
            {formAspects}
          </div>
          <div className="aspect-column">
            {inertiaAspects}
          </div>
          <div className="aspect-column">
            {lifeAspects}
          </div>
        </div>
        {/* options buttons */}
        <div className="bottom-interface">
          <Tippy content={strings.iterations} placement="bottom" duration="0">
            <div className="num-input">
              <p className={this.textClass}>Builds to try:</p>
              <input type="val" value={this.state.iterations} onChange={(e) => this.setState({iterations: e.target.value})}></input>
            </div>
          </Tippy>
          <Tippy content={strings.useFullCore} placement="bottom" duration="0">
            <div className="checkbox-bottom-ui">
              <input type="checkbox" checked={this.state.useFullCore} onChange={(e) => this.setState({useFullCore: e.target.checked})}></input>
              <p className={this.textClass}>Use a full Core</p>
            </div>
          </Tippy>
          {/* <Tippy content={strings.considerDipping} placement="bottom" duration="0">
            <div className="checkbox-bottom-ui">
              <input type="checkbox" checked={this.state.considerDipping} onChange={(e) => this.setState({considerDipping: e.target.checked})}></input>
              <p className={textClass}>Consider dipping tier 2 aspects</p>
            </div>
          </Tippy> */}
          <Tippy content={"Change the UI to be dark. This setting persists even if you refresh the page."} placement="bottom" duration="0">
          <div className="checkbox-bottom-ui">
              <input type="checkbox" checked={this.state.darkMode} onChange={(e) => {this.setState({darkMode: e.target.checked}); window.localStorage.setItem("darkMode", e.target.checked)}}></input>
              <p className={this.textClass}>Dark mode</p>
            </div>
          </Tippy>
          <Tippy content={strings.mode} placement="bottom" duration="0">
            <div className="dropdown">
              <select onChange={(e) => this.setState({mode: e.target.value, result: null,})}>
                <option value="fastest">Find shortest paths</option>
                <option value="self-sustain">Find self-sustainable builds</option>
              </select>
            </div>
          </Tippy>
        </div>
        <div className="bottom-interface column">
          {requirementsInfo}
          <button onClick={() => this.run()}>{(this.state.mode == "self-sustain") ? "Find self-sustained builds" : "Find shortest paths"}</button>
          {resultsPanel}
        </div>
        <div className="source-code-link">
          <a href="https://github.com/PinewoodPip/ee2calc">Source code</a>
        </div>
      </div>
    )
  };
}

// --------- HELPER FUNCTIONS ------------

function capitalizeFirstLetter(string) { // https://stackoverflow.com/a/1026087
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function getTotalPoints(build) {
  var points = 0;
  for (var x = 0; x < build.length; x++) {
    points += build[x].nodes;
  }

  return points;
}

// https://stackoverflow.com/questions/6229197/how-to-know-if-two-arrays-have-the-same-values/34566587
// yeah I really was too lazy to write this myself
function arraysEqual(_arr1, _arr2) {
  if (!Array.isArray(_arr1) || ! Array.isArray(_arr2) || _arr1.length !== _arr2.length)
    return false;
  var arr1 = _arr1.concat().sort();
  var arr2 = _arr2.concat().sort();
  for (var i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i])
      return false;
  }
  return true;
}

function filterDuplicateBuilds(builds) {
  var pathIds = []
  var duplicates = []
  for (let x in builds) {
    let pathId = []

    for (let z in builds[x]) {
      let asp = builds[x][z];
      pathId.push(asp.name)
    }

    pathId.sort();

    for (let z in pathIds) {
      if (arraysEqual(pathIds[z], pathId)) {
        duplicates.push(parseInt(pathIds.length))
      }
    }

    pathIds.push(pathId)
  }
  console.log(pathIds)
  console.log(duplicates)

  return builds.filter(function(item, index){
    return !duplicates.includes(index);
  });
}

function filterDuplicatePaths(bestPaths) {
  var pathIds = []
  var duplicates = []
  for (let x in bestPaths) {
    let pathId = []

    for (let z in bestPaths[x].build) {
      let asp = bestPaths[x].build[z];
      pathId.push(asp.name)
    }

    pathId.sort();

    for (let z in pathIds) {
      if (arraysEqual(pathIds[z], pathId)) {
        duplicates.push(parseInt(pathIds.length))
      }
    }

    pathIds.push(pathId)
  }
  console.log(pathIds)
  console.log(duplicates)

  return bestPaths.filter(function(item, index){
    return !duplicates.includes(index);
  });
}

// gets the highest requirement for each embodiment on a build
function getTotalReqs(aspects, hideUnused=false) { // requires an array
  var embodiments = {
    force: 0,
    entropy: 0,
    form: 0,
    inertia: 0,
    life: 0,
  };

  for (var x in aspects) {
    var aspect = aspects[x];

    for (var z in aspect.requirements) {
      if (aspect.requirements[z] > embodiments[z])
        embodiments[z] = aspect.requirements[z]
    }
  }

  if (hideUnused) {
    for (let z in embodiments) {
      if (embodiments[z] <= 0)
        delete embodiments[z]
    }
  }

  return embodiments;
}

function getTotalRewards(aspects, showAny=false, hideUnused=false) {
  var rewards = {
    force: 0,
    entropy: 0,
    form: 0,
    inertia: 0,
    life: 0,
  };

  if (showAny)
    rewards.any = 0;

  for (var x in aspects) {
    var aspect = aspects[x];

    if (showAny && aspect.tier == 2)
      rewards.any++;

    for (var r in aspect.rewards) {
      rewards[r] += aspect.rewards[r];
    }
  }

  if (hideUnused) {
    for (let z in rewards) {
      if (rewards[z] <= 0)
        delete rewards[z]
    }
  }

  return rewards;
}

function fullfillsRequirements(build, aspect=null) {
  if (aspect != null) {
    var embodiments = getTotalRewards(build);
    var reqs = getTotalReqs(aspect);

    for (let e in reqs) {
      if (embodiments[e] < reqs[e])
        return false;
    }

    return true;
  }
  else {
    var embodiments = getTotalRewards(build);
    var reqs = getTotalReqs(build, false, true);

    for (let e in reqs) {
      if (embodiments[e] < reqs[e])
        return false;
    }

    return true;
  }
}

function getRelevantEmbs(build, goalBuild) {
  let reqs = getTotalReqs(goalBuild)
  let current = getTotalRewards(build)

  for (let x in current) {
    reqs[x] -= current[x]
    if (reqs[x] < 0) {
      reqs[x] = 0;
    }
  }

  let relevant = []
  for (let x in reqs) {
    if (reqs[x] > 0) {
      relevant.push(x)
    }
  }

  return relevant;
}

// why does this discount ? error?
function getRemainingReqs(build, deleteUnused=false) {
  let reqs = getTotalReqs(build);

  for (let x in build) {
    let asp = build[x]
    for (let z in asp.rewards) {
      reqs[z] -= asp.rewards[z];
    }
  }

  if (deleteUnused) {
    for (let x in reqs) {
      if (reqs[x] < 1) {
        delete reqs[x]
      }
    }
  }

  return reqs;
}

function getRemainingReqs2(build, goal, deleteUnused=false) {
  let reqs = getTotalReqs(goal);
  let current = getTotalRewards(build)

  for (let x in current) {
    reqs[x] -= current[x];
    if (reqs[x] < 0)
      reqs[x] = 0;
  }

  if (deleteUnused) {
    for (let x in reqs) {
      if (reqs[x] < 1) {
        delete reqs[x]
      }
    }
  }

  return reqs;
}

function hasRelevantRewards(asp, reqs) {
  for (let x in reqs) {
    if (asp.rewards[x] != undefined) {
      if (asp.rewards[x] > 0)
        return true;
    }
  }
  return false;
}

function includesAspect(build, asp) {
  for (let x in build) {
    if (build[x].id == asp.id)
      return true;
  }
  return false;
}

export default App;