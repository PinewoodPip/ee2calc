import React from 'react';
import './App.css';
import _ from "lodash"
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import { aspects } from "./Data.js" // ascension data goes there
import { result } from 'underscore';

// todo:

// add hoverable tooltips over each step of results display
// remove self-sustain setting - DONE
// revise scoring
// t2s bug out in result display - NOT FIXED???, HAPPENS IN REMOVABLE ASPS ONLY
// add dipping t2s, FOR THIS MAKE A HELPER FUNC FOR GENERATING T2S
// revise scoring for both modes !!!, still seems inconsistent, sometimes result bugs out hard, revise path creation

// something important to consider: going to grab the 2nd node of a tier 2, then backtracking to remove something
// pointsNeeded calc doesnt work properly rn

// maybe start building from the goal and pick aspects for embs, then go from start and try to make a real path out of that? - DONE

// if lowest emb req is < number of t2s, use t2s for it and discard the emb's family, or cover it with core nodes? - SOMEWHAT DONE (not with core nodes)

// after adding each new asp, make a new reqs list and only pull in relevant asps - DONE

const generateTechnicalAspects = false;

const strings = {
  iterations: "How many builds should be randomly generated. With higher amounts the search takes longer but is more likely to find the most efficient build. Keep this in the thousands, and increase it when you're doing crazy searches (3+ aspects chosen, multiple T3s, stuff like that).",
  useFullCore: "Use a full Core instead of its lone nodes. A full Core grants 2 of each embodiment for 5 points.",
  selfSustain: "If enabled, shows aspects which can be removed after completing the chosen aspects.",
  preference: "Controls the scoring system for builds. The first option will make the search favor builds which require less points to sustain after removing all unnecessary aspects. The second option favors paths which require the least amount of points to reach, but may require more points to sustain.",
  considerDipping: "If enabled, the search will include the possibility of 'dipping' into a tier 2 aspects to get the embodiment reward on their second node, for only 2 points. This is rarely ever useful for finding shortest paths. If you're using this, you should increase the 'builds to try' setting considerably.",
}

String.prototype.format = function () { // by gpvos from stackoverflow
  var args = arguments;
  return this.replace(/\{(\d+)\}/g, function (m, n) { return args[n]; });
};

// generate a new "internal" aspect for each tier 2 aspect, one for each different embodiment rewards you can choose in node 2.
var num = 999; // object key for these aspects, starts at high number to uhm... avoid any problems
var extraAspects = {};

if (generateTechnicalAspects) {
  for (var x in aspects) {
    var aspect = aspects[x];
  
    if (aspect.tier == 2) {
      var embs = {
        force: 1,
        entropy: 1,
        form: 1,
        inertia: 1,
        life: 1,
      }
  
      for (var z in embs) {
        var newAspect = {
          name: aspect.name + " (+{0})".format(z),
          id: aspect.id, // same id so the calc function doesnt pick multiple
          family: "special",
          tier: aspect.tier,
          requirements: aspect.requirements, // does this reference or copy??
          rewards: {},
          nodes: aspect.nodes,
          hasChoiceNode: aspect.hasChoiceNode,
          generated: true, // if this property exists, aspect does not render in UI
          extraEmbodimentType: z,
        };
  
        for (var v in aspect.rewards) {
          newAspect.rewards[v] = aspect.rewards[v];
        }
  
        if (newAspect.rewards[z] == undefined)
          newAspect.rewards[z] = 1;
        else
          newAspect.rewards[z] += embs[z]; // add +1 embodiment
  
        num++;
  
        extraAspects[num] = newAspect;
      }
  
      // generate dipping aspects, which only have 2 nodes and grant 1 embodiment
      for (var b in embs) {
        var newAspect = {
          name: aspect.name + " (dip, +{0})".format(b),
          id: aspect.id, // same id so the calc function doesnt pick multiple
          family: "special",
          tier: aspect.tier,
          requirements: aspect.requirements,
          rewards: {},
          nodes: 2, // dipping aspects only have 2 nodes
          hasChoiceNode: aspect.hasChoiceNode,
          dipping: true,
          generated: true, // if this property exists, aspect does not render in UI
          extraEmbodimentType: b,
        };
  
        newAspect.rewards[b] = 1; // tier 2 dips reward 1 embodiment
  
        num++;
  
        extraAspects[num] = newAspect;
      }
    }
  }
}

for (var x in extraAspects) { // gotta do this here because we cannot change an object while we're iterating through it
  aspects[x] = extraAspects[x];
}

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

class Checkbox extends React.Component {
  toggle() {
    if (this.props.app.state.selection.includes(this.props.data)) {
      this.props.app.updateSelection(this.props.data, null)

      if (!this.props.data.isCoreNode && this.props.data.tier != 3)
        this.props.app.updateExclusion(this.props.data, null)
    }
    else if (this.props.app.state.excluded.includes(this.props.data)) {
      this.props.app.updateExclusion(this.props.data, null)
    }
    else {
      this.props.app.updateSelection(this.props.data, null);
    }
  }

  render() {
    var state = "checkbox ";
    var text = ""

    // disable onClick if this is a core node and we're using full core
    let onClick = (this.props.data.isCoreNode != undefined && this.props.app.state.useFullCore) ? null : () => this.toggle()

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

class Embodiment extends React.Component {
  render() {
    return (
    <div className={"embodiment " + this.props.type + ((this.props.darkMode) ? " dark-mode-embodiment" : " ")}>
      <p className={(this.props.darkMode ? "dark-mode-text" : "")}>{this.props.amount}</p>
    </div>
    )
  }
}

class Aspect extends React.Component {
  getRequirementsText() {
    var elements = [];

    for (var x in this.props.data.requirements) {
      var amount = this.props.data.requirements[x]
      var element;
      var type = x; // serves to figure out css class
      let darkMode = (this.props.darkMode)

      element = <Embodiment key={x} darkMode={darkMode} type={type} amount={amount}/>
      elements.push(element);
    }

    return elements;
  }

  getRewards() {
    var text = [];
    var embs = {
      force: 0,
      entropy: 0,
      form: 0,
      inertia: 0,
      life: 0,
    }

    for (var x in this.props.data.rewards) {
      var amount = this.props.data.rewards[x]
      embs[x] = amount;
    }

    // don't even show the header for tier 3 aspects
    var header = (this.props.data.tier != 3) ? "Completion rewards:" : "";
    for (var z in embs) {
      if (embs[z] != 0)
        text.push(<p key={this.props.data.name + "_tooltip_" + z}>{embs[z] + " " + capitalizeFirstLetter(z)}</p>);
    }

    return <div>
      <p>{header}</p>
      <div>{text}</div>
    </div>;
  }

  getTooltip() {
    var name = this.props.data.name
    var cost = this.props.data.nodes;
    var rewards = this.getRewards();
    var nodeText = ((this.props.data.nodes > 1) ? " ({0} nodes)" : " ({0} node)").format(cost)
    
    // note to self, dont nest <p> elements accidentally
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
      selection: [],
      excluded: [], // excluded aspects
      result: null,
      waiting: false,
      useFullCore: false,
      considerDipping: false,
      selfSustain: true,
      pointsBudget: 26,
      preference: "0", // scoring mode
      iterations: 30000, // how many random builds are generated and compared
      maximumOutputs: 10,
      resultIndex: 0,
      darkMode: false,
    }

    if (window.localStorage.getItem("darkMode") == "true")
      this.state.darkMode = true;
  }

  changeIndex(change) {
    let current = this.state.resultIndex;
    current += change;
    if (current > this.state.result.bestPaths.length-1)
      current = 0;
    else if (current < 0)
      current = this.state.result.bestPaths.length-1;

    this.setState({
      resultIndex: current,
    })
  }

  filterApplicableAspects(list) { // list is chosen aspects

    // if player chose tier 2s, replace those with generated versions. later we will discard the duplicates once one of the variants has been chosen
    var realList = [];
    var excludedAspects = [];
    for (var n = 0; n < this.state.excluded.length; n++) {
      excludedAspects.push(this.state.excluded[n].id)
    }
    
    for (var x = 0; x < list.length; x++) { // this works
      var aspect = list[x];

      if (aspect.isCoreNode != undefined && this.state.useFullCore) {

      }
      else
        realList.push(aspect); // we dont split t2s up here now
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

    function hasRelevantReward(aspect, reqs) {
      for (var x in aspect.rewards) {
        var reward = aspect.rewards[x];

        if (excludedAspects.includes(aspect.id)) // excluded aspects
          return false;

        if (aspect.dipping && !this.state.considerDipping)
          return false;

        // !!! always ignore base tier 2s !!!, use only the generated versions, which have the +embodiment node considered
        // if (aspect.tier == 2 && aspect.generated == undefined)
        //   return false;

        // core handling. (do we need handling for the edge case where the calc chooses all 5 cores in non-core mode? probably. TODO)
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

    // check what embodiment types we need
    for (var z in list) {
      var aspect = list[z];

      reqs.force = (aspect.requirements.force > reqs.force) ? aspect.requirements.force : reqs.force;

      reqs.entropy = (aspect.requirements.entropy > reqs.entropy) ? aspect.requirements.entropy : reqs.entropy;

      reqs.form = (aspect.requirements.form > reqs.form) ? aspect.requirements.form : reqs.form;

      reqs.inertia = (aspect.requirements.inertia > reqs.inertia) ? aspect.requirements.inertia : reqs.inertia;

      reqs.life = (aspect.requirements.life > reqs.life) ? aspect.requirements.life : reqs.life;
    }

    for (var x in aspects) {
      var aspect = aspects[x];

      const func = hasRelevantReward.bind(this);
      if (func(aspect, reqs)) {
        newList[x] = aspect;
      }
    }

    // make sure the aspects we have chosen don't get filtered out.
    // note to self: how the fuck does this avoid base t2s?
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

    return { // this works
      reqs: reqs,
      aspects: newList,
      chosenAspects: chosenAspects,
      aspectWithHighestRequirements: aspectWithHighestRequirements,
    };
  }

  async calculateV2() {
    // step 1: make a list of relevant aspects and gather the total embodiment requirements
    var data = this.filterApplicableAspects(this.state.selection);
    data.chosenAspects = _.cloneDeep(data.chosenAspects)
    console.log(data.chosenAspects);
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

    var tier1s = []; // todo use these?
    for (let x in data.aspects) {
      if (data.aspects[x].tier == 1)
        tier1s.push(data.aspects[x])
    }

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
        bestBuilds = [build]; // CAREFUL! PREV WE WERE SETTING THIS TO []
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

    for (let x in bestBuilds) { // todo: revise if it rand picks the same way of calcV1, then filter the fastest paths
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

    var pathIds = []
    var duplicates = []

    // filter out duplicates
    for (let x in bestPaths) {
      let pathId = []

      for (let z in bestPaths[x]) {
        let asp = bestPaths[x][z].aspect;
        pathId.push(asp.id)
      }

      pathId.sort();

      if (pathIds.length == 0)
        pathIds.push(pathId)
      else {
        for (let z in pathIds) {
          if (pathIds[z] == pathId) {
            pathIds.push(pathId)
          }
          else {
            duplicates.push(bestPaths[x])
          }
        }
      }
    
    }

    bestPaths = bestPaths.filter(function(item){
      return !duplicates.includes(item);
    })

    console.log("Paths:")
    console.log(bestPaths)

    var result = {
      bestBuilds: bestBuilds,
      buildPoints: bestPoints,
      selfSustainPoints: bestPoints,
      bestPaths: bestPaths,
      pathPoints: bestPathsPoints,
    }

    //return result;
    this.setState({
      result: result,
      resultIndex: 0,
    })
  }

  async calculate() {
    // step 1: make a list of relevant aspects and gather the total embodiment requirements
    var data = this.filterApplicableAspects(this.state.selection);
    console.log(data.chosenAspects)

    // warn if the user has excluded a lot of aspects
    if (this.state.excluded.length >= 6)
      if (!window.confirm("You've excluded a lot of aspects. I haven't implemented failsafes for that so if you continue, the webpage may freeze if there is literally no way to build towards the goal. Just a warnin'."))
        return;

    var bestBuild;

    // quit if nothing was selected
    if (Object.keys(data.chosenAspects).length == 0)
      return;

    // step 2: create random builds and save the most point-efficient one
    for (var iteration = 0; iteration < this.state.iterations; iteration++) {
      var aspects = data.aspects;
      var chosenAspects = [] // we "shuffle" this.
      for (var x in data.chosenAspects) {
        chosenAspects.push(data.chosenAspects[x]);
      }
      shuffle(chosenAspects);

      var build = [];

      var availableAspects = {}; // unnecessary? we dont edit this list
      for (var u in aspects) {
        availableAspects[u] = aspects[u]
      }

      for (var attempts = 0; attempts < 2000; attempts++) {

        // pick random aspect
        var aspect = _.sample(availableAspects)
        var skipRandomChoice = false;

        //CHECK IF WE MEET THE REQS FOR THE PLAYER-PICKED NODES, AND IF SO, START PUTTING THOSE IN AND IGNORE THE RANDOMLY PICKED ASPECT
        var breakThis = false;
        for (var v in chosenAspects) {
          if (breakThis)
            break;
          
          var chosenAspect = chosenAspects[v]

          if (fullfillsRequirements(build, {chosenAspect}) && !aspectAlreadyPicked(build, chosenAspect)) {
            build.push(chosenAspect)

            skipRandomChoice = true;

            //console.log("picked " + chosenAspect.name + " (goal) because reqs were fulfilled")

            // if one of the goals was a t2, remove the variants of it from the list of goals
            if (chosenAspect.tier == 2) {
              var newGoals = []

              for (var z in chosenAspects) {
                var asp = chosenAspects[z];
                if (asp.id == chosenAspect.id && asp != chosenAspect) {
                  //console.log("removed " + asp.name)
                }
                else {
                  newGoals.push(asp);
                }
              }

              chosenAspects = newGoals;

              breakThis = true; // can we just replace this with break?
            }

            break;
          }
        }

        if (!skipRandomChoice) {
          // choose it if we can and if we dont already have it in some way (relevant for t2s)
          if (fullfillsRequirements(build, {aspect}) && !aspectAlreadyPicked(build, aspect)) {
            build.push(aspect)

            //console.log("picked " + aspect.name)
          }
        }

        // check if we got all the nodes we wanted
        var allChosenNodesObtained = false;
        for (var n in chosenAspects) {
          if (!build.includes(chosenAspects[n])) {
            allChosenNodesObtained = false;
            break;
          }

          allChosenNodesObtained = true;
        }

        // self-sustaining
        // TODO MAKE IT TRY TO REMOVE THE MOST COSTLY ONES FIRST - to do this, first make an ordered list of aspects from most costly to cheapest
        var aspectsToRemove = [];
        var filteredBuild = build;
        if (allChosenNodesObtained && this.state.selfSustain) {
          // for (var x = 0; x < build.length; x++) {
          //   var asp = build[x];
          //   var buildWithoutThat = filteredBuild.filter(function(val) {return val != asp });

          //   if (fullfillsRequirements(buildWithoutThat) && !isInObject(asp, data.chosenAspects) && filteredBuild.includes(asp)) {
          //     aspectsToRemove.push(asp);
          //     filteredBuild = filteredBuild.filter(function(val) {return val != asp });
          //   }
          // }

          for (var x = build.length; x >= 0; x--) {
            var asp = build[x];
            var earliestTimeToRemove = null;
            if (!isInObject(asp, data.chosenAspects)) { // are we checking the right thing here?
              var buildWithoutThat = filteredBuild.filter(function(val) {return val != asp });
              for (var z = build.length; z >= 0; z--) {
                if (fullfillsRequirements(buildWithoutThat) && filteredBuild.includes(asp)) {
                  aspectsToRemove.push({
                    aspect: asp,
                    time: z});
                  filteredBuild = filteredBuild.filter(function(val) {return val != asp });
                }
              }
            }
          }
        }

        // break if we finished picking aspects for this build
        if (allChosenNodesObtained)
          break;
      }

      // < ! > Sometimes a build comes up with 0 aspects and points. I assume this happens when the find-aspects loop has finished and somehow, miraculously, all attempts to find a starting point for the build have failed.
      if (build.length != 0) {
        console.log(build);
        var pathOperationOrder = GetPathOperationOrder(build, aspectsToRemove)
        //var pointsToReach = GetMinimumPoints(pathOperationOrder);
        var pointsToReach = getTotalPoints(build)
        var pointsToSustain = getTotalPoints(filteredBuild)

        var buildInfo = {
          aspects: build,
          aspectsToRemove: aspectsToRemove,
          pathOperationOrder: pathOperationOrder,
          points: pointsToReach,
          finalCost: pointsToSustain,
          score: pointsToReach + pointsToSustain + ((this.state.preference == "0") ? 0 : build.length), // less aspects = better, discourages needlessly picking builds only to despec them later
          totalEmbodiments: getTotalRewards(build),
        }

        // check if new build is more point-efficient or tied, in which case we keep both tracked
        if (bestBuild == undefined)
          bestBuild = buildInfo;
        else if (buildInfo.score < bestBuild.score && buildInfo.points <= this.state.pointsBudget) // favoring only finalCost doesnt really work, it picks 50-point builds
          bestBuild = buildInfo;
      }
    }

    console.log("--- Best Build ---")
    console.log(bestBuild);

    this.setState({
      result: bestBuild,
      waiting: false,
    })
  }

  // add/remove aspects to the list of aspects we want to calculate, called by the checkboxes
  updateSelection(aspect, e) {
    var selection = this.state.selection.slice();

    if (!selection.includes(aspect))
      selection.push(aspect);
    else
      selection = selection.filter(function(val, index, arr){ return val != aspect })

    this.setState({
      selection: selection
    })
  }

  updateExclusion(aspect, e) {
    var selection = this.state.excluded.slice();

    if (!selection.includes(aspect))
      selection.push(aspect);
    else
      selection = selection.filter(function(val, index, arr){ return val != aspect })

    this.setState({
      excluded: selection
    })
  }

  render() {
    var forceAspects = [];
    var entropyAspects = [];
    var formAspects = [];
    var inertiaAspects = [];
    var lifeAspects = [];

    // dark mode
    let textClass = ""
    let checkboxClass = ""
    if (this.state.darkMode) {
      document.getElementsByTagName("body")[0].classList = "dark-bg"
      textClass += "dark-mode-text"
      checkboxClass += "dark-mode-checkbox"
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
      }

      let reqs = getTotalReqs(selection, true)
      let rewards = getTotalRewards(selection, true, true)

      let reqEmbs = []
      let rewEmbs = []
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

      for (let x in rewards) {
        if (x == "any") {
          rewEmbs.push(<p key={key} className={textClass}>{", {0} any".format(rewards[x])}</p>)
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

      requirementsInfo = <div className="flexbox-horizontal">
        <p className={textClass}>{"Requirements of chosen aspects: "}</p>
        {reqEmbs}
        <p className={textClass}>{", rewards:"}</p>
        {rewEmbs}
      </div>
    }

    var text = [];
    if (this.state.result != null) {
      let header = ((this.state.result.bestPaths.length > 1) ? "{0} paths found" : "{0} path found").format(this.state.result.bestPaths.length) + " ({0} points to sustain)".format(this.state.result.buildPoints)

      var resultsPanel = <div className="flexbox-horizontal">
        {(this.state.result.bestPaths.length > 1) ? <button className="arrow-button" onClick={() => this.changeIndex(1)}>{"<"}</button> : null}
        <p className={textClass}>{header}</p>
        {(this.state.result.bestPaths.length > 1) ? <button className="arrow-button" onClick={() => this.changeIndex(-1)}>{">"}</button> : null}
      </div>

      var path = this.state.result.bestPaths[this.state.resultIndex];
      let darkModeClass = this.state.darkMode ? "-dark-mode" : ""

      for (let x in path) {
        let element = path[x];

        switch(element.role) {
          case "goal": {
            text.push(<p className={"result-goal" + darkModeClass} key={x}>{element.aspect.name}</p>)
            break;
          }
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
    }
    else
      var resultsPanel = null;

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
        <div className="bottom-interface">
          <Tippy content={strings.iterations} placement="bottom" duration="0">
            <div className="num-input">
              <p className={textClass}>Builds to try:</p>
              <input type="val" value={this.state.iterations} onChange={(e) => this.setState({iterations: e.target.value})}></input>
            </div>
          </Tippy>
          <Tippy content={strings.useFullCore} placement="bottom" duration="0">
            <div className="checkbox-bottom-ui">
              <input type="checkbox" checked={this.state.useFullCore} onChange={(e) => this.setState({useFullCore: e.target.checked})}></input>
              <p className={textClass}>Use a full Core</p>
            </div>
          </Tippy>
          {/* <Tippy content={strings.considerDipping} placement="bottom" duration="0">
            <div className="checkbox-bottom-ui">
              <input type="checkbox" checked={this.state.considerDipping} onChange={(e) => this.setState({considerDipping: e.target.checked})}></input>
              <p className={textClass}>Consider dipping tier 2 aspects</p>
            </div>
          </Tippy> */}
          {/* <Tippy content={strings.selfSustain} placement="bottom" duration="0">
            <div className="checkbox-bottom-ui">
              <input type="checkbox" checked={this.state.selfSustain} onChange={(e) => this.setState({selfSustain: e.target.checked})}></input>
              <p>Self-sustain</p>
            </div>
          </Tippy> */}
          <Tippy content={"Change the UI to be dark."} placement="bottom" duration="0">
          <div className="checkbox-bottom-ui">
              <input type="checkbox" checked={this.state.darkMode} onChange={(e) => {this.setState({darkMode: e.target.checked}); window.localStorage.setItem("darkMode", e.target.checked)}}></input>
              <p className={textClass}>Dark mode</p>
            </div>
          </Tippy>
          {/* <Tippy content={strings.preference} placement="bottom" duration="0">
            <div className="dropdown">
              <select onChange={(e) => this.setState({preference: e.target.value})}>
                <option value="0">Prefer builds with lower final cost</option>
                <option value="1">Prefer builds with fewer points needed to reach</option>
              </select>
            </div>
          </Tippy> */}
        </div>
        <div className="bottom-interface column">
          {requirementsInfo}
          <button onClick={() => this.calculateV2()}>Search short paths</button>
          {/* <p>{resultText}</p> */}
          {resultsPanel}
        </div>
        <div className="flexbox-horizontal">
          {text}
        </div>
        <div className="source-code-link">
          <a href="https://github.com/PinewoodPip/ee2calc">Source code</a>
        </div>
      </div>
    )
  };
}

// --------- HELPER FUNCTIONS ------------

function shuffle(array) { // https://stackoverflow.com/a/2450976
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

function capitalizeFirstLetter(string) { // https://stackoverflow.com/a/1026087
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function isInObject(thing, obj) {
  for (var x in obj) {
    if (obj[x] == thing)
      return true
  }
  return false;
}

function getTotalPoints(build) {
  var points = 0;
  for (var x = 0; x < build.length; x++) {
    points += build[x].nodes;
  }

  return points;
}

function GetMinimumPoints(path) {
  var points = 0;

  for (var x = 0; x < path.length; x++) {
    var asp = path[x].aspect;
    points += (path[x].operation == "add") ? asp.nodes : -asp.nodes;

  }

  return points;
}

function GetPathOperationOrder(build, toRemove) {
  var path = [];

  for (var x = 0; x < build.length; x++) {
    var asp = build[x];
    path.push({aspect: asp, operation: "add"})
  }

  for (var z in toRemove) {
    path.splice(toRemove[z].time, 0, {aspect: toRemove[z].aspect, operation: "remove"})
  }
  console.log(path);
  return path;
}

function mergeIntoObject(build, aspect) {
  var newList = {};
  for (var x = 0; x < build.length; x++) {
    newList[x] = build[x];
  }
  newList[aspect.id] = aspect;

  return newList;
}

function randomProp(obj) {
  var keys = Object.keys(obj);
  return obj[keys[ keys.length * Math.random() << 0]];
};

// gets the highest requirement for each embodiment on a build
function getTotalReqs(aspects, hideUnused=false) { // requires an array
  var embodiments = {
    force: 0,
    entropy: 0,
    form: 0,
    inertia: 0,
    life: 0,
  };

  // if (typeof aspects == "object") {
  //   for (let x in aspect.requirements) {
  //     embodiments[x] = aspect.requirements[x];
  //   }
  // }
  // else {
  //   for (var x in aspects) {
  //     var aspect = aspects[x];
  
  //     for (var z in aspect.requirements) {
  //       if (aspect.requirements[z] > embodiments[z])
  //         embodiments[z] = aspect.requirements[z]
  //     }
  //   }
  // }

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

    for (var e in reqs) {
      if (embodiments[e] < reqs[e])
        return false;
    }

    return true;
  }
  else {
    var embodiments = getTotalRewards(build);
    var reqs = getTotalReqs(build);

    for (var e in reqs) {
      if (embodiments[e] < reqs[e])
        return false;
    }

    return true;
  }
}

function aspectAlreadyPicked(build, aspect) {
  for (var x = 0; x < build.length; x++) {
    if (build[x].id == aspect.id)
      return true;
  }

  return false;
}

export default App;

// serity pls come back, we miss you :(